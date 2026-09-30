#!/usr/bin/env python3
"""Sirve `vista` y actualiza componentes guardados sin recargar la página."""

from __future__ import annotations

import argparse
import json
import queue
import threading
import time
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse

VISTA = Path(__file__).resolve().parent
CLIENTS: set[queue.Queue[bytes]] = set()
CLIENTS_LOCK = threading.Lock()
WATCHED_SUFFIXES = {".html", ".css", ".js"}


def source_signature() -> tuple[tuple[str, int, int], ...]:
    """Return file paths and metadata for the view's editable sources."""
    entries = []
    for path in VISTA.rglob("*"):
        if not path.is_file() or path.suffix not in WATCHED_SUFFIXES:
            continue
        if any(part.startswith(".") for part in path.relative_to(VISTA).parts):
            continue
        try:
            stat = path.stat()
        except FileNotFoundError:
            continue
        entries.append((path.relative_to(VISTA).as_posix(), stat.st_mtime_ns, stat.st_size))
    return tuple(sorted(entries))


def changed_paths(previous, current) -> list[str]:
    old = {path: (mtime, size) for path, mtime, size in previous}
    new = {path: (mtime, size) for path, mtime, size in current}
    return sorted(path for path in old.keys() | new.keys() if old.get(path) != new.get(path))


def publish(event: dict) -> None:
    message = f"data: {json.dumps(event)}\n\n".encode()
    with CLIENTS_LOCK:
        clients = list(CLIENTS)
    for client in clients:
        client.put(message)


class Handler(SimpleHTTPRequestHandler):
    """Serve static files and the server-sent-event hot reload channel."""

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(VISTA), **kwargs)

    def do_GET(self):
        path = urlparse(self.path).path
        if path == "/__livereload":
            self.serve_events()
            return
        super().do_GET()

    def serve_events(self):
        client: queue.Queue[bytes] = queue.Queue()
        with CLIENTS_LOCK:
            CLIENTS.add(client)

        self.send_response(200)
        self.send_header("Content-Type", "text/event-stream; charset=utf-8")
        self.send_header("Cache-Control", "no-cache, no-store")
        self.send_header("Connection", "keep-alive")
        self.send_header("X-Accel-Buffering", "no")
        self.end_headers()

        try:
            self.wfile.write(b": connected\n\n")
            self.wfile.flush()
            while True:
                try:
                    message = client.get(timeout=15)
                except queue.Empty:
                    self.wfile.write(b": keep-alive\n\n")
                else:
                    self.wfile.write(message)
                self.wfile.flush()
        except (BrokenPipeError, ConnectionResetError, ConnectionAbortedError):
            pass
        finally:
            with CLIENTS_LOCK:
                CLIENTS.discard(client)


def watch_sources(interval: float) -> None:
    previous = source_signature()
    while True:
        time.sleep(interval)
        current = source_signature()
        if current == previous:
            continue

        for path in changed_paths(previous, current):
            version = time.time_ns()
            if path in {"style.css", "styles.css"}:
                publish({"type": "style", "path": path, "version": version})
            elif path.startswith("components/") and path.endswith(".js"):
                publish({"type": "component", "path": path, "version": version})
            else:
                publish({"type": "reload", "path": path, "version": version})
            print(f"Cambio detectado: {path}")

        previous = current


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=4173)
    parser.add_argument("--intervalo", type=float, default=0.1)
    args = parser.parse_args()

    watcher = threading.Thread(
        target=watch_sources,
        args=(args.intervalo,),
        daemon=True,
        name="vista-source-watcher",
    )
    watcher.start()

    server = ThreadingHTTPServer((args.host, args.port), Handler)
    print(f"Vista disponible en http://{args.host}:{args.port}/ (Ctrl+C para salir)")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nServidor detenido")
    finally:
        server.shutdown()
        server.server_close()


if __name__ == "__main__":
    main()
