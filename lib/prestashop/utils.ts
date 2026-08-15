import { PRESTASHOP_CORE_TABLES, type PrestashopCoreTable } from "@/lib/prestashop/types";

const PRESTASHOP_TABLE_HINTS = new Set<string>([
  ...PRESTASHOP_CORE_TABLES,
  "product_attribute",
  "product_attribute_combination",
  "attribute",
  "attribute_group",
  "lang",
  "shop",
]);

export function normalizeLineEndings(value: string) {
  return value.replace(/\r\n?/g, "\n");
}

export function stripUtf8Bom(value: string) {
  return value.charCodeAt(0) === 0xfeff ? value.slice(1) : value;
}

export function normalizeSqlDump(value: string) {
  return normalizeLineEndings(stripUtf8Bom(value));
}

export function formatBytes(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 octet";
  const units = ["octets", "Ko", "Mo", "Go"];
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const amount = bytes / 1024 ** exponent;
  return `${new Intl.NumberFormat("fr-CH", { maximumFractionDigits: exponent === 0 ? 0 : 2 }).format(amount)} ${units[exponent]}`;
}

export function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function toLogicalTableName(fullName: string, prefix: string) {
  return fullName.startsWith(prefix) ? fullName.slice(prefix.length) : fullName;
}

export function isPrestashopTableHint(logicalName: string) {
  return PRESTASHOP_TABLE_HINTS.has(logicalName);
}

export function isPrestashopCoreTable(value: string): value is PrestashopCoreTable {
  return (PRESTASHOP_CORE_TABLES as readonly string[]).includes(value);
}

export function assertValidSqlFile(file: File, maxBytes: number) {
  if (!file.name.toLowerCase().endsWith(".sql")) {
    throw new Error("INVALID_EXTENSION");
  }

  if (file.size <= 0) {
    throw new Error("EMPTY_FILE");
  }

  if (file.size > maxBytes) {
    throw new Error("FILE_TOO_LARGE");
  }
}
