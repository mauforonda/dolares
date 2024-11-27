<link rel="stylesheet" href="style.css">

```js
import { drawPlot, displayObservation } from "./components/plot.js";

const default_cotizacion = "median";
const stored_cotizacion = localStorage.getItem("tipo-cotizacion");
const selected_cotizacion = stored_cotizacion
    ? stored_cotizacion
    : default_cotizacion;

const input_cotizacion = Inputs.input(selected_cotizacion);
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
const data = d3.csv(`${github}/${tradeType}.csv`, d3.autoType);
```

```js
const opcionesDias = {
    "1e6": "todo",
    // 180: "6 meses",
    90: "3 meses",
    30: "1 mes",
    7: "1 semana",
};
const timeRanges = Inputs.radio(Object.keys(opcionesDias), {
    format: (d) => opcionesDias[d],
    sort: (a, b) => {
        return Number(b) - Number(a);
    },
    value: "30",
});
const timeRange = Generators.input(timeRanges);
```

```js
const plot = drawPlot(data, width, tipo_cotizacion, timeRange);
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
    <details open>
        <summary>¿De dónde salen estos números?</summary>
        <div class="content">

[Binance P2P](https://p2p.binance.com/en/trade/all-payments/USDT?fiat=BOB) es un mercado en internet donde la gente puede comprar y vender USDT, una criptomoneda cuya cotización simula el valor del dólar americano. El valor de USDT tiende a subir y bajar junto al valor del dólar en la calle. Cuando alguien quiere vender USDT por bolivianos, ingresa a Binance P2P y publica una oferta, que consiste en una cotización y un monto. Binance P2P lista docenas de ofertas todo el tiempo.

Sin embargo, este listado no incluye una cotización estimada de mercado o información de qué ofertas se toman efectivamente. Es sólo una lista de ofertas. Entonces ¿de dónde sale que 1 Dólar equivale a ${selected[tipo_cotizacion]} Bolivianos? ¿Cómo consolidar la información de este listado en un sólo valor referencial?

Ofrezco 3 opciones:

La ${cambio_cotizacion("median")}, que es una idea simple e intuitiva de la tendencia central en el mercado. Es el precio que muestro por defecto y equivale a Bs. ${selected.median}.

El ${cambio_cotizacion("vwap")}, que sería una estimación más correcta de la tendencia central ponderando cada precio listado por el monto que se ofrece. ${selected.vwap ? "Equivale a Bs. " + selected.vwap + "." : ""}

Estas opciones son aproximaciones de la tendencia central en el mercado. Pero alguien que quiera comprar o vender dólares probablemente busca valores más extremos. La tercera opción es el ${cambio_cotizacion("naive")}. Este valor representa la cotización de una oferta que se tomaría fácilmente en el mercado ${selected.naive ? "y equivale a Bs. " + selected.naive : ""}.

Comencé a estimar cada opción desde un momento distinto. Primero la mediana, luego el promedio ponderado y finalmente el valor extremo. Junto a estas estimaciones recojo el precio mínimo y máximo que se ofrece en el mercado. Puedes utilizar todos estos datos como quieras desde [el repositorio](https://github.com/mauforonda/dolares/), que se actualiza cada 30 minutos, más o menos.

Usualmente todo sale bien, pero a veces también meto la pata. ¿Notas un salto extraño en los precios de compra entre el 16 y 17 de agosto? Ahí introduje un error en el código que contaminó datos por 12 horas, los cuales luego borré. Por favor sólo utiliza estos números como una referencia.

</div>
</details></div><div class="center">🪴</div>

<div id="creditos">
    <div class="credito">
        <span><a href="https://p2p.binance.com/en/trade/all-payments/USDT?fiat=BOB" target="_blank">Binance P2P</a></span>
        <span class="creditoNota">fuente</span>
    </div>
    <div>&</div>
    <div class="credito">
        <span><a href="mailto:mauriforonda@gmail.com">Mauricio Foronda</a></span>
        <span class="creditoNota">creación</span>
    </div>
</div>
