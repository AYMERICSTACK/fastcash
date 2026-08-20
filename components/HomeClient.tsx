"use client";

import Image from "next/image";
import Link from "next/link";
import ProductCard from "@/components/ProductCard";
import FastCashBlock from "@/components/FastCashBlock";
import GoogleReviews from "@/components/GoogleReviews";
import type { Product } from "@/lib/products";
import type { PublicCategory } from "@/lib/public-categories";
import type { GoogleBusinessReviewsData } from "@/lib/google-business-reviews";
import { useI18n } from "@/lib/i18n";
import { useShopSettings } from "@/components/settings/ShopSettingsProvider";

const categoryCardMeta: Record<string, string> = {
  montres: "Rolex • Omega • Cartier",
  apple: "iPhone • MacBook • iPad",
  maroquinerie: "Sacs • Portefeuilles • Luxe",
  bijoux: "Bagues • Bracelets • Or",
  informatique: "MacBook • PC • Écrans",
  consoles: "PlayStation • Xbox • Switch",
  samsung: "Galaxy • Fold • Watch",
  "image-son": "TV • Audio • Photo",
};

const categoryCardMetaEn: Record<string, string> = {
  montres: "Rolex • Omega • Cartier",
  apple: "iPhone • MacBook • iPad",
  maroquinerie: "Bags • Wallets • Luxury",
  bijoux: "Rings • Bracelets • Gold",
  informatique: "MacBook • PC • Screens",
  consoles: "PlayStation • Xbox • Switch",
  samsung: "Galaxy • Fold • Watch",
  "image-son": "TV • Audio • Photo",
};

const categoryTitlesEn: Record<string, string> = {
  montres: "Watches",
  apple: "Apple",
  maroquinerie: "Leather goods",
  bijoux: "Jewelry",
  informatique: "Computers",
  consoles: "Consoles",
  samsung: "Samsung",
  "image-son": "Image & Sound",
};

const preferredCategoryOrder = ["montres", "apple", "maroquinerie", "bijoux", "informatique", "consoles", "samsung", "image-son"];

function sortHomeCategories(categories: PublicCategory[]) {
  return [...categories].sort((a, b) => {
    const aIndex = preferredCategoryOrder.indexOf(a.slug);
    const bIndex = preferredCategoryOrder.indexOf(b.slug);

    if (aIndex !== -1 || bIndex !== -1) {
      return (aIndex === -1 ? 99 : aIndex) - (bIndex === -1 ? 99 : bIndex);
    }

    return a.title.localeCompare(b.title, "fr");
  });
}

export default function HomeClient({
  featured,
  categories,
  googleReviews,
}: {
  featured: Product[];
  categories: PublicCategory[];
  googleReviews: GoogleBusinessReviewsData | null;
}) {
  const { locale, dict } = useI18n();
  const settings = useShopSettings();
  const meta = locale === "en" ? categoryCardMetaEn : categoryCardMeta;
  const visibleCategories = sortHomeCategories(categories).slice(0, 12);

  return (
    <main>
      <section className="home-hero-luxury home-hero-general">
        <div className="container home-hero-grid">
          <div className="home-hero-copy">
            <p className="hero-kicker">{locale === "en" ? settings.heroKickerEn : settings.heroKickerFr}</p>

            <h1>
              <span>{locale === "en" ? settings.heroTitle1En : settings.heroTitle1Fr}</span>
              <span>{locale === "en" ? settings.heroTitle2En : settings.heroTitle2Fr}</span>
            </h1>

            <p>{locale === "en" ? settings.heroIntroEn : settings.heroIntroFr}</p>

            <div className="hero-actions">
              <Link href="/estimation" className="btn btn-gold">{dict.home.estimateCta}</Link>
              <Link href="/categories/montres" className="btn btn-ghost">{dict.home.catalogCta}</Link>
            </div>

            <div className="hero-proof" aria-label="FAST CASH guarantees">
              <span>{locale === "en" ? settings.heroProof1En : settings.heroProof1Fr}</span>
              <span>{locale === "en" ? settings.heroProof2En : settings.heroProof2Fr}</span>
              <span>{locale === "en" ? settings.heroProof3En : settings.heroProof3Fr}</span>
            </div>
          </div>

          <div className="home-hero-visual">
            <Image
              src={settings.heroImage}
              alt="Montres, Apple, maroquinerie et bijoux"
              width={1200}
              height={700}
              className="hero-luxury-image"
              priority
            />
          </div>
        </div>
      </section>

      <section className="section section-soft luxury-categories-section">
        <div className="container">
          <div className="section-heading section-heading-row">
            <div>
              <p className="hero-kicker">{dict.home.univers}</p>
              <h2 className="title-lg">{dict.home.premiumCategories}</h2>
            </div>
            <span className="catalog-note">{dict.home.selected}</span>
          </div>

          <div className="luxury-category-grid">
            {visibleCategories.map((category) => (
              <Link href={`/categories/${category.slug}`} className="luxury-category-card" key={category.slug}>
                <Image src={category.image} alt={category.title} width={560} height={720} />
                <div>
                  <span>{meta[category.slug] ?? category.subtitle}</span>
                  <h3>{locale === "en" ? categoryTitlesEn[category.slug] ?? category.title : category.title}</h3>
                  <small>{dict.home.discover}</small>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="section-heading section-heading-row">
            <div>
              <p className="hero-kicker">{dict.home.arrivals}</p>
              <h2 className="title-lg">{dict.home.available}</h2>
            </div>
            <Link href="/categories/telephonie" className="text-link">{dict.home.more}</Link>
          </div>

          <div className="product-grid premium-product-grid">
            {featured.map((product) => <ProductCard key={product.id} product={product} />)}
          </div>
        </div>
      </section>

      <FastCashBlock />
      <GoogleReviews data={googleReviews} />
    </main>
  );
}
