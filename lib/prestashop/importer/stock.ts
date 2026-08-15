import type { PrismaClient } from "@prisma/client";
import { parsePrestashopDump } from "@/lib/prestashop/parser";
import type { PrestashopSqlRow } from "@/lib/prestashop/types";

export type PrestashopStockImportAction = "updated" | "unchanged" | "ignored" | "error";

export interface PrestashopStockImportItem {
  prestashopProductId: number;
  sourceQuantity: number;
  quantity: number;
  normalized: boolean;
  action: PrestashopStockImportAction;
  message?: string;
}

export interface PrestashopStockImportReport {
  totalRows: number;
  baseRows: number;
  variantRowsIgnored: number;
  duplicateRowsIgnored: number;
  productsProcessed: number;
  updated: number;
  unchanged: number;
  ignored: number;
  errors: number;
  negativeDetected: number;
  normalized: number;
  positive: number;
  zero: number;
  items: PrestashopStockImportItem[];
  importedAt: string;
}

const numberValue = (row: PrestashopSqlRow | undefined, key: string) => {
  const value = Number(row?.[key]);
  return Number.isFinite(value) ? value : 0;
};

type SourceStock = {
  prestashopProductId: number;
  sourceQuantity: number;
  quantity: number;
  normalized: boolean;
  shopId: number;
  rowId: number;
};

function selectBaseStocks(rows: PrestashopSqlRow[]) {
  const baseRows = rows.filter((row) => numberValue(row, "id_product_attribute") === 0);
  const byProduct = new Map<number, SourceStock[]>();

  for (const row of baseRows) {
    const prestashopProductId = numberValue(row, "id_product");
    if (prestashopProductId <= 0) continue;
    const sourceQuantity = Math.trunc(numberValue(row, "quantity"));
    const source: SourceStock = {
      prestashopProductId,
      sourceQuantity,
      quantity: Math.max(0, sourceQuantity),
      normalized: sourceQuantity < 0,
      shopId: numberValue(row, "id_shop"),
      rowId: numberValue(row, "id_stock_available"),
    };
    const list = byProduct.get(prestashopProductId) ?? [];
    list.push(source);
    byProduct.set(prestashopProductId, list);
  }

  const selected: SourceStock[] = [];
  let duplicateRowsIgnored = 0;

  for (const candidates of byProduct.values()) {
    candidates.sort((left, right) => {
      // Prefer a concrete shop row over a shared id_shop=0 row, then keep the
      // lowest shop/id for a deterministic result on multi-shop dumps.
      const leftShopRank = left.shopId > 0 ? 0 : 1;
      const rightShopRank = right.shopId > 0 ? 0 : 1;
      return leftShopRank - rightShopRank || left.shopId - right.shopId || left.rowId - right.rowId;
    });
    selected.push(candidates[0]);
    duplicateRowsIgnored += Math.max(0, candidates.length - 1);
  }

  selected.sort((a, b) => a.prestashopProductId - b.prestashopProductId);
  return { selected, baseRows: baseRows.length, duplicateRowsIgnored };
}

async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  worker: (item: T) => Promise<R>,
) {
  const results: R[] = new Array(items.length);
  let cursor = 0;
  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, async () => {
      while (true) {
        const index = cursor++;
        if (index >= items.length) return;
        results[index] = await worker(items[index]);
      }
    }),
  );
  return results;
}

export async function importPrestashopStock(input: {
  content: string;
  prisma: PrismaClient;
}): Promise<PrestashopStockImportReport> {
  const parsed = parsePrestashopDump(input.content);
  const rows = parsed.data.stock_available?.rows ?? [];
  if (!rows.length) throw new Error("STOCK_TABLE_MISSING");

  const { selected, baseRows, duplicateRowsIgnored } = selectBaseStocks(rows);
  const productIds = selected.map((stock) => stock.prestashopProductId);
  const products = await input.prisma.product.findMany({
    where: { prestashopId: { in: productIds } },
    select: { id: true, prestashopId: true, stock: true },
  });
  const productByPrestashopId = new Map(
    products.flatMap((product) =>
      product.prestashopId == null ? [] : [[product.prestashopId, product] as const],
    ),
  );

  const items = await mapWithConcurrency(selected, 16, async (source): Promise<PrestashopStockImportItem> => {
    const product = productByPrestashopId.get(source.prestashopProductId);
    if (!product) {
      return {
        prestashopProductId: source.prestashopProductId,
        sourceQuantity: source.sourceQuantity,
        quantity: source.quantity,
        normalized: source.normalized,
        action: "ignored",
        message: "PRODUCT_NOT_IMPORTED",
      };
    }

    if (product.stock === source.quantity) {
      return {
        prestashopProductId: source.prestashopProductId,
        sourceQuantity: source.sourceQuantity,
        quantity: source.quantity,
        normalized: source.normalized,
        action: "unchanged",
      };
    }

    try {
      await input.prisma.product.update({
        where: { id: product.id },
        data: { stock: source.quantity },
      });
      return {
        prestashopProductId: source.prestashopProductId,
        sourceQuantity: source.sourceQuantity,
        quantity: source.quantity,
        normalized: source.normalized,
        action: "updated",
      };
    } catch (error) {
      return {
        prestashopProductId: source.prestashopProductId,
        sourceQuantity: source.sourceQuantity,
        quantity: source.quantity,
        normalized: source.normalized,
        action: "error",
        message: error instanceof Error ? error.message.slice(0, 500) : "UNKNOWN_ERROR",
      };
    }
  });

  return {
    totalRows: rows.length,
    baseRows,
    variantRowsIgnored: rows.length - baseRows,
    duplicateRowsIgnored,
    productsProcessed: selected.length,
    updated: items.filter((item) => item.action === "updated").length,
    unchanged: items.filter((item) => item.action === "unchanged").length,
    ignored: items.filter((item) => item.action === "ignored").length,
    errors: items.filter((item) => item.action === "error").length,
    negativeDetected: selected.filter((item) => item.normalized).length,
    normalized: items.filter((item) => item.normalized && item.action !== "ignored" && item.action !== "error").length,
    positive: selected.filter((item) => item.sourceQuantity > 0).length,
    zero: selected.filter((item) => item.sourceQuantity === 0).length,
    items,
    importedAt: new Date().toISOString(),
  };
}
