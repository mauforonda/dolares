---
theme: dashboard
---

<link rel="stylesheet" href="style.css">

```js
import { drawPlot, displayObservation } from "./components/plot.js";
```

```js
const tradeTypes = Inputs.radio(["buy", "sell"], {
    format: d => d == "buy" ? "compra" : "venta",
    value: "buy"
})
const tradeType = Generators.input(tradeTypes)
```

```js
const github = "https://raw.githubusercontent.com/mauforonda/dolares/main";
const data = d3.csv(`${github}/${tradeType}.csv`, d3.autoType);
```

```js
const plot = drawPlot(data, width);
const observation = Generators.input(plot);
```

```js
const lastObservation = displayObservation(data.slice(-1)[0]);
const plotHeader = observation
    ? displayObservation(observation)
    : lastObservation;
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