#!/usr/bin/env python3

import re
import sys
import unicodedata
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo

import pandas as pd
import requests
from bs4 import BeautifulSoup
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry


DATA_DIR = Path(__file__).parent
TIMEZONE = ZoneInfo("America/La_Paz")
REQUEST_TIMEOUT = (10, 30)

SESSION = requests.Session()
SESSION.headers.update(
    {
        "User-Agent": (
            "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
            "(KHTML, like Gecko) Chrome/131.0 Safari/537.36"
        ),
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "es-BO,es;q=0.9,en;q=0.8",
        "Cache-Control": "no-cache",
    }
)
RETRY = Retry(
    total=3,
    connect=3,
    read=3,
    status=3,
    backoff_factor=1,
    status_forcelist=(429, 500, 502, 503, 504),
    allowed_methods=frozenset({"GET", "POST"}),
    raise_on_status=False,
)
SESSION.mount("https://", HTTPAdapter(max_retries=RETRY))

URLS = {
    "banco_bisa": "https://www.bisa.com/",
    "banco_de_credito": "https://www.bcp.com.bo/",
    "banco_de_la_nacion_argentina": "https://www.bna.com.bo/",
    "banco_economico": "https://www.baneco.com.bo/",
    "banco_fortaleza": "https://www.bancofortaleza.com.bo/",
    "banco_ganadero": "https://www.bg.com.bo/",
    "banco_mercantil_santa_cruz": "https://www.bmsc.com.bo/",
    "banco_solidario": "https://www.bancosol.com.bo/",
    "banco_union": "https://www.bancounion.com.bo/",
    "banco_fie": "https://www.bancofie.com.bo/",
    "banco_prodem": "https://www.prodem.bo/",
    "banco_pyme_de_la_comunidad": "https://www.bco.com.bo/",
}


def descargar(url):
    response = SESSION.get(url, timeout=REQUEST_TIMEOUT)
    response.raise_for_status()
    return BeautifulSoup(response.text, "html.parser")


def descargar_json(url):
    response = SESSION.get(url, timeout=REQUEST_TIMEOUT)
    response.raise_for_status()
    return response.json()


def texto(elemento):
    return " ".join(elemento.get_text(" ", strip=True).split()) if elemento else ""


def sin_acentos(valor):
    return "".join(
        c
        for c in unicodedata.normalize("NFD", valor)
        if unicodedata.category(c) != "Mn"
    ).lower()


def numero(valor):
    valor = valor.replace("\xa0", " ").strip()
    encontrados = re.findall(
        r"(?<!\d)\d{1,3}(?:[.,]\d{3})*[.,]\d{1,5}(?!\d)", valor
    )
    if not encontrados:
        encontrados = re.findall(r"(?<!\d)\d+(?:[.,]\d+)?(?!\d)", valor)
    if not encontrados:
        raise ValueError(f"No se encontró un número en: {valor!r}")

    token = encontrados[-1]
    if "," in token and "." in token:
        decimal = "," if token.rfind(",") > token.rfind(".") else "."
        miles = "." if decimal == "," else ","
        token = token.replace(miles, "").replace(decimal, ".")
    elif "," in token:
        token = token.replace(",", ".")
    return float(token)


def valor_etiquetado(texto_fuente, etiqueta):
    patron = rf"{etiqueta}\s*[:\-]?\s*(\d+(?:[.,]\d+)?)"
    encontrado = re.search(patron, texto_fuente, flags=re.IGNORECASE)
    if not encontrado:
        raise ValueError(f"No se encontró {etiqueta!r} en: {texto_fuente!r}")
    return numero(encontrado.group(1))


def cotizaciones_desde_texto(texto_fuente, compra=r"compra", venta=r"venta"):
    return {
        "compra": valor_etiquetado(texto_fuente, compra),
        "venta": valor_etiquetado(texto_fuente, venta),
    }


def cotizaciones_desde_elementos(elementos):
    return cotizaciones_desde_texto(" | ".join(texto(e) for e in elementos))


def banco_bisa():
    nodo = descargar(URLS["banco_bisa"]).select_one(
        "section.marquee-container p.marquee-text"
    )
    return cotizaciones_desde_texto(
        texto(nodo), r"d[oó]lar\s+compra", r"d[oó]lar\s+venta"
    )


def banco_de_credito():
    elementos = descargar(URLS["banco_de_credito"]).select(
        ".marquee-content span"
    )
    return cotizaciones_desde_elementos(elementos)


def banco_de_la_nacion_argentina():
    sopa = descargar(URLS["banco_de_la_nacion_argentina"])
    compra = sopa.select_one('span[x-text="cotizacion.compra"]')
    venta = sopa.select_one('span[x-text="cotizacion.venta"]')
    if texto(compra) and texto(venta):
        return {"compra": numero(texto(compra)), "venta": numero(texto(venta))}

    datos = descargar_json(URLS["banco_de_la_nacion_argentina"] + "Home/CargarCotizaciones")
    dolar = next(item for item in datos if str(item.get("moneda", "")).upper() == "USD")
    return {"compra": float(dolar["compra"]), "venta": float(dolar["venta"])}


def banco_economico():
    sopa = descargar(URLS["banco_economico"])
    contenido = texto(sopa.select_one("#cotizacion"))
    if not contenido:
        contenido = descargar_json(
            URLS["banco_economico"] + "gbGLOBALTiposDeCambio"
        )["gbGLOBALTiposDeCambioResult"]
    return cotizaciones_desde_texto(contenido)


def banco_fortaleza():
    sopa = descargar(URLS["banco_fortaleza"])
    compra = sopa.select_one('span[data-exchange="buyExchange"]')
    venta = sopa.select_one('span[data-exchange="saleExchange"]')
    if not re.search(r"\d", texto(compra)) or not re.search(r"\d", texto(venta)):
        datos = descargar_json(URLS["banco_fortaleza"] + "proxy-exchange.php")["response"]
        return {"compra": float(datos["buyExchange"]), "venta": float(datos["saleExchange"])}
    return {"compra": numero(texto(compra)), "venta": numero(texto(venta))}


def banco_ganadero():
    sopa = descargar(URLS["banco_ganadero"])
    candidatos = sopa.select(
        "#indicadores div.mx-auto.text-center.text-\\[10px\\].md\\:text-sm"
    )
    por_etiqueta = {}
    for valor in candidatos:
        bloque = valor.parent.parent
        por_etiqueta[sin_acentos(texto(bloque))] = numero(texto(valor))
    compra = next(v for etiqueta, v in por_etiqueta.items() if "t. cambio oficial" in etiqueta)
    venta = next(v for etiqueta, v in por_etiqueta.items() if "valor ref. venta usd" in etiqueta)
    return {"compra": compra, "venta": venta}


def banco_mercantil_santa_cruz():
    datos = descargar_json(
        "https://backportal.bmsc.com.bo:1443/api/bmscservices/tipotre"
    )
    return {"compra": float(datos["compra"]), "venta": float(datos["venta"])}


def banco_solidario():
    sopa = descargar(URLS["banco_solidario"])
    bloque = sopa.select_one(
        ".indicador-grupo .valores-grupo .highlight-field"
    )
    return cotizaciones_desde_texto(texto(bloque))


def banco_union():
    sopa = descargar(URLS["banco_union"])
    candidatos = sopa.select(".opacity.mb-3-tasas p.card-text")
    cotizacion = next(t for t in map(texto, candidatos) if "dolar" in sin_acentos(t))
    return cotizaciones_desde_texto(cotizacion, r"compra\s+BOB\s*:", r"venta")


def banco_fie():
    response = SESSION.post(
        "https://www.bancofie.com.bo/api/tcl",
        headers={"Content-Type": "application/json", "Referer": URLS["banco_fie"]},
        timeout=REQUEST_TIMEOUT,
    )
    response.raise_for_status()
    documento = response.json()["resultado"]["documento"]
    return cotizaciones_desde_texto(
        documento, r"d[oó]lar\s+compra", r"d[oó]lar\s+venta"
    )


def banco_prodem():
    sopa = descargar(URLS["banco_prodem"])
    compra = sopa.select_one("#prodem-compra")
    venta = sopa.select_one("#prodem-venta")
    return {"compra": numero(texto(compra)), "venta": numero(texto(venta))}


def banco_pyme_de_la_comunidad():
    sopa = descargar(URLS["banco_pyme_de_la_comunidad"])
    filas = sopa.select(".csc-tc__tabla tr")
    por_etiqueta = {
        texto(fila.select_one("th")).lower(): numero(texto(fila.select_one("td")))
        for fila in filas
    }
    return {"compra": por_etiqueta["compra"], "venta": por_etiqueta["venta"]}


BANCOS = {
    nombre: globals()[nombre]
    for nombre in URLS
    if nombre != "banco_prodem"  # GitHub Actions no logra conectarse al servidor.
}


def actualizar_archivo(tipo_cotizacion, nuevos):
    ruta = DATA_DIR / f"{tipo_cotizacion}.csv"
    columnas = ["timestamp", "banco", "valor"]
    partes = []

    if ruta.exists() and ruta.stat().st_size:
        anterior = pd.read_csv(ruta, usecols=columnas)
        partes.append(anterior)

    actuales = nuevos.loc[nuevos["tipo_cotizacion"] == tipo_cotizacion, columnas]
    partes.append(actuales)
    datos = pd.concat(partes, ignore_index=True)
    datos["timestamp"] = datos["timestamp"].astype(str).str[:10]
    datos["_timestamp_orden"] = pd.to_datetime(
        datos["timestamp"], format="%Y-%m-%d", errors="raise", utc=True
    )
    datos = (
        datos.sort_values("_timestamp_orden")
        .drop_duplicates(subset=["timestamp", "banco"], keep="last")
        .sort_values(["_timestamp_orden", "banco"])
    )
    datos = datos.drop(columns="_timestamp_orden")
    datos.to_csv(ruta, columns=columnas, index=False)


def main():
    timestamp = datetime.now(TIMEZONE).date().isoformat()
    registros = []
    errores = []

    for banco, funcion in BANCOS.items():
        try:
            cotizaciones = funcion()
            for tipo_cotizacion in ("compra", "venta"):
                registros.append(
                    {
                        "tipo_cotizacion": tipo_cotizacion,
                        "timestamp": timestamp,
                        "banco": banco,
                        "valor": cotizaciones[tipo_cotizacion],
                    }
                )
            print(f"{banco}: {cotizaciones}")
        except Exception as error:
            mensaje = f"{type(error).__name__}: {error}".replace("\n", " ")
            errores.append((banco, mensaje))
            print(f"::error title=Error en cotización::{banco}: {mensaje}")

    nuevos = pd.DataFrame(
        registros,
        columns=["tipo_cotizacion", "timestamp", "banco", "valor"],
    )
    if not nuevos.empty:
        for tipo_cotizacion in ("compra", "venta"):
            actualizar_archivo(tipo_cotizacion, nuevos)

    if errores:
        print(f"Fallaron {len(errores)} de {len(BANCOS)} bancos.")
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
