export function alignOfficialRates(binance, officialRates, metric = "naive") {
  let officialIndex = 0;

  return binance.flatMap((row) => {
    while (
      officialIndex < officialRates.length - 1 &&
      officialRates[officialIndex + 1].timestamp <= row.timestamp
    ) {
      officialIndex++;
    }

    const rate = officialRates[officialIndex];
    return rate?.timestamp <= row.timestamp
      ? [
          {
            timestamp: row.timestamp,
            value: rate.value,
            binance: row[metric],
          },
        ]
      : [];
  });
}
