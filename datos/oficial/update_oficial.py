#!/usr/bin/env python

"""Actualiza el TCO de compra publicado en la portada del BCB."""

import re
from datetime import datetime as dt
from pathlib import Path

import pandas as pd
import requests
from bs4 import BeautifulSoup

LANDING_URL = "https://www.bcb.gob.bo"
LANDING_SELECTORS = {
    "tco": ".is-tc-oficial .bcb-tco-num",
    "fecha": ".is-tc-oficial .bcb-kpi2-asof time",
    "tco_duo_fila": ".is-tc-oficial .bcb-tco-duo-row",
    "tco_duo_num": ".bcb-tco-duo-num",
    "tco_duo_fecha": ".bcb-tco-duo-label span",
}
COMPRA_FN = "compra.csv"
DATA_DIR = Path(__file__).parent


def normalizar_decimal(texto):
    return float(str(texto).strip().replace(".", "").replace(",", "."))


def normalizar_fecha_es(texto):
    meses = {
        "enero": 1, "febrero": 2, "marzo": 3, "abril": 4, "mayo": 5,
        "junio": 6, "julio": 7, "agosto": 8, "septiembre": 9,
        "octubre": 10, "noviembre": 11, "diciembre": 12,
    }
    fecha = re.search(r"(\d{1,2})\s+de\s+(\w+),?\s+(?:de\s+)?(\d{4})", texto.lower())
    if fecha is None:
        raise ValueError(f"No se pudo interpretar la fecha: {texto}")
    return dt(int(fecha.group(3)), meses[fecha.group(2)], int(fecha.group(1))).strftime("%Y-%m-%d")


def fecha_iso(texto):
    return texto if re.fullmatch(r"\d{4}-\d{2}-\d{2}", texto) else normalizar_fecha_es(texto)


def consultar_landing(session):
    response = session.get(LANDING_URL)
    response.raise_for_status()
    html = BeautifulSoup(response.text, "html.parser")
    fila_manana = next(
        (fila for fila in html.select(LANDING_SELECTORS["tco_duo_fila"])
         if "mañana" in fila.get_text(" ", strip=True).lower()),
        None,
    )
    if fila_manana is not None:
        tco = fila_manana.select_one(LANDING_SELECTORS["tco_duo_num"])
        fecha = fila_manana.select_one(LANDING_SELECTORS["tco_duo_fecha"])
        fecha = fecha.get_text(" ", strip=True) if fecha else None
    else:
        tco = html.select_one(LANDING_SELECTORS["tco"])
        fecha = html.select_one(LANDING_SELECTORS["fecha"])
        fecha = fecha.get("datetime") if fecha else None
    if tco is None or not fecha:
        raise ValueError("No se pudo extraer el tipo de cambio oficial del landing")
    return fecha_iso(fecha), normalizar_decimal(tco.get_text(strip=True))


def consolidar(compra):
    fn = DATA_DIR / COMPRA_FN
    if fn.exists():
        compra = pd.concat([pd.read_csv(fn), compra])
    compra = compra.drop_duplicates(subset=["timestamp"], keep="last")
    compra["value"] = compra["value"].round(5)
    compra.sort_values("timestamp").to_csv(fn, index=False)


def main():
    with requests.Session() as session:
        timestamp, tco = consultar_landing(session)
    consolidar(pd.DataFrame([{"timestamp": timestamp, "value": tco}]))
    print(f"TCO oficial actualizado para {timestamp}: {tco}")


if __name__ == "__main__":
    main()
