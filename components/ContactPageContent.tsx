"use client";

import Link from "next/link";
import ContactForm from "@/components/ContactForm";
import { useI18n } from "@/lib/i18n";
import { useShopSettings } from "@/components/settings/ShopSettingsProvider";

export default function ContactPageContent() {
  const { dict } = useI18n();
  const copy = dict.contact;
  const settings = useShopSettings();

  const contactCards = [
    {
      label: copy.cards.store.label,
      title: copy.cards.store.title,
      text: `${settings.addressLine1}, ${settings.postalCode} ${settings.city}`,
      href: settings.mapsUrl,
      action: copy.cards.store.action,
    },
    {
      label: copy.cards.phone.label,
      title: settings.phoneDisplay,
      text: copy.cards.phone.text,
      href: `tel:${settings.phoneHref}`,
      action: copy.cards.phone.action,
    },
    {
      label: copy.cards.email.label,
      title: settings.publicEmail,
      text: copy.cards.email.text,
      href: `mailto:${settings.publicEmail}`,
      action: copy.cards.email.action,
    },
  ];

  return (
    <main className="contact-premium-page">
      <section className="contact-hero section">
        <div className="container contact-hero-grid">
          <div className="contact-hero-copy">
            <p className="hero-kicker">{copy.heroKicker}</p>
            <h1 className="title-lg">{copy.title}</h1>
            <p className="muted">{copy.intro}</p>
            <div className="contact-hero-actions">
              <Link href={`tel:${settings.phoneHref}`} className="btn btn-gold">
                {copy.callStore}
              </Link>
              <Link href="/estimation" className="btn btn-light">
                {copy.estimate}
              </Link>
            </div>
          </div>

          <div className="contact-store-card" aria-label={copy.storeLabel}>
            <span>{copy.storeLabel}</span>
            <strong>{settings.addressLine1}</strong>
            <p>{settings.postalCode} {settings.city}</p>
            <div className="contact-store-divider" />
            <a href={`tel:${settings.phoneHref}`}>+41 22 731 16 63</a>
            <small>{copy.storeSmall}</small>
          </div>
        </div>
      </section>

      <section className="section contact-main-section">
        <div className="container contact-main-grid">
          <div className="contact-panel contact-form-panel">
            <p className="hero-kicker">{copy.messageKicker}</p>
            <h2>{copy.formTitle}</h2>
            <p className="muted">{copy.formIntro}</p>
            <ContactForm />
          </div>

          <aside className="contact-side-stack" aria-label={copy.detailsKicker}>
            <div className="contact-panel">
              <p className="hero-kicker">{copy.detailsKicker}</p>
              <div className="contact-card-list">
                {contactCards.map((card) => (
                  <a
                    key={card.label}
                    href={card.href}
                    className="contact-info-card"
                    target={card.href.startsWith("http") ? "_blank" : undefined}
                    rel={card.href.startsWith("http") ? "noreferrer" : undefined}
                  >
                    <span>{card.label}</span>
                    <strong>{card.title}</strong>
                    <p>{card.text}</p>
                    <small>{card.action} →</small>
                  </a>
                ))}
              </div>
            </div>

            <div className="contact-panel contact-hours-card">
              <p className="hero-kicker">{copy.hoursKicker}</p>
              <h2>{copy.hoursTitle}</h2>
              <div className="contact-hours-list">
                {settings.hours.map((item) => (
                  <div key={item.key}>
                    <span>{item.fr}</span>
                    <strong>{item.time}</strong>
                  </div>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </section>

      <section className="section contact-map-section">
        <div className="container">
          <div className="contact-map-card">
            <div>
              <p className="hero-kicker">{copy.mapKicker}</p>
              <h2>{copy.mapTitle}</h2>
              <p className="muted">{copy.mapText}</p>
            </div>
            <a
              href={settings.mapsUrl}
              target="_blank"
              rel="noreferrer"
              className="btn btn-dark"
            >
              {copy.mapCta}
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}
