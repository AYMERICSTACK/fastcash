import type { Metadata } from "next";
import "./globals.css";
import SiteChrome from "@/components/SiteChrome";
import { CartProvider } from "@/components/cart/CartProvider";
import { CurrencyProvider } from "@/components/currency/CurrencyProvider";
import { LocaleProvider } from "@/lib/i18n";
import { getShopSettings } from "@/lib/settings";
import { getPublicCategories } from "@/lib/public-categories";
import { ShopSettingsProvider } from "@/components/settings/ShopSettingsProvider";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://fastcash-geneve.ch";
export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [settings, categories] = await Promise.all([getShopSettings(), getPublicCategories()]);
  const socialProfiles = [settings.instagramUrl].filter(Boolean);
  const siteJsonLd = [
    {
      "@context":"https://schema.org","@type":"Organization","@id":`${siteUrl}/#organization`,
      name:settings.shopName,url:siteUrl,logo:`${siteUrl}/images/logo-fastcash-white.png`,
      ...(socialProfiles.length ? { sameAs:socialProfiles } : {}),
      contactPoint:[{ "@type":"ContactPoint", telephone:settings.phoneHref, contactType:"customer service", areaServed:"CH", availableLanguage:["French","English"] }],
    },
    {
      "@context":"https://schema.org","@type":"Store","@id":`${siteUrl}/#store`,
      name:settings.shopName,url:siteUrl,image:`${siteUrl}${settings.heroImage.startsWith("/") ? settings.heroImage : "/images/hero-fastcash.png"}`,
      logo:`${siteUrl}/images/logo-fastcash-white.png`,telephone:settings.phoneHref,
      address:{ "@type":"PostalAddress", streetAddress:settings.addressLine1, postalCode:settings.postalCode, addressLocality:settings.city, addressCountry:"CH" },
      priceRange:"CHF / EUR", currenciesAccepted:"CHF, EUR", paymentAccepted:"Cash, Credit Card, Stripe",
      ...(socialProfiles.length ? { sameAs:socialProfiles } : {}),
      parentOrganization:{ "@id":`${siteUrl}/#organization` },
    },
    {
      "@context":"https://schema.org","@type":"WebSite","@id":`${siteUrl}/#website`,
      name:settings.shopName,url:siteUrl,publisher:{ "@id":`${siteUrl}/#organization` },
      potentialAction:{ "@type":"SearchAction", target:`${siteUrl}/recherche?q={search_term_string}`, "query-input":"required name=search_term_string" },
    },
  ];

  return (
    <html lang="fr" data-scroll-behavior="smooth">
      <body>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(siteJsonLd) }} />
        <LocaleProvider>
          <ShopSettingsProvider settings={settings}>
            <CurrencyProvider defaultCurrency={settings.defaultCurrency}>
              <CartProvider>
                <SiteChrome categories={categories}>{children}</SiteChrome>
              </CartProvider>
            </CurrencyProvider>
          </ShopSettingsProvider>
        </LocaleProvider>
      </body>
    </html>
  );
}
