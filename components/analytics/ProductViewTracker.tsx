"use client";

import { useEffect, useRef } from "react";
import type { Product } from "@/lib/products";
import { productAnalyticsItem, trackAnalyticsEvent } from "@/lib/analytics";

export default function ProductViewTracker({ product }: { product: Product }) {
  const tracked = useRef(false);
  useEffect(() => {
    if (tracked.current) return;
    tracked.current = true;
    trackAnalyticsEvent("view_item", {
      currency: "CHF",
      value: Number(product.price) || 0,
      items: [productAnalyticsItem(product)],
    });
  }, [product]);
  return null;
}
