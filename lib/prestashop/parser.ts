import { isPrestashopTableHint, normalizeSqlDump, toLogicalTableName } from "@/lib/prestashop/utils";
import {
  PRESTASHOP_CORE_TABLES,
  type PrestashopCoreTable,
  type PrestashopDumpMetadata,
  type PrestashopParsedTableData,
  type PrestashopParserResult,
  type PrestashopParserWarning,
  type PrestashopSqlRow,
  type PrestashopSqlValue,
  type PrestashopTableDefinition,
} from "@/lib/prestashop/types";

const TABLE_REFERENCE_PATTERN = /(?:CREATE\s+TABLE(?:\s+IF\s+NOT\s+EXISTS)?|INSERT\s+INTO)\s+`([^`]+)`/gi;
const CREATE_TABLE_PATTERN = /CREATE\s+TABLE(?:\s+IF\s+NOT\s+EXISTS)?\s+`([^`]+)`\s*\(([^]*?)\)\s*(?:ENGINE|TYPE)\s*=/gi;
const INSERT_START_PATTERN = /INSERT\s+INTO\s+`([^`]+)`(?:\s*\(([^]*?)\))?\s+VALUES\s*/gi;
const CORE_TABLE_SET = new Set<string>(PRESTASHOP_CORE_TABLES);

function collectReferencedTableNames(sql: string) {
  const names = new Set<string>();
  let match: RegExpExecArray | null;
  TABLE_REFERENCE_PATTERN.lastIndex = 0;
  while ((match = TABLE_REFERENCE_PATTERN.exec(sql)) !== null) names.add(match[1]);
  return [...names];
}

function splitPrefixCandidates(tableName: string) {
  const candidates: Array<{ prefix: string; logicalName: string }> = [];
  for (let index = 1; index < tableName.length; index += 1) {
    if (tableName[index - 1] !== "_") continue;
    const prefix = tableName.slice(0, index);
    const logicalName = tableName.slice(index);
    if (logicalName) candidates.push({ prefix, logicalName });
  }
  return candidates;
}

function detectPrefixes(tableNames: string[]) {
  const rootTables = new Set(["product", "category", "image", "manufacturer", "stock_available"]);
  const scores = new Map<string, { score: number; matches: number; hintMatches: number; rootMatches: number }>();
  for (const tableName of tableNames) {
    for (const candidate of splitPrefixCandidates(tableName)) {
      const current = scores.get(candidate.prefix) ?? { score: 0, matches: 0, hintMatches: 0, rootMatches: 0 };
      const isHint = isPrestashopTableHint(candidate.logicalName);
      current.matches += 1;
      current.hintMatches += isHint ? 1 : 0;
      current.rootMatches += rootTables.has(candidate.logicalName) ? 1 : 0;
      current.score += isHint ? 10 : 1;
      scores.set(candidate.prefix, current);
    }
  }
  const ranked = [...scores.entries()]
    .filter(([, value]) => value.matches >= 2 && value.hintMatches >= 2)
    .sort((a, b) => b[1].score - a[1].score || b[1].matches - a[1].matches || a[0].length - b[0].length);
  const strongCandidates = ranked.filter(([, value]) => value.rootMatches >= 2);
  return (strongCandidates.length ? strongCandidates : ranked.slice(0, 1)).map(([prefix]) => prefix);
}

function parseColumns(rawDefinition: string) {
  return [...rawDefinition.matchAll(/^\s*`([^`]+)`/gm)].map((match) => match[1]);
}

function parseMetadata(sql: string): PrestashopDumpMetadata {
  const firstMatch = (pattern: RegExp) => sql.match(pattern)?.[1]?.trim() || null;
  return {
    phpMyAdminVersion: firstMatch(/^--\s*version\s+([^\n]+)$/im),
    databaseName: firstMatch(/^--\s*Base de données\s*:\s*`([^`]+)`/im) ?? firstMatch(/^--\s*Database\s*:\s*`([^`]+)`/im),
    databaseServerVersion: firstMatch(/^--\s*Version du serveur\s*:\s*([^\n]+)$/im) ?? firstMatch(/^--\s*Server version\s*:\s*([^\n]+)$/im),
    phpVersion: firstMatch(/^--\s*Version de PHP\s*:\s*([^\n]+)$/im) ?? firstMatch(/^--\s*PHP Version\s*:\s*([^\n]+)$/im),
    generatedAt: firstMatch(/^--\s*Généré le\s*:\s*([^\n]+)$/im) ?? firstMatch(/^--\s*Generation Time\s*:\s*([^\n]+)$/im),
    prestashopVersion: firstMatch(/(?:_PS_VERSION_|prestashop_version|PrestaShop version)[^'"\n]*['"]([0-9]+(?:\.[0-9]+){1,3})['"]/i),
  };
}

function findStatementEnd(sql: string, start: number) {
  let quoted = false;
  let escaped = false;
  for (let index = start; index < sql.length; index += 1) {
    const character = sql[index];
    if (quoted) {
      if (escaped) escaped = false;
      else if (character === "\\") escaped = true;
      else if (character === "'") quoted = false;
      continue;
    }
    if (character === "'") quoted = true;
    else if (character === ";") return index;
  }
  return sql.length;
}

function decodeSqlValue(rawValue: string): PrestashopSqlValue {
  const value = rawValue.trim();
  if (!value || /^null$/i.test(value)) return null;
  if (value.startsWith("'") && value.endsWith("'")) {
    return value.slice(1, -1).replace(/\\(['"\\0bnrtZ])/g, (_, escaped: string) => {
      const replacements: Record<string, string> = {
        "0": "\0", b: "\b", n: "\n", r: "\r", t: "\t", Z: "\u001a",
        "'": "'", '"': '"', "\\": "\\",
      };
      return replacements[escaped] ?? escaped;
    });
  }
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : value;
}

function parseValues(rawValues: string, columns: string[]): PrestashopSqlRow[] {
  const rows: PrestashopSqlRow[] = [];
  let row: string[] | null = null;
  let token = "";
  let depth = 0;
  let quoted = false;
  let escaped = false;

  const pushToken = () => {
    if (row) row.push(token.trim());
    token = "";
  };
  const pushRow = () => {
    if (!row) return;
    pushToken();
    const parsed: PrestashopSqlRow = {};
    columns.forEach((column, index) => { parsed[column] = decodeSqlValue(row?.[index] ?? "NULL"); });
    rows.push(parsed);
    row = null;
  };

  for (const character of rawValues) {
    if (quoted) {
      token += character;
      if (escaped) escaped = false;
      else if (character === "\\") escaped = true;
      else if (character === "'") quoted = false;
      continue;
    }
    if (character === "'") { quoted = true; token += character; continue; }
    if (character === "(") {
      if (depth === 0) { row = []; token = ""; }
      else token += character;
      depth += 1;
      continue;
    }
    if (character === ")" && depth > 0) {
      depth -= 1;
      if (depth === 0) pushRow();
      else token += character;
      continue;
    }
    if (character === "," && depth === 1) { pushToken(); continue; }
    if (depth > 0) token += character;
  }
  return rows;
}

function parseCoreTableData(sql: string, prefix: string, definitions: Map<string, PrestashopTableDefinition>) {
  const data: Partial<Record<PrestashopCoreTable, PrestashopParsedTableData>> = {};
  INSERT_START_PATTERN.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = INSERT_START_PATTERN.exec(sql)) !== null) {
    const fullName = match[1];
    if (!fullName.startsWith(prefix)) continue;
    const logicalName = toLogicalTableName(fullName, prefix);
    if (!CORE_TABLE_SET.has(logicalName)) continue;
    const tableName = logicalName as PrestashopCoreTable;
    const explicitColumns = match[2] ? [...match[2].matchAll(/`([^`]+)`/g)].map((column) => column[1]) : [];
    const columns = explicitColumns.length ? explicitColumns : definitions.get(fullName)?.columns ?? [];
    if (!columns.length) continue;
    const statementEnd = findStatementEnd(sql, INSERT_START_PATTERN.lastIndex);
    const rows = parseValues(sql.slice(INSERT_START_PATTERN.lastIndex, statementEnd), columns);
    const existing = data[tableName] ?? { name: tableName, columns, rows: [], rowCount: 0 };
    existing.rows.push(...rows);
    existing.rowCount = existing.rows.length;
    data[tableName] = existing;
    INSERT_START_PATTERN.lastIndex = statementEnd + 1;
  }
  return data;
}

export function parsePrestashopDump(rawSql: string): PrestashopParserResult {
  const sql = normalizeSqlDump(rawSql);
  const referencedTableNames = collectReferencedTableNames(sql);
  const detectedPrefixes = detectPrefixes(referencedTableNames);
  const prefix = detectedPrefixes[0] ?? "";
  if (!prefix) throw new Error("PRESTASHOP_PREFIX_NOT_FOUND");

  const definitions = new Map<string, PrestashopTableDefinition>();
  const ensureDefinition = (fullName: string) => {
    const existing = definitions.get(fullName);
    if (existing) return existing;
    const created: PrestashopTableDefinition = { fullName, name: toLogicalTableName(fullName, prefix), prefix, columns: [], hasCreateStatement: false, hasInsertStatement: false, insertStatementCount: 0 };
    definitions.set(fullName, created);
    return created;
  };

  let createMatch: RegExpExecArray | null;
  CREATE_TABLE_PATTERN.lastIndex = 0;
  while ((createMatch = CREATE_TABLE_PATTERN.exec(sql)) !== null) {
    if (!createMatch[1].startsWith(prefix)) continue;
    const table = ensureDefinition(createMatch[1]);
    table.hasCreateStatement = true;
    table.columns = parseColumns(createMatch[2]);
  }

  let insertMatch: RegExpExecArray | null;
  INSERT_START_PATTERN.lastIndex = 0;
  while ((insertMatch = INSERT_START_PATTERN.exec(sql)) !== null) {
    if (!insertMatch[1].startsWith(prefix)) continue;
    const table = ensureDefinition(insertMatch[1]);
    table.hasInsertStatement = true;
    table.insertStatementCount += 1;
    if (!table.columns.length && insertMatch[2]) table.columns = [...insertMatch[2].matchAll(/`([^`]+)`/g)].map((column) => column[1]);
  }
  for (const fullName of referencedTableNames) if (fullName.startsWith(prefix)) ensureDefinition(fullName);

  const tables = [...definitions.values()].sort((a, b) => a.name.localeCompare(b.name));
  const warnings: PrestashopParserWarning[] = [];
  if (detectedPrefixes.length > 1) warnings.push({ code: "PREFIX_AMBIGUOUS", message: `Plusieurs préfixes SQL ont été détectés (${detectedPrefixes.join(", ")}). Le préfixe ${prefix} a été retenu.` });
  if (!tables.some((table) => table.hasCreateStatement)) warnings.push({ code: "NO_CREATE_TABLE", message: "Aucune structure CREATE TABLE n'a été détectée." });
  if (!tables.some((table) => table.hasInsertStatement)) warnings.push({ code: "NO_INSERT_DATA", message: "Aucune donnée INSERT INTO n'a été détectée." });
  const metadata = parseMetadata(sql);
  if (!metadata.prestashopVersion) warnings.push({ code: "UNKNOWN_PRESTASHOP_VERSION", message: "La version Prestashop n'est pas déclarée dans le dump SQL." });

  return { prefix, detectedPrefixes, tables, data: parseCoreTableData(sql, prefix, definitions), metadata, warnings };
}
