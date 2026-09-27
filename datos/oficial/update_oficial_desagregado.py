#!/usr/bin/env python

"""Actualiza las operaciones desagregadas del TCO oficial del BCB.

Las fechas guardadas son las fechas de corte de las transacciones, no las
fechas de vigencia del TCO que se publican en la portada.
"""

import argparse
import re
import unicodedata
from datetime import datetime as dt
from io import StringIO
from pathlib import Path

import pandas as pd
import requests
from bs4 import BeautifulSoup

TABLA_URL = "https://www.bcb.gob.bo/bcb_tco_publico_detalle_historico.php"
TABLA_SELECTOR = "table.matrix"
FECHA_SELECTOR = ".vrd-date-info"
COMPRAS_DETALLE_FN = "compras_detalle.csv"
BANCOS_DETALLE_FN = "bancos_detalle.csv"
TOTALES = {"TOTAL", "TCO"}
TOTAL_BANCOS = "total_bancos"
REDONDEO_COLUMNAS = {"cambio": 5, "monto": 0, "compras": 0}
DATA_DIR = Path(__file__).parent


def normalizar_nombres(texto):
    return (unicodedata.normalize("NFKD", texto.lower().replace(" ", "_"))
            .encode("ascii", "ignore").decode("ascii"))


def normalizar_numeros(serie):
    return pd.to_numeric(
        serie.astype(str).str.strip().replace({r"-": ""}, regex=True), errors="coerce"
    ).fillna(0)


def normalizar_fecha_es(texto):
    meses = {
        "enero": 1, "febrero": 2, "marzo": 3, "abril": 4, "mayo": 5,
        "junio": 6, "julio": 7, "agosto": 8, "septiembre": 9,
        "octubre": 10, "noviembre": 11, "diciembre": 12,
    }
    fecha = re.search(r"(\d{1,2})\s+de\s+(\w+)\s+de\s+(\d{4})", texto.lower())
    if fecha is None:
        raise ValueError(f"No se pudo interpretar la fecha de corte: {texto}")
    return dt(int(fecha.group(3)), meses[fecha.group(2)], int(fecha.group(1))).strftime("%Y-%m-%d")


def fecha_de_corte(html):
    info = html.select_one(FECHA_SELECTOR)
    if info is None:
        raise ValueError("No se encontró la fecha de corte en el reporte")
    fecha = re.search(r"Fecha de corte:\s*(.+?)(?=\s*Vigencia:|$)", info.get_text(" ", strip=True))
    if fecha is None:
        raise ValueError("No se encontró el texto de fecha de corte en el reporte")
    return normalizar_fecha_es(fecha.group(1))


def consultar_fuente(session, fecha=None):
    response = session.get(TABLA_URL, params={"fecha": fecha} if fecha else None)
    response.raise_for_status()
    html = BeautifulSoup(response.text, "html.parser")
    tabla = html.select_one(TABLA_SELECTOR)
    if tabla is None:
        raise ValueError("No se encontró la tabla desagregada del BCB")
    raw = pd.read_html(StringIO(str(tabla)), thousands=".", decimal=",")[0]
    df = raw.set_index(raw.columns[0]).unstack().to_frame().reset_index()
    df.columns = ["banco", "tipo_valor", "cambio", "valor"]
    df = df.pivot(index=["banco", "cambio"], columns="tipo_valor", values="valor").reset_index()
    df.columns = ["banco", "cambio", "monto", "compras"]
    df["banco"] = df["banco"].map(normalizar_nombres)
    for columna in ["monto", "compras"]:
        df[columna] = normalizar_numeros(df[columna])
    return fecha_de_corte(html), df


def get_compras(df, timestamp):
    compras = df[(~df.cambio.isin(TOTALES)) & (df.compras > 0) & (df.banco != TOTAL_BANCOS)].copy()
    compras["timestamp"] = timestamp
    compras["cambio"] = compras["cambio"].astype(float)
    return compras[["timestamp", "banco", "cambio", "monto", "compras"]]


def get_bancos(compras, timestamp):
    def procesar_banco(banco):
        banco_df = compras[compras.banco == banco]
        monto = banco_df.monto.sum()
        return {
            "timestamp": timestamp, "banco": banco,
            "cambio": (banco_df.cambio * banco_df.monto).sum() / monto if monto else 0,
            "monto": monto, "compras": banco_df.compras.sum(),
        }
    return pd.DataFrame([procesar_banco(banco) for banco in compras.banco.unique()])


def consolidar(df, filename, subset):
    fn = DATA_DIR / filename
    if fn.exists():
        df = pd.concat([pd.read_csv(fn), df])
    df = df.drop_duplicates(subset=subset, keep="last")
    for columna, decimales in REDONDEO_COLUMNAS.items():
        df[columna] = df[columna].round(decimales)
    df[["monto", "compras"]] = df[["monto", "compras"]].astype("Int64")
    df.sort_values(subset).to_csv(fn, index=False)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--fecha", help="fecha YYYY-MM-DD; por defecto, el último reporte")
    args = parser.parse_args()
    if args.fecha and not re.fullmatch(r"\d{4}-\d{2}-\d{2}", args.fecha):
        parser.error("--fecha debe usar el formato YYYY-MM-DD")
    with requests.Session() as session:
        timestamp, df = consultar_fuente(session, args.fecha)
    if args.fecha and timestamp != args.fecha:
        print(
            f"No hay reporte con fecha de corte {args.fecha}; "
            f"el BCB devolvió el último corte disponible ({timestamp})."
        )
        return
    compras = get_compras(df, timestamp)
    bancos = get_bancos(compras, timestamp)
    consolidar(compras, COMPRAS_DETALLE_FN, ["timestamp", "banco", "cambio"])
    consolidar(bancos, BANCOS_DETALLE_FN, ["timestamp", "banco"])
    print(f"Desagregados actualizados para corte {timestamp}: {len(compras)} tipos y {len(bancos)} bancos")


if __name__ == "__main__":
    main()
