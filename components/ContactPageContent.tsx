"use client";

import Link from "next/link";
import ContactForm from "@/components/ContactForm";
import { useI18n } from "@/lib/i18n";

export default function ContactPageContent() {
  const { dict } = useI18n();
  const copy = dict.contact;

  const contactCards = [
    {
      label: copy.cards.store.label,
      title: copy.cards.store.title,
      text: copy.cards.store.text,
      href: "https://www.google.com/maps/search/?api=1&query=Rue%20de%20Monthoux%2027%201201%20Gen%C3%A8ve",
      action: copy.cards.store.action,
    },
    {
      label: copy.cards.phone.label,
      title: copy.cards.phone.title,
      text: copy.cards.phone.text,
      href: "tel:+41227311663",
      action: copy.cards.phone.action,
    },
    {
      label: copy.cards.email.label,
      title: copy.cards.email.title,
      text: copy.cards.email.text,
      href: "mailto:contact@fastcash-geneve.ch",
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
              <Link href="tel:+41227311663" className="btn btn-gold">
                {copy.callStore}
              </Link>
              <Link href="/estimation" className="btn btn-light">
                {copy.estimate}
              </Link>
            </div>
          </div>

          <div className="contact-store-card" aria-label={copy.storeLabel}>
            <span>{copy.storeLabel}</span>
            <strong>{copy.addressLine1}</strong>
            <p>{copy.addressLine2}</p>
            <div className="contact-store-divider" />
            <a href="tel:+41227311663">+41 22 731 16 63</a>
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
                {copy.hours.map(([day, time]) => (
                  <div key={day}>
                    <span>{day}</span>
                    <strong>{time}</strong>
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
              href="https://www.google.com/maps/search/?api=1&query=Rue%20de%20Monthoux%2027%201201%20Gen%C3%A8ve"
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
