import * as Plot from "@observablehq/plot";

const BANK_NAMES = {
  banco_bisa: "BISA",
  banco_de_credito: "Banco de Crédito",
  banco_de_la_nacion_argentina: "Banco de la Nación Argentina",
  banco_economico: "Banco Económico",
  banco_fie: "Banco FIE",
  banco_fortaleza: "Banco Fortaleza",
  banco_ganadero: "Banco Ganadero",
  banco_mercantil_santa_cruz: "Banco Mercantil Santa Cruz",
  banco_pyme_de_la_comunidad: "Banco PyME de la Comunidad",
  banco_solidario: "Banco Solidario",
  banco_union: "Banco Unión",
};

export function mount(element, { bankRates, officialRates }) {
  const date = bankRates[0].date;
  const officialRate = officialRates.find((rate) => rate.date === date).value;
  const rates = bankRates.toSorted((a, b) => a.value - b.value);
  const maxRate = rates.at(-1).value;
  const banks = rates.map((rate) => rate.bank);
  const rowHeight = Number.parseFloat(
    getComputedStyle(element).getPropertyValue("--bank-row-height"),
  );
  const height = banks.length * rowHeight;
  const rateLabel = {
    x: officialRate,
    y: "bank",
    text: (rate) => rate.value.toFixed(2),
    dx: -6,
    textAnchor: "end",
    fontSize: 10,
    fill: "var(--ink)",
  };
  const bankLabel = {
    x: officialRate,
    y: "bank",
    text: (rate) => BANK_NAMES[rate.bank],
    dx: 6,
    textAnchor: "start",
    fontSize: 10,
    fill: "var(--ink)",
  };
  let width = 0;
  let disposed = false;

  function render() {
    if (!width || disposed) return;

    const plot = Plot.plot({
      width,
      height,
      marginBottom: 5,
      marginLeft: 42,
      marginRight: 10,
      marginTop: 0,
      x: {
        axis: null,
        domain: [Math.min(officialRate, rates[0].value), maxRate],
      },
      y: {
        axis: null,
        domain: banks,
        padding: 0.5,
      },
      marks: [
        Plot.ruleX(
          [
            {
              rate: officialRate,
              topBank: banks[0],
              bottomBank: banks.at(-1),
            },
          ],
          {
            x: "rate",
            y1: "topBank",
            y2: "bottomBank",
            dy: 10,
            stroke: "var(--official)",
            strokeDasharray: "2,2",
          },
        ),
        Plot.ruleY(rates, {
          y: "bank",
          x1: officialRate,
          x2: "value",
          stroke: "url(#bank-rate-gradient)",
          strokeWidth: 2,
          strokeOpacity: 0.5,
          dy: 10,
        }),
        Plot.dot(rates, {
          x: "value",
          y: "bank",
          dy: 10,
          r: 2.5,
          fill: "var(--binance)",
        }),
        Plot.text(rates, { ...rateLabel, opacity: 0.3 }),
        Plot.text(rates, Plot.pointerY({ ...rateLabel, opacity: 1 })),
        Plot.text(rates, { ...bankLabel, opacity: 0.5 }),
        Plot.text(rates, Plot.pointerY({ ...bankLabel, opacity: 1 })),
      ],
    });

    const x = plot.scale("x").apply;
    plot.insertAdjacentHTML(
      "afterbegin",
      `<defs>
        <linearGradient
          id="bank-rate-gradient"
          gradientUnits="userSpaceOnUse"
          x1="${x(officialRate)}"
          y1="0"
          x2="${x(maxRate)}"
          y2="0"
        >
          <stop offset="0%" stop-color="var(--official)" />
          <stop offset="100%" stop-color="var(--binance)" />
        </linearGradient>
      </defs>`,
    );

    element.innerHTML = `
      <div class="bank-rates__header">
        <span class="bank-rates__title">Cotizaciones de venta por banco</span>
        <span class="bank-rates__date">${date}</span>
      </div>
      <div class="plot-container"></div>`;
    element.querySelector(".plot-container").append(plot);

    plot.addEventListener(
      "pointerleave",
      (event) => {
        if (event.pointerType === "mouse") event.stopImmediatePropagation();
      },
      { capture: true },
    );

    const y = plot.scale("y").apply;
    const topBank = banks.reduce((top, bank) =>
      y(bank) < y(top) ? bank : top,
    );
    const bounds = plot.getBoundingClientRect();
    const viewBox = plot.viewBox.baseVal;
    plot.dispatchEvent(
      new PointerEvent("pointermove", {
        clientX: bounds.left + bounds.width / 2,
        clientY: bounds.top + (y(topBank) / viewBox.height) * bounds.height,
        pointerId: 1,
        pointerType: "mouse",
        isPrimary: true,
      }),
    );
  }

  const resizeObserver = new ResizeObserver(([entry]) => {
    const nextWidth = Math.floor(entry.contentRect.width);
    if (nextWidth === width) return;
    width = nextWidth;
    render();
  });
  resizeObserver.observe(element);
  render();

  return {
    dispose() {
      disposed = true;
      resizeObserver.disconnect();
      element.replaceChildren();
    },
  };
}
