"use client";

import { useCurrency } from "./CurrencyProvider";

export default function CurrencyPrice({ value }: { value: number }) {
  const { formatPrice } = useCurrency();

  return <>{formatPrice(value)}</>;
}
