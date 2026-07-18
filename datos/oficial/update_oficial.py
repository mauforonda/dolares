#!/usr/bin/env python

import re
import unicodedata
from datetime import datetime as dt
from io import StringIO
from pathlib import Path

import pandas as pd
import requests
from bs4 import BeautifulSoup

TABLA_URL = "https://www.bcb.gob.bo/tco_reporte_detalle_historico.php"
TABLA_SELECTOR = "table.matrix"

LANDING_URL = "https://www.bcb.gob.bo"
LANDING_SELECTORS = {
    "tco": ".is-tc-oficial .bcb-tco-num",
    "fecha": ".is-tc-oficial .bcb-kpi2-asof time",
    "tco_duo_fila": ".is-tc-oficial .bcb-tco-duo-row",
    "tco_duo_num": ".bcb-tco-duo-num",
    "tco_duo_fecha": ".bcb-tco-duo-label span",
}

TOTALES = {"total": "TOTAL", "tco": "TCO"}
TOTAL_BANCOS = "TOTAL BANCOS"
NORMALIZACIONES_TEXTO = {
    r"-": "",
}
VENTA_DIFERENCIAL = 0.10

COMPRAS_DETALLE_FN = "compras_detalle.csv"
BANCOS_DETALLE_FN = "bancos_detalle.csv"
COMPRA_FN = "compra.csv"
VENTA_FN = "venta.csv"
REDONDEO_COLUMNAS = {
    "cambio": 5,
    "value": 5,
    "monto": 0,
    "compras": 0,
}


def normalizar_nombres(texto):
    return (
        unicodedata.normalize("NFKD", texto.lower().replace(" ", "_"))
        .encode("ascii", "ignore")
        .decode("ascii")
    )


def normalizar_numeros(serie):
    normalizaciones = NORMALIZACIONES_TEXTO

    return pd.to_numeric(
        serie.astype(str)
        .str.strip()
        .replace(
            normalizaciones,
            regex=True,
        ),
        errors="coerce",
    ).fillna(0)


def normalizar_decimal(texto):
    return float(str(texto).strip().replace(".", "").replace(",", "."))


def codigo_meses():
    meses = [
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
    return {mes: i + 1 for i, mes in enumerate(meses)}


def normalizar_fecha_es(texto):
    texto = texto.lower()
    meses = codigo_meses()
    d = re.search(r"(\d{1,2})\s+de\s+(\w+),?\s+(?:de\s+)?(\d{4})", texto)
    if d is None:
        raise ValueError(f"No se pudo interpretar la fecha: {texto}")
    return dt(int(d.group(3)), meses[d.group(2)], int(d.group(1))).strftime("%Y-%m-%d")


def get_ultima_fecha_guardada(filename):
    fn = DATA_DIR / filename
    if not fn.exists():
        return None
    df = pd.read_csv(fn, parse_dates=["timestamp"])
    if df.empty:
        return None
    return df["timestamp"].max().strftime("%Y-%m-%d")


def consultar_fuente(session):

    def get_tabla_cruda(session):
        # Consultar fuente y extraer tabla cruda

        response = session.get(TABLA_URL)
        response.raise_for_status()
        html = BeautifulSoup(response.text, "html.parser")
        table = html.select(TABLA_SELECTOR)[0]
        df = pd.read_html(StringIO(str(table)), thousands=".", decimal=",")[0]
        return df

    def simplificar_tabla(df):
        # Simplificar tabla

        df = df.set_index(df.columns[0]).unstack().to_frame().reset_index()
        df.columns = ["banco", "tipo_valor", "cambio", "valor"]
        df = df.pivot(
            index=["banco", "cambio"],
            columns="tipo_valor",
            values="valor",
        ).reset_index()
        df.columns = ["banco", "cambio", "monto", "compras"]
        df["banco"] = df["banco"].map(normalizar_nombres)
        return df

    def normalizar_columnas_numeros(df):
        # Normalizar columnas de numeros

        for col in ["monto", "compras"]:
            df[col] = normalizar_numeros(df[col])
        return df

    df = get_tabla_cruda(session)
    df = simplificar_tabla(df)
    df = normalizar_columnas_numeros(df)
    return df


def fecha_iso(texto):
    if re.fullmatch(r"\d{4}-\d{2}-\d{2}", texto):
        return texto
    return normalizar_fecha_es(texto)


def consultar_landing(session):
    response = session.get(LANDING_URL)
    response.raise_for_status()
    html = BeautifulSoup(response.text, "html.parser")

    fila_manana = next(
        (
            fila
            for fila in html.select(LANDING_SELECTORS["tco_duo_fila"])
            if "mañana" in fila.get_text(" ", strip=True).lower()
        ),
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


def get_agregado_landing(timestamp, tco):
    return pd.DataFrame([{"timestamp": timestamp, "value": tco}])


def get_compras(df, timestamp):
    # Filtrar valores existentes por banco

    compras = df[
        (~df.cambio.isin(TOTALES.values()))
        & (df.compras > 0)
        & (df.banco != normalizar_nombres(TOTAL_BANCOS))
    ].copy()
    compras["timestamp"] = timestamp
    compras["cambio"] = compras["cambio"].astype(float)
    return compras[["timestamp", "banco", "cambio", "monto", "compras"]]


def get_bancos(compras, timestamp):
    # Estimar tipos de cambio por banco

    def procesar_banco(df, banco):
        banco_df = df[df.banco == banco].copy()
        existe = banco_df.monto.sum() > 0
        return {
            **{
                "banco": banco,
                "cambio": (banco_df["cambio"] * banco_df["monto"]).sum()
                / banco_df["monto"].sum()
                if existe
                else 0,
            },
            **banco_df[["monto", "compras"]].sum().to_dict(),
        }

    bancos = pd.DataFrame(
        [procesar_banco(compras, banco) for banco in compras.banco.unique()]
    )
    bancos["timestamp"] = timestamp
    return bancos[["timestamp", "banco", "cambio", "monto", "compras"]]


def get_cambio_oficial(bancos, timestamp):
    # Estimar el tipo de cambio oficial

    cambio_oficial = (bancos.monto * bancos.cambio).sum() / bancos.monto.sum()
    return pd.DataFrame([{"timestamp": timestamp, "value": cambio_oficial}])


def get_venta(compra):
    venta = compra.copy()
    venta["value"] = venta["value"] + VENTA_DIFERENCIAL
    return venta


def get_datos_detalle(df, timestamp):
    compras = get_compras(df, timestamp)
    bancos = get_bancos(compras, timestamp)
    compra = get_cambio_oficial(bancos, timestamp)
    venta = get_venta(compra)
    return compras, bancos, compra, venta


def misma_tabla_detalle(compras, ultima_fecha_detalle):
    if ultima_fecha_detalle is None:
        return False

    fn = DATA_DIR / COMPRAS_DETALLE_FN
    if not fn.exists():
        return False

    anterior = pd.read_csv(fn)
    anterior = anterior[anterior["timestamp"] == ultima_fecha_detalle]
    if anterior.empty:
        return False

    def normalizar(df):
        columnas = ["banco", "cambio", "monto", "compras"]
        df = df[columnas].copy()
        df["cambio"] = df["cambio"].round(5)
        df["monto"] = df["monto"].round(0).astype("Int64")
        df["compras"] = df["compras"].round(0).astype("Int64")
        return df.sort_values(columnas).reset_index(drop=True)

    return normalizar(compras).equals(normalizar(anterior))


def detalle_coincide_con_landing(compra, tco_landing):
    tco_detalle = float(compra.iloc[0]["value"])
    return round(tco_detalle, 2) == round(tco_landing, 2)


def detalle_listo(compras, compra, tco_landing, ultima_fecha_detalle):
    if not detalle_coincide_con_landing(compra, tco_landing):
        return False
    if misma_tabla_detalle(compras, ultima_fecha_detalle):
        return False
    return True


def consolidar(df, filename, subset):
    df = df.copy()

    fn = Path(DATA_DIR / filename)
    if fn.exists():
        df_old = pd.read_csv(fn)
        df = pd.concat([df_old, df])
    df = df.drop_duplicates(subset=subset, keep="last")
    for col, decimales in REDONDEO_COLUMNAS.items():
        if col in df:
            df[col] = df[col].round(decimales)
    for col in ["monto", "compras"]:
        if col in df:
            df[col] = df[col].astype("Int64")
    df.sort_values(subset).to_csv(fn, index=False)


DATA_DIR = Path(__file__).parent


def main():
    session = requests.Session()

    # El landing publica primero el TCO oficial y define la fecha canónica.
    timestamp_landing, tco_landing = consultar_landing(session)
    ultima_fecha_agregado = get_ultima_fecha_guardada(COMPRA_FN)
    ultima_fecha_detalle = get_ultima_fecha_guardada(COMPRAS_DETALLE_FN)

    agregado_nuevo = (
        ultima_fecha_agregado is None or timestamp_landing > ultima_fecha_agregado
    )
    detalle_pendiente = (
        ultima_fecha_detalle is None or timestamp_landing > ultima_fecha_detalle
    )

    if not agregado_nuevo and not detalle_pendiente:
        print(f"Sin datos nuevos. El landing del BCB tiene fecha {timestamp_landing}")
        return

    if agregado_nuevo:
        compra = get_agregado_landing(timestamp_landing, tco_landing)
        venta = get_venta(compra)
        consolidar(compra, COMPRA_FN, ["timestamp"])
        consolidar(venta, VENTA_FN, ["timestamp"])

    if not detalle_pendiente:
        return

    # La tabla detallada puede publicarse horas después. Solo la usamos si ya
    # coincide con el landing y cambió respecto al último detalle guardado.
    df = consultar_fuente(session)
    compras, bancos, compra, venta = get_datos_detalle(df, timestamp_landing)
    if not detalle_listo(compras, compra, tco_landing, ultima_fecha_detalle):
        print(f"Detalle pendiente para {timestamp_landing}; se conserva el landing")
        return

    consolidar(compras, COMPRAS_DETALLE_FN, ["timestamp", "banco", "cambio"])
    consolidar(bancos, BANCOS_DETALLE_FN, ["timestamp", "banco"])
    consolidar(compra, COMPRA_FN, ["timestamp"])
    consolidar(venta, VENTA_FN, ["timestamp"])


if __name__ == "__main__":
    main()
