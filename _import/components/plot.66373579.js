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

export function drawPlot(data, width, campo_precio, dias) {
    const ahora = new Date();
    const desde = new Date(ahora - dias * 86400000);

    data = data.filter((d) => d[campo_precio] && d.timestamp >= desde);

    const hours =
        (data.slice(-1)[0].timestamp - data[0].timestamp) / (1000 * 60 * 60);
    const days = hours / 24;
    const hoursFit = width / hours > 3;

    const colors = {
        base: "#a3a3a3",
        figures: "#34A853",
    };

    const [min, max] = data.reduce(
        ([min, max], d) => [
            Math.min(min, d[campo_precio]),
            Math.max(max, d[campo_precio]),
        ],
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

    return Plot.plot({
        height: 500,
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
                strokeWidth: .3
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

export function displayObservation(observation, campo_precio) {
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
            <div class="median">
                <div class="medianValue">
                    <div class="currency">Bs.</div>
                    <div class="value">
                        ${numberFormat(observation[campo_precio])}
                    </div>
                </div>
                <div class="annotation">por 1 Dólar</div>
            </div>
            <div class="limit">
                <div>${numberFormat(observation.high)}</div>
                <div class="annotation">hasta</div>
            </div>
        </div>
        <div class="date">${timeFormat.format(observation.timestamp)}</div>
    </div>`;
}
