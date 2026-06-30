import * as Plot from "../../_npm/@observablehq/plot@0.6.17/_esm.js";

import { html, svg } from "../../_npm/htl@1.0.0/_esm.js";
import { curveBasis, curveStepBefore, format, line } from "../../_npm/d3@7.9.0/_esm.js";

import { getPalette, sourceColor } from "./colors.b8607fe9.js";

const timeTickFormat = () => {
  const seenYears = new Set();
  const seenMonthYears = new Set();

  const formatMonth = Plot.formatMonth("es-BO");
  const formatDay = format("d");

  return (date) => {
    const year = date.getFullYear();
    const month = formatMonth(date.getMonth());
    const day = formatDay(date.getDate());
    const monthYear = `${month}\n${year}`;

    if (!seenYears.has(year)) {
      seenYears.add(year);
      seenMonthYears.add(monthYear);
      if (seenYears.size > 1) {
        return `${month}\n${year}`;
      } else {
        return `${day}\n${month}`;
      }
    }

    if (!seenMonthYears.has(monthYear)) {
      seenMonthYears.add(monthYear);
      return `${day}\n${month}`;
    }

    return day;
  };
};

function withGradient({ color, id = "gradient" }, callback) {
  return [
    callback(`url(#${id})`),
    () => svg`<defs>
        <linearGradient id=${id} gradientTransform="rotate(90)">
          <stop offset=0% stop-color=${color} stop-opacity=0.25 />
          <stop offset=100% stop-color=${color} stop-opacity=0 />
        </linearGradient>
      </defs>`,
  ];
}

function withPattern({ color, id, opacity = 0.7 }, callback) {
  return [
    callback(`url(#${id})`),
    () => svg`<defs>
    <pattern id="${id}" x="0" y="0" width="100" height="100" patternUnits="userSpaceOnUse" patternTransform="translate(-79.53 183.07)">
      <rect fill="none" width="100" height="100"/>
      <line style="stroke:${color};stroke-miterlimit:10;stroke-width:1px;stroke-opacity:${opacity};fill:none" x1="53.03" y1="-53.03" x2="-53.03" y2="53.03"/>
      <line style="stroke:${color};stroke-miterlimit:10;stroke-width:1px;stroke-opacity:${opacity};fill:none" x1="55.81" y1="-50.25" x2="-50.25" y2="55.81"/>
      <line style="stroke:${color};stroke-miterlimit:10;stroke-width:1px;stroke-opacity:${opacity};fill:none" x1="58.59" y1="-47.48" x2="-47.48" y2="58.59"/>
      <line style="stroke:${color};stroke-miterlimit:10;stroke-width:1px;stroke-opacity:${opacity};fill:none" x1="61.37" y1="-44.7" x2="-44.7" y2="61.37"/>
      <line style="stroke:${color};stroke-miterlimit:10;stroke-width:1px;stroke-opacity:${opacity};fill:none" x1="64.14" y1="-41.92" x2="-41.92" y2="64.14"/>
      <line style="stroke:${color};stroke-miterlimit:10;stroke-width:1px;stroke-opacity:${opacity};fill:none" x1="66.92" y1="-39.14" x2="-39.14" y2="66.92"/>
      <line style="stroke:${color};stroke-miterlimit:10;stroke-width:1px;stroke-opacity:${opacity};fill:none" x1="69.7" y1="-36.37" x2="-36.37" y2="69.7"/>
      <line style="stroke:${color};stroke-miterlimit:10;stroke-width:1px;stroke-opacity:${opacity};fill:none" x1="72.48" y1="-33.59" x2="-33.59" y2="72.48"/>
      <line style="stroke:${color};stroke-miterlimit:10;stroke-width:1px;stroke-opacity:${opacity};fill:none" x1="75.26" y1="-30.81" x2="-30.81" y2="75.26"/>
      <line style="stroke:${color};stroke-miterlimit:10;stroke-width:1px;stroke-opacity:${opacity};fill:none" x1="78.03" y1="-28.03" x2="-28.03" y2="78.03"/>
      <line style="stroke:${color};stroke-miterlimit:10;stroke-width:1px;stroke-opacity:${opacity};fill:none" x1="80.81" y1="-25.26" x2="-25.26" y2="80.81"/>
      <line style="stroke:${color};stroke-miterlimit:10;stroke-width:1px;stroke-opacity:${opacity};fill:none" x1="83.59" y1="-22.48" x2="-22.48" y2="83.59"/>
      <line style="stroke:${color};stroke-miterlimit:10;stroke-width:1px;stroke-opacity:${opacity};fill:none" x1="86.37" y1="-19.7" x2="-19.7" y2="86.37"/>
      <line style="stroke:${color};stroke-miterlimit:10;stroke-width:1px;stroke-opacity:${opacity};fill:none" x1="89.14" y1="-16.92" x2="-16.92" y2="89.14"/>
      <line style="stroke:${color};stroke-miterlimit:10;stroke-width:1px;stroke-opacity:${opacity};fill:none" x1="91.92" y1="-14.14" x2="-14.14" y2="91.92"/>
      <line style="stroke:${color};stroke-miterlimit:10;stroke-width:1px;stroke-opacity:${opacity};fill:none" x1="94.7" y1="-11.37" x2="-11.37" y2="94.7"/>
      <line style="stroke:${color};stroke-miterlimit:10;stroke-width:1px;stroke-opacity:${opacity};fill:none" x1="97.48" y1="-8.59" x2="-8.59" y2="97.48"/>
      <line style="stroke:${color};stroke-miterlimit:10;stroke-width:1px;stroke-opacity:${opacity};fill:none" x1="100.25" y1="-5.81" x2="-5.81" y2="100.25"/>
      <line style="stroke:${color};stroke-miterlimit:10;stroke-width:1px;stroke-opacity:${opacity};fill:none" x1="103.03" y1="-3.03" x2="-3.03" y2="103.03"/>
      <line style="stroke:${color};stroke-miterlimit:10;stroke-width:1px;stroke-opacity:${opacity};fill:none" x1="105.81" y1="-0.25" x2="-0.25" y2="105.81"/>
      <line style="stroke:${color};stroke-miterlimit:10;stroke-width:1px;stroke-opacity:${opacity};fill:none" x1="108.59" y1="2.52" x2="2.52" y2="108.59"/>
      <line style="stroke:${color};stroke-miterlimit:10;stroke-width:1px;stroke-opacity:${opacity};fill:none" x1="111.37" y1="5.3" x2="5.3" y2="111.37"/>
      <line style="stroke:${color};stroke-miterlimit:10;stroke-width:1px;stroke-opacity:${opacity};fill:none" x1="114.14" y1="8.08" x2="8.08" y2="114.14"/>
      <line style="stroke:${color};stroke-miterlimit:10;stroke-width:1px;stroke-opacity:${opacity};fill:none" x1="116.92" y1="10.86" x2="10.86" y2="116.92"/>
      <line style="stroke:${color};stroke-miterlimit:10;stroke-width:1px;stroke-opacity:${opacity};fill:none" x1="119.7" y1="13.63" x2="13.63" y2="119.7"/>
      <line style="stroke:${color};stroke-miterlimit:10;stroke-width:1px;stroke-opacity:${opacity};fill:none" x1="122.48" y1="16.41" x2="16.41" y2="122.48"/>
      <line style="stroke:${color};stroke-miterlimit:10;stroke-width:1px;stroke-opacity:${opacity};fill:none" x1="125.26" y1="19.19" x2="19.19" y2="125.26"/>
      <line style="stroke:${color};stroke-miterlimit:10;stroke-width:1px;stroke-opacity:${opacity};fill:none" x1="128.03" y1="21.97" x2="21.97" y2="128.03"/>
      <line style="stroke:${color};stroke-miterlimit:10;stroke-width:1px;stroke-opacity:${opacity};fill:none" x1="130.81" y1="24.74" x2="24.74" y2="130.81"/>
      <line style="stroke:${color};stroke-miterlimit:10;stroke-width:1px;stroke-opacity:${opacity};fill:none" x1="133.59" y1="27.52" x2="27.52" y2="133.59"/>
      <line style="stroke:${color};stroke-miterlimit:10;stroke-width:1px;stroke-opacity:${opacity};fill:none" x1="136.37" y1="30.3" x2="30.3" y2="136.37"/>
      <line style="stroke:${color};stroke-miterlimit:10;stroke-width:1px;stroke-opacity:${opacity};fill:none" x1="139.14" y1="33.08" x2="33.08" y2="139.14"/>
      <line style="stroke:${color};stroke-miterlimit:10;stroke-width:1px;stroke-opacity:${opacity};fill:none" x1="141.92" y1="35.86" x2="35.86" y2="141.92"/>
      <line style="stroke:${color};stroke-miterlimit:10;stroke-width:1px;stroke-opacity:${opacity};fill:none" x1="144.7" y1="38.63" x2="38.63" y2="144.7"/>
      <line style="stroke:${color};stroke-miterlimit:10;stroke-width:1px;stroke-opacity:${opacity};fill:none" x1="147.48" y1="41.41" x2="41.41" y2="147.48"/>
      <line style="stroke:${color};stroke-miterlimit:10;stroke-width:1px;stroke-opacity:${opacity};fill:none" x1="150.25" y1="44.19" x2="44.19" y2="150.25"/>
      <line style="stroke:${color};stroke-miterlimit:10;stroke-width:1px;stroke-opacity:${opacity};fill:none" x1="153.03" y1="46.97" x2="46.97" y2="153.03"/>
    </pattern>`,
  ];
}

class DifferenceArea extends Plot.Mark {
  constructor(data, { x, y1, y2, fill, fillOpacity = 1 } = {}) {
    super(
      data,
      {
        x: { value: x, scale: "x" },
        y1: { value: y1, scale: "y" },
        y2: { value: y2, scale: "y" },
      },
      {},
      { ariaLabel: "difference-area" },
    );
    this.fill = fill;
    this.fillOpacity = fillOpacity;
  }

  render(index, scales, channels, dimensions, context) {
    const X = channels.x.value ?? channels.x;
    const Y1 = channels.y1.value ?? channels.y1;
    const Y2 = channels.y2.value ?? channels.y2;
    const x = (i) => (Number.isFinite(X[i]) ? X[i] : scales.x(X[i]));
    const y1 = (i) => (Number.isFinite(Y1[i]) ? Y1[i] : scales.y(Y1[i]));
    const y2 = (i) => (Number.isFinite(Y2[i]) ? Y2[i] : scales.y(Y2[i]));
    const facets = typeof index[0] === "number" ? [index] : index;
    const group = context.document.createElementNS(
      "http://www.w3.org/2000/svg",
      "g",
    );
    group.setAttribute("aria-label", "difference-area");

    for (const facet of facets) {
      const points = Array.from(facet)
        .filter(
          (i) =>
            X[i] != null &&
            Number.isFinite(y1(i)) &&
            Number.isFinite(y2(i)),
        )
        .sort((a, b) => X[a] - X[b]);
      if (points.length < 2) continue;

      const binance = line().curve(curveBasis).x(x).y(y1)(points);
      const oficial = line()
        .curve(curveStepBefore)
        .x(x)
        .y(y2)(points.slice().reverse());
      if (!binance || !oficial) continue;

      const path = context.document.createElementNS(
        "http://www.w3.org/2000/svg",
        "path",
      );
      path.setAttribute("d", `${binance}${oficial.replace(/^M/, "L")}Z`);
      path.setAttribute("fill", this.fill);
      path.setAttribute("fill-opacity", this.fillOpacity);
      path.setAttribute("stroke", "none");
      group.appendChild(path);
    }

    return group.childNodes.length ? group : null;
  }
}

export function drawPlot(data, oficial, width, campo_precio, dias, dark) {
  const ahora = new Date();
  const desde = new Date(ahora - dias * 86400000);

  data = data.filter((d) => d[campo_precio] && d.timestamp >= desde);
  const oficial_corto = oficial.filter((d) => d.value && d.timestamp >= desde);
  oficial = oficial.map((d) => {
    const proximo_dia = new Date(d.timestamp.getTime() + 86400000);
    return {
      ...d,
      fin: ahora < proximo_dia ? ahora : proximo_dia,
    };
  });
  const ultimo_oficial = oficial.slice(-1)[0];
  oficial = [
    ...oficial,
    ...[
      {
        timestamp: ultimo_oficial.fin,
        value: ultimo_oficial.value,
        fin: ultimo_oficial.fin,
        fuente: ultimo_oficial.fuente,
      },
    ],
  ];

  console.log(dias);

  const hours =
    (data.slice(-1)[0].timestamp - data[0].timestamp) / (1000 * 60 * 60);
  const days = hours / 24;
  const hoursFit = width / hours > 3;

  const colors = getPalette(dark);
  const colorOficial = (d) => sourceColor(colors, d.fuente);

  const [min, max] = [
    ...data.map((d) => d[campo_precio]),
    ...oficial_corto.map((d) => d.value),
  ].reduce(
    ([min, max], d) => [Math.min(min, d), Math.max(max, d)],
    [Infinity, -Infinity],
  );

  const yDomain = [min * 0.97, max * 1.03];

  const tickScale = {
    tickSize: 0,
    label: null,
  };

  const x = {
    ...tickScale,
    type: "time",
    domain: [desde, ahora],
  };
  const yTicksCount = 10;
  const y = {
    ...tickScale,
    axis: "right",
    clamp: true,
    domain: yDomain,
    ticks: yTicksCount,
    tickFormat: ".1f",
    zero: false,
  };

  const dotMedian = {
    x: "timestamp",
    y: campo_precio,
  };
  const dotOficial = {
    x: "timestamp",
    y: "value",
  };
  let oficialIndex = 0;
  const oficialPointer = data.flatMap((d) => {
    while (
      oficialIndex < oficial.length - 1 &&
      oficial[oficialIndex + 1].timestamp <= d.timestamp
    ) {
      oficialIndex++;
    }
    return oficial[oficialIndex]?.timestamp <= d.timestamp
      ? [
          {
            ...d,
            value: oficial[oficialIndex].value,
            fuente: oficial[oficialIndex].fuente,
            binance: d[campo_precio],
          },
        ]
      : [];
  });
  const oficialAlineado = oficialPointer.map((d, i) => ({
    ...d,
    fin: oficialPointer[i + 1]?.timestamp ?? ahora,
  }));
  const oficialTramos = [];
  for (const d of oficialAlineado) {
    const ultimo = oficialTramos.at(-1);
    if (ultimo && ultimo.fuente === d.fuente && ultimo.value === d.value) {
      ultimo.fin = d.fin;
    } else {
      oficialTramos.push({ ...d });
    }
  }
  const referencial = oficialTramos.filter((d) => d.fuente === "referencial");
  const oficialNuevo = oficialTramos.filter((d) => d.fuente === "oficial");
  const ultimoReferencial = referencial.slice(-1)[0];
  const primerOficial = oficialNuevo[0];
  const lineaReferencial =
    ultimoReferencial && primerOficial
      ? [
          ...referencial,
          { ...ultimoReferencial, timestamp: primerOficial.timestamp },
          primerOficial,
        ]
      : referencial;
  const lineaOficial =
    oficialNuevo.length > 0
      ? [
          ...oficialNuevo,
          { ...oficialNuevo.at(-1), timestamp: oficialNuevo.at(-1).fin },
        ]
      : oficialNuevo;
  const ultimo = data.slice(-1);
  const ultimoOficial = oficialPointer.slice(-1);

  const plot = Plot.plot({
    height: 550,
    marginTop: 20,
    marginLeft: 5,
    marginBottom: 35,
    style: {
      color: colors.base,
    },
    width,
    x,
    y,
    marks: [
      hoursFit
        ? Plot.axisX({
            tickSize: 4,
            stroke: colors.base,
            ticks: "hour",
            strokeOpacity: 0.5,
            tickFormat: "",
            //   filter: (d) => d.getHours() > 0,
          })
        : null,
      Plot.axisX({
        tickSize: 0,
        stroke: colors.base,
        ticks: days < 8 ? days : 8,
        tickFormat: timeTickFormat(),
        lineHeight: 1.2,
      }),
      Plot.gridY({
        ticks: yTicksCount,
        strokeDasharray: "1,3",
        strokeOpacity: 1,
        strokeWidth: 0.3,
      }),
      new DifferenceArea(oficialPointer, {
        x: "timestamp",
        y1: "binance",
        y2: "value",
        fill: colors.alerta,
        fillOpacity: 0.1,
      }),
      withPattern(
        { color: colors.referencial, id: "pattern-referencial", opacity: 0.3 },
        (fill) =>
          Plot.rectY(referencial, {
            x1: "timestamp",
            x2: "fin",
            y: "value",
            fill,
          }),
      ),
      withPattern(
        { color: colors.oficial, id: "pattern-oficial", opacity: 0.5 },
        (fill) =>
          Plot.rectY(oficialNuevo, {
            x1: "timestamp",
            x2: "fin",
            y: "value",
            fill,
          }),
      ),
      Plot.ruleX(
        oficialPointer,
        Plot.pointerX({
          x: "timestamp",
          y1: "binance",
          y2: "value",
          stroke: colors.alerta,
          strokeWidth: 2,
          strokeOpacity: d => Math.abs(d.value - d.binance),
        }),
      ),
      Plot.line(lineaReferencial, {
        ...dotOficial,
        curve: "step-after",
        stroke: colors.referencial,
        strokeWidth: 1.5,
        strokeOpacity: 0.7,
        sort: "timestamp",
      }),
      Plot.line(lineaOficial, {
        ...dotOficial,
        curve: "step-after",
        stroke: colors.oficial,
        strokeWidth: 2,
        strokeOpacity: 0.7,
        sort: "timestamp",
      }),
      Plot.dot(ultimoOficial, {
        ...dotOficial,
        className: "initial-selection",
        r: 4,
        fill: colorOficial,
        fillOpacity: 1,
        stroke: colorOficial,
        strokeWidth: 10,
        strokeOpacity: 0.2,
      }),
      Plot.dot(
        oficialPointer,
        Plot.pointerX({
          ...dotOficial,
          r: 4,
          fill: colorOficial,
          fillOpacity: 1,
          stroke: colorOficial,
          strokeWidth: 10,
          strokeOpacity: 0.2,
        }),
      ),
      withGradient({ color: colors.figures }, (fill) =>
        Plot.areaY(data, {
          ...dotMedian,
          fill,
          curve: "basis",
        }),
      ),
      Plot.line(data, {
        ...dotMedian,
        curve: "basis",
        stroke: colors.figures,
        strokeWidth: 1,
        sort: "timestamp",
      }),
      Plot.dot(ultimo, {
        ...dotMedian,
        className: "initial-selection",
        r: 4,
        fill: colors.figures,
        fillOpacity: 1,
        stroke: colors.figures,
        strokeWidth: 10,
        strokeOpacity: 0.2,
      }),
      Plot.dot(
        data,
        Plot.pointerX({
          ...dotMedian,
          r: 4,
          fill: colors.figures,
          fillOpacity: 1,
          stroke: colors.figures,
          strokeWidth: 10,
          strokeOpacity: 0.2,
        }),
      ),
    ],
  });
  const activateSelection = () => {
    plot.dataset.selection = "active";
  };
  const clearSelection = () => {
    delete plot.dataset.selection;
  };
  const syncSelection = () => {
    requestAnimationFrame(() => {
      if (plot.value) {
        activateSelection();
      } else {
        clearSelection();
      }
    });
  };
  plot.addEventListener("pointerdown", activateSelection, { passive: true });
  plot.addEventListener("pointermove", activateSelection, { passive: true });
  plot.addEventListener("input", syncSelection);
  plot.addEventListener("pointerleave", syncSelection, { passive: true });
  plot.addEventListener("pointercancel", syncSelection, { passive: true });
  plot.addEventListener("pointerup", syncSelection, { passive: true });
  return plot;
}

export function displayObservation(
  observation,
  campo_precio,
  precio_oficial,
  etiqueta_oficial,
  color_oficial,
  color_binance,
) {
  const numberFormat = format(".2f");
  const timeFormat = Intl.DateTimeFormat("es-BO", {
    month: "long",
    year: "numeric",
    day: "numeric",
    hour: "numeric",
    hour12: false,
    minute: "2-digit",
  });
  return html`<div class="observation">
    <div class="price">
      <div class="mid">
        <div class="varieties">
          <div class="variety">
            <div class="annotation fuente" style=${{ color: color_oficial }}>
              ${etiqueta_oficial}
            </div>
            <div class="midValue">
              <div class="value oficial" style=${{ color: color_oficial }}>
                ${precio_oficial ? numberFormat(precio_oficial) : "~"}
              </div>
            </div>
          </div>

          <div class="variety">
            <div class="annotation fuente" style=${{ color: color_binance }}>
              Binance
            </div>
            <div class="midValue">
              <div class="value">
                ${numberFormat(observation[campo_precio])}
              </div>
            </div>
          </div>
        </div>
        <div class="annotation">Bs. por 1 Dólar</div>
      </div>
    </div>
    <div class="date">${timeFormat.format(observation.timestamp)}</div>
  </div>`;
}
