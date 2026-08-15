"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { Product } from "@/lib/products";
import { useI18n } from "@/lib/i18n";
import { getStockLabel, getStockStatus } from "@/lib/stock";
import { useCart } from "./CartProvider";

export default function AddToCartButton({ product }: { product: Product }) {
  const { add, items } = useCart();
  const { locale } = useI18n();
  const stockStatus = getStockStatus(product.stock);
  const [addedState, setAddedState] = useState<"idle" | "added" | "max">("idle");
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const currentQuantity = useMemo(
    () => items.find((item) => String(item.product.id) === String(product.id))?.quantity ?? 0,
    [items, product.id],
  );

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  const flashFeedback = (state: "added" | "max", message: string) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setAddedState(state);
    setToastMessage(message);
    timerRef.current = setTimeout(() => {
      setAddedState("idle");
      setToastMessage(null);
    }, 2600);
  };
  const isUnavailable = stockStatus === "out-of-stock";
  const label = isUnavailable
    ? locale === "en"
      ? "Unavailable"
      : "Indisponible"
    : addedState === "added"
      ? locale === "en" ? "Added ✓" : "Ajouté ✓"
      : addedState === "max"
        ? locale === "en" ? "Maximum stock reached" : "Stock maximum atteint"
        : locale === "en"
          ? "Add to cart"
          : "Ajouter au panier";

  return (
    <div className="add-to-cart-stack">
      <button
        className={`btn btn-dark add-to-cart-button ${isUnavailable ? "is-disabled" : ""} ${addedState === "added" ? "is-added" : ""}`}
        onClick={() => {
          if (isUnavailable) return;
          if (currentQuantity >= product.stock) {
            flashFeedback(
              "max",
              locale === "en" ? "Maximum available stock is already in your cart." : "La quantité maximale disponible est déjà dans votre panier.",
            );
            return;
          }

          const wasAlreadyInCart = currentQuantity > 0;
          add(product);
          flashFeedback(
            "added",
            wasAlreadyInCart
              ? locale === "en" ? "Cart quantity updated." : "Quantité mise à jour dans le panier."
              : locale === "en" ? "Product added to cart." : "Produit ajouté au panier.",
          );
        }}
        disabled={isUnavailable}
        aria-disabled={isUnavailable}
        title={isUnavailable ? getStockLabel(product.stock, locale) : undefined}
      >
        {label}
      </button>

      <span className={`stock-inline-note stock-inline-note-${stockStatus}`}>
        {getStockLabel(product.stock, locale)}
      </span>

      {toastMessage ? (
        <div className={`cart-add-toast ${addedState === "max" ? "cart-add-toast-warning" : ""}`} role="status" aria-live="polite">
          <span className="cart-add-toast-icon">{addedState === "max" ? "!" : "✓"}</span>
          <div>
            <strong>{toastMessage}</strong>
            <small>{product.name}</small>
          </div>
          <Link href="/panier">{locale === "en" ? "View cart" : "Voir le panier"}</Link>
        </div>
      ) : null}
    </div>
  );
}
