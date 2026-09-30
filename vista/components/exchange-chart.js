import * as Plot from "@observablehq/plot";
import * as d3 from "d3";
import { alignOfficialRates } from "../data/align-series.js";

const METRIC = "naive";
const RIGHT_INSET = 50;
const COLORS = { binance: "var(--binance)", official: "var(--official)" };
let nextGlowId = 0;

export function mount(element, { binance, officialRates }, initialRange) {
  element.selectedData = null;
  let dateRange = initialRange;
  let width = 0;
  let height = 0;
  let disposed = false;
  let publishSelection = () => {};

  function render() {
    if (!width || disposed) return;

    const [start, end] = dateRange;
    const series = binance.filter(
      (row) => row.timestamp >= start && row.timestamp <= end,
    );
    const xDomain = dateRange;
    const officialSeries = alignOfficialRates(series, officialRates, METRIC);
    const min = Math.min(
      d3.min(series, (row) => row[METRIC]),
      d3.min(officialSeries, (row) => row.value),
    );
    const max = Math.max(
      d3.max(series, (row) => row[METRIC]),
      d3.max(officialSeries, (row) => row.value),
    );
    const yMin = min * 0.95;
    const pointerTarget = {
      maxRadius: Infinity,
      px: "timestamp",
      py: (row) => (row.value + row.binance) / 2,
    };
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
      marginTop: 10,
      marginBottom: 40,
      style: {
        background: "transparent",
        color: "var(--stroke)",
        fontFamily: "Inter",
      },
      x: {
        axis: null,
        domain: xDomain,
      },
      y: {
        axis: null,
        domain: [yMin, max * 1.01],
      },
      marks: [
        Plot.gridY({
          ticks: 8,
          strokeDasharray: "2,2",
          strokeWidth: 0.8,
          strokeOpacity: 0.5,
        }),
        Plot.axisY({
          ticks: 8,
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
        }),
        Plot.axisX(xTicks, {
          label: null,
          tickSize: 0,
          fill: "var(--ink)",
          className: "x-axis",
        }),
        Plot.areaY(series, {
          x: "timestamp",
          y: METRIC,
          y1: yMin,
          fillOpacity: 0.4,
          fill: "url(#binance-gradient)",
          curve: "basis",
        }),
        Plot.areaY(officialSeries, {
          x: "timestamp",
          y: "value",
          y1: yMin,
          fillOpacity: 0.3,
          fill: "url(#official-gradient)",
          curve: "step-after",
          className: "official-area",
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
          strokeWidth: 1.5,
          stroke: COLORS.official,
          curve: "step-after",
        }),
        Plot.ruleY(
          officialSeries,
          Plot.pointerX({
            maxRadius: Infinity,
            px: "timestamp",
            x1: "timestamp",
            x2: null,
            y: "value",
            stroke: COLORS.official,
            strokeDasharray: "2,2",
            strokeWidth: 1,
          }),
        ),
        Plot.ruleX(
          officialSeries,
          Plot.pointerX({
            ...pointerTarget,
            x: "timestamp",
            y1: "value",
            y2: "binance",
            stroke: {
              value: (row) =>
                row.binance >= row.value
                  ? "url(#connector-binance-top)"
                  : "url(#connector-official-top)",
              scale: null,
            },
            strokeWidth: 2,
            strokeOpacity: 0.8,

            render: (index, scales, values, dimensions, context, next) => {
              const g = next(index, scales, values, dimensions, context);

              g?.querySelectorAll("line").forEach((line) => {
                line.setAttribute("x2", +line.getAttribute("x2") + 0.001);
              });

              return g;
            },
          }),
        ),
        Plot.dot(
          officialSeries,
          Plot.pointerX({
            ...pointerTarget,
            x: "timestamp",
            y: "binance",
            r: 3,
            fill: COLORS.binance,
          }),
        ),
        Plot.dot(
          officialSeries,
          Plot.pointerX({
            ...pointerTarget,
            x: "timestamp",
            y: "value",
            r: 3,
            fill: COLORS.official,
          }),
        ),
      ],
    });

    const gradients = [
      ...Object.entries(COLORS).map(
        ([name, color]) => `
      <linearGradient id="${name}-gradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="${color}" />
            <stop offset="100%" stop-color="var(--background)" />
          </linearGradient>`,
      ),
      `
        <linearGradient id="connector-binance-top" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="${COLORS.binance}" />
          <stop offset="100%" stop-color="${COLORS.official}" />
        </linearGradient>
        <linearGradient id="connector-official-top" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="${COLORS.official}" />
          <stop offset="100%" stop-color="${COLORS.binance}" />
        </linearGradient>`,
    ].join("");
    plot.insertAdjacentHTML("afterbegin", `<defs>${gradients}</defs>`);

    element.innerHTML = `<div class="plot-container"></div>`;
    element.firstElementChild.append(plot);

    const glowId = `official-glow-${++nextGlowId}`;
    let glowGradient;
    const officialArea = plot.querySelector(
      ".official-area path, path.official-area",
    );
    const defs = plot.querySelector("defs");
    if (officialArea && defs) {
      defs.insertAdjacentHTML(
        "beforeend",
        `<radialGradient id="${glowId}-gradient" gradientUnits="userSpaceOnUse" cx="0" cy="0" r="140">
          <stop offset="0%" stop-color="${COLORS.official}" stop-opacity="0.1" />
          <stop offset="50%" stop-color="${COLORS.official}" stop-opacity="0.05" />
          <stop offset="100%" stop-color="${COLORS.official}" stop-opacity="0" />
        </radialGradient>
        <clipPath id="${glowId}-clip">${officialArea.outerHTML}</clipPath>`,
      );
      plot.insertAdjacentHTML(
        "beforeend",
        `<rect class="official-area-glow" x="0" y="0" width="${plot.viewBox.baseVal.width}" height="${plot.viewBox.baseVal.height}" fill="url(#${glowId}-gradient)" clip-path="url(#${glowId}-clip)" pointer-events="none" />`,
      );

      glowGradient = plot.querySelector(`#${glowId}-gradient`);
    }

    const positionGlow = (row) => {
      if (!glowGradient || !row) return;
      glowGradient.setAttribute(
        "cx",
        plot.scale("x").apply(row.timestamp),
      );
      glowGradient.setAttribute("cy", plot.scale("y").apply(row.value));
    };

    plot.addEventListener(
      "pointerleave",
      (event) => {
        if (event.pointerType === "mouse") event.stopImmediatePropagation();
      },
      { capture: true },
    );

    plot.addEventListener("pointerup", (event) => {
      if (event.pointerType !== "mouse" || event.button !== 0) return;
      // Plot unlocks on pointerdown. Re-evaluate immediately on pointerup so
      // the pointer marks resume at the current cursor position.
      if (disposed || !plot.isConnected) return;
      plot.dispatchEvent(
        new PointerEvent("pointermove", {
          clientX: event.clientX,
          clientY: event.clientY,
          pointerId: event.pointerId,
          pointerType: event.pointerType,
          isPrimary: event.isPrimary,
        }),
      );
    });

    let previousSelection = null;
    publishSelection = (row) => {
      const selectedData = row
        ? {
            binance: row.binance,
            official: row.value,
            timestamp: row.timestamp,
          }
        : null;
      const key = selectedData
        ? `${selectedData.timestamp.getTime()}:${selectedData.binance}:${selectedData.official}`
        : null;
      if (key === previousSelection) return;

      previousSelection = key;
      element.selectedData = selectedData;
      element.dispatchEvent(
        new CustomEvent("rate-selection-change", {
          detail: selectedData,
          bubbles: true,
        }),
      );
    };

    const yTickLabels = [...plot.querySelectorAll(".y-axis text")];
    const yTickValues = yTickLabels.map((label) => Number(label.textContent));
    const sortedYTickValues = [...yTickValues].sort((a, b) => a - b);
    const tickStep = d3.min(
      sortedYTickValues
        .slice(1)
        .map((value, index) => value - sortedYTickValues[index]),
    );
    const xTickLabels = [...plot.querySelectorAll(".x-axis text")];

    const setTickOpacity = (labels, values, opacity) => {
      labels.forEach((label, index) =>
        label.setAttribute("opacity", opacity(values[index], index)),
      );
    };

    const updateAxisTickOpacity = () => {
      const row = plot.value;
      // Plot briefly publishes null while unlocking a sticky pointer. Keep
      // the current selection and tick emphasis until the next pointer move.
      if (!row) return;
      publishSelection(row);
      positionGlow(row);
      const low = Math.min(row.binance, row.value) - tickStep;
      const high = Math.max(row.binance, row.value) + tickStep;
      const timestamp = plot.value?.timestamp;
      let closestIndex = -1;
      let closestDistance = Infinity;

      if (timestamp) {
        xTicks.forEach((tick, index) => {
          if (tick < start || tick > end) return;
          const distance = Math.abs(tick - timestamp);
          if (distance < closestDistance) {
            closestIndex = index;
            closestDistance = distance;
          }
        });
      }

      setTickOpacity(yTickLabels, yTickValues, (tick) =>
        row && tick >= low && tick <= high ? 1 : 0.3,
      );
      setTickOpacity(xTickLabels, xTicks, (tick, index) =>
        tick < start || tick > end ? 0 : index === closestIndex ? 1 : 0.3,
      );
    };

    plot.addEventListener("input", updateAxisTickOpacity);
    updateAxisTickOpacity();

    const latest = officialSeries.at(-1);
    const bounds = plot.getBoundingClientRect();
    const viewBox = plot.viewBox.baseVal;
    const clientX =
      bounds.left +
      (plot.scale("x").apply(latest.timestamp) / viewBox.width) * bounds.width;
    const clientY =
      bounds.top +
      (plot.scale("y").apply((yMin + max) / 2) / viewBox.height) *
        bounds.height;
    plot.dispatchEvent(
      new PointerEvent("pointermove", {
        clientX,
        clientY,
        pointerId: 1,
        pointerType: "mouse",
        isPrimary: true,
      }),
    );
  }

  const resizeObserver = new ResizeObserver(([entry]) => {
    const nextWidth = Math.floor(entry.contentRect.width);
    const nextHeight = Number.parseFloat(
      getComputedStyle(element).getPropertyValue("--plot-height"),
    );
    if (nextWidth === width && nextHeight === height) return;
    width = nextWidth;
    height = nextHeight;
    render();
  });
  resizeObserver.observe(element);

  render();

  return {
    setRange(range) {
      dateRange = range;
      render();
    },
    dispose() {
      disposed = true;
      resizeObserver.disconnect();
      publishSelection(null);
      element.replaceChildren();
    },
  };
}
