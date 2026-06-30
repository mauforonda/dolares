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
}
MUESTRA_BANCOS_VALIDACION = 5

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


def get_fecha(html):
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

    texto = html.select_one(".vrd-date-info").get_text(" ", strip=True)
    meses = codigo_meses()
    d = re.search(r"(\d{1,2})\s+de\s+(\w+)\s+de\s+(\d{4})", texto)
    return dt(int(d.group(3)), meses[d.group(2)], int(d.group(1))).strftime("%Y-%m-%d")


def consultar_fuente(session):

    def get_tabla_cruda(session):
        # Consultar fuente y extraer tabla cruda

        response = session.get(TABLA_URL)
        response.raise_for_status()
        html = BeautifulSoup(response.text, "html.parser")
        table = html.select(TABLA_SELECTOR)[0]
        df = pd.read_html(StringIO(str(table)), thousands=".", decimal=",")[0]
        return html, df

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

    html, df = get_tabla_cruda(session)
    timestamp = get_fecha(html)
    df = simplificar_tabla(df)
    df = normalizar_columnas_numeros(df)
    return timestamp, df


def validar_novedad(session, df):

    def consultar_landing(session):
        response = session.get(LANDING_URL)
        response.raise_for_status()
        html = BeautifulSoup(response.text, "html.parser")
        tco = html.select_one(LANDING_SELECTORS.get("tco"))
        fecha = html.select_one(LANDING_SELECTORS.get("fecha"))
        if tco is None:
            raise ValueError(
                f"No se encontro el selector de TCO en el landing: "
                f"{LANDING_SELECTORS.get('tco')}"
            )
        if fecha is None:
            raise ValueError(
                f"No se encontro el selector de fecha en el landing: "
                f"{LANDING_SELECTORS.get('fecha')}"
            )
        if not fecha.get("datetime"):
            raise ValueError(
                f"El selector de fecha no tiene atributo datetime: "
                f"{LANDING_SELECTORS.get('fecha')}"
            )
        return fecha["datetime"], normalizar_decimal(tco.get_text(strip=True))

    def get_ultima_fecha_guardada():
        fn = DATA_DIR / COMPRA_FN
        if not fn.exists():
            return None
        df = pd.read_csv(fn, parse_dates=["timestamp"])
        if df.empty:
            return None
        return df["timestamp"].max().strftime("%Y-%m-%d")

    def get_tco_tabla(df):
        total_bancos = normalizar_nombres(TOTAL_BANCOS)
        tco = df[
            (df["banco"] == total_bancos)
            & (df["cambio"].astype(str).str.upper() == TOTALES["tco"])
        ]
        if tco.empty:
            raise ValueError("No se encontro TOTAL BANCOS / TCO en la tabla")
        return float(tco.iloc[0]["monto"])

    def validar_montos_bancos(df, ultima_fecha):
        fn = DATA_DIR / BANCOS_DETALLE_FN
        if ultima_fecha is None or not fn.exists():
            return True

        anterior = pd.read_csv(fn)
        anterior = anterior[anterior["timestamp"] == ultima_fecha]
        if anterior.empty:
            return True

        compras = get_compras(df, ultima_fecha)
        actual = get_bancos(compras, ultima_fecha)
        comparacion = anterior[["banco", "monto"]].merge(
            actual[["banco", "monto"]],
            on="banco",
            suffixes=("_anterior", "_actual"),
        )
        if comparacion.empty:
            return False

        muestra = comparacion.sort_values("banco").head(MUESTRA_BANCOS_VALIDACION)
        return (muestra["monto_anterior"] != muestra["monto_actual"]).all()

    # Consulta el tipo de cambio en el landing del BCB
    timestamp_landing, tco_landing = consultar_landing(session)

    # La fecha de este tipo debe ser mayor a la última fecha que guardamos
    # i.e. hay un nuevo dato
    ultima_fecha = get_ultima_fecha_guardada()
    if ultima_fecha is not None and timestamp_landing <= ultima_fecha:
        return False, timestamp_landing

    # El tipo en el landing debe ser igual al tipo en la nueva tabla que acabamos de consultar
    # i.e. la tabla disponible desagrega este nuevo dato
    tco_tabla = get_tco_tabla(df)
    if round(tco_tabla, 2) != round(
        tco_landing,
        2,
    ):
        return False, timestamp_landing

    # Una muestra de montos por banco en esta nueva tabla no coincide con la última fecha que guardamos
    # i.e. la tabla disponible es realmente nueva
    if not validar_montos_bancos(df, ultima_fecha):
        return False, timestamp_landing

    return True, timestamp_landing


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

    # Consultamos la tabla de tipos y montos
    _, df = consultar_fuente(session)

    # Validamos que corresponda a nuevos datos y encontramos la fecha a la que corresponden
    es_nuevo, timestamp = validar_novedad(session, df)
    if not es_nuevo:
        print(f"Sin datos nuevos. El landing del BCB tiene datos para el {timestamp}")
        return

    # Extraemos los datos que necesitamos
    compras = get_compras(df, timestamp)
    bancos = get_bancos(compras, timestamp)
    compra = get_cambio_oficial(bancos, timestamp)
    venta = get_venta(compra)

    # Los guardamos
    consolidar(compras, COMPRAS_DETALLE_FN, ["timestamp", "banco", "cambio"])
    consolidar(bancos, BANCOS_DETALLE_FN, ["timestamp", "banco"])
    consolidar(compra, COMPRA_FN, ["timestamp"])
    consolidar(venta, VENTA_FN, ["timestamp"])


if __name__ == "__main__":
    main()
