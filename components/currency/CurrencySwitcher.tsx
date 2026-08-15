"use client";

import { useCurrency } from "./CurrencyProvider";
import type { Currency } from "@/lib/currency";

const currencies: Currency[] = ["CHF", "EUR"];

export default function CurrencySwitcher() {
  const { currency, setCurrency } = useCurrency();

  return (
    <div className="currency-switcher" aria-label="Changer de devise">
      {currencies.map((item) => (
        <button
          key={item}
          type="button"
          className={currency === item ? "is-active" : ""}
          onClick={() => setCurrency(item)}
          aria-pressed={currency === item}
        >
          {item === "EUR" ? "€" : item}
        </button>
      ))}
    </div>
  );
}
