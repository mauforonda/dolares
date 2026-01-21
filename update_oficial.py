#!/usr/bin/env python

import requests
import pandas as pd
from bs4 import BeautifulSoup
import re
from datetime import datetime as dt
import unicodedata
from pathlib import Path
from numpy import nan

COMPRA_FN_COTIZACION = "buy_oficial.csv"
COMPRA_FN_MONTO = "buy_oficial_monto.csv"
VENTA_FN = "sell_oficial.csv"


def normalize(texto, to_float=False):
    if to_float:
        if "-" in texto or "—" in texto:
            return nan
        else:
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
        bancos = html.select(".cell-text")
        valores = html.select(".cell-value")
        cotizaciones = [valores[i - 1] for i in range(1, len(valores) + 1, 2)]
        montos = [valores[i] for i in range(1, len(valores) + 1, 2)]

        cotizaciones_por_banco = {
            normalize(banco.get_text()): normalize(i.get_text(), True)
            for banco, i in zip(bancos, cotizaciones)
        }

        montos_por_banco = {
            normalize(banco.get_text()): normalize(i.get_text().replace(".", ""), True)
            for banco, i in zip(bancos, montos)
        }

        return [cotizaciones_por_banco, montos_por_banco]

    def get_promedio(html):
        return normalize(html.select(".average-value")[0].get_text(), True)

    def get_total(html):
        return normalize(
            html.select(".average-value")[1].get_text().replace(".", ""), True
        )

    URL = "https://www.bcb.gob.bo/valor_referencial_compra_svg.php"

    r = session.get(URL)
    html = BeautifulSoup(r.text, "xml")

    fecha = get_fecha(html)
    cotizaciones, montos = get_cotizaciones(html)
    promedio = get_promedio(html)
    total = get_total(html)

    return [
        {"timestamp": fecha, **cotizaciones, "value": promedio},
        {"timestamp": fecha, **montos, "value": total},
    ]


def get_venta(session):
    def get_cotizaciones(
        html, selector_text=".cell-text", selector_value=".cell-value"
    ):
        def get_fecha(texto):
            d = re.search(r"(\d{1,2})\s+de\s+(\w+)\s+de\s+(\d{4})", texto)
            return dt(int(d.group(3)), meses[d.group(2)], int(d.group(1))).strftime(
                "%Y-%m-%d"
            )

        return [
            {
                "timestamp": get_fecha(fecha.get_text()),
                "value": normalize(cotizacion.get_text(), True),
            }
            for fecha, cotizacion in zip(
                html.select(selector_text), html.select(selector_value)
            )
        ]

    URL = "https://www.bcb.gob.bo/valor_referencial_venta_svg.php"
    r = session.get(URL)
    html = BeautifulSoup(r.text, "xml")
    meses = codigo_meses(False)
    cotizaciones = []
    for s in [
        {"text": ".cell-text", "value": ".cell-value"},
        {"text": ".cell-text--highlight", "value": ".cell-value--highlight"},
    ]:
        cotizaciones.extend(get_cotizaciones(html, s["text"], s["value"]))
    return cotizaciones


def consolidar(df, filename):
    fn = Path(filename)
    if fn.exists():
        df_old = pd.read_csv(fn)
        df = pd.concat([df_old, df])
        df = df.drop_duplicates(subset=["timestamp"], keep="last")
    df.sort_values("timestamp").to_csv(fn, index=False)


session = requests.Session()

compra = get_compra(session)

compra_cotizacion, compra_monto = get_compra(session)
consolidar(pd.DataFrame([compra_cotizacion]), COMPRA_FN_COTIZACION)
consolidar(pd.DataFrame([compra_monto]), COMPRA_FN_MONTO)

venta = get_venta(session)
consolidar(pd.DataFrame(venta), VENTA_FN)
