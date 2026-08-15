"use client";

import Image from "next/image";
import { useState } from "react";
import { CreditCard, ShieldCheck, Store } from "lucide-react";
import CurrencyPrice from "@/components/currency/CurrencyPrice";
import AddToCartButton from "@/components/cart/AddToCartButton";
import ProductCard from "@/components/ProductCard";
import type { Product } from "@/lib/products";
import { getStockLabel, getStockStatus } from "@/lib/stock";
import { translateCategoryName, useI18n } from "@/lib/i18n";

type ProductShowroomProps = {
  product: Product;
  relatedProducts: Product[];
};

export default function ProductShowroom({ product, relatedProducts }: ProductShowroomProps) {
  const { locale } = useI18n();
  const gallery = product.images?.length ? product.images : product.image ? [{ id: "primary", url: product.image, alt: product.name, isPrimary: true }] : [];
  const [activeImage, setActiveImage] = useState(gallery.find((image) => image.isPrimary)?.url ?? gallery[0]?.url ?? "");
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
    description:
      locale === "en"
        ? "Pre-owned item checked and available at FAST CASH Geneva according to in-store stock. For any question, our team can confirm condition and availability before your visit."
        : "Produit d'occasion contrôlé et disponible chez FAST CASH Genève selon stock en boutique. Pour toute question, notre équipe peut confirmer l'état et la disponibilité avant votre passage.",
    relatedKicker: locale === "en" ? "FAST CASH selection" : "Sélection FAST CASH",
    relatedTitle: locale === "en" ? "You may also like" : "Vous pourriez aussi aimer",
    relatedText:
      locale === "en"
        ? "Similar items selected from the same universe to continue your visit."
        : "Des articles proches, sélectionnés dans le même univers pour prolonger votre visite.",
  };

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
          </div>

          <p className="muted premium-product-description">{copy.description}</p>

          <AddToCartButton product={product} />
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
