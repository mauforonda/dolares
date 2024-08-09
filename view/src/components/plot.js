import * as Plot from "npm:@observablehq/plot";
import { html, svg } from "npm:htl";
import { format } from "npm:d3";

function withGradient({ color, limit, id = "gradient" }, callback) {
    return [
        callback(`url(#${id})`),
        () => svg`<defs>
        <linearGradient id=${id} gradientTransform="rotate(90)">
          <stop offset=0% stop-color=${color} stop-opacity=0.3 />
          <stop offset=${limit}% stop-color=${color} stop-opacity=0 />
        </linearGradient>
      </defs>`,
    ];
}

export function drawPlot(data, width) {
    const colors = {
        base: "#a3a3a3",
        figures: "#34A853",
    };

    const [min, max] = data.reduce(
        ([min, max], { median }) => [
            Math.min(min, median),
            Math.max(max, median),
        ],
        [Infinity, -Infinity]
    );

    const lowMin = data.reduce(
        (lowLimit, { low }) => Math.min(lowLimit, low),
        Infinity
    );
    const lowLimit = (max - min * 0.97) / (max - lowMin);

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
        y: "median",
    };

    return Plot.plot({
        marginTop: 20,
        marginLeft: 5,
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
            domain: [min * 0.97, max * 1.03],
        },
        marks: [
            Plot.gridY({}),
            withGradient(
                { color: colors.figures, limit: (lowLimit * 100) / 2 },
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
                    r: "offers",
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

export function displayObservation(observation) {
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
                    <div class="value">${numberFormat(observation.median)}</div>
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
