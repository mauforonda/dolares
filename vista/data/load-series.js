import * as d3 from "d3";

const DATA_URL = "https://raw.githubusercontent.com/mauforonda/dolares/main/datos";
export const OFFICIAL_CUTOFF = "2026-06-29";

function parseBankRate(row) {
  return {
    timestamp: new Date(`${row.timestamp}T00:00:00-04:00`),
    date: row.timestamp,
    bank: row.banco,
    value: +row.valor,
  };
}

function latestBankRates(rates) {
  const latestDate = d3.max(rates, (rate) => rate.date);
  return rates.filter((rate) => rate.date === latestDate);
}

export async function loadSeries() {
  const [binance, referential, official, bankSales, bankPurchases] = await Promise.all([
    d3.csv(`${DATA_URL}/binance/compra.csv`, d3.autoType),
    d3.csv(`${DATA_URL}/referencial_bcb/compra.csv`, (row) => ({
      timestamp: new Date(`${row.timestamp}T00:00:00-04:00`),
      date: row.timestamp,
      value: +row.value,
    })),
    d3.csv(`${DATA_URL}/oficial/compra.csv`, (row) => ({
      timestamp: new Date(`${row.timestamp}T00:00:00-04:00`),
      date: row.timestamp,
      value: +row.value,
    })),
    d3.csv(`${DATA_URL}/bancos/venta.csv`, parseBankRate),
    d3.csv(`${DATA_URL}/bancos/compra.csv`, parseBankRate),
  ]);

  const officialRates = [
    ...referential.filter((rate) => rate.date < OFFICIAL_CUTOFF),
    ...official.filter((rate) => rate.date >= OFFICIAL_CUTOFF),
  ].sort((a, b) => a.timestamp - b.timestamp);
  const bankRates = {
    venta: latestBankRates(bankSales),
    compra: latestBankRates(bankPurchases),
  };

  return { binance, officialRates, bankRates };
}
