"use client";

import Image from "next/image";
import { useState } from "react";
import { CreditCard, ShieldCheck, Store } from "lucide-react";
import CurrencyPrice from "@/components/currency/CurrencyPrice";
import AddToCartButton from "@/components/cart/AddToCartButton";
import FavoriteButton from "@/components/FavoriteButton";
import OfferButton from "@/components/OfferButton";
import ProductCard from "@/components/ProductCard";
import type { Product } from "@/lib/products";
import { getStockLabel, getStockStatus } from "@/lib/stock";
import { translateCategoryName, useI18n } from "@/lib/i18n";

type ProductShowroomProps = {
  product: Product;
  relatedProducts: Product[];
};

function stripPrestashopBoilerplate(value: string) {
  return value
    // Anciennes promesses commerciales PrestaShop qui ne correspondent plus au site actuel.
    .replace(/Tous nos produits sont payables? en 3 ou 4 fois sans frais\.?/gi, "")
    .replace(/Garantie de 1 an\s*:?\s*[^·\n]*(?=(?:\s*[·•-]\s*\*\*)|$)/gi, "")
    .replace(/Profitez de notre emplacement idéal[^.]*\.?/gi, "")
    .replace(/Bienvenue chez Fast Cash[^.]*\.?/gi, "")
    .replace(/Nous vous offrons une large sélection d['’]articles authentiques[^.]*\.?/gi, "")
    .replace(/Découvrez le luxe d['’]occasion chez FAST CASH à Genève!*/gi, "")
    .replace(/Nos services exceptionnels\s*:?/gi, "")
    .replace(/Authenticité garantie\s*:?\s*Chaque produit est minutieusement vérifié et certifié original\.?/gi, "")
    .replace(/\s*[·•-]\s*(?=[·•-]|$)/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function cleanProductDescription(value?: string | null, importedFromPrestashop = false) {
  if (!value) return "";

  const source = importedFromPrestashop ? stripPrestashopBoilerplate(value) : value;

  return source
    .replace(/<\s*br\s*\/?\s*>/gi, "\n")
    .replace(/<\/p\s*>/gi, "\n\n")
    .replace(/<\/?li\b[^>]*>/gi, (tag) => (tag.startsWith("</") ? "\n" : "• "))
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\s+\*\*(?=[^*]+\*\*)/g, "\n\n**")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function renderDescriptionLine(line: string) {
  const chunks = line.split(/(\*\*[^*]+\*\*)/g).filter(Boolean);

  return chunks.map((chunk, index) => {
    if (chunk.startsWith("**") && chunk.endsWith("**")) {
      return <strong key={`${chunk}-${index}`}>{chunk.slice(2, -2)}</strong>;
    }

    return <span key={`${chunk}-${index}`}>{chunk}</span>;
  });
}

export default function ProductShowroom({ product, relatedProducts }: ProductShowroomProps) {
  const { locale } = useI18n();
  const gallery = product.images?.length ? product.images : product.image ? [{ id: "primary", url: product.image, alt: product.name, isPrimary: true }] : [];
  const [activeImage, setActiveImage] = useState(gallery.find((image) => image.isPrimary)?.url ?? gallery[0]?.url ?? "");
  const [descriptionExpanded, setDescriptionExpanded] = useState(false);
  const publicDescription = cleanProductDescription(product.description, product.importedFromPrestashop);
  const descriptionParagraphs = publicDescription.split(/\n{2,}/).map((paragraph) => paragraph.trim()).filter(Boolean);
  const stockStatus = getStockStatus(product.stock);
  const categoryLabel = translateCategoryName(product.category, locale);
  const headingMeta = product.brand ? `${product.brand} · ${categoryLabel}` : categoryLabel;

  const copy = {
    galleryTitle: locale === "en" ? "Item checked in store" : "Article vérifié en boutique",
    galleryText:
      locale === "en"
        ? "Availability confirmed according to FAST CASH Geneva in-store stock."
        : "Disponibilité confirmée selon le stock boutique FAST CASH Genève.",
    priceLabel: locale === "en" ? "FAST CASH price" : "Prix FAST CASH",
    priceHint:
      locale === "en"
        ? "Secure payment · In-store pickup in Geneva"
        : "Paiement sécurisé · Retrait en boutique à Genève",
    stockOut:
      locale === "en"
        ? "This item is currently not available to order."
        : "Ce produit n'est plus disponible à la commande pour le moment.",
    stockLow:
      locale === "en"
        ? "Rare item: in-store stock is almost sold out."
        : "Article rare : le stock boutique est presque épuisé.",
    stockAvailable:
      locale === "en"
        ? "Available at FAST CASH Geneva store."
        : "Disponible en boutique FAST CASH Genève.",
    checkedTitle: locale === "en" ? "Checked product" : "Produit contrôlé",
    checkedText: locale === "en" ? "Verified before listing" : "Vérification avant mise en vente",
    pickupTitle: locale === "en" ? "Store pickup" : "Retrait boutique",
    paymentTitle: locale === "en" ? "Secure payment" : "Paiement sécurisé",
    paymentText: locale === "en" ? "Protected checkout" : "Commande protégée",
    adviceTitle: locale === "en" ? "Expert advice" : "Conseil expert",
    adviceText: locale === "en" ? "Our team can confirm details before pickup" : "Notre équipe confirme les détails avant retrait",
    stockTitle: locale === "en" ? "Store stock" : "Stock boutique",
    unavailable: locale === "en" ? "Unavailable" : "Indisponible",
    availableSuffix: locale === "en" ? "available" : "disponible",
    availablePluralSuffix: locale === "en" ? "available" : "disponibles",
    reference: locale === "en" ? "Reference" : "Référence",
    universe: locale === "en" ? "Universe" : "Univers",
    condition: locale === "en" ? "Condition" : "État",
    description:
      locale === "en"
        ? "Pre-owned item checked and available at FAST CASH Geneva according to in-store stock. For any question, our team can confirm condition and availability before your visit."
        : "Produit d'occasion contrôlé et disponible chez FAST CASH Genève selon stock en boutique. Pour toute question, notre équipe peut confirmer l'état et la disponibilité avant votre passage.",
    descriptionTitle: locale === "en" ? "Product description" : "Description du produit",
    descriptionMore: locale === "en" ? "Read full description" : "Voir toute la description",
    descriptionLess: locale === "en" ? "Show less" : "Réduire",
    relatedKicker: locale === "en" ? "FAST CASH selection" : "Sélection FAST CASH",
    relatedTitle: locale === "en" ? "You may also like" : "Vous pourriez aussi aimer",
    relatedText:
      locale === "en"
        ? "Similar items selected from the same universe to continue your visit."
        : "Des articles proches, sélectionnés dans le même univers pour prolonger votre visite.",
  };


  const conditionLabels: Record<string, { fr: string; en: string }> = {
    DAMAGED: { fr: "Abîmé", en: "Damaged" },
    GOOD: { fr: "Bon état", en: "Good condition" },
    EXCELLENT: { fr: "Excellent état", en: "Excellent condition" },
    LIKE_NEW: { fr: "Comme neuf", en: "Like new" },
    NEW: { fr: "Neuf", en: "New" },
  };
  const conditionLabel = conditionLabels[product.condition || "GOOD"]?.[locale] ?? (locale === "en" ? "Good condition" : "Bon état");

  const stockDescription =
    stockStatus === "out-of-stock"
      ? copy.stockOut
      : stockStatus === "low-stock"
        ? copy.stockLow
        : copy.stockAvailable;

  const stockValue =
    stockStatus === "out-of-stock"
      ? copy.unavailable
      : `${product.stock} ${product.stock > 1 ? copy.availablePluralSuffix : copy.availableSuffix}`;

  return (
    <>
      <div className="product-page-grid premium-product-showroom">
        <div className="product-gallery premium-product-gallery">
          <span className={`stock-badge stock-badge-${stockStatus}`}>
            {getStockLabel(product.stock, locale)}
          </span>
          {activeImage ? (
            <Image
              src={activeImage}
              alt={gallery.find((image) => image.url === activeImage)?.alt || product.name}
              width={820}
              height={820}
              priority
              className="product-gallery-main-image"
            />
          ) : null}
          {gallery.length > 1 ? (
            <div className="product-gallery-thumbnails" aria-label={locale === "en" ? "Product images" : "Images du produit"}>
              {gallery.map((image) => (
                <button key={image.id} type="button" className={image.url === activeImage ? "is-active" : ""} onClick={() => setActiveImage(image.url)} aria-label={image.alt || product.name}>
                  <Image src={image.url} alt="" width={96} height={96} />
                </button>
              ))}
            </div>
          ) : null}
          <div className="product-gallery-caption">
            <strong>{copy.galleryTitle}</strong>
            <span>{copy.galleryText}</span>
          </div>
        </div>

        <aside className="product-summary premium-product-summary">
          <div className="premium-product-heading">
            <p className="hero-kicker">{headingMeta}</p>
            <h1 className="title-lg">{product.name}</h1>
          </div>

          <div className="premium-price-card">
            <span>{copy.priceLabel}</span>
            <p className="product-page-price"><CurrencyPrice value={product.price} /></p>
            <small>{copy.priceHint}</small>
          </div>

          <div className={`product-stock-panel product-stock-panel-${stockStatus}`}>
            <div>
              <strong>{getStockLabel(product.stock, locale)}</strong>
              <span>{stockDescription}</span>
            </div>
          </div>

          <div className="premium-product-services" aria-label={locale === "en" ? "FAST CASH services" : "Services FAST CASH"}>
            <div>
              <ShieldCheck className="premium-product-service-icon" aria-hidden="true" strokeWidth={1.8} />
              <strong>{copy.checkedTitle}</strong>
              <span>{copy.checkedText}</span>
            </div>
            <div>
              <Store className="premium-product-service-icon" aria-hidden="true" strokeWidth={1.8} />
              <strong>{copy.pickupTitle}</strong>
              <span>{locale === "en" ? "FAST CASH Geneva" : "FAST CASH Genève"}</span>
            </div>
            <div>
              <CreditCard className="premium-product-service-icon" aria-hidden="true" strokeWidth={1.8} />
              <strong>{copy.paymentTitle}</strong>
              <span>{copy.paymentText}</span>
            </div>
          </div>

          <div className="premium-product-advice">
            <strong>{copy.adviceTitle}</strong>
            <span>{copy.adviceText}</span>
          </div>

          <div className="product-info-list premium-product-info-list">
            <div>
              <strong>{copy.stockTitle}</strong>
              <span>{stockValue}</span>
            </div>
            <div>
              <strong>{copy.reference}</strong>
              <span>{product.reference || `FC-${product.id}`}</span>
            </div>
            <div>
              <strong>{copy.universe}</strong>
              <span>{categoryLabel}</span>
            </div>
            <div>
              <strong>{copy.condition}</strong>
              <span>{conditionLabel}</span>
            </div>
          </div>

          {publicDescription ? (
            <section className="premium-product-description-card" aria-labelledby="product-description-title">
              <p className="hero-kicker">{copy.descriptionTitle}</p>
              <div
                className={`premium-product-description-content${descriptionExpanded ? " is-expanded" : ""}`}
              >
                {descriptionParagraphs.map((paragraph, index) => (
                  <p key={`${index}-${paragraph.slice(0, 24)}`}>{renderDescriptionLine(paragraph)}</p>
                ))}
              </div>
              {publicDescription.length > 420 ? (
                <button
                  type="button"
                  className="premium-product-description-toggle"
                  onClick={() => setDescriptionExpanded((value) => !value)}
                  aria-expanded={descriptionExpanded}
                >
                  {descriptionExpanded ? copy.descriptionLess : copy.descriptionMore}
                </button>
              ) : null}
            </section>
          ) : (
            <p className="muted premium-product-description">{copy.description}</p>
          )}

          <AddToCartButton product={product} />
          <div className="product-negotiation-actions"><OfferButton product={product} /><FavoriteButton productId={product.id} /></div>
        </aside>
      </div>

      {relatedProducts.length ? (
        <section className="related-products-section" aria-labelledby="related-products-title">
          <div className="related-products-heading">
            <p className="hero-kicker">{copy.relatedKicker}</p>
            <h2 id="related-products-title" className="title-md">{copy.relatedTitle}</h2>
            <p className="muted">{copy.relatedText}</p>
          </div>

          <div className="product-grid related-products-grid">
            {relatedProducts.map((relatedProduct) => (
              <ProductCard key={relatedProduct.slug} product={relatedProduct} />
            ))}
          </div>
        </section>
      ) : null}
    </>
  );
}
