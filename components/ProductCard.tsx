"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, ShieldCheck } from "lucide-react";
import { Product } from "@/lib/products";
import CurrencyPrice from "@/components/currency/CurrencyPrice";
import AddToCartButton from "./cart/AddToCartButton";
import { translateCategoryName, useI18n } from "@/lib/i18n";
import { getStockLabel, getStockStatus } from "@/lib/stock";

function getConditionKey(product: Product): "new" | "veryGood" | "available" | "onDemand" {
  const name = product.name.toLowerCase();

  if (name.includes("neuf") || name.includes("scell")) return "new";
  if (name.includes("excellent") || name.includes("très bon") || name.includes("tres bon")) return "veryGood";

  return product.stock > 0 ? "available" : "onDemand";
}

export default function ProductCard({ product }: { product: Product }) {
  const { dict, locale } = useI18n();
  const conditionKey = getConditionKey(product);
  const condition = dict.product[conditionKey];
  const stockStatus = getStockStatus(product.stock);
  const productHref = `/produits/${product.slug}`;

  return (
    <article className="product-card premium-product-card">
      <Link href={productHref} className="product-img premium-product-img" aria-label={`${locale === "en" ? "View" : "Voir"} ${product.name}`}>
        <span className={`premium-product-badge premium-product-badge-${stockStatus}`}>{condition}</span>
        {product.image ? <Image src={product.image} alt={product.name} width={520} height={520} /> : null}
      </Link>

      <div className="product-body premium-product-body">
        <div className="premium-product-meta">
          <span className="premium-product-category">{translateCategoryName(product.category, locale)}</span>
          <span className={`premium-stock-pill premium-stock-pill-${stockStatus}`}>
            {getStockLabel(product.stock, locale)}
          </span>
        </div>

        <Link href={productHref} className="product-name premium-product-name">
          {product.name}
        </Link>

        <div className="premium-product-assurance">
          <ShieldCheck size={14} aria-hidden="true" />
          <span>{dict.product.checked}</span>
        </div>

        <div className="premium-product-bottom">
          <div>
            <div className="price premium-product-price"><CurrencyPrice value={product.price} /></div>
            <div className="premium-product-sub">{locale === "en" ? "FAST CASH Geneva pickup" : "Retrait FAST CASH Genève"}</div>
          </div>
          <Link href={productHref} className="premium-mini-cart" aria-label={`${locale === "en" ? "View" : "Voir"} ${product.name}`}>
            <ArrowUpRight size={17} />
          </Link>
        </div>

        <Link href={productHref} className="premium-product-cta">
          {locale === "en" ? "View product" : "Voir le produit"}
          <ArrowUpRight size={14} aria-hidden="true" />
        </Link>

        <AddToCartButton product={product} />
      </div>
    </article>
  );
}
