import { loadSeries } from "./data/load-series.js";

const ratesElement = document.querySelector(".rates");
const chartElement = document.querySelector("exchange-chart");
const historicalChartElement = document.querySelector("historical-chart");
const bankRatesElement = document.querySelector("bank-rates");
const DAY_MS = 24 * 60 * 60 * 1000;
let chartInstance;
let historicalChartInstance;
let bankRatesInstance;
let rateInstance;
let timeInstance;
let selectedRange;
const seriesPromise = loadSeries();
const updateSelection = ({ detail }) => {
  rateInstance?.update(detail);
  timeInstance?.update(detail);
};

async function mountChart(version = "") {
  const moduleUrl = version
    ? `./components/exchange-chart.js?v=${encodeURIComponent(version)}`
    : "./components/exchange-chart.js";
  const [component, series] = await Promise.all([
    import(moduleUrl),
    seriesPromise,
  ]);
  chartInstance?.dispose();
  chartElement.removeEventListener("rate-selection-change", updateSelection);
  chartElement.addEventListener("rate-selection-change", updateSelection);
  chartInstance = await component.mount(chartElement, series, selectedRange);
}

async function mountHistoricalChart(version = "") {
  const moduleUrl = version
    ? `./components/historical-chart.js?v=${encodeURIComponent(version)}`
    : "./components/historical-chart.js";
  const [component, series] = await Promise.all([
    import(moduleUrl),
    seriesPromise,
  ]);
  historicalChartInstance?.dispose();
  historicalChartElement.removeEventListener("date-range-change", updateRange);
  historicalChartElement.addEventListener("date-range-change", updateRange);
  historicalChartInstance = component.mount(
    historicalChartElement,
    series,
    selectedRange,
  );
}

async function mountBankRates(version = "") {
  const moduleUrl = version
    ? `./components/bank-rates.js?v=${encodeURIComponent(version)}`
    : "./components/bank-rates.js";
  const [component, series] = await Promise.all([
    import(moduleUrl),
    seriesPromise,
  ]);
  bankRatesInstance?.dispose();
  bankRatesInstance = component.mount(bankRatesElement, series);
}

function updateRange({ detail }) {
  selectedRange = detail;
  chartInstance?.setRange(selectedRange);
}

async function mountRates(version = "") {
  const moduleUrl = version
    ? `./components/rates.js?v=${encodeURIComponent(version)}`
    : "./components/rates.js";
  const component = await import(moduleUrl);
  rateInstance = component.mount(ratesElement, chartElement.selectedData);
}

async function mountTime(version = "") {
  const moduleUrl = version
    ? `./components/selected-time.js?v=${encodeURIComponent(version)}`
    : "./components/selected-time.js";
  const component = await import(moduleUrl);
  const timeElement = document.querySelector(".selected-time");
  timeInstance = component.mount(timeElement, chartElement.selectedData);
}

function connectHotReload() {
  if (!("EventSource" in window)) return;
  if (!["localhost", "127.0.0.1", "::1"].includes(location.hostname)) return;

  const events = new EventSource("/__livereload");
  events.addEventListener("message", async ({ data }) => {
    const event = JSON.parse(data);
    if (
      event.type === "component" &&
      event.path === "components/rates.js"
    ) {
      try {
        await mountRates(event.version);
        console.info(`[dev] componente actualizado: ${event.path}`);
      } catch (error) {
        console.error(`[dev] no se pudo actualizar ${event.path}`, error);
      }
    } else if (
      event.type === "component" &&
      event.path === "components/selected-time.js"
    ) {
      try {
        await mountTime(event.version);
        console.info(`[dev] componente actualizado: ${event.path}`);
      } catch (error) {
        console.error(`[dev] no se pudo actualizar ${event.path}`, error);
      }
    } else if (
      event.type === "component" &&
      event.path === "components/exchange-chart.js"
    ) {
      try {
        await mountChart(event.version);
        console.info(`[dev] componente actualizado: ${event.path}`);
      } catch (error) {
        console.error(`[dev] no se pudo actualizar ${event.path}`, error);
      }
    } else if (
      event.type === "component" &&
      event.path === "components/historical-chart.js"
    ) {
      try {
        await mountHistoricalChart(event.version);
        console.info(`[dev] componente actualizado: ${event.path}`);
      } catch (error) {
        console.error(`[dev] no se pudo actualizar ${event.path}`, error);
      }
    } else if (
      event.type === "component" &&
      event.path === "components/bank-rates.js"
    ) {
      try {
        await mountBankRates(event.version);
        console.info(`[dev] componente actualizado: ${event.path}`);
      } catch (error) {
        console.error(`[dev] no se pudo actualizar ${event.path}`, error);
      }
    } else if (event.type === "style") {
      const stylesheet = document.querySelector('link[rel="stylesheet"]');
      stylesheet.href = `${event.path}?v=${event.version}`;
    } else if (event.type === "reload" || event.type === "component") {
      location.reload();
    }
  });
}

connectHotReload();
async function start() {
  await Promise.all([mountRates(), mountTime()]);
  const series = await seriesPromise;
  const lastTimestamp = series.binance.at(-1).timestamp;
  const firstTimestamp = series.binance[0].timestamp;
  const rangeStart = new Date(+lastTimestamp - 90 * DAY_MS);
  selectedRange = [
    rangeStart < firstTimestamp ? firstTimestamp : rangeStart,
    lastTimestamp,
  ];

  await Promise.all([
    mountChart(),
    mountHistoricalChart(),
    mountBankRates(),
  ]);
  const main = document.querySelector("main");
  main.dataset.state = "ready";
  main.setAttribute("aria-busy", "false");
}

start();
