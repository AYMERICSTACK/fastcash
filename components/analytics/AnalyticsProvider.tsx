"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  ANALYTICS_CONSENT_EVENT,
  getAnalyticsConsent,
  setAnalyticsConsent,
  type AnalyticsConsent,
} from "@/lib/analytics";

const PRIVATE_PREFIXES = ["/admin", "/pilotage", "/api"];

function isPublicPath(pathname: string) {
  return !PRIVATE_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

export default function AnalyticsProvider({ measurementId }: { measurementId?: string }) {
  const pathname = usePathname();
  const [consent, setConsentState] = useState<AnalyticsConsent | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const publicPath = isPublicPath(pathname);

  useEffect(() => {
    setConsentState(getAnalyticsConsent());

    const onConsent = (event: Event) => {
      const detail = (event as CustomEvent<AnalyticsConsent>).detail;
      if (detail === "granted" || detail === "denied") setConsentState(detail);
    };
    const onOpen = () => setSettingsOpen(true);

    window.addEventListener(ANALYTICS_CONSENT_EVENT, onConsent);
    window.addEventListener("fc:analytics-open-settings", onOpen);
    return () => {
      window.removeEventListener(ANALYTICS_CONSENT_EVENT, onConsent);
      window.removeEventListener("fc:analytics-open-settings", onOpen);
    };
  }, []);

  useEffect(() => {
    if (!measurementId || consent !== "granted" || !publicPath) return;

    window.dataLayer = window.dataLayer || [];
    // Google's gtag.js expects each command to be queued as the native
    // `arguments` object (same shape as the official Google snippet).
    // Pushing the rest-parameter array here prevents GA4 from dispatching hits.
    if (!window.gtag) {
      window.gtag = (function gtag() {
        window.dataLayer?.push(arguments);
      }) as (...args: unknown[]) => void;
    }

    if (!document.querySelector(`script[data-fc-ga4="${measurementId}"]`)) {
      const script = document.createElement("script");
      script.async = true;
      script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`;
      script.dataset.fcGa4 = measurementId;
      document.head.appendChild(script);

      window.gtag("js", new Date());
      window.gtag("config", measurementId, {
        send_page_view: false,
        allow_google_signals: false,
        allow_ad_personalization_signals: false,
      });
    }
  }, [consent, measurementId, publicPath]);

  useEffect(() => {
    if (!measurementId || consent !== "granted" || !publicPath || !window.gtag) return;
    window.gtag("event", "page_view", {
      page_path: `${pathname}${window.location.search || ""}`,
      page_location: window.location.href,
      page_title: document.title,
    });
  }, [consent, measurementId, pathname, publicPath]);

  if (!measurementId || !publicPath) return null;
  const showBanner = consent === null || settingsOpen;
  if (!showBanner) return null;

  const choose = (value: AnalyticsConsent) => {
    setAnalyticsConsent(value);
    setConsentState(value);
    setSettingsOpen(false);
  };

  return (
    <div className="analytics-consent" role="dialog" aria-live="polite" aria-label="Préférences Analytics">
      <div className="analytics-consent-copy">
        <strong>Mesure d’audience FAST CASH</strong>
        <p>
          Nous utilisons Google Analytics uniquement avec votre accord pour comprendre la fréquentation du site et améliorer l’expérience.
          Les cookies nécessaires au panier et à la connexion restent indépendants de ce choix.
        </p>
        <Link href="/politique-cookies">En savoir plus</Link>
      </div>
      <div className="analytics-consent-actions">
        <button type="button" className="btn analytics-consent-secondary" onClick={() => choose("denied")}>Refuser</button>
        <button type="button" className="btn btn-gold" onClick={() => choose("granted")}>Accepter</button>
      </div>
    </div>
  );
}
