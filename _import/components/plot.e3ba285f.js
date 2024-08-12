import * as Plot from "../../_npm/@observablehq/plot@0.6.16/_esm.js";
import { html, svg } from "../../_npm/htl@0.3.1/_esm.js";
import { format } from "../../_npm/d3@7.9.0/_esm.js";

const customFormat = () => {
    const years = new Set();
    const months = new Set();

    const monthFormat = Plot.formatMonth("es-BO");
    return (d) => {
        const day = d.getDate();
        const month = monthFormat(d.getMonth());
        const year = d.getFullYear();
        const monthString = `${month}\n${year}`;

        if (!years.has(year)) {
            years.add(year);
            months.add(monthString);
            return monthString;
        } else if (!months.has(monthString)) {
            months.add(monthString);
            return month;
        } else {
            return day;
        }
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

export function drawPlot(data, width, campo_precio) {
    data = data.filter((d) => d[campo_precio]);
    const hours =
        (data.slice(-1)[0].timestamp - data[0].timestamp) / (1000 * 60 * 60);
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

    const scale = {
        tickSize: 0,
        label: null,
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
        marginTop: 20,
        marginLeft: 5,
        marginBottom: 35,
        style: {
            color: colors.base,
        },
        width,
        x: {
            ...scale,
            type: "time",
        },
        y: {
            ...scale,
            axis: "right",
            zero: false,
            clamp: true,
            domain: [min * 0.97, max * 1.03],
        },
        marks: [
            hoursFit
                ? Plot.axisX({
                      tickSize: 4,
                      stroke: colors.base,
                      ticks: "hour",
                      strokeOpacity: 0.5,
                      tickFormat: "",
                      filter: (d) => d.getHours() > 0,
                  })
                : null,
            Plot.axisX({
                tickSize: 8,
                stroke: colors.base,
                ticks: 5,
                tickFormat: customFormat(),
                lineHeight: 1.2,
            }),
            Plot.gridY({}),
            withGradient(
                { color: colors.figures},
                (fill) =>
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
