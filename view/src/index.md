<link rel="stylesheet" href="style.css">

```js
import { drawPlot, displayObservation } from "./components/plot.js";

const default_cotizacion = "vwap";
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
const officialRates = {
  buy: 6.86,
  sell: 6.96,
};

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

const oficial = await d3.csv(`${github}/datos/referencial_bcb/${fileByTradeType[tradeType]}.csv`, (d) => ({
  timestamp: new Date(d.timestamp + "T00:00-04:00"),
  value: +d.value,
}));

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
  officialValueAtOrBefore(selected.date)
);
```

```js
const bolivianosInitiate = Inputs.input(100);
const bolivianosInput = Inputs.bind(
  htl.html`<input type=number style="width: 80px;">`,
  bolivianosInitiate
);
const bolivianos = Generators.input(bolivianosInput);
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

<div id="devaluacion">
    <div>
        Bs. ${bolivianosInput}
        <span> equivalen a </span>
        <span class="underlined">${ bolivianos ? d3.format(".2f")(bolivianos / selected[tipo_cotizacion]) : "🤷" } Dólares</span>,
    </div>
    <div>
        <span>que al tipo de cambio oficial serían</span>
        <span class="underlined">${bolivianos ? d3.format(".2f")(bolivianos / officialRates[tradeType]) : "🤷" } Dólares</span>.
    </div>
    <div>
        <span>Una devaluación del </span>
        <span class="underlined">${(d3.format(".2%")(1 - (officialRates[tradeType] / selected[tipo_cotizacion])))}</span>.
    </div>
</div>

<div id="explicacion">
    <details>
        <summary>¿De dónde salen estos números?</summary>
        <div class="content">

[Binance P2P](https://p2p.binance.com/en/trade/all-payments/USDT?fiat=BOB) es un mercado en internet donde la gente puede comprar y vender USDT, una criptomoneda cuya cotización simula el valor del dólar americano. El valor de USDT tiende a subir y bajar junto al valor del dólar en la calle. Cuando alguien quiere vender USDT por bolivianos, ingresa a Binance P2P y publica una oferta, que consiste en una cotización y un monto. Binance P2P lista docenas de ofertas todo el tiempo.

Sin embargo, este listado no incluye una cotización estimada de mercado o información de qué ofertas se toman efectivamente. Es sólo una lista de ofertas. Entonces ¿de dónde sale que 1 Dólar equivale a ${selected[tipo_cotizacion]} Bolivianos? ¿Cómo consolidar la información de este listado en un sólo valor referencial?

Ofrezco 3 opciones:

La ${cambio_cotizacion("median")}, que es una idea simple e intuitiva de la tendencia central en el mercado y equivale a Bs. ${selected.median}.

El ${cambio_cotizacion("vwap")}, que sería una estimación más correcta de la tendencia central ponderando cada precio listado por el monto que se ofrece. Es el precio que muestro por defecto ${selected.vwap ? "y equivale a Bs. " + selected.vwap : ""}.

Estas opciones son aproximaciones de la tendencia central en el mercado. Pero alguien que quiera comprar o vender dólares probablemente busca valores más extremos. La tercera opción es el ${cambio_cotizacion("naive")}. Este valor representa la cotización de una oferta que se tomaría fácilmente en el mercado ${selected.naive ? "y equivale a Bs. " + selected.naive : ""}.

Finalmente, el 1 de diciembre de 2025 el Banco Central de Bolivia [comenzó a publicar](https://www.bcb.gob.bo/webdocs/files_noticias/COMUNICADO%20DE%20PRENSA%20BCB_DIC_ok.pdf) el _valor referencial del dólar estadounidense_ para compra y venta. El valor de compra representa el promedio ponderado del tipo de cambio en operaciones entre entidades de intermediación financiera y sus clientes mayoristas. Y el valor de venta es el tipo de cambio máximo que estas entidades cobran en operaciones con el exterior. Estos valores se deberían publicar diariamente en la página del Banco Central.

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
