import type { PrismaClient } from "@prisma/client";
import { parsePrestashopDump } from "@/lib/prestashop/parser";
import type { PrestashopSqlRow } from "@/lib/prestashop/types";

export interface PrestashopCategoryImportItem {
  prestashopId: number;
  name: string;
  action: "created" | "updated" | "unchanged" | "merged" | "ignored" | "error";
  message?: string;
}

export interface PrestashopCategoryImportReport {
  languageId: number;
  total: number;
  created: number;
  updated: number;
  unchanged: number;
  merged: number;
  ignored: number;
  errors: number;
  items: PrestashopCategoryImportItem[];
  importedAt: string;
}

const numberValue = (row: PrestashopSqlRow, key: string) => {
  const value = Number(row[key]);
  return Number.isFinite(value) ? value : 0;
};
const textValue = (row: PrestashopSqlRow, key: string) => String(row[key] ?? "").trim();

function slugify(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim()
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "categorie";
}

// Les catégories historiques du nouveau site ont parfois un slug légèrement
// différent de Prestashop. Cette table ne fusionne que des univers réellement
// équivalents ; les catégories contextuelles répétées (ex. Accessoires) restent distinctes.
const CANONICAL_SLUG_ALIASES: Record<string, string> = {
  montre: "montres",
  montres: "montres",
  mode: "chaussures",
  chaussures: "chaussures",
  imageson: "image-et-son",
  "image-son": "image-et-son",
  "image-et-son": "image-et-son",
  "consoles-jeux-video": "consoles-jeux-video",
  bijouterie: "bijouterie",
};

function canonicalSlug(value: string) {
  const normalized = slugify(value);
  return CANONICAL_SLUG_ALIASES[normalized] ?? normalized;
}

function semanticKey(name: string, slug: string) {
  const canonical = canonicalSlug(slug || name);
  // Le slug est prioritaire : il évite de fusionner les nombreux "Accessoires"
  // Prestashop qui peuvent appartenir à des branches différentes.
  return canonical;
}

function detectLanguage(rows: PrestashopSqlRow[], requested?: number | null) {
  if (requested && rows.some((row) => numberValue(row, "id_lang") === requested)) return requested;
  const scores = new Map<number, number>();
  for (const row of rows) {
    const id = numberValue(row, "id_lang");
    if (id > 0 && textValue(row, "name")) scores.set(id, (scores.get(id) ?? 0) + 1);
  }
  return [...scores.entries()].sort((a, b) => b[1] - a[1] || a[0] - b[0])[0]?.[0] ?? 0;
}

async function cleanupLegacyRootAccessories(prisma: PrismaClient) {
  const legacy = await prisma.category.findFirst({
    where: {
      prestashopId: null,
      parentId: null,
      name: { equals: "Accessoires", mode: "insensitive" },
    },
    select: {
      id: true,
      _count: { select: { products: true, productLinks: true, children: true } },
    },
  });
  if (!legacy) return;
  const hasRelations = legacy._count.products > 0 || legacy._count.productLinks > 0 || legacy._count.children > 0;
  if (hasRelations) {
    await prisma.category.update({ where: { id: legacy.id }, data: { active: false } });
    return;
  }
  await prisma.category.delete({ where: { id: legacy.id } });
}

async function uniqueSlug(prisma: PrismaClient, base: string, prestashopId: number, currentId?: string) {
  const root = slugify(base);
  let candidate = root;
  let suffix = 2;
  while (true) {
    const existing = await prisma.category.findUnique({ where: { slug: candidate }, select: { id: true, prestashopId: true } });
    if (!existing || existing.id === currentId || existing.prestashopId === prestashopId) return candidate;
    candidate = `${root}-${suffix++}`;
  }
}

async function mergeCategoryIntoCanonical(
  prisma: PrismaClient,
  duplicateId: string,
  canonicalId: string,
  prestashopId: number,
) {
  if (duplicateId === canonicalId) return;

  // Lecture hors transaction : sur les grosses catégories (Luxe, Téléphonie…),
  // plusieurs centaines d'upsert séquentiels faisaient expirer la transaction
  // interactive Prisma au bout de 5 secondes.
  const duplicateLinks = await prisma.productCategory.findMany({
    where: { categoryId: duplicateId },
    select: { productId: true, position: true },
  });

  await prisma.$transaction(
    async (tx) => {
      // Insertion groupée : la clé composite évite les doublons déjà présents
      // sur la catégorie canonique, sans lancer une requête par produit.
      if (duplicateLinks.length > 0) {
        await tx.productCategory.createMany({
          data: duplicateLinks.map((link) => ({
            productId: link.productId,
            categoryId: canonicalId,
            position: link.position,
          })),
          skipDuplicates: true,
        });
      }

      await tx.productCategory.deleteMany({ where: { categoryId: duplicateId } });

      await tx.product.updateMany({
        where: { categoryId: duplicateId },
        data: { categoryId: canonicalId },
      });
      await tx.category.updateMany({
        where: { parentId: duplicateId },
        data: { parentId: canonicalId },
      });

      // Libère l'unicité Prestashop avant de l'attribuer à la catégorie canonique.
      await tx.category.update({
        where: { id: duplicateId },
        data: { prestashopId: null },
      });
      await tx.category.update({
        where: { id: canonicalId },
        data: { prestashopId },
      });
      await tx.category.delete({ where: { id: duplicateId } });
    },
    {
      maxWait: 10_000,
      timeout: 30_000,
    },
  );
}

export async function importPrestashopCategories(input: {
  content: string;
  prisma: PrismaClient;
  languageId?: number | null;
}): Promise<PrestashopCategoryImportReport> {
  const parsed = parsePrestashopDump(input.content);
  const categories = parsed.data.category?.rows ?? [];
  const translations = parsed.data.category_lang?.rows ?? [];
  if (!categories.length || !translations.length) throw new Error("CATEGORY_TABLES_MISSING");

  const languageId = detectLanguage(translations, input.languageId);
  if (!languageId) throw new Error("CATEGORY_LANGUAGE_NOT_FOUND");

  await cleanupLegacyRootAccessories(input.prisma);

  const translationById = new Map<number, PrestashopSqlRow>();
  for (const row of translations) {
    if (numberValue(row, "id_lang") === languageId && !translationById.has(numberValue(row, "id_category"))) {
      translationById.set(numberValue(row, "id_category"), row);
    }
  }

  const sourceById = new Map(categories.map((row) => [numberValue(row, "id_category"), row]));
  const systemIds = new Set<number>();
  for (const row of categories) {
    const id = numberValue(row, "id_category");
    const name = textValue(translationById.get(id) ?? {}, "name").toLowerCase();
    if (numberValue(row, "id_parent") === 0 || numberValue(row, "is_root_category") === 1 || ["root", "racine", "home", "accueil"].includes(name)) systemIds.add(id);
  }

  const commercial = categories.filter((row) => !systemIds.has(numberValue(row, "id_category")));
  const depth = (row: PrestashopSqlRow) => numberValue(row, "level_depth");
  commercial.sort((a, b) => depth(a) - depth(b) || numberValue(a, "position") - numberValue(b, "position") || numberValue(a, "id_category") - numberValue(b, "id_category"));

  const report: PrestashopCategoryImportReport = { languageId, total: categories.length, created: 0, updated: 0, unchanged: 0, merged: 0, ignored: systemIds.size, errors: 0, items: [], importedAt: new Date().toISOString() };
  for (const id of systemIds) report.items.push({ prestashopId: id, name: textValue(translationById.get(id) ?? {}, "name") || `Catégorie #${id}`, action: "ignored", message: "Catégorie système" });

  const dbIds = new Map<number, string>();
  const resolveCommercialParent = (row: PrestashopSqlRow) => {
    let parentId = numberValue(row, "id_parent");
    const seen = new Set<number>();
    while (parentId > 0 && !seen.has(parentId)) {
      seen.add(parentId);
      if (!systemIds.has(parentId)) return parentId;
      parentId = numberValue(sourceById.get(parentId) ?? {}, "id_parent");
    }
    return null;
  };

  for (const row of commercial) {
    const prestashopId = numberValue(row, "id_category");
    const translation = translationById.get(prestashopId);
    const name = textValue(translation ?? {}, "name");
    if (!name) {
      report.ignored += 1;
      report.items.push({ prestashopId, name: `Catégorie #${prestashopId}`, action: "ignored", message: `Nom absent pour la langue ${languageId}` });
      continue;
    }

    try {
      let existing = await input.prisma.category.findUnique({ where: { prestashopId } });
      let wasMerged = false;
      const sourceSlug = textValue(translation ?? {}, "link_rewrite") || name;
      const wantedKey = semanticKey(name, sourceSlug);

      // Une catégorie créée par le nouveau site (prestashopId=null) est la cible
      // prioritaire. On ne cherche jamais une cible par le seul nom "Accessoires".
      const canonicalCandidates = await input.prisma.category.findMany({
        where: { prestashopId: null },
        select: { id: true, name: true, slug: true, prestashopId: true },
      });
      const canonical = canonicalCandidates.find((candidate) =>
        candidate.id !== existing?.id && semanticKey(candidate.name, candidate.slug) === wantedKey,
      );

      if (existing && canonical) {
        await mergeCategoryIntoCanonical(input.prisma, existing.id, canonical.id, prestashopId);
        existing = await input.prisma.category.findUnique({ where: { id: canonical.id } });
        report.merged += 1;
        wasMerged = true;
        report.items.push({ prestashopId, name, action: "merged", message: `Fusionnée vers ${canonical.name} (${canonical.slug})` });
      } else if (!existing && canonical) {
        existing = await input.prisma.category.update({ where: { id: canonical.id }, data: { prestashopId } });
        report.merged += 1;
        wasMerged = true;
        report.items.push({ prestashopId, name, action: "merged", message: `Catégorie existante réutilisée (${canonical.slug})` });
      }

      const parentPrestashopId = resolveCommercialParent(row);
      const parentId = parentPrestashopId ? dbIds.get(parentPrestashopId) ?? (await input.prisma.category.findUnique({ where: { prestashopId: parentPrestashopId }, select: { id: true } }))?.id ?? null : null;

      // Si une catégorie canonique a été adoptée, on conserve son slug public.
      const slug = existing
        ? existing.slug
        : await uniqueSlug(input.prisma, sourceSlug, prestashopId);
      const data = { name, slug, active: numberValue(row, "active") === 1, position: numberValue(row, "position"), parentId };

      if (!existing) {
        const created = await input.prisma.category.create({ data: { ...data, prestashopId }, select: { id: true } });
        dbIds.set(prestashopId, created.id);
        report.created += 1;
        report.items.push({ prestashopId, name, action: "created" });
      } else {
        dbIds.set(prestashopId, existing.id);
        const changed = existing.name !== data.name || existing.slug !== data.slug || existing.active !== data.active || existing.position !== data.position || existing.parentId !== data.parentId;
        if (changed) {
          await input.prisma.category.update({ where: { id: existing.id }, data });
          if (!wasMerged) report.updated += 1;
          // Ne duplique pas une ligne de rapport si la fusion vient déjà d'être signalée.
          if (!wasMerged) {
            report.items.push({ prestashopId, name, action: "updated" });
          }
        } else if (!wasMerged) {
          report.unchanged += 1;
          report.items.push({ prestashopId, name, action: "unchanged" });
        }
      }
    } catch (error) {
      report.errors += 1;
      report.items.push({ prestashopId, name, action: "error", message: error instanceof Error ? error.message : "Erreur inconnue" });
    }
  }
  return report;
}
