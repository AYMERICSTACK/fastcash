export type Currency = "CHF" | "EUR";

export const EUR_RATE = 1316.1 / 1239.9;

export function normalizeCurrency(value: unknown): Currency {
  return value === "EUR" ? "EUR" : "CHF";
}

export function convertFromCHF(valueCHF: number, currency: Currency) {
  return currency === "EUR" ? valueCHF * EUR_RATE : valueCHF;
}

export function formatCurrencyFromCHF(valueCHF: number, currency: Currency) {
  const value = convertFromCHF(valueCHF, currency);

  return new Intl.NumberFormat("fr-CH", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}
