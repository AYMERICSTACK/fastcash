"use client";

export const ANALYTICS_CONSENT_KEY = "fc_analytics_consent";
export const ANALYTICS_CONSENT_EVENT = "fc:analytics-consent";

export type AnalyticsConsent = "granted" | "denied";

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

export function getAnalyticsConsent(): AnalyticsConsent | null {
  if (typeof window === "undefined") return null;
  const value = window.localStorage.getItem(ANALYTICS_CONSENT_KEY);
  return value === "granted" || value === "denied" ? value : null;
}

export function setAnalyticsConsent(value: AnalyticsConsent) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(ANALYTICS_CONSENT_KEY, value);
  window.dispatchEvent(new CustomEvent(ANALYTICS_CONSENT_EVENT, { detail: value }));
}

export function openAnalyticsConsentSettings() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("fc:analytics-open-settings"));
}

export function trackAnalyticsEvent(name: string, params: Record<string, unknown> = {}) {
  if (typeof window === "undefined") return;
  if (getAnalyticsConsent() !== "granted") return;
  window.gtag?.("event", name, params);
}

export function productAnalyticsItem(product: {
  id: string | number;
  name: string;
  price: number;
  category?: string;
  brand?: string;
  reference?: string;
}, quantity = 1) {
  return {
    item_id: String(product.reference || product.id),
    item_name: product.name,
    item_category: product.category || undefined,
    item_brand: product.brand || undefined,
    price: Number(product.price) || 0,
    quantity,
  };
}
