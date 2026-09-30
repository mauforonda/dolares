import * as Plot from "@observablehq/plot";
import * as d3 from "d3";
import { alignOfficialRates } from "../data/align-series.js";

const METRIC = "naive";
const RIGHT_INSET = 50;
const COLORS = { binance: "var(--binance)", official: "var(--official)" };

export function mount(element, { binance, officialRates }, initialRange) {
  const height = Number.parseFloat(
    getComputedStyle(element).getPropertyValue("--plot-height"),
  );
  let width = 0;
  let dateRange = initialRange;
  let disposed = false;

  function render() {
    if (!width || disposed) return;

    const series = binance;
    const officialSeries = alignOfficialRates(series, officialRates, METRIC);
    const xDomain = [series[0].timestamp, series.at(-1).timestamp];
    const min = Math.min(
      d3.min(series, (row) => row[METRIC]),
      d3.min(officialSeries, (row) => row.value),
    );
    const max = Math.max(
      d3.max(series, (row) => row[METRIC]),
      d3.max(officialSeries, (row) => row.value),
    );
    const yMin = min * 0.95;
    const xTicks = d3
      .scaleUtc()
      .domain(xDomain)
      .ticks(Math.max(2, Math.floor((width - RIGHT_INSET) / 80)));

    const plot = Plot.plot({
      width,
      height,
      insetRight: RIGHT_INSET,
      marginRight: 0,
      marginLeft: 0,
      marginTop: 0,
      marginBottom: 40,
      style: {
        background: "transparent",
        color: "var(--stroke)",
        fontFamily: "Inter",
      },
      x: { axis: null, domain: xDomain },
      y: { axis: null, domain: [yMin, max * 1.01] },
      marks: [
        Plot.gridY({
          ticks: 3,
          strokeDasharray: "2,2",
          strokeWidth: 0.8,
          strokeOpacity: 0.5,
        }),
        Plot.axisY({
          ticks: 3,
          tickFormat: d3.format("~f"),
          opacity: 1,
          className: "y-axis",
          tickSize: 0,
          anchor: "right",
          dy: -5,
          dx: -42,
          lineAnchor: "bottom",
          textAnchor: "start",
          fill: "var(--ink)",
          fillOpacity: 0.3,
        }),
        Plot.axisX(xTicks, {
          label: null,
          tickSize: 0,
          fill: "var(--ink)",
          fillOpacity: 0.3,
          className: "x-axis",
        }),
        Plot.areaY(series, {
          x: "timestamp",
          y: METRIC,
          y1: yMin,
          fillOpacity: 0.4,
          fill: "url(#historical-binance-gradient)",
          curve: "basis",
        }),
        Plot.areaY(officialSeries, {
          x: "timestamp",
          y: "value",
          y1: yMin,
          fillOpacity: 0.3,
          fill: "url(#historical-official-gradient)",
          curve: "step-after",
        }),
        Plot.line(series, {
          x: "timestamp",
          y: METRIC,
          stroke: COLORS.binance,
          strokeWidth: 0.1,
          curve: "basis",
        }),
        Plot.line(officialSeries, {
          x: "timestamp",
          y: "value",
          strokeWidth: .8,
          stroke: COLORS.official,
          curve: "step-after",
        }),
      ],
    });

    const gradients = Object.entries(COLORS)
      .map(
        ([name, color]) => `
          <linearGradient id="historical-${name}-gradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="${color}" />
            <stop offset="100%" stop-color="var(--background)" />
          </linearGradient>`,
      )
      .join("");
    plot.insertAdjacentHTML("afterbegin", `<defs>${gradients}</defs>`);

    element.innerHTML = `<div class="plot-container"></div>`;
    element.firstElementChild.append(plot);

    plot.querySelector("defs").insertAdjacentHTML(
      "afterend",
      `<rect class="historical-brush-selection" x="0" y="0" width="0" height="${height - 40}" />`,
    );
    const selectionRect = plot.querySelector(".historical-brush-selection");
    const scaleX = d3
      .scaleUtc()
      .domain(xDomain)
      .range([0, width - RIGHT_INSET]);
    const brush = d3
      .brushX()
      .handleSize(1)
      .extent([
        [0, 0],
        [width - RIGHT_INSET, height - 40],
      ])
      .on("brush", (event) => {
        if (!event.selection) {
          selectionRect.setAttribute("display", "none");
          return;
        }

        selectionRect.removeAttribute("display");
        selectionRect.setAttribute("x", event.selection[0]);
        selectionRect.setAttribute(
          "width",
          event.selection[1] - event.selection[0],
        );
      })
      .on("end", (event) => {
        if (disposed || !event.sourceEvent) return;
        if (!event.selection) {
          brushGroup.call(brush.move, dateRange.map(scaleX));
          return;
        }

        const range = event.selection.map(scaleX.invert);
        if (range[0] >= range[1]) {
          brushGroup.call(brush.move, dateRange.map(scaleX));
          return;
        }

        dateRange = range;
        element.dispatchEvent(
          new CustomEvent("date-range-change", {
            detail: dateRange,
            bubbles: true,
          }),
        );
      });
    const brushGroup = d3
      .select(plot)
      .append("g")
      .attr("class", "historical-brush")
      .call(brush);

    brushGroup.call(brush.move, dateRange.map(scaleX));
  }

  const resizeObserver = new ResizeObserver(([entry]) => {
    const nextWidth = Math.floor(entry.contentRect.width);
    if (nextWidth === width) return;
    width = nextWidth;
    render();
  });
  resizeObserver.observe(element);

  return {
    dispose() {
      disposed = true;
      resizeObserver.disconnect();
      element.replaceChildren();
    },
  };
}
