import * as Plot from "../../_npm/@observablehq/plot@0.6.17/_esm.js";

import { html, svg } from "../../_npm/htl@0.3.1/_esm.js";
import { format } from "../../_npm/d3@7.9.0/_esm.js";

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
          <stop offset=0% stop-color=${color} stop-opacity=0.3 />
          <stop offset=100% stop-color=${color} stop-opacity=0 />
        </linearGradient>
      </defs>`,
  ];
}

function withPattern({ color, opacity = 0.7, id = "gradient" }, callback) {
  return [
    callback(`url(#${id})`),
    () => svg`<defs>
    <pattern id="${id}" x="0" y="0" width="100" height="100" patternUnits="userSpaceOnUse" patternTransform="translate(-79.53 183.07)">
      <rect fill="none" width="100" height="100"/>
      <line style="stroke:${color};stroke-miterlimit:10;stroke-width:1px;stroke-opacity:${opacity};fill:none" x1="53.03" y1="-53.03" x2="-53.03" y2="53.03"/>
      <line style="stroke:${color};stroke-miterlimit:10;stroke-width:1px;stroke-opacity:${opacity};fill:none" x1="58.59" y1="-47.48" x2="-47.48" y2="58.59"/>
      <line style="stroke:${color};stroke-miterlimit:10;stroke-width:1px;stroke-opacity:${opacity};fill:none" x1="64.14" y1="-41.92" x2="-41.92" y2="64.14"/>
      <line style="stroke:${color};stroke-miterlimit:10;stroke-width:1px;stroke-opacity:${opacity};fill:none" x1="69.7" y1="-36.37" x2="-36.37" y2="69.7"/>
      <line style="stroke:${color};stroke-miterlimit:10;stroke-width:1px;stroke-opacity:${opacity};fill:none" x1="75.26" y1="-30.81" x2="-30.81" y2="75.26"/>
      <line style="stroke:${color};stroke-miterlimit:10;stroke-width:1px;stroke-opacity:${opacity};fill:none" x1="80.81" y1="-25.26" x2="-25.26" y2="80.81"/>
      <line style="stroke:${color};stroke-miterlimit:10;stroke-width:1px;stroke-opacity:${opacity};fill:none" x1="86.37" y1="-19.7" x2="-19.7" y2="86.37"/>
      <line style="stroke:${color};stroke-miterlimit:10;stroke-width:1px;stroke-opacity:${opacity};fill:none" x1="91.92" y1="-14.14" x2="-14.14" y2="91.92"/>
      <line style="stroke:${color};stroke-miterlimit:10;stroke-width:1px;stroke-opacity:${opacity};fill:none" x1="97.48" y1="-8.59" x2="-8.59" y2="97.48"/>
      <line style="stroke:${color};stroke-miterlimit:10;stroke-width:1px;stroke-opacity:${opacity};fill:none" x1="103.03" y1="-3.03" x2="-3.03" y2="103.03"/>
      <line style="stroke:${color};stroke-miterlimit:10;stroke-width:1px;stroke-opacity:${opacity};fill:none" x1="108.59" y1="2.52" x2="2.52" y2="108.59"/>
      <line style="stroke:${color};stroke-miterlimit:10;stroke-width:1px;stroke-opacity:${opacity};fill:none" x1="114.14" y1="8.08" x2="8.08" y2="114.14"/>
      <line style="stroke:${color};stroke-miterlimit:10;stroke-width:1px;stroke-opacity:${opacity};fill:none" x1="119.7" y1="13.63" x2="13.63" y2="119.7"/>
      <line style="stroke:${color};stroke-miterlimit:10;stroke-width:1px;stroke-opacity:${opacity};fill:none" x1="125.26" y1="19.19" x2="19.19" y2="125.26"/>
      <line style="stroke:${color};stroke-miterlimit:10;stroke-width:1px;stroke-opacity:${opacity};fill:none" x1="130.81" y1="24.74" x2="24.74" y2="130.81"/>
      <line style="stroke:${color};stroke-miterlimit:10;stroke-width:1px;stroke-opacity:${opacity};fill:none" x1="136.37" y1="30.3" x2="30.3" y2="136.37"/>
      <line style="stroke:${color};stroke-miterlimit:10;stroke-width:1px;stroke-opacity:${opacity};fill:none" x1="141.92" y1="35.86" x2="35.86" y2="141.92"/>
      <line style="stroke:${color};stroke-miterlimit:10;stroke-width:1px;stroke-opacity:${opacity};fill:none" x1="147.48" y1="41.41" x2="41.41" y2="147.48"/>
      <line style="stroke:${color};stroke-miterlimit:10;stroke-width:1px;stroke-opacity:${opacity};fill:none" x1="153.03" y1="46.97" x2="46.97" y2="153.03"/>
    </pattern>`,
  ];
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
      },
    ],
  ];

  const hours =
    (data.slice(-1)[0].timestamp - data[0].timestamp) / (1000 * 60 * 60);
  const days = hours / 24;
  const hoursFit = width / hours > 3;

  const colors = {
    base: dark ? "#d7e7f7" : "#4f6882",
    background: "#eff4f4",
    figures: "#34A853",
    oficial: "#4da4c4ff",
  };

  const [min, max] = [
    ...data.map((d) => d[campo_precio]),
    ...oficial_corto.map((d) => d.value),
  ].reduce(
    ([min, max], d) => [Math.min(min, d), Math.max(max, d)],
    [Infinity, -Infinity]
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

  const dotLimit = {
    x: "timestamp",
    r: 2,
    stroke: null,
    fill: colors.base,
  };

  const dotMedian = {
    x: "timestamp",
    y: campo_precio,
  };
  const dotOficial = {
    x: "timestamp",
    y: "value",
  };

  return Plot.plot({
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
      withPattern(
        { color: colors.oficial, opacity: 0.3, id: "gradient_oficial" },
        (fill) =>
          Plot.rectY(oficial, {
            x1: "timestamp",
            x2: "fin",
            y: "value",
            fill,
          })
      ),
      Plot.line(oficial, {
        ...dotOficial,
        curve: "step-after",
        stroke: colors.oficial,
        strokeWidth: 2,
        strokeOpacity: 0.4,
        sort: "timestamp",
      }),
      withGradient({ color: colors.figures }, (fill) =>
        Plot.areaY(data, {
          ...dotMedian,
          fill,
          curve: "basis",
        })
      ),
      Plot.line(data, {
        ...dotMedian,
        curve: "basis",
        stroke: colors.figures,
        strokeWidth: 0.8,
        sort: "timestamp",
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
        })
      ),
      Plot.ruleX(
        data,
        Plot.pointerX({
          x: "timestamp",
          y1: "low",
          y2: "high",
          strokeWidth: 0.5,
          strokeOpacity: 0.9,
          strokeDasharray: 2,
        })
      ),
      Plot.dot(
        data,
        Plot.pointerX({
          ...dotLimit,
          y: "low",
        })
      ),
      Plot.dot(
        data,
        Plot.pointerX({
          ...dotLimit,
          y: "high",
        })
      ),
    ],
  });
}

export function displayObservation(observation, campo_precio, precio_oficial) {
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
      <div class="limit">
        <div>${numberFormat(observation.low)}</div>
        <div class="annotation">desde</div>
      </div>
      <div class="mid">
        <div class="varieties">
          <div class="variety">
            <div class="annotation fuente">Binance</div>
            <div class="midValue">
              <div class="value">
                ${numberFormat(observation[campo_precio])}
              </div>
            </div>
          </div>

          <div class="variety">
            <div class="annotation fuente">BCB</div>
            <div class="midValue">
              <div class="value oficial">
                ${precio_oficial ? numberFormat(precio_oficial) : "~"}
              </div>
            </div>
          </div>
        </div>
        <div class="annotation">Bs. por 1 Dólar</div>
      </div>
      <div class="limit">
        <div>${numberFormat(observation.high)}</div>
        <div class="annotation">hasta</div>
      </div>
    </div>
    <div class="date">${timeFormat.format(observation.timestamp)}</div>
  </div>`;
}
