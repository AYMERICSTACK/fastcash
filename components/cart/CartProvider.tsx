"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { Product } from "@/lib/products";
import { clampQuantityToStock, isProductAvailable } from "@/lib/stock";

type CartProductId = string | number;
type Item = { product: Product; quantity: number };

type CartContextType = {
  items: Item[];
  count: number;
  total: number;
  hydrated: boolean;
  add: (p: Product) => void;
  remove: (id: CartProductId) => void;
  clear: () => void;
  setQty: (id: CartProductId, qty: number) => void;
};

const CartContext = createContext<CartContextType | null>(null);

function sameProductId(a: CartProductId, b: CartProductId) {
  return String(a) === String(b);
}

function sanitizeStoredItems(value: unknown): Item[] {
  if (!Array.isArray(value)) return [];

  return value.flatMap((entry) => {
    if (!entry || typeof entry !== "object") return [];
    const item = entry as Partial<Item>;
    if (!item.product || typeof item.product !== "object") return [];

    const product = item.product as Product;
    if (product.id === undefined || !Number.isFinite(Number(product.price))) return [];

    const quantity = clampQuantityToStock(Number(item.quantity) || 1, Number(product.stock) || 0);
    if (quantity < 1) return [];

    return [{ product, quantity }];
  });
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<Item[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem("fc_cart") || "[]");
      setItems(sanitizeStoredItems(stored));
    } catch {
      setItems([]);
    } finally {
      setHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem("fc_cart", JSON.stringify(items));
  }, [hydrated, items]);

  const api = useMemo<CartContextType>(
    () => ({
      items,
      hydrated,
      count: items.reduce((sum, item) => sum + item.quantity, 0),
      total: items.reduce((sum, item) => sum + item.product.price * item.quantity, 0),
      add: (product: Product) =>
        setItems((currentItems) => {
          if (!isProductAvailable(product)) return currentItems;

          const existingItem = currentItems.find((item) => sameProductId(item.product.id, product.id));

          if (existingItem) {
            return currentItems.map((item) =>
              sameProductId(item.product.id, product.id)
                ? { ...item, quantity: clampQuantityToStock(item.quantity + 1, product.stock) }
                : item,
            );
          }

          return [...currentItems, { product, quantity: 1 }];
        }),
      remove: (id: CartProductId) =>
        setItems((currentItems) => currentItems.filter((item) => !sameProductId(item.product.id, id))),
      clear: () => setItems([]),
      setQty: (id: CartProductId, qty: number) =>
        setItems((currentItems) =>
          currentItems.map((item) =>
            sameProductId(item.product.id, id)
              ? { ...item, quantity: clampQuantityToStock(qty, item.product.stock) }
              : item,
          ),
        ),
    }),
    [hydrated, items],
  );

  return <CartContext.Provider value={api}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("CartProvider missing");
  return ctx;
}
