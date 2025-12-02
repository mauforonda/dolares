#!/usr/bin/env python

import requests
import pandas as pd
from bs4 import BeautifulSoup
import re
from datetime import datetime as dt
import unicodedata
from pathlib import Path

COMPRA_FN = "buy_oficial.csv"
VENTA_FN = "sell_oficial.csv"


def normalize(texto, to_float=False):
    if to_float:
        return float(texto.replace(",", "."))
    return (
        unicodedata.normalize("NFKD", texto.lower().replace(" ", "_"))
        .encode("ascii", "ignore")
        .decode("ascii")
    )


def codigo_meses(corto=False):
    meses_corto = [
        "ene",
        "feb",
        "mar",
        "abr",
        "may",
        "jun",
        "jul",
        "ago",
        "sep",
        "oct",
        "nov",
        "dic",
    ]
    meses_largo = [
        "enero",
        "febrero",
        "marzo",
        "abril",
        "mayo",
        "junio",
        "julio",
        "agosto",
        "septiembre",
        "octubre",
        "noviembre",
        "diciembre",
    ]
    return {mes: i + 1 for i, mes in enumerate(meses_corto if corto else meses_largo)}


def get_compra(session):
    def get_fecha(html):
        meses = codigo_meses()
        d = re.search(
            r"FECHA DE PUBLICACIÓN:\s*(\d{1,2})\s+de\s+(\w+)\s+de\s+(\d{4})",
            html.select(".date-line")[0].get_text(),
        )
        return dt(int(d.group(3)), meses[d.group(2)], int(d.group(1))).strftime(
            "%Y-%m-%d"
        )

    def get_cotizaciones(html):
        return {
            normalize(banco.get_text()): normalize(cotizacion.get_text(), True)
            for banco, cotizacion in zip(
                html.select(".cell-text"), html.select(".cell-value")
            )
        }

    def get_promedio(html):
        return normalize(html.select(".average-value")[0].get_text(), True)

    URL = "https://www.bcb.gob.bo/?q=content/tipo-de-cambio-promedio-ponderado-para-clientes-preferenciales"

    r = session.get(URL)
    html = BeautifulSoup(r.text, "html.parser")

    fecha = get_fecha(html)
    cotizaciones = get_cotizaciones(html)
    promedio = get_promedio(html)

    return {"timestamp": fecha, **cotizaciones, "value": promedio}


def get_venta(session):
    def get_cotizacion(texto, meses):
        i = re.search(r"(\d{2})-(\w+)-(\d{2})\s*—\s*(\d+,\d+)", texto)
        fecha = dt(int("20" + i.group(3)), meses[i.group(2)], int(i.group(1))).strftime(
            "%Y-%m-%d"
        )
        cotizacion = normalize(i.group(4), True)
        return {"timestamp": fecha, "value": cotizacion}

    URL = "https://www.bcb.gob.bo/?q=content/valor-referencial-del-d%C3%B3lar-estadounidense-para-operaciones-con-el-exterior"
    r = session.get(URL)
    html = BeautifulSoup(r.text, "html.parser")
    meses = codigo_meses(True)
    return [get_cotizacion(i.get_text(), meses) for i in html.select("circle title")]


def consolidar(df, filename):
    fn = Path(filename)
    if fn.exists():
        df_old = pd.read_csv(fn)
        df = pd.concat([df_old, df])
        df = df.drop_duplicates(subset=["timestamp"], keep="last")
    df.sort_values("timestamp").to_csv(fn, index=False)


session = requests.Session()

compra = get_compra(session)
consolidar(pd.DataFrame([compra]), COMPRA_FN)

venta = get_venta(session)
consolidar(pd.DataFrame(venta), VENTA_FN)
