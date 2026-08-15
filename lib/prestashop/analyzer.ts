import { parsePrestashopDump } from "@/lib/prestashop/parser";
import {
  PRESTASHOP_CORE_TABLES,
  type AnalyzePrestashopDumpInput,
  type PrestashopAnalysis,
  type PrestashopAnalysisIssue,
  type PrestashopCapabilities,
  type PrestashopCoreTable,
  type PrestashopLanguageAnalysis,
  type PrestashopQualityScore,
  type PrestashopSqlRow,
  type PrestashopStatistics,
} from "@/lib/prestashop/types";
import { formatBytes } from "@/lib/prestashop/utils";

function hasAll(tableNames: Set<string>, required: string[]) {
  return required.every((table) => tableNames.has(table));
}

function resolveCapabilities(tableNames: Set<string>): PrestashopCapabilities {
  return {
    products: hasAll(tableNames, ["product", "product_lang"]),
    categories: hasAll(tableNames, ["category", "category_lang", "category_product"]),
    brands: tableNames.has("manufacturer"),
    images: hasAll(tableNames, ["image", "image_shop"]),
    stock: tableNames.has("stock_available"),
    combinations: hasAll(tableNames, ["product_attribute", "product_attribute_combination"]),
  };
}

const numberValue = (row: PrestashopSqlRow, key: string) => {
  const value = Number(row[key]);
  return Number.isFinite(value) ? value : 0;
};
const textValue = (row: PrestashopSqlRow, key: string) => String(row[key] ?? "").trim();
const isBlank = (value: unknown) => value == null || String(value).trim() === "";

function buildLanguages(productLang: PrestashopSqlRow[], categoryLang: PrestashopSqlRow[]) {
  const ids = new Set<number>();
  for (const row of [...productLang, ...categoryLang]) ids.add(numberValue(row, "id_lang"));

  const detected: PrestashopLanguageAnalysis[] = [...ids]
    .filter((id) => id > 0)
    .map((id) => {
      const productRows = productLang.filter((row) => numberValue(row, "id_lang") === id);
      const categoryRows = categoryLang.filter((row) => numberValue(row, "id_lang") === id);
      const namedProducts = productRows.filter((row) => !isBlank(row.name)).length;
      const namedCategories = categoryRows.filter((row) => !isBlank(row.name)).length;
      const denominator = productRows.length + categoryRows.length;
      return {
        id,
        productRows: productRows.length,
        categoryRows: categoryRows.length,
        namedProducts,
        namedCategories,
        completenessScore: denominator ? Math.round(((namedProducts + namedCategories) / denominator) * 100) : 0,
      };
    })
    .sort((a, b) => b.completenessScore - a.completenessScore || b.namedProducts - a.namedProducts || a.id - b.id);

  return { detected, suggestedId: detected[0]?.id ?? null };
}

function qualityFromIssues(issues: PrestashopAnalysisIssue[], totalProducts: number): PrestashopQualityScore {
  const deductions: PrestashopQualityScore["deductions"] = [];
  const add = (code: string, points: number, reason: string) => {
    if (points > 0) deductions.push({ code, points, reason });
  };

  for (const issue of issues) {
    if (!issue.count) continue;
    const ratio = totalProducts ? issue.count / totalProducts : 0;
    switch (issue.code) {
      case "EMPTY_PRODUCTS": add(issue.code, Math.min(12, Math.max(2, Math.round(ratio * 100))), issue.title); break;
      case "BROKEN_RELATIONS": add(issue.code, Math.min(20, Math.max(5, issue.count)), issue.title); break;
      case "ORPHAN_IMAGES": add(issue.code, Math.min(15, Math.max(4, Math.ceil(issue.count / 10))), issue.title); break;
      case "ORPHAN_STOCK": add(issue.code, Math.min(12, Math.max(4, Math.ceil(issue.count / 10))), issue.title); break;
      case "NEGATIVE_STOCK": add(issue.code, Math.min(6, Math.max(1, Math.ceil(issue.count / 20))), issue.title); break;
      case "ZERO_PRICE": add(issue.code, Math.min(8, Math.max(1, Math.ceil(issue.count / 20))), issue.title); break;
      case "NO_TAX_RULES": add(issue.code, 5, issue.title); break;
      case "PRODUCTS_WITHOUT_IMAGE": add(issue.code, Math.min(8, Math.max(1, Math.ceil(issue.count / 20))), issue.title); break;
      case "DUPLICATE_SLUGS": add(issue.code, Math.min(6, Math.max(1, Math.ceil(issue.count / 10))), issue.title); break;
      case "DUPLICATE_IMAGE_COVERS":
      case "DUPLICATE_IMAGE_POSITIONS": add(issue.code, Math.min(5, Math.max(1, issue.count)), issue.title); break;
      default: break;
    }
  }

  const score = Math.max(0, 100 - deductions.reduce((sum, item) => sum + item.points, 0));
  return { score, grade: score >= 90 ? "excellent" : score >= 75 ? "good" : score >= 55 ? "fair" : "poor", deductions };
}

function analyzeData(parsed: ReturnType<typeof parsePrestashopDump>) {
  const products = parsed.data.product?.rows ?? [];
  const productLang = parsed.data.product_lang?.rows ?? [];
  const categories = parsed.data.category?.rows ?? [];
  const categoryLang = parsed.data.category_lang?.rows ?? [];
  const categoryProducts = parsed.data.category_product?.rows ?? [];
  const manufacturers = parsed.data.manufacturer?.rows ?? [];
  const images = parsed.data.image?.rows ?? [];
  const stocks = parsed.data.stock_available?.rows ?? [];

  const productIds = new Set(products.map((row) => numberValue(row, "id_product")));
  const categoryIds = new Set(categories.map((row) => numberValue(row, "id_category")));
  const manufacturerIds = new Set(manufacturers.map((row) => numberValue(row, "id_manufacturer")));
  const productLangByProduct = new Map<number, PrestashopSqlRow[]>();
  for (const row of productLang) {
    const id = numberValue(row, "id_product");
    const list = productLangByProduct.get(id) ?? [];
    list.push(row);
    productLangByProduct.set(id, list);
  }

  const emptyProductIds = new Set<number>();
  for (const product of products) {
    const id = numberValue(product, "id_product");
    const translations = productLangByProduct.get(id) ?? [];
    const empty = translations.length === 0 || translations.every((row) =>
      isBlank(row.name) && isBlank(row.link_rewrite) && isBlank(row.description) && isBlank(row.description_short));
    if (empty) emptyProductIds.add(id);
  }

  const imageProductIds = new Set(images.map((row) => numberValue(row, "id_product")));
  const prices = products.map((row) => numberValue(row, "price"));
  const nonEmptyPrices = prices.filter(Number.isFinite);
  const duplicateSlugs = (() => {
    const counts = new Map<string, number>();
    for (const row of productLang) {
      const slug = textValue(row, "link_rewrite").toLocaleLowerCase();
      if (!slug) continue;
      const key = `${numberValue(row, "id_lang")}::${slug}`;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return [...counts.values()].filter((count) => count > 1).reduce((sum, count) => sum + count - 1, 0);
  })();

  const systemNames = new Set(["root", "racine", "home", "accueil"]);
  const systemCategoryIds = new Set<number>();
  for (const row of categoryLang) {
    if (systemNames.has(textValue(row, "name").toLocaleLowerCase())) systemCategoryIds.add(numberValue(row, "id_category"));
  }
  for (const row of categories) {
    if (numberValue(row, "id_parent") === 0 || numberValue(row, "is_root_category") === 1) systemCategoryIds.add(numberValue(row, "id_category"));
  }

  const categoryOrphans = categories.filter((row) => {
    const parent = numberValue(row, "id_parent");
    return parent > 0 && !categoryIds.has(parent);
  }).length;
  const brokenRelations = categoryProducts.filter((row) => !categoryIds.has(numberValue(row, "id_category")) || !productIds.has(numberValue(row, "id_product"))).length;
  const orphanImages = images.filter((row) => !productIds.has(numberValue(row, "id_product"))).length;
  const orphanStock = stocks.filter((row) => !productIds.has(numberValue(row, "id_product"))).length;

  const coverCounts = new Map<number, number>();
  const positionCounts = new Map<string, number>();
  for (const row of images) {
    const productId = numberValue(row, "id_product");
    if (numberValue(row, "cover") === 1) coverCounts.set(productId, (coverCounts.get(productId) ?? 0) + 1);
    const key = `${productId}:${numberValue(row, "position")}`;
    positionCounts.set(key, (positionCounts.get(key) ?? 0) + 1);
  }
  const duplicateCovers = [...coverCounts.values()].filter((count) => count > 1).length;
  const duplicatePositions = [...positionCounts.values()].filter((count) => count > 1).length;

  const rulesGroups = [...new Set(products.map((row) => numberValue(row, "id_tax_rules_group")))].sort((a, b) => a - b);
  const languages = buildLanguages(productLang, categoryLang);
  const statistics: PrestashopStatistics = {
    products: {
      total: products.length,
      importable: Math.max(0, products.length - emptyProductIds.size),
      ignoredEmpty: emptyProductIds.size,
      active: products.filter((row) => numberValue(row, "active") === 1).length,
      inactive: products.filter((row) => numberValue(row, "active") !== 1).length,
      inactiveImportable: products.filter((row) => numberValue(row, "active") !== 1 && !emptyProductIds.has(numberValue(row, "id_product"))).length,
      zeroPrice: prices.filter((price) => price === 0).length,
      negativePrice: prices.filter((price) => price < 0).length,
      minimumPrice: nonEmptyPrices.length ? Math.min(...nonEmptyPrices) : null,
      maximumPrice: nonEmptyPrices.length ? Math.max(...nonEmptyPrices) : null,
      duplicateSlugs,
      invalidDefaultCategory: products.filter((row) => !categoryIds.has(numberValue(row, "id_category_default"))).length,
      invalidManufacturer: products.filter((row) => {
        const id = numberValue(row, "id_manufacturer");
        return id > 0 && !manufacturerIds.has(id);
      }).length,
    },
    categories: {
      total: categories.length,
      commercial: Math.max(0, categories.length - systemCategoryIds.size),
      system: systemCategoryIds.size,
      orphaned: categoryOrphans,
      brokenProductRelations: brokenRelations,
    },
    brands: {
      total: manufacturers.length,
      active: manufacturers.filter((row) => numberValue(row, "active") === 1).length,
      inactive: manufacturers.filter((row) => numberValue(row, "active") !== 1).length,
    },
    images: {
      total: images.length,
      productsWithoutImage: products.filter((row) => !imageProductIds.has(numberValue(row, "id_product"))).length,
      ignoredWithEmptyProducts: [...emptyProductIds].filter((id) => imageProductIds.has(id)).length,
      orphaned: orphanImages,
      duplicateCovers,
      duplicatePositions,
    },
    stock: {
      rows: stocks.length,
      positive: stocks.filter((row) => numberValue(row, "quantity") > 0).length,
      zero: stocks.filter((row) => numberValue(row, "quantity") === 0).length,
      negative: stocks.filter((row) => numberValue(row, "quantity") < 0).length,
      orphaned: orphanStock,
      combinations: stocks.filter((row) => numberValue(row, "id_product_attribute") > 0).length,
    },
    tax: { rulesGroups, missingRules: products.length > 0 && rulesGroups.every((id) => id === 0) },
    languages,
  };

  const issues: PrestashopAnalysisIssue[] = [];
  const addIssue = (issue: PrestashopAnalysisIssue) => { if (issue.count > 0) issues.push(issue); };
  addIssue({ code: "EMPTY_PRODUCTS", severity: "warning", title: "Produits complètement vides", message: `${statistics.products.ignoredEmpty} produit(s) sans nom, slug ni description seront ignorés.`, count: statistics.products.ignoredEmpty, normalization: "IGNORED_EMPTY_PRODUCT" });
  addIssue({ code: "NEGATIVE_STOCK", severity: "warning", title: "Stocks négatifs", message: `${statistics.stock.negative} stock(s) négatif(s) devront être normalisés à zéro.`, count: statistics.stock.negative, normalization: "Quantité ramenée à 0" });
  addIssue({ code: "ZERO_PRICE", severity: "warning", title: "Produits à prix zéro", message: `${statistics.products.zeroPrice} produit(s) possèdent un prix nul.`, count: statistics.products.zeroPrice });
  addIssue({ code: "PRODUCTS_WITHOUT_IMAGE", severity: "info", title: "Produits sans image", message: `${statistics.images.productsWithoutImage} produit(s) ne possèdent aucune image.`, count: statistics.images.productsWithoutImage });
  addIssue({ code: "DUPLICATE_SLUGS", severity: "warning", title: "Slugs dupliqués", message: `${statistics.products.duplicateSlugs} collision(s) de slug ont été détectées. La synchronisation utilisera prestashopId.`, count: statistics.products.duplicateSlugs });
  addIssue({ code: "BROKEN_RELATIONS", severity: "error", title: "Relations produit/catégorie cassées", message: `${statistics.categories.brokenProductRelations} relation(s) pointent vers une entité absente.`, count: statistics.categories.brokenProductRelations });
  addIssue({ code: "ORPHAN_IMAGES", severity: "error", title: "Images orphelines", message: `${statistics.images.orphaned} image(s) pointent vers un produit absent.`, count: statistics.images.orphaned });
  addIssue({ code: "ORPHAN_STOCK", severity: "error", title: "Stocks orphelins", message: `${statistics.stock.orphaned} ligne(s) de stock pointent vers un produit absent.`, count: statistics.stock.orphaned });
  addIssue({ code: "DUPLICATE_IMAGE_COVERS", severity: "warning", title: "Images principales multiples", message: `${statistics.images.duplicateCovers} produit(s) ont plusieurs images principales.`, count: statistics.images.duplicateCovers });
  addIssue({ code: "DUPLICATE_IMAGE_POSITIONS", severity: "warning", title: "Positions d’image dupliquées", message: `${statistics.images.duplicatePositions} position(s) sont dupliquées dans une galerie.`, count: statistics.images.duplicatePositions });
  if (statistics.tax.missingRules) issues.push({ code: "NO_TAX_RULES", severity: "warning", title: "Aucune règle de TVA détectée", message: "Tous les produits utilisent id_tax_rules_group = 0. Les prix seront importés tels quels.", count: products.length });

  return { statistics, issues, quality: qualityFromIssues(issues, products.length) };
}

export function analyzePrestashopDump(input: AnalyzePrestashopDumpInput): PrestashopAnalysis {
  const parsed = parsePrestashopDump(input.content);
  const tableNames = parsed.tables.map((table) => table.name);
  const tableNameSet = new Set(tableNames);
  const coreTables = Object.fromEntries(PRESTASHOP_CORE_TABLES.map((table) => [table, tableNameSet.has(table)])) as Record<PrestashopCoreTable, boolean>;
  const detailed = analyzeData(parsed);

  return {
    format: "prestashop-sql",
    file: { name: input.fileName, size: input.fileSize, sizeLabel: formatBytes(input.fileSize), mimeType: input.mimeType ?? null },
    prefix: parsed.prefix,
    tables: parsed.tables,
    tableNames,
    coreTables,
    capabilities: resolveCapabilities(tableNameSet),
    metadata: parsed.metadata,
    ...detailed,
    warnings: parsed.warnings,
    analyzedAt: new Date().toISOString(),
  };
}
