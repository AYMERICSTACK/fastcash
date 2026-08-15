"use client";

import Image from "next/image";
import Link from "next/link";
import {
  BadgeCheck,
  HandCoins,
  ShieldCheck,
  Store,
  Wrench,
} from "lucide-react";
import { CategoryConfig, translateCategoryLabel } from "@/lib/categories";
import { getLocalizedBrandHero, useI18n } from "@/lib/i18n";
import type { BreadcrumbItem } from "@/components/PremiumBreadcrumb";
import LocalizedPremiumBreadcrumb from "@/components/LocalizedPremiumBreadcrumb";

const benefitIcons = [ShieldCheck, BadgeCheck, HandCoins, Wrench];

const categoryStrongTexts: Record<string, string> = {
  apple:
    "Acheter un produit Apple d'occasion est une excellente alternative pour profiter de la qualité, du design et des performances de la marque à un prix plus avantageux.",
  samsung:
    "Profitez d'appareils Samsung Galaxy contrôlés, récents et proposés selon les arrivages disponibles en boutique.",
  montres:
    "Chaque montre est sélectionnée avec soin afin de proposer des pièces de qualité, adaptées aux amateurs d'horlogerie premium.",
  consoles:
    "Consoles, manettes et jeux sont testés avant la mise en vente pour garantir une expérience fiable dès l'achat.",
  informatique:
    "Ordinateurs, MacBook, écrans et accessoires sont contrôlés pour vous orienter vers un matériel performant et adapté à vos besoins.",
  "image-son":
    "Équipements audio, photo et vidéo sont sélectionnés pour leur qualité, leur état et leur disponibilité immédiate en boutique.",
  bijoux:
    "Bijoux, or et pièces précieuses peuvent être estimés directement en magasin avec un accompagnement clair et professionnel.",
  maroquinerie:
    "Sacs et accessoires premium sont sélectionnés selon leur état, leur style et les arrivages disponibles chez FAST CASH Genève.",
  telephonie:
    "Smartphones et accessoires sont vérifiés avant la mise en vente pour proposer des appareils fiables au meilleur prix.",
};

const categoryProofs: Record<string, string[]> = {
  apple: ["iPhone", "iPad", "MacBook", "Apple Watch"],
  samsung: ["Galaxy", "Fold", "Watch", "Accessoires"],
  montres: ["Rolex", "Omega", "Cartier", "Tudor"],
  consoles: ["PS5", "Xbox", "Switch", "Jeux"],
  informatique: ["MacBook", "PC", "Écrans", "Accessoires"],
  "image-son": ["TV", "Audio", "Photo", "Vidéo"],
  bijoux: ["Bagues", "Bracelets", "Colliers", "Or"],
  maroquinerie: ["Sacs", "Luxe", "Accessoires", "Premium"],
  telephonie: ["iPhone", "Samsung", "Accessoires", "Reprise"],
};

function getHeroImage(category: CategoryConfig) {
  if (category.slug === "apple") {
    return "/images/categories/apple-dark.jpg";
  }

  return category.image;
}

function getBreadcrumbParent(category: CategoryConfig) {
  if (["apple", "samsung", "telephonie"].includes(category.slug)) {
    return "Téléphonie";
  }

  if (["consoles", "informatique", "image-son"].includes(category.slug)) {
    return "High-tech";
  }

  return "Catalogue";
}

export default function CategoryHero({
  category,
  breadcrumbItems,
}: {
  category: CategoryConfig;
  breadcrumbItems?: BreadcrumbItem[];
}) {
  const { dict, locale } = useI18n();
  const localizedCategory = getLocalizedBrandHero(category, locale);
  const heroImage = getHeroImage(category);
  const strongText =
    dict.category.strongTexts[category.slug as keyof typeof dict.category.strongTexts] ??
    categoryStrongTexts[category.slug] ??
    (locale === "en"
      ? "Every item is checked by FAST CASH Geneva before being listed or estimated in store."
      : "Chaque produit est contrôlé par FAST CASH Genève avant sa mise en vente ou son estimation en boutique.");
  const proofs = categoryProofs[category.slug] ?? category.advantages.slice(0, 4);
  const defaultBreadcrumbItems = [
    { label: dict.category.home, href: "/" },
    {
      label:
        getBreadcrumbParent(category) === "Téléphonie"
          ? dict.category.telephony
          : getBreadcrumbParent(category) === "High-tech"
            ? dict.category.hightech
            : dict.category.catalogue,
      href: "/recherche",
    },
    { label: category.title.replace("Produits ", "") },
  ];

  return (
    <section className="dark-category-page-hero premium-category-hero">
      <div className="container">
        <LocalizedPremiumBreadcrumb items={breadcrumbItems ?? defaultBreadcrumbItems} variant="dark" />
      </div>

      <div className="container dark-hero-grid premium-category-grid">
        <div className="dark-hero-copy premium-category-copy">
          <p className="premium-category-eyebrow">{localizedCategory.eyebrow ?? dict.category.defaultEyebrow}</p>
          <h1>{localizedCategory.title}</h1>
          <h2>{localizedCategory.subtitle}</h2>
          <span className="dark-gold-line" />

          <p>{localizedCategory.description}</p>

          <p className="dark-hero-strong">{strongText}</p>

          <div className="premium-category-actions">
            <Link href="#produits" className="premium-category-main-cta">
              {dict.category.discoverProducts}
            </Link>
            <Link href="/estimation" className="premium-category-secondary-cta">
              {dict.category.estimate}
            </Link>
          </div>

          <div className="premium-category-tags" aria-label={dict.category.tagsAria}>
            {proofs.map((proof) => (
              <span key={proof}>{translateCategoryLabel(proof, locale)}</span>
            ))}
          </div>
        </div>

        <div className="dark-hero-visual premium-category-visual" aria-hidden="true">
          <Image
            src={heroImage}
            alt={`${localizedCategory.title} ${locale === "en" ? "pre-owned in Geneva" : "d'occasion à Genève"}`}
            fill
            priority
            sizes="(max-width: 900px) 100vw, 58vw"
            className="dark-hero-image"
          />
        </div>
      </div>

      <div className="container premium-category-service-wrap">
        <div className="dark-benefits premium-category-benefits" aria-label={dict.category.advantagesAria}>
          {dict.category.benefits.map(([title, text], index) => {
            const Icon = benefitIcons[index];
            return (
              <div className="dark-benefit" key={title}>
                <span>
                  <Icon size={23} strokeWidth={1.75} />
                </span>
                <div className="dark-benefit-content">
                  <strong>{title}</strong>
                  <small>{text}</small>
                </div>
              </div>
            );
          })}
        </div>

        <div className="dark-store-strip premium-category-store-strip">
          <div className="dark-store-icon">
            <Store size={34} strokeWidth={1.6} />
          </div>

          <div className="dark-store-copy">
            <h3>{dict.category.storeTitle}</h3>
            <p>
              {dict.category.storeText}
            </p>
          </div>

          <Link href="/estimation" className="dark-store-cta">
            <HandCoins size={26} strokeWidth={1.6} />
            <span>{localizedCategory.cta}<br />{dict.category.inStore}</span>
          </Link>
        </div>
      </div>
    </section>
  );
}
