export { analyzePrestashopDump } from "@/lib/prestashop/analyzer";
export { parsePrestashopDump } from "@/lib/prestashop/parser";
export { createPrestashopFoundationReport } from "@/lib/prestashop/report";
export { assertValidSqlFile, formatBytes } from "@/lib/prestashop/utils";
export type {
  AnalyzePrestashopDumpInput,
  PrestashopAnalysis,
  PrestashopAnalysisIssue,
  PrestashopCapabilities,
  PrestashopCapabilityKey,
  PrestashopCoreTable,
  PrestashopDumpMetadata,
  PrestashopIssueSeverity,
  PrestashopLanguageAnalysis,
  PrestashopParsedTableData,
  PrestashopParserResult,
  PrestashopParserWarning,
  PrestashopQualityScore,
  PrestashopSqlRow,
  PrestashopSqlValue,
  PrestashopStatistics,
  PrestashopTableDefinition,
} from "@/lib/prestashop/types";

export { importPrestashopCategories } from "@/lib/prestashop/importer/categories";
export type { PrestashopCategoryImportItem, PrestashopCategoryImportReport } from "@/lib/prestashop/importer/categories";

export { importPrestashopBrands } from "@/lib/prestashop/importer/brands";
export type { PrestashopBrandImportItem, PrestashopBrandImportReport } from "@/lib/prestashop/importer/brands";

export { importPrestashopProducts } from "@/lib/prestashop/importer/products";
export type {
  PrestashopProductImportAction,
  PrestashopProductImportItem,
  PrestashopProductImportReport,
} from "@/lib/prestashop/importer/products";

export { buildPrestashopImageUrl, importPrestashopImages } from "@/lib/prestashop/importer/images";
export type { PrestashopImageImportAction, PrestashopImageImportItem, PrestashopImageImportReport } from "@/lib/prestashop/importer/images";

export { importPrestashopStock } from "@/lib/prestashop/importer/stock";
export type {
  PrestashopStockImportAction,
  PrestashopStockImportItem,
  PrestashopStockImportReport,
} from "@/lib/prestashop/importer/stock";
