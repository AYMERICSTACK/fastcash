import type { Metadata } from "next";
import "./globals.css";
import SiteChrome from "@/components/SiteChrome";
import { CartProvider } from "@/components/cart/CartProvider";
import { CurrencyProvider } from "@/components/currency/CurrencyProvider";
import { LocaleProvider } from "@/lib/i18n";
import { getShopSettings } from "@/lib/settings";
import { getPublicCategories } from "@/lib/public-categories";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://fastcash-geneve.ch";
const instagramUrl = process.env.NEXT_PUBLIC_INSTAGRAM_URL?.trim();
const socialProfiles = [instagramUrl].filter((url): url is string => Boolean(url));

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "FAST CASH Genève | Produits premium d'occasion",
    template: "%s | FAST CASH Genève",
  },
  description:
    "Achat, vente et reprise de produits premium d'occasion à Genève : Apple, Samsung, montres de luxe, bijoux, maroquinerie, informatique, consoles, image et son.",
  keywords: [
    "FAST CASH Genève",
    "produits d'occasion Genève",
    "Apple occasion Genève",
    "montres de luxe Genève",
    "bijoux Genève",
    "maroquinerie Genève",
  ],
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "fr_CH",
    url: siteUrl,
    siteName: "FAST CASH Genève",
    title: "FAST CASH Genève | Produits premium d'occasion",
    description:
      "Découvrez une sélection premium de produits contrôlés à Genève : Apple, Samsung, montres, bijoux, maroquinerie, informatique et gaming.",
    images: [
      {
        url: "/images/hero-fastcash.png",
        width: 1200,
        height: 630,
        alt: "FAST CASH Genève - Produits premium d'occasion",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "FAST CASH Genève | Produits premium d'occasion",
    description:
      "Achat, vente et reprise de produits premium d'occasion à Genève.",
    images: ["/images/hero-fastcash.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
};

const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  "@id": `${siteUrl}/#organization`,
  name: "FAST CASH Genève",
  url: siteUrl,
  logo: `${siteUrl}/images/logo-fastcash-white.png`,
  ...(socialProfiles.length ? { sameAs: socialProfiles } : {}),
  contactPoint: [
    {
      "@type": "ContactPoint",
      telephone: "+41227311663",
      contactType: "customer service",
      areaServed: "CH",
      availableLanguage: ["French", "English"],
    },
  ],
};

const localBusinessJsonLd = {
  "@context": "https://schema.org",
  "@type": "Store",
  "@id": `${siteUrl}/#store`,
  name: "FAST CASH Genève",
  url: siteUrl,
  image: `${siteUrl}/images/hero-fastcash.png`,
  logo: `${siteUrl}/images/logo-fastcash-white.png`,
  telephone: "+41227311663",
  address: {
    "@type": "PostalAddress",
    streetAddress: "Rue de Monthoux 27",
    postalCode: "1201",
    addressLocality: "Genève",
    addressCountry: "CH",
  },
  openingHoursSpecification: [
    { "@type": "OpeningHoursSpecification", dayOfWeek: "Monday", opens: "10:00", closes: "20:00" },
    { "@type": "OpeningHoursSpecification", dayOfWeek: "Tuesday", opens: "14:00", closes: "20:00" },
    { "@type": "OpeningHoursSpecification", dayOfWeek: "Wednesday", opens: "10:00", closes: "20:00" },
    { "@type": "OpeningHoursSpecification", dayOfWeek: "Thursday", opens: "11:30", closes: "20:00" },
    { "@type": "OpeningHoursSpecification", dayOfWeek: "Friday", opens: "11:30", closes: "13:30" },
    { "@type": "OpeningHoursSpecification", dayOfWeek: "Friday", opens: "14:30", closes: "20:00" },
    { "@type": "OpeningHoursSpecification", dayOfWeek: "Saturday", opens: "10:00", closes: "18:00" },
  ],
  priceRange: "CHF / EUR",
  currenciesAccepted: "CHF, EUR",
  paymentAccepted: "Cash, Credit Card, Stripe",
  ...(socialProfiles.length ? { sameAs: socialProfiles } : {}),
  parentOrganization: {
    "@id": `${siteUrl}/#organization`,
  },
};

const websiteJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  "@id": `${siteUrl}/#website`,
  name: "FAST CASH Genève",
  url: siteUrl,
  publisher: {
    "@id": `${siteUrl}/#organization`,
  },
  potentialAction: {
    "@type": "SearchAction",
    target: `${siteUrl}/recherche?q={search_term_string}`,
    "query-input": "required name=search_term_string",
  },
};

const siteJsonLd = [organizationJsonLd, localBusinessJsonLd, websiteJsonLd];

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [settings, categories] = await Promise.all([getShopSettings(), getPublicCategories()]);

  return (
    <html lang="fr" data-scroll-behavior="smooth">
      <body>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(siteJsonLd) }}
        />
        <LocaleProvider>
          <CurrencyProvider defaultCurrency={settings.defaultCurrency}>
            <CartProvider>
              <SiteChrome categories={categories}>{children}</SiteChrome>
            </CartProvider>
          </CurrencyProvider>
        </LocaleProvider>
      </body>
    </html>
  );
}
