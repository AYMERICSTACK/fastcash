import type { Product } from "@/lib/products";

export const LOW_STOCK_LIMIT = 3;

export type StockStatus = "in-stock" | "low-stock" | "out-of-stock";

export function getStockStatus(stock: number): StockStatus {
  if (stock <= 0) return "out-of-stock";
  if (stock <= LOW_STOCK_LIMIT) return "low-stock";
  return "in-stock";
}

export function isProductAvailable(product: Pick<Product, "stock">) {
  return product.stock > 0;
}

export function clampQuantityToStock(quantity: number, stock: number) {
  if (!Number.isFinite(quantity)) return stock > 0 ? 1 : 0;
  return Math.min(Math.max(Math.floor(quantity), 1), Math.max(stock, 0));
}

export function getStockLabel(stock: number, locale: "fr" | "en" = "fr") {
  const status = getStockStatus(stock);

  if (locale === "en") {
    if (status === "out-of-stock") return "Out of stock";
    if (status === "low-stock") return `Only ${stock} left`;
    return "In stock";
  }

  if (status === "out-of-stock") return "Rupture de stock";
  if (status === "low-stock") return `Plus que ${stock} disponible${stock > 1 ? "s" : ""}`;
  return "En stock";
}

export function getStockTone(stock: number) {
  const status = getStockStatus(stock);
  if (status === "out-of-stock") return "danger";
  if (status === "low-stock") return "warning";
  return "success";
}
