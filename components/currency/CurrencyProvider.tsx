"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { convertFromCHF, EUR_RATE, formatCurrencyFromCHF, type Currency } from "@/lib/currency";

const STORAGE_KEY = "fc_currency";

type CurrencyContextType = {
  currency: Currency;
  setCurrency: (currency: Currency) => void;
  convertPrice: (valueCHF: number) => number;
  formatPrice: (valueCHF: number) => string;
  rate: number;
};

const CurrencyContext = createContext<CurrencyContextType | null>(null);

export function convertCHF(valueCHF: number, currency: Currency) {
  return convertFromCHF(valueCHF, currency);
}

export function CurrencyProvider({
  children,
  defaultCurrency = "CHF",
}: {
  children: React.ReactNode;
  defaultCurrency?: Currency;
}) {
  const [currency, setCurrencyState] = useState<Currency>(defaultCurrency);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);

    if (stored === "EUR" || stored === "CHF") {
      setCurrencyState(stored);
      return;
    }

    setCurrencyState(defaultCurrency);
  }, [defaultCurrency]);

  const setCurrency = (nextCurrency: Currency) => {
    setCurrencyState(nextCurrency);
    localStorage.setItem(STORAGE_KEY, nextCurrency);
  };

  const value = useMemo(
    () => ({
      currency,
      setCurrency,
      rate: EUR_RATE,
      convertPrice: (valueCHF: number) => convertCHF(valueCHF, currency),
      formatPrice: (valueCHF: number) => formatCurrencyFromCHF(valueCHF, currency),
    }),
    [currency],
  );

  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>;
}

export function useCurrency() {
  const context = useContext(CurrencyContext);

  if (!context) {
    throw new Error("CurrencyProvider missing");
  }

  return context;
}
