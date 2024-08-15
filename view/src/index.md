<link rel="stylesheet" href="style.css">

```js
import { drawPlot, displayObservation } from "./components/plot.js";
const param = new URLSearchParams(window.location.search).get("precio");
const campo_precio =
    param && ["median", "vwap", "naive"].includes(param) ? param : "median";
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
```

```js
const github = "https://raw.githubusercontent.com/mauforonda/dolares/main";
const data = d3.csv(`${github}/${tradeType}.csv`, d3.autoType);
```

```js
const plot = drawPlot(data, width, campo_precio);
const observation = Generators.input(plot);
```

```js
const selected = observation ? observation : data.slice(-1)[0];
const plotHeader = displayObservation(selected, campo_precio);
```

```js
const bolivianosInitiate = Inputs.input(100);
const bolivianosInput = Inputs.bind(
    htl.html`<input type=number style="width: 80px;">`,
    bolivianosInitiate
);
const bolivianos = Generators.input(bolivianosInput);
```

<div class="title">Dólar en Bolivia</div>

<div class="options">
    ${tradeTypes}
</div>

<div class="plotHeader">
    ${plotHeader}
</div>

<div class="card">
    ${plot}
</div>

<div class="explainer">
    <div>
        Bs. ${bolivianosInput}
        <span> equivalen a </span>
        <span class="underlined">${ bolivianos ? d3.format(".2f")(bolivianos / selected[campo_precio]) : "🤷" } Dólares</span>,
    </div>
    <div>
        <span>que al tipo de cambio oficial serían</span>
        <span class="underlined">${bolivianos ? d3.format(".2f")(bolivianos / officialRates[tradeType]) : "🤷" } Dólares</span>.
    </div>
    <div>
        <span>Una devaluación del </span>
        <span class="underlined">${(d3.format(".2%")(1 - (officialRates[tradeType] / selected[campo_precio])))}</span>.
    </div>
</div>

<div class="source">
    <div>
        <span><a href="https://p2p.binance.com/en/trade/all-payments/USDT?fiat=BOB" target="_blank">Binance P2P</a></span>
        <span class="annotation">fuente</span>
    </div>
    <div>&</div>
    <div>
        <span><a href="mailto:mauriforonda@gmail.com">Mauricio Foronda</a></span>
        <span class="annotation">creación</span>
    </div>
</div>
