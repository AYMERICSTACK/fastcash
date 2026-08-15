export const PRESTASHOP_CORE_TABLES = [
  "product",
  "product_lang",
  "product_shop",
  "category",
  "category_lang",
  "category_product",
  "category_shop",
  "image",
  "image_lang",
  "image_shop",
  "stock_available",
  "manufacturer",
] as const;

export type PrestashopCoreTable = (typeof PRESTASHOP_CORE_TABLES)[number];
export type PrestashopCapabilityKey =
  | "products"
  | "categories"
  | "brands"
  | "images"
  | "stock"
  | "combinations";
export type PrestashopCapabilities = Record<PrestashopCapabilityKey, boolean>;

export interface PrestashopDumpMetadata {
  phpMyAdminVersion: string | null;
  databaseName: string | null;
  databaseServerVersion: string | null;
  phpVersion: string | null;
  generatedAt: string | null;
  prestashopVersion: string | null;
}

export interface PrestashopTableDefinition {
  fullName: string;
  name: string;
  prefix: string;
  columns: string[];
  hasCreateStatement: boolean;
  hasInsertStatement: boolean;
  insertStatementCount: number;
}

export interface PrestashopParserWarning {
  code: "PREFIX_AMBIGUOUS" | "NO_CREATE_TABLE" | "NO_INSERT_DATA" | "UNKNOWN_PRESTASHOP_VERSION";
  message: string;
}

export type PrestashopSqlValue = string | number | null;
export type PrestashopSqlRow = Record<string, PrestashopSqlValue>;

export interface PrestashopParsedTableData {
  name: string;
  columns: string[];
  rows: PrestashopSqlRow[];
  rowCount: number;
}

export interface PrestashopParserResult {
  prefix: string;
  detectedPrefixes: string[];
  tables: PrestashopTableDefinition[];
  data: Partial<Record<PrestashopCoreTable, PrestashopParsedTableData>>;
  metadata: PrestashopDumpMetadata;
  warnings: PrestashopParserWarning[];
}

export type PrestashopIssueSeverity = "info" | "warning" | "error";

export interface PrestashopAnalysisIssue {
  code: string;
  severity: PrestashopIssueSeverity;
  title: string;
  message: string;
  count: number;
  normalization?: string;
}

export interface PrestashopLanguageAnalysis {
  id: number;
  productRows: number;
  categoryRows: number;
  namedProducts: number;
  namedCategories: number;
  completenessScore: number;
}

export interface PrestashopStatistics {
  products: {
    total: number;
    importable: number;
    ignoredEmpty: number;
    active: number;
    inactive: number;
    inactiveImportable: number;
    zeroPrice: number;
    negativePrice: number;
    minimumPrice: number | null;
    maximumPrice: number | null;
    duplicateSlugs: number;
    invalidDefaultCategory: number;
    invalidManufacturer: number;
  };
  categories: {
    total: number;
    commercial: number;
    system: number;
    orphaned: number;
    brokenProductRelations: number;
  };
  brands: {
    total: number;
    active: number;
    inactive: number;
  };
  images: {
    total: number;
    productsWithoutImage: number;
    ignoredWithEmptyProducts: number;
    orphaned: number;
    duplicateCovers: number;
    duplicatePositions: number;
  };
  stock: {
    rows: number;
    positive: number;
    zero: number;
    negative: number;
    orphaned: number;
    combinations: number;
  };
  tax: {
    rulesGroups: number[];
    missingRules: boolean;
  };
  languages: {
    detected: PrestashopLanguageAnalysis[];
    suggestedId: number | null;
  };
}

export interface PrestashopQualityScore {
  score: number;
  grade: "excellent" | "good" | "fair" | "poor";
  deductions: Array<{ code: string; points: number; reason: string }>;
}

export interface PrestashopAnalysis {
  format: "prestashop-sql";
  file: { name: string; size: number; sizeLabel: string; mimeType: string | null };
  prefix: string;
  tables: PrestashopTableDefinition[];
  tableNames: string[];
  coreTables: Partial<Record<PrestashopCoreTable, boolean>>;
  capabilities: PrestashopCapabilities;
  metadata: PrestashopDumpMetadata;
  statistics: PrestashopStatistics;
  issues: PrestashopAnalysisIssue[];
  quality: PrestashopQualityScore;
  warnings: PrestashopParserWarning[];
  analyzedAt: string;
}

export interface AnalyzePrestashopDumpInput {
  content: string;
  fileName: string;
  fileSize: number;
  mimeType?: string | null;
}
