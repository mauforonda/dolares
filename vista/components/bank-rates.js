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
  banco_nacional_de_bolivia: "Banco Nacional de Bolivia",
  banco_prodem: "Banco PRODEM",
  banco_pyme_de_la_comunidad: "Banco PyME de la Comunidad",
  banco_solidario: "BancoSol",
  banco_union: "Banco Unión",
};

const GRADIENT_ID = "bank-rate-gradient";
const DISTRIBUTION_GRADIENT_ID = "bank-rate-distribution-gradient";
const DISTRIBUTION_LINE_GRADIENT_ID = "bank-rate-distribution-line-gradient";
const DISTRIBUTION_AREA_CLASS = "bank-rates__distribution-area";
const DISTRIBUTION_LINE_CLASS = "bank-rates__distribution-line";
const ACTIVE_AREA_CLIP_ID = "bank-rates-active-area-clip";
const DAY_MS = 24 * 60 * 60 * 1000;
const PLOT_MARGINS = { top: 0, right: 10, bottom: 5, left: 42 };
const DISTRIBUTION_MARGINS = { top: 5, right: 10, bottom: 0, left: 42 };

function formatRelativeDate(date) {
  const todayParts = new Intl.DateTimeFormat("en", {
    timeZone: "America/La_Paz",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const today = Object.fromEntries(
    todayParts.map(({ type, value }) => [type, value]),
  );
  const todayKey = `${today.year}-${today.month}-${today.day}`;
  const daysAgo =
    (Date.parse(`${todayKey}T00:00:00Z`) - Date.parse(`${date}T00:00:00Z`)) /
    DAY_MS;

  if (daysAgo === 0) return "hoy";
  if (daysAgo === 1) return "ayer";
  return `hace ${daysAgo} días`;
}

function labelMark(rates, options, idleOpacity, className) {
  return Plot.text(rates, {
    ...options,
    opacity: idleOpacity,
    className,
  });
}

function markTextElements(plot, className) {
  const mark = plot.querySelector(`.${className}`);
  return mark.matches("text") ? [mark] : [...mark.querySelectorAll("text")];
}

function updateLabelOpacities(quote, rates, banksByQuote, rateLabels, bankLabels) {
  const selectedBanks = new Set(banksByQuote.get(quote) ?? []);

  rates.forEach((rate, index) => {
    const selected = selectedBanks.has(rate.bank);
    rateLabels[index].setAttribute("opacity", selected ? 1 : 0.3);
    bankLabels[index].setAttribute("opacity", selected ? 1 : 0.5);
  });
}

function groupRates(rates) {
  const banksByQuote = new Map();

  rates.forEach(({ bank, value }) => {
    const quote = value.toFixed(2);
    const banks = banksByQuote.get(quote) ?? [];
    banks.push(bank);
    banksByQuote.set(quote, banks);
  });

  const counts = [...banksByQuote]
    .map(([quote, banks]) => ({ quote, rate: Number(quote), count: banks.length }))
    .sort((a, b) => a.rate - b.rate);

  return { banksByQuote, counts };
}

function addRateGradient(plot, officialRate, maxRate, gradientId) {
  const x = plot.scale("x").apply;
  plot.insertAdjacentHTML(
    "afterbegin",
    `<defs>
      <linearGradient
        id="${gradientId}"
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
}

function addQuoteGuides(plot, banksByQuote) {
  const x = plot.scale("x").apply;
  const y = plot.scale("y").apply;
  const guides = [...banksByQuote].map(([quote, banks]) => ({
    quote,
    x: x(Number(quote)),
    y: y(banks.at(-1)) + 10,
  }));
  const defs = plot.querySelector("defs");
  const linesMarkup = guides
    .map(
      ({ quote, x: xPosition, y: yPosition }) =>
        `<line data-quote="${quote}" x1="${xPosition}" x2="${xPosition}" y1="0" y2="${yPosition}" stroke="var(--muted)" stroke-width="1" stroke-dasharray="2 3" opacity="0" />`,
    )
    .join("");
  defs.insertAdjacentHTML(
    "afterend",
    `<g class="bank-rates__quote-guides" pointer-events="none">${linesMarkup}</g>`,
  );
  const group = plot.querySelector(".bank-rates__quote-guides");
  const lines = new Map(
    [...group.querySelectorAll("line")].map((line) => [line.dataset.quote, line]),
  );
  return (quote) => {
    lines.forEach((line, lineQuote) => {
      line.setAttribute("opacity", lineQuote === quote ? 0.65 : 0);
    });
  };
}

function addBinanceGradient(plot) {
  plot.insertAdjacentHTML(
    "afterbegin",
    `<defs>
      <linearGradient id="${DISTRIBUTION_GRADIENT_ID}" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="var(--binance)" />
        <stop offset="100%" stop-color="var(--background)" />
      </linearGradient>
    </defs>`,
  );
}

function addDistributionActivation(plot, startRate) {
  const area = plot.querySelector(`.${DISTRIBUTION_AREA_CLASS}`);
  const line = plot.querySelector(`.${DISTRIBUTION_LINE_CLASS}`);
  const activeArea = area.cloneNode(true);
  const activeLine = line.cloneNode(true);
  const { height } = plot.viewBox.baseVal;
  const x = plot.scale("x").apply;

  plot.insertAdjacentHTML(
    "afterbegin",
    `<defs>
      <clipPath id="${ACTIVE_AREA_CLIP_ID}" clipPathUnits="userSpaceOnUse">
        <rect x="${x(startRate)}" y="0" width="0" height="${height}" />
      </clipPath>
    </defs>`,
  );
  activeArea.setAttribute("clip-path", `url(#${ACTIVE_AREA_CLIP_ID})`);
  activeArea.setAttribute("pointer-events", "none");
  const activePaths = activeArea.matches("path")
    ? [activeArea]
    : [...activeArea.querySelectorAll("path")];
  activePaths.forEach((path) => path.setAttribute("fill-opacity", "0.5"));
  activeLine.setAttribute("clip-path", `url(#${ACTIVE_AREA_CLIP_ID})`);
  activeLine.setAttribute("pointer-events", "none");
  const activeLines = activeLine.matches("path")
    ? [activeLine]
    : [...activeLine.querySelectorAll("path")];
  activeLines.forEach((path) => path.setAttribute("stroke-opacity", "0.5"));
  plot.append(activeArea, activeLine);

  const clip = plot.querySelector(`#${ACTIVE_AREA_CLIP_ID} rect`);
  return (quote) => {
    if (quote == null) return;
    const startX = x(startRate);
    const selectedX = x(Number(quote));
    const width = Math.abs(selectedX - startX);
    clip.setAttribute("x", Math.min(startX, selectedX));
    clip.setAttribute("width", width);
  };
}

function keepSelectionOnPointerLeave(plot) {
  plot.addEventListener(
    "pointerleave",
    (event) => event.stopImmediatePropagation(),
    { capture: true },
  );
}

function setQuoteAsDefault(plot, quote) {
  const x = plot.scale("x").apply(Number(quote));
  const bounds = plot.getBoundingClientRect();
  const viewBox = plot.viewBox.baseVal;

  plot.dispatchEvent(
    new PointerEvent("pointermove", {
      clientX: bounds.left + (x / viewBox.width) * bounds.width,
      clientY: bounds.top + bounds.height / 2,
      pointerId: 1,
      pointerType: "mouse",
      isPrimary: true,
    }),
  );
}

function createDistributionPlot(width, height, counts, xDomain, maxCount, margins) {
  return Plot.plot({
    width,
    height,
    marginTop: margins.top,
    marginRight: margins.right,
    marginBottom: margins.bottom,
    marginLeft: margins.left,
    x: { axis: null, domain: xDomain },
    y: { axis: null, domain: [0, maxCount] },
    marks: [
      Plot.areaY(counts, {
        x: "rate",
        y: "count",
        curve: "natural",
        fill: `url(#${DISTRIBUTION_GRADIENT_ID})`,
        fillOpacity: .2,
        className: DISTRIBUTION_AREA_CLASS,
      }),
      Plot.line(counts, {
        x: "rate",
        y: "count",
        curve: "natural",
        stroke: `url(#${DISTRIBUTION_LINE_GRADIENT_ID})`,
        strokeWidth: 1,
        strokeOpacity: 0.2,
        className: DISTRIBUTION_LINE_CLASS,
      }),
      Plot.dot(
        counts,
        Plot.pointerX({
          maxRadius: Infinity,
          x: "rate",
          y: "count",
          r: 0,
          fillOpacity: 0,
          strokeOpacity: 0,
        }),
      ),
    ],
  });
}

function createRatesPlot(width, height, rates, banks, officialRate, xDomain, margins, isPurchase) {
  const rateLabel = {
    x: officialRate,
    y: "bank",
    text: (rate) => rate.value.toFixed(2),
    dx: isPurchase ? 6 : -6,
    textAnchor: isPurchase ? "start" : "end",
    fontSize: 10,
    fill: "var(--ink)",
  };
  const bankLabel = {
    x: officialRate,
    y: "bank",
    text: (rate) => BANK_NAMES[rate.bank],
    dx: isPurchase ? -6 : 6,
    textAnchor: isPurchase ? "end" : "start",
    fontSize: 12,
    fill: "var(--ink)",
  };

  return Plot.plot({
    width,
    height,
    marginTop: margins.top,
    marginRight: margins.right,
    marginBottom: margins.bottom,
    marginLeft: margins.left,
    x: {
      axis: null,
      domain: xDomain,
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
          dy: 12,
          stroke: "var(--official)",
          strokeDasharray: "2,2",
        },
      ),
      Plot.ruleY(rates, {
        y: "bank",
        x1: officialRate,
        x2: "value",
        stroke: `url(#${GRADIENT_ID})`,
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
      Plot.dot(
        rates,
        Plot.pointerY({
          x: "value",
          y: "bank",
          r: 0,
          fillOpacity: 0,
          strokeOpacity: 0,
        }),
      ),
      labelMark(rates, rateLabel, 0.3, "bank-rates__rate-labels"),
      labelMark(rates, bankLabel, 0.5, "bank-rates__bank-labels"),
    ],
  });
}

export function mount(element, { bankRates, officialRates }) {
  const rowHeight = Number.parseFloat(
    getComputedStyle(element).getPropertyValue("--bank-row-height"),
  );
  const distributionHeight = Number.parseFloat(
    getComputedStyle(element).getPropertyValue("--bank-distribution-height"),
  );
  let width = 0;
  let disposed = false;
  let selectedType = "venta";

  function render() {
    if (!width || disposed) return;

    const isPurchase = selectedType === "compra";
    const currentBankRates = bankRates[selectedType];
    const date = currentBankRates[0].date;
    const relativeDate = formatRelativeDate(date);
    const officialRate = officialRates.find((rate) => rate.date === date).value;
    const rates = currentBankRates.toSorted((a, b) =>
      isPurchase ? b.value - a.value : a.value - b.value,
    );
    const banks = rates.map((rate) => rate.bank);
    const rateValues = rates.map((rate) => rate.value);
    const minRate = Math.min(officialRate, ...rateValues);
    const maxRate = Math.max(officialRate, ...rateValues);
    const gradientEndRate = rates.at(-1).value;
    const xDomain = [minRate, maxRate];
    const { banksByQuote, counts: rateCounts } = groupRates(rates);
    const maxCount = Math.max(...rateCounts.map(({ count }) => count));
    const defaultQuote = rateCounts.reduce((mostFrequent, count) =>
      count.count > mostFrequent.count ? count : mostFrequent,
    ).quote;
    const height = banks.length * rowHeight;
    const plotMargins = isPurchase
      ? { ...PLOT_MARGINS, left: PLOT_MARGINS.right, right: PLOT_MARGINS.left }
      : PLOT_MARGINS;
    const distributionMargins = isPurchase
      ? {
          ...DISTRIBUTION_MARGINS,
          left: DISTRIBUTION_MARGINS.right,
          right: DISTRIBUTION_MARGINS.left,
        }
      : DISTRIBUTION_MARGINS;

    const distributionPlot = createDistributionPlot(
      width,
      distributionHeight,
      rateCounts,
      xDomain,
      maxCount,
      distributionMargins,
    );
    addBinanceGradient(distributionPlot);
    addRateGradient(
      distributionPlot,
      officialRate,
      gradientEndRate,
      DISTRIBUTION_LINE_GRADIENT_ID,
    );
    const updateActiveArea = addDistributionActivation(
      distributionPlot,
      isPurchase ? rateCounts.at(-1).rate : rateCounts[0].rate,
    );
    const ratesPlot = createRatesPlot(
      width,
      height,
      rates,
      banks,
      officialRate,
      xDomain,
      plotMargins,
      isPurchase,
    );
    addRateGradient(ratesPlot, officialRate, gradientEndRate, GRADIENT_ID);
    const updateQuoteGuide = addQuoteGuides(ratesPlot, banksByQuote);

    element.innerHTML = `
      <div class="bank-rates__selection">
        <div class="binance-rate bank-rates__selected-rate" aria-label="Cotización seleccionada">
          <span class="binance-rate__integer"></span>
          <span class="binance-rate__separator">.</span>
          <span class="binance-rate__decimal"></span>
        </div>
        <div class="currency-unit bank-rates__selected-unit">
          <span class="currency-unit__integer">BS</span>
          <span class="currency-unit__separator">x</span>
          <span class="currency-unit__decimal">USD</span>
        </div>
      </div>
      <div class="bank-rates__header">
        <span class="bank-rates__title">
          <span>Cotizaciones de</span>
          <span class="bank-rates__switch" role="radiogroup" aria-label="Tipo de cotización">
            <label>
              <input type="radio" name="bank-rate-type" value="compra" ${isPurchase ? "checked" : ""} />
              <span>compra</span>
            </label>
            <label>
              <input type="radio" name="bank-rate-type" value="venta" ${isPurchase ? "" : "checked"} />
              <span>venta</span>
            </label>
          </span>
          <span>por banco</span>
        </span>
        <span class="bank-rates__date">${relativeDate}</span>
      </div>
      <div class="plot-container"></div>`;
    element.setAttribute(
      "aria-label",
      `Diferencia entre el tipo de cambio oficial y las cotizaciones de ${selectedType} de los bancos`,
    );
    const plotContainer = element.querySelector(".plot-container");
    plotContainer.append(distributionPlot, ratesPlot);

    const rateLabels = markTextElements(ratesPlot, "bank-rates__rate-labels");
    const bankLabels = markTextElements(ratesPlot, "bank-rates__bank-labels");
    const selectedRate = element.querySelector(".bank-rates__selected-rate");
    const selectedRateInteger = selectedRate.querySelector(".binance-rate__integer");
    const selectedRateDecimal = selectedRate.querySelector(".binance-rate__decimal");
    const setActiveQuote = (quote) => {
      if (quote == null) return;

      updateLabelOpacities(quote, rates, banksByQuote, rateLabels, bankLabels);
      updateActiveArea(quote);
      updateQuoteGuide(quote);

      const [integer, decimal] = Number(quote).toFixed(2).split(".");
      const position = Math.min(
        1,
        Math.max(
          0,
          (Number(quote) - officialRate) / (gradientEndRate - officialRate),
        ),
      );
      const binanceShare = Number.isFinite(position) ? position * 100 : 100;
      selectedRateInteger.textContent = integer;
      selectedRateDecimal.textContent = decimal;
      selectedRate.setAttribute(
        "aria-label",
        `Cotización seleccionada: ${integer}.${decimal} Bs por dólar`,
      );
      element.style.setProperty(
        "--selected-rate-color",
        `color-mix(in srgb, var(--official) ${100 - binanceShare}%, var(--binance) ${binanceShare}%)`,
      );
    };

    ratesPlot.addEventListener("input", () =>
      setActiveQuote(ratesPlot.value?.value?.toFixed(2) ?? null),
    );
    distributionPlot.addEventListener("input", () =>
      setActiveQuote(distributionPlot.value?.rate?.toFixed(2) ?? null),
    );
    element.querySelector(".bank-rates__switch").addEventListener("change", (event) => {
      if (!event.target.checked || event.target.value === selectedType) return;
      selectedType = event.target.value;
      render();
    });

    keepSelectionOnPointerLeave(distributionPlot);
    keepSelectionOnPointerLeave(ratesPlot);
    setQuoteAsDefault(distributionPlot, defaultQuote);
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
