<link rel="stylesheet" href="style.css">

```js
import { drawPlot, displayObservation } from "./components/plot.js";
const default_cotizacion = "median";
const input_cotizacion = Inputs.input(default_cotizacion);
const tipo_cotizacion = Generators.input(input_cotizacion);
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
const plot = drawPlot(data, width, tipo_cotizacion);
const observation = Generators.input(plot);
```

```js
const selected = observation ? observation : data.slice(-1)[0];
const plotHeader = displayObservation(selected, tipo_cotizacion);
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

function cambio_cotizacion(texto, cotizacion) {
    const input_button = htl.html`<span class="cotizacion">${texto}</span>`;
    if (cotizacion == default_cotizacion) {input_button.classList.add("selected")};
    input_button.onclick = () => {
        set(input_cotizacion, cotizacion);
        document.querySelector(".selected").classList.remove("selected");
        input_button.classList.add("selected")
    }
    return input_button;
}
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

<div class="description">
    <details open>
        <summary>¿De dónde salen estos números?</summary>
        <div class="content">

[Binance P2P](https://p2p.binance.com/en/trade/all-payments/USDT?fiat=BOB) es un mercado en internet donde la gente puede comprar y vender USDT, una criptomoneda cuya cotización simula el valor del dólar americano. El valor de USDT tiende a subir y bajar junto al valor del dólar en la calle. Cuando alguien quiere vender USDT por bolivianos, ingresa a Binance P2P y publica una oferta, que consiste en una cotización y un monto. Binance P2P lista docenas de ofertas todo el tiempo.

Sin embargo, este listado no incluye una cotización estimada de mercado o información de qué ofertas se toman efectivamente. Es sólo una lista de ofertas. Entonces ¿de dónde sale que 1 Dólar equivale a ${selected[tipo_cotizacion]} Bolivianos? ¿Cómo consolidar la información de este listado en un sólo valor referencial?

Ofrezco 3 opciones:

${cambio_cotizacion("La mediana de todos los precios listados", "median")}</span>, que es una idea simple e intuitiva de la tendencia central en el mercado. Es el precio que muestro por defecto y equivale a Bs. ${selected.median}.

${cambio_cotizacion("El promedio ponderado por volumen", "vwap")}, que sería una estimación más correcta de la tendencia central ponderando cada precio listado por el monto que se ofrece. ${selected.vwap ? "Equivale a Bs. " + selected.vwap + "." : ""}

Estas opciones son aproximaciones de la tendencia central en el mercado. Pero alguien que quiera comprar o vender dólares probablemente busca valores más extremos. La tercera opción es ${cambio_cotizacion("el valor más frecuente en el 10% de ofertas más " + (tradeType == "buy" ? "bajas (para compra)" : "altas (para venta)"), "naive")}. Este valor representa la cotización de una oferta que se tomaría fácilmente en el mercado ${selected.naive ? "y equivale a Bs. " + selected.naive : ""}.

Comencé a estimar cada opción desde un momento distinto. Primero la mediana, luego el promedio ponderado y finalmente el valor extremo. Junto a estas estimaciones recojo el precio mínimo y máximo que se ofrece en el mercado. Puedes utilizar todos estos datos como quieras desde [el repositorio](https://github.com/mauforonda/dolares/), que se actualiza cada 30 minutos, más o menos. 

Usualmente todo sale bien, pero a veces también meto la pata. ¿Notas un salto extraño en los precios de compra entre el 16 y 17 de agosto? Ahí introduje un error en el código que contaminó datos por 12 horas, los cuales luego borré. Por favor sólo utiliza estos números como una referencia.
        </div>
    </details></div><div class="center">🪴</div>
<div class="sources">
    <div class="source">
        <span><a href="https://p2p.binance.com/en/trade/all-payments/USDT?fiat=BOB" target="_blank">Binance P2P</a></span>
        <span class="annotation">fuente</span>
    </div>
    <div>&</div>
    <div class="source">
        <span><a href="mailto:mauriforonda@gmail.com">Mauricio Foronda</a></span>
        <span class="annotation">creación</span>
    </div>
</div>
