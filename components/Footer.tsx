"use client";

import Image from "next/image";
import Link from "next/link";
import CurrencySwitcher from "@/components/currency/CurrencySwitcher";
import LanguageSwitcher from "@/components/language/LanguageSwitcher";
import { useI18n } from "@/lib/i18n";
import SocialLinks from "@/components/SocialLinks";
import { useShopSettings } from "@/components/settings/ShopSettingsProvider";

const categoryLinks = [
  { href: "/categories/montres", key: "watches" },
  { href: "/marques/apple", key: "apple" },
  { href: "/marques/samsung", key: "samsung" },
  { href: "/categories/maroquinerie", key: "leather" },
  { href: "/categories/bijoux", key: "jewelry" },
  { href: "/categories/informatique", key: "computers" },
  { href: "/categories/image-son", key: "imageSound" },
  { href: "/categories/consoles", key: "consoles" },
] as const;

const serviceLinks = [
  { href: "/estimation", key: "estimate" },
  { href: "/recherche", key: "search" },
  { href: "/panier", key: "cart" },
  { href: "/contact", key: "contact" },
] as const;

export default function Footer() {
  const { dict, locale } = useI18n();
  const footer = dict.footer;
  const settings = useShopSettings();

  return (
    <footer className="footer footer-premium">
      <div className="container">
        <div className="footer-premium-top">
          <div className="footer-brand-block">
            <Link href="/" className="footer-logo" aria-label="FAST CASH Genève">
              <span className="footer-logo-mark">
                <Image
                  src="/images/logo-fastcash-white.png"
                  alt="FAST CASH Genève"
                  width={48}
                  height={48}
                />
              </span>
              <span>
                <strong>FAST CASH</strong>
                <small>Genève</small>
              </span>
            </Link>

            <p className="footer-brand">{footer.brandText}</p>

            <address className="footer-address">
              <span>{settings.addressLine1}, {settings.postalCode} {settings.city}</span>
              <a href={`tel:${settings.phoneHref}`}>{settings.phoneDisplay}</a>
            </address>

            <div className="footer-social-block">
              <span>{locale === "en" ? "Follow FAST CASH Geneva" : "Suivez FAST CASH Genève"}</span>
              <SocialLinks className="footer-social-links" showLabels />
            </div>
          </div>

          <div>
            <h4>{footer.categories}</h4>
            <ul className="footer-link-list footer-link-grid">
              {categoryLinks.map((link) => (
                <li key={link.href}>
                  <Link href={link.href}>{footer[link.key]}</Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4>{footer.services}</h4>
            <ul className="footer-link-list">
              {serviceLinks.map((link) => (
                <li key={link.href}>
                  <Link href={link.href}>{footer[link.key]}</Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4>{footer.reassuranceTitle}</h4>
            <ul className="footer-check-list">
              {footer.reassurance.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        </div>

        <div className="footer-hours-card">
          <div>
            <p className="footer-eyebrow">{footer.store}</p>
            <h4>{footer.hoursTitle}</h4>
          </div>

          <div className="footer-hours-grid">
            {settings.hours.map((item) => (
              <div key={item.key}>
                <span>{locale === "en" ? item.en : item.fr}</span>
                <strong>{item.time}</strong>
              </div>
            ))}
          </div>
        </div>

        <div className="footer-bottom">
          <span>{footer.copyright}</span>

          <div className="footer-bottom-actions">
            <Link href="/mentions-legales">{footer.legal}</Link>
            <span>·</span>
            <Link href="/conditions-generales">CGV</Link>
            <span>·</span>
            <Link href="/livraison-retours">Livraison & retours</Link>
            <span>·</span>
            <Link href="/politique-confidentialite">{footer.privacy}</Link>
            <span>·</span>
            <Link href="/politique-cookies">Cookies</Link>
            <span className="footer-separator" />
            <CurrencySwitcher />
            <LanguageSwitcher />
          </div>
        </div>
      </div>
    </footer>
  );
}
