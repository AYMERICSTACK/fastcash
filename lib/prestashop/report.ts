import type { PrestashopAnalysis } from "@/lib/prestashop/types";

export function createPrestashopFoundationReport(analysis: PrestashopAnalysis) {
  const enabledCapabilities = Object.entries(analysis.capabilities)
    .filter(([, enabled]) => enabled)
    .map(([name]) => name);

  return {
    summary: {
      detectedPrefix: analysis.prefix,
      detectedTables: analysis.tables.length,
      populatedTables: analysis.tables.filter((table) => table.hasInsertStatement).length,
      enabledCapabilities,
      warningCount: analysis.warnings.length,
      issueCount: analysis.issues.length,
      qualityScore: analysis.quality.score,
      products: analysis.statistics.products.total,
      importableProducts: analysis.statistics.products.importable,
      categories: analysis.statistics.categories.total,
      brands: analysis.statistics.brands.total,
      images: analysis.statistics.images.total,
      stockRows: analysis.statistics.stock.rows,
    },
    analysis,
  };
}
