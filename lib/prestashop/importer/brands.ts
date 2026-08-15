import type { PrismaClient } from "@prisma/client";
import { parsePrestashopDump } from "@/lib/prestashop/parser";
import type { PrestashopSqlRow } from "@/lib/prestashop/types";

export interface PrestashopBrandImportItem {
  prestashopId: number;
  name: string;
  action: "created" | "updated" | "unchanged" | "ignored" | "error";
  message?: string;
}

export interface PrestashopBrandImportReport {
  total: number;
  created: number;
  updated: number;
  unchanged: number;
  ignored: number;
  errors: number;
  items: PrestashopBrandImportItem[];
  importedAt: string;
}

const numberValue = (row: PrestashopSqlRow, key: string) => {
  const value = Number(row[key]);
  return Number.isFinite(value) ? value : 0;
};

const textValue = (row: PrestashopSqlRow, key: string) => String(row[key] ?? "").trim();

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "marque";
}

async function uniqueSlug(
  prisma: PrismaClient,
  base: string,
  prestashopId: number,
  currentId?: string,
) {
  const root = slugify(base);
  let candidate = root;
  let suffix = 2;

  while (true) {
    const existing = await prisma.brand.findUnique({
      where: { slug: candidate },
      select: { id: true, prestashopId: true },
    });

    if (!existing || existing.id === currentId || existing.prestashopId === prestashopId) {
      return candidate;
    }

    candidate = `${root}-${suffix++}`;
  }
}

export async function importPrestashopBrands(input: {
  content: string;
  prisma: PrismaClient;
}): Promise<PrestashopBrandImportReport> {
  const parsed = parsePrestashopDump(input.content);
  const manufacturers = parsed.data.manufacturer?.rows ?? [];

  if (!parsed.data.manufacturer) {
    throw new Error("BRAND_TABLE_MISSING");
  }

  const report: PrestashopBrandImportReport = {
    total: manufacturers.length,
    created: 0,
    updated: 0,
    unchanged: 0,
    ignored: 0,
    errors: 0,
    items: [],
    importedAt: new Date().toISOString(),
  };

  const orderedManufacturers = [...manufacturers].sort(
    (a, b) => numberValue(a, "id_manufacturer") - numberValue(b, "id_manufacturer"),
  );

  for (const row of orderedManufacturers) {
    const prestashopId = numberValue(row, "id_manufacturer");
    const name = textValue(row, "name");

    if (prestashopId <= 0) {
      report.ignored += 1;
      report.items.push({
        prestashopId,
        name: name || "Marque sans identifiant",
        action: "ignored",
        message: "Identifiant Prestashop invalide.",
      });
      continue;
    }

    if (!name) {
      report.ignored += 1;
      report.items.push({
        prestashopId,
        name: `Marque #${prestashopId}`,
        action: "ignored",
        message: "Nom de marque absent.",
      });
      continue;
    }

    try {
      let existing = await input.prisma.brand.findUnique({ where: { prestashopId } });
      const canonicalSlug = slugify(name);
      const legacyBrand = await input.prisma.brand.findUnique({
        where: { slug: canonicalSlug },
      });

      // A brand may already exist from the original FAST CASH catalogue without a
      // Prestashop id (for example Apple /apple). Older versions of the importer
      // created a second brand (/apple-2) because synchronisation only looked at
      // prestashopId. When both records exist, keep the historical/public record,
      // move the imported products to it, transfer prestashopId, then remove the
      // duplicate. This preserves existing URLs and makes future imports idempotent.
      if (
        legacyBrand &&
        legacyBrand.prestashopId == null &&
        (!existing || legacyBrand.id !== existing.id)
      ) {
        if (existing) {
          existing = await input.prisma.$transaction(async (tx) => {
            await tx.product.updateMany({
              where: { brandId: existing!.id },
              data: { brandId: legacyBrand.id },
            });

            // Release the unique prestashopId before assigning it to the canonical
            // historical brand.
            await tx.brand.update({
              where: { id: existing!.id },
              data: { prestashopId: null },
            });

            const adopted = await tx.brand.update({
              where: { id: legacyBrand.id },
              data: {
                prestashopId,
                name,
                active: numberValue(row, "active") === 1,
              },
            });

            await tx.brand.delete({ where: { id: existing!.id } });
            return adopted;
          });

          report.updated += 1;
          report.items.push({
            prestashopId,
            name,
            action: "updated",
            message: `Doublon fusionné vers /marques/${legacyBrand.slug}.`,
          });
          continue;
        }

        existing = await input.prisma.brand.update({
          where: { id: legacyBrand.id },
          data: {
            prestashopId,
            name,
            active: numberValue(row, "active") === 1,
          },
        });

        report.updated += 1;
        report.items.push({
          prestashopId,
          name,
          action: "updated",
          message: `Marque existante adoptée sans changer le slug /${legacyBrand.slug}.`,
        });
        continue;
      }

      const slug = existing?.slug ?? await uniqueSlug(input.prisma, name, prestashopId);
      const data = {
        name,
        slug,
        active: numberValue(row, "active") === 1,
      };

      if (!existing) {
        await input.prisma.brand.create({
          data: { ...data, prestashopId },
        });
        report.created += 1;
        report.items.push({ prestashopId, name, action: "created" });
        continue;
      }

      const changed =
        existing.name !== data.name ||
        existing.active !== data.active;

      if (!changed) {
        report.unchanged += 1;
        report.items.push({ prestashopId, name, action: "unchanged" });
        continue;
      }

      await input.prisma.brand.update({
        where: { id: existing.id },
        data: { name: data.name, active: data.active },
      });
      report.updated += 1;
      report.items.push({ prestashopId, name, action: "updated" });
    } catch (error) {
      report.errors += 1;
      report.items.push({
        prestashopId,
        name,
        action: "error",
        message: error instanceof Error ? error.message : "Erreur inconnue",
      });
    }
  }

  return report;
}
