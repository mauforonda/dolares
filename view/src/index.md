<link rel="stylesheet" href="style.css">

```js
import { drawPlot, displayObservation } from "./components/plot.js";

const default_cotizacion = "naive";
const stored_cotizacion = localStorage.getItem("tipo-cotizacion");
const selected_cotizacion = stored_cotizacion
  ? stored_cotizacion
  : default_cotizacion;

const input_cotizacion = Inputs.input(selected_cotizacion);
const tipo_cotizacion = Generators.input(input_cotizacion);
```

```js
const default_time = "30";
const stored_time = localStorage.getItem("timerange") || default_time;
```

```js
const tradeTypes = Inputs.radio(["buy", "sell"], {
  format: (d) => (d == "buy" ? "compra" : "venta"),
  value: "buy",
});
const tradeType = Generators.input(tradeTypes);

const texto_cotizaciones = (cotizacion) => {
  const opciones = {
    median: "mediana de todos los precios listados",
    vwap: "promedio ponderado por volumen",
    naive: `valor más frecuente en el 10% de ofertas más bajo (compra) o alto (venta)`,
  };
  return opciones[cotizacion];
};
```

```js
const github = "https://raw.githubusercontent.com/mauforonda/dolares/main";
const fileByTradeType = {
  buy: "compra",
  sell: "venta",
};
const oficialCutoff = "2026-06-29";

const parseDailyRate = (d) => ({
  timestamp: new Date(d.timestamp + "T00:00-04:00"),
  value: +d.value,
});

const referencialBcb = await d3.csv(
  `${github}/datos/referencial_bcb/${fileByTradeType[tradeType]}.csv`,
  parseDailyRate
);
const oficialNuevo = await d3.csv(
  `${github}/datos/oficial/${fileByTradeType[tradeType]}.csv`,
  parseDailyRate
);
const oficial = [
  ...referencialBcb.filter((d) => d.timestamp.toISOString().slice(0, 10) < oficialCutoff),
  ...oficialNuevo.filter((d) => d.timestamp.toISOString().slice(0, 10) >= oficialCutoff),
];

const oficialMap = new Map(
  oficial.map((o) => [o.timestamp.toISOString().slice(0, 10), o.value])
);
const oficialSeries = oficial
  .map((o) => ({
    date: o.timestamp.toISOString().slice(0, 10),
    value: o.value,
  }))
  .sort((a, b) => d3.ascending(a.date, b.date));
const oficialDateBisector = d3.bisector((d) => d.date).right;

function officialValueAtOrBefore(date) {
  const exact = oficialMap.get(date);
  if (exact !== undefined) return exact;
  const i = oficialDateBisector(oficialSeries, date) - 1;
  return i >= 0 ? oficialSeries[i].value : undefined;
}

function officialLabelAtOrBefore(date) {
  return date < oficialCutoff ? "Referencial" : "Oficial";
}

let data = await d3.csv(`${github}/datos/binance/${fileByTradeType[tradeType]}.csv`, d3.autoType);

data = data.map((d) => ({
  ...d,
  date: d.timestamp.toISOString().slice(0, 10),
}));

const total_days = new Set(
  data.map((d) => {
    const t = new Date(d.timestamp.getTime() - 4 * 3600e3);
    return t.toISOString().slice(0, 10);
  })
).size;
```

```js
const opcionesDias = {
  all: "todo",
  90: "3 meses",
  30: "1 mes",
  7: "1 semana",
  3: "3 días",
};
const timeRanges = Inputs.radio(Object.keys(opcionesDias), {
  format: (d) => opcionesDias[d],
  sort: (a, b) => {
    if (a === "all") return -1;
    if (b === "all") return 1;
    return Number(b) - Number(a);
  },
  value: stored_time,
});
const timeRangeKey = Generators.input(timeRanges);
```

```js
localStorage.setItem("timerange", timeRangeKey);
const timeRange = timeRangeKey === "all" ? total_days : Number(timeRangeKey);
```

```js
const dark = Generators.dark();
```

```js
const plot = drawPlot(data, oficial, width, tipo_cotizacion, timeRange, dark);
const observation = Generators.input(plot);
```

```js
const selected = observation ? observation : data.slice(-1)[0];
const plotHeader = displayObservation(
  selected,
  tipo_cotizacion,
  officialValueAtOrBefore(selected.date),
  officialLabelAtOrBefore(selected.date)
);
```

```js
function set(input, value) {
  input.value = value;
  input.dispatchEvent(new Event("input", { bubbles: true }));
}

function cambio_cotizacion(cotizacion) {
  const texto = texto_cotizaciones(cotizacion);
  const input_button = htl.html`<span class="cotizacion">${texto}</span>`;
  if (cotizacion == selected_cotizacion) {
    input_button.classList.add("selected");
  }
  input_button.onclick = () => {
    set(input_cotizacion, cotizacion);
    localStorage.setItem("tipo-cotizacion", cotizacion);
    document.querySelector(".selected").classList.remove("selected");
    input_button.classList.add("selected");
    document.querySelector("#cotizacionSeleccionada").textContent = texto;
  };
  return input_button;
}
```

<div id="titulo">Dólar en Bolivia</div>

<div id="opcionesCompraVenta">
    ${tradeTypes}
</div>

<div id="precioValor">
    ${plotHeader}
</div>

<div id="grafico" class="card">
    <div id="opcionesTiempo">
        ${timeRanges}
    </div>
    ${plot}
    <div id="graficoNota">
        <div id="cotizacionSeleccionada">
            ${texto_cotizaciones(selected_cotizacion)}
        </div>
    </div>
</div>

<div id="explicacion">
    <details>
        <summary>¿De dónde salen estos números?</summary>
        <div class="content">

El Banco Central de Bolivia [publica](https://www.bcb.gob.bo/) los tipos de cambio oficial y referencial como promedios ponderados de operaciones cambiarias en entidades financieras para días hábiles.

El tipo de cambio Binance se construye con las ofertas de USDT en el mercado Binance P2P para USDT por bolivianos. [Binance P2P](https://p2p.binance.com/en/trade/all-payments/USDT?fiat=BOB) es un mercado en internet donde la gente puede comprar y vender USDT, una criptomoneda cuya cotización simula el valor del dólar americano. El valor de USDT tiende a subir y bajar junto al valor del dólar en la calle. Cuando alguien quiere vender USDT por bolivianos, ingresa a Binance P2P y publica una oferta, que consiste en una cotización y un monto. Binance P2P lista docenas de ofertas todo el tiempo.

Sin embargo, este listado no incluye una cotización estimada de mercado o información de qué ofertas se toman efectivamente. Es sólo una lista de ofertas. Entonces ¿de dónde sale que 1 Dólar equivale a ${selected[tipo_cotizacion]} Bolivianos y cómo consolidar la información de este listado en un sólo valor referencial?

Ofrezco 3 opciones:

La ${cambio_cotizacion("median")}, que es una idea simple e intuitiva de la tendencia central en el mercado y equivale a Bs. ${selected.median}.

El ${cambio_cotizacion("vwap")}, que sería una estimación más correcta de la tendencia central ponderando cada precio listado por el monto que se ofrece ${selected.vwap ? "y equivale a Bs. " + selected.vwap : ""}.

Estas opciones son aproximaciones de la tendencia central en el mercado. Pero alguien que quiera comprar o vender dólares probablemente busca valores más extremos. La tercera opción es el ${cambio_cotizacion("naive")}. Este valor representa la cotización de una oferta que se tomaría fácilmente en el mercado ${selected.naive ? "y equivale a Bs. " + selected.naive : ""}.

Puedes utilizar todos estos datos como quieras desde [el repositorio](https://github.com/mauforonda/dolares/), que se actualiza cada 30 minutos, más o menos.

Por favor sólo utiliza estos números como una referencia.

</div>
</details></div><div class="center">🪴</div>

<div id="creditos">
    <div class="credito">
        <span><a href="https://p2p.binance.com/en/trade/all-payments/USDT?fiat=BOB" target="_blank">Binance P2P</a> + <a href="https://www.bcb.gob.bo/" target="_blank">BCB</a></span>
        <span class="creditoNota">fuentes</span>
    </div>
    <div>&</div>
    <div class="credito">
        <span><a href="https://mauforonda.github.io">Mauricio Foronda</a></span>
        <span class="creditoNota">creación</span>
    </div>
</div>
