import * as d3 from "d3";
import { OFFICIAL_CUTOFF } from "../data/load-series.js";

const formatRate = d3.format(".2f");
const officialCutoff = new Date(`${OFFICIAL_CUTOFF}T00:00:00-04:00`);

export function mount(element, selectedData) {
  const rateParts = [
    {
      dataKey: "official",
      integer: element.querySelector(".official-rate__integer"),
      decimal: element.querySelector(".official-rate__decimal"),
    },
    {
      dataKey: "binance",
      integer: element.querySelector(".binance-rate__integer"),
      decimal: element.querySelector(".binance-rate__decimal"),
    },
  ];
  const officialLabel = element.querySelector(".official-rate-label");

  function update(data) {
    for (const rate of rateParts) {
      const value = data?.[rate.dataKey];
      const [whole = "", fraction = ""] = value == null
        ? []
        : formatRate(value).split(".");
      rate.integer.textContent = whole;
      rate.decimal.textContent = fraction;
    }

    officialLabel.textContent = !data
      ? ""
      : data.timestamp >= officialCutoff
        ? "Oficial"
        : "Referencial";
  }

  update(selectedData);
  return { update };
}
