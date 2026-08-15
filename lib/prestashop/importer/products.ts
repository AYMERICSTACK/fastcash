import type { PrismaClient } from "@prisma/client";
import { parsePrestashopDump } from "@/lib/prestashop/parser";
import type { PrestashopSqlRow } from "@/lib/prestashop/types";

export type PrestashopProductImportAction =
  | "created"
  | "updated"
  | "unchanged"
  | "ignored"
  | "error";

export interface PrestashopProductImportItem {
  prestashopId: number;
  name: string;
  action: PrestashopProductImportAction;
  message?: string;
}

export interface PrestashopUncategorizedProductItem {
  productId: string;
  prestashopId: number;
  name: string;
  reference: string | null;
  active: boolean;
}

export interface PrestashopProductImportReport {
  languageId: number;
  total: number;
  importable: number;
  created: number;
  updated: number;
  unchanged: number;
  ignored: number;
  errors: number;
  missingDefaultCategories: number;
  systemDefaultCategoriesReassigned: number;
  uncategorizedProducts: number;
  uncategorizedItems: PrestashopUncategorizedProductItem[];
  staleProductsDisabled: number;
  staleReconciliationSkipped: boolean;
  missingBrands: number;
  secondaryRelations: number;
  items: PrestashopProductImportItem[];
  importedAt: string;
}

type SourceProduct = {
  prestashopId: number;
  name: string;
  slugBase: string;
  reference: string | null;
  description: string | null;
  descriptionShort: string | null;
  metaTitle: string | null;
  metaDescription: string | null;
  metaKeywords: string | null;
  price: number;
  active: boolean;
  manufacturerId: number;
  defaultCategoryId: number;
  prestashopCreatedAt: Date | null;
  prestashopUpdatedAt: Date | null;
  categoryRelations: Array<{ prestashopId: number; position: number }>;
};

const numberValue = (row: PrestashopSqlRow | undefined, key: string) => {
  const value = Number(row?.[key]);
  return Number.isFinite(value) ? value : 0;
};

const textValue = (row: PrestashopSqlRow | undefined, key: string) =>
  String(row?.[key] ?? "").trim();

const nullableText = (row: PrestashopSqlRow | undefined, key: string) => {
  const value = textValue(row, key);
  return value || null;
};

function parseDate(value: unknown) {
  const text = String(value ?? "").trim();
  if (!text || text === "0000-00-00 00:00:00" || text === "0000-00-00") return null;
  const date = new Date(text.replace(" ", "T") + (text.includes("T") ? "" : "Z"));
  return Number.isNaN(date.getTime()) ? null : date;
}

function slugify(value: string) {
  return (
    value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "produit"
  );
}

function normalizeDescription(value: string | null) {
  if (!value) return null;
  const normalized = value
    .replace(/<br\s*\/?\s*>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<\/li>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#039;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/[ \t]+/g, " ")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return normalized || null;
}

function detectLanguage(rows: PrestashopSqlRow[], requested?: number | null) {
  if (requested && rows.some((row) => numberValue(row, "id_lang") === requested)) {
    return requested;
  }

  const scores = new Map<number, number>();
  for (const row of rows) {
    const languageId = numberValue(row, "id_lang");
    if (languageId <= 0) continue;
    const score =
      (textValue(row, "name") ? 5 : 0) +
      (textValue(row, "link_rewrite") ? 2 : 0) +
      (textValue(row, "description") ? 1 : 0) +
      (textValue(row, "description_short") ? 1 : 0);
    scores.set(languageId, (scores.get(languageId) ?? 0) + score);
  }

  return [...scores.entries()].sort((a, b) => b[1] - a[1] || a[0] - b[0])[0]?.[0] ?? 0;
}

function sameNullableDate(left: Date | null, right: Date | null) {
  return left?.getTime() === right?.getTime();
}

function sameStringSet(left: Array<{ categoryId: string; position: number }>, right: Array<{ categoryId: string; position: number }>) {
  if (left.length !== right.length) return false;
  const normalized = (items: Array<{ categoryId: string; position: number }>) =>
    [...items]
      .sort((a, b) => a.categoryId.localeCompare(b.categoryId))
      .map((item) => `${item.categoryId}:${item.position}`)
      .join("|");
  return normalized(left) === normalized(right);
}

export async function importPrestashopProducts(input: {
  content: string;
  prisma: PrismaClient;
  languageId?: number | null;
}): Promise<PrestashopProductImportReport> {
  const parsed = parsePrestashopDump(input.content);
  const products = parsed.data.product?.rows ?? [];
  const translations = parsed.data.product_lang?.rows ?? [];
  const shops = parsed.data.product_shop?.rows ?? [];
  const categoryProducts = parsed.data.category_product?.rows ?? [];
  const categories = parsed.data.category?.rows ?? [];
  const categoryTranslations = parsed.data.category_lang?.rows ?? [];

  if (!products.length || !translations.length) throw new Error("PRODUCT_TABLES_MISSING");

  const languageId = detectLanguage(translations, input.languageId);
  if (!languageId) throw new Error("PRODUCT_LANGUAGE_NOT_FOUND");

  const shopsByProduct = new Map<number, PrestashopSqlRow[]>();
  for (const row of shops) {
    const productId = numberValue(row, "id_product");
    if (productId <= 0) continue;
    const current = shopsByProduct.get(productId) ?? [];
    current.push(row);
    shopsByProduct.set(productId, current);
  }

  const translationsByProduct = new Map<number, PrestashopSqlRow[]>();
  for (const row of translations) {
    if (numberValue(row, "id_lang") !== languageId) continue;
    const productId = numberValue(row, "id_product");
    const current = translationsByProduct.get(productId) ?? [];
    current.push(row);
    translationsByProduct.set(productId, current);
  }

  const categoryTranslationById = new Map<number, PrestashopSqlRow>();
  for (const row of categoryTranslations) {
    if (numberValue(row, "id_lang") !== languageId) continue;
    const categoryId = numberValue(row, "id_category");
    if (categoryId > 0 && !categoryTranslationById.has(categoryId)) categoryTranslationById.set(categoryId, row);
  }

  const categoryParentById = new Map<number, number>();
  for (const row of categories) {
    const categoryId = numberValue(row, "id_category");
    if (categoryId > 0) categoryParentById.set(categoryId, numberValue(row, "id_parent"));
  }

  const categoryDepth = (categoryId: number) => {
    let depth = 0;
    let current = categoryId;
    const visited = new Set<number>();
    while (current > 0 && !visited.has(current)) {
      visited.add(current);
      const parent = categoryParentById.get(current) ?? 0;
      if (parent <= 0) break;
      depth += 1;
      current = parent;
    }
    return depth;
  };

  const isCategoryInBranch = (categoryId: number, ancestorId: number) => {
    if (categoryId <= 0 || ancestorId <= 0) return false;

    let current = categoryId;
    const visited = new Set<number>();

    while (current > 0 && !visited.has(current)) {
      if (current === ancestorId) return true;
      visited.add(current);
      current = categoryParentById.get(current) ?? 0;
    }

    return false;
  };

  const systemCategoryIds = new Set<number>();
  for (const row of categories) {
    const categoryId = numberValue(row, "id_category");
    if (categoryId <= 0) continue;
    const translation = categoryTranslationById.get(categoryId);
    const name = textValue(translation, "name").toLowerCase();
    if (
      numberValue(row, "id_parent") === 0 ||
      numberValue(row, "is_root_category") === 1 ||
      ["root", "racine", "home", "accueil"].includes(name)
    ) {
      systemCategoryIds.add(categoryId);
    }
  }

  const relationsByProduct = new Map<number, Array<{ prestashopId: number; position: number }>>();
  for (const row of categoryProducts) {
    const productId = numberValue(row, "id_product");
    const categoryId = numberValue(row, "id_category");
    if (productId <= 0 || categoryId <= 0) continue;
    const current = relationsByProduct.get(productId) ?? [];
    if (!current.some((item) => item.prestashopId === categoryId)) {
      current.push({ prestashopId: categoryId, position: numberValue(row, "position") });
    }
    relationsByProduct.set(productId, current);
  }

  const sourceProducts: SourceProduct[] = products
    .map((row) => {
      const prestashopId = numberValue(row, "id_product");
      const defaultShopId = numberValue(row, "id_shop_default");
      const translationsForProduct = translationsByProduct.get(prestashopId) ?? [];
      const translation =
        translationsForProduct.find((item) => numberValue(item, "id_shop") === defaultShopId) ??
        translationsForProduct[0];
      const shopsForProduct = shopsByProduct.get(prestashopId) ?? [];
      const shop =
        shopsForProduct.find((item) => numberValue(item, "id_shop") === defaultShopId) ??
        shopsForProduct[0];
      const name = textValue(translation, "name");
      const rawDescription = nullableText(translation, "description");
      const rawDescriptionShort = nullableText(translation, "description_short");
      const slugSource = textValue(translation, "link_rewrite") || name || `produit-${prestashopId}`;

      return {
        prestashopId,
        name,
        slugBase: slugSource,
        reference: nullableText(row, "reference"),
        description: normalizeDescription(rawDescription),
        descriptionShort: normalizeDescription(rawDescriptionShort),
        metaTitle: nullableText(translation, "meta_title"),
        metaDescription: nullableText(translation, "meta_description"),
        metaKeywords: nullableText(translation, "meta_keywords"),
        price: shop ? numberValue(shop, "price") : numberValue(row, "price"),
        active: (shop ? numberValue(shop, "active") : numberValue(row, "active")) === 1,
        manufacturerId: numberValue(row, "id_manufacturer"),
        defaultCategoryId: numberValue(shop, "id_category_default") || numberValue(row, "id_category_default"),
        prestashopCreatedAt: parseDate(shop?.date_add ?? row.date_add),
        prestashopUpdatedAt: parseDate(shop?.date_upd ?? row.date_upd),
        categoryRelations: relationsByProduct.get(prestashopId) ?? [],
      };
    })
    .sort((a, b) => a.prestashopId - b.prestashopId);

  const categoryRows = await input.prisma.category.findMany({
    where: { prestashopId: { not: null } },
    select: { id: true, prestashopId: true },
  });
  const categoryByPrestashopId = new Map(
    categoryRows.flatMap((category) =>
      category.prestashopId == null ? [] : [[category.prestashopId, category.id] as const],
    ),
  );

  const brandRows = await input.prisma.brand.findMany({
    where: { prestashopId: { not: null } },
    select: { id: true, prestashopId: true },
  });
  const brandByPrestashopId = new Map(
    brandRows.flatMap((brand) =>
      brand.prestashopId == null ? [] : [[brand.prestashopId, brand.id] as const],
    ),
  );

  const existingProducts = await input.prisma.product.findMany({
    where: { prestashopId: { not: null } },
    include: { categoryLinks: { select: { categoryId: true, position: true } } },
  });
  const existingByPrestashopId = new Map(
    existingProducts.flatMap((product) =>
      product.prestashopId == null ? [] : [[product.prestashopId, product] as const],
    ),
  );

  const allSlugs = await input.prisma.product.findMany({ select: { id: true, prestashopId: true, slug: true } });
  const slugOwners = new Map(allSlugs.map((product) => [product.slug, { id: product.id, prestashopId: product.prestashopId }]));
  const allocatedSlugByPrestashopId = new Map<number, string>();

  for (const source of sourceProducts) {
    const existing = existingByPrestashopId.get(source.prestashopId);
    const root = slugify(source.slugBase);
    let candidate = root;
    let suffix = 2;
    while (true) {
      const owner = slugOwners.get(candidate);
      if (!owner || owner.id === existing?.id || owner.prestashopId === source.prestashopId) break;
      candidate = suffix === 2 ? `${root}-${source.prestashopId}` : `${root}-${source.prestashopId}-${suffix - 1}`;
      suffix += 1;
    }
    allocatedSlugByPrestashopId.set(source.prestashopId, candidate);
    slugOwners.set(candidate, { id: existing?.id ?? `prestashop-${source.prestashopId}`, prestashopId: source.prestashopId });
  }

  const report: PrestashopProductImportReport = {
    languageId,
    total: sourceProducts.length,
    importable: 0,
    created: 0,
    updated: 0,
    unchanged: 0,
    ignored: 0,
    errors: 0,
    missingDefaultCategories: 0,
    systemDefaultCategoriesReassigned: 0,
    uncategorizedProducts: 0,
    uncategorizedItems: [],
    staleProductsDisabled: 0,
    staleReconciliationSkipped: false,
    missingBrands: 0,
    secondaryRelations: 0,
    items: [],
    importedAt: new Date().toISOString(),
  };

  const processSource = async (source: SourceProduct) => {
    const emptyProduct =
      !source.name &&
      !slugify(source.slugBase).replace(/^produit-\d+$/, "") &&
      !source.description &&
      !source.descriptionShort;

    if (source.prestashopId <= 0 || emptyProduct || (!source.name && !source.description && !source.descriptionShort)) {
      report.ignored += 1;
      report.items.push({
        prestashopId: source.prestashopId,
        name: source.name || `Produit #${source.prestashopId}`,
        action: "ignored",
        message: source.prestashopId <= 0 ? "Identifiant Prestashop invalide." : "IGNORED_EMPTY_PRODUCT",
      });
      return;
    }

    report.importable += 1;

    const existing = existingByPrestashopId.get(source.prestashopId);
    const importedDefaultCategoryId = categoryByPrestashopId.get(source.defaultCategoryId) ?? null;
    const sourceDefaultIsSystem = systemCategoryIds.has(source.defaultCategoryId);
    const brandId = brandByPrestashopId.get(source.manufacturerId) ?? null;
    if (source.defaultCategoryId > 0 && !sourceDefaultIsSystem && !importedDefaultCategoryId) {
      report.missingDefaultCategories += 1;
    }
    if (source.manufacturerId > 0 && !brandId) report.missingBrands += 1;

    const categoryLinks = source.categoryRelations
      .map((relation) => ({
        categoryId: categoryByPrestashopId.get(relation.prestashopId),
        position: relation.position,
      }))
      .filter((relation): relation is { categoryId: string; position: number } => Boolean(relation.categoryId))
      .sort((a, b) => a.position - b.position || a.categoryId.localeCompare(b.categoryId));

    // La catégorie principale publique doit être la catégorie métier la plus
    // spécifique réellement liée au produit. Dans le Prestashop historique,
    // id_category_default peut pointer vers une catégorie très large (Luxe,
    // Informatique...) alors qu'une sous-catégorie métier plus précise existe
    // dans category_product. On privilégie donc la relation la plus profonde
    // dans l'arbre, avec la catégorie par défaut Prestashop comme départageur.
    const rankedSourceRelations = source.categoryRelations
      .filter((relation) => !systemCategoryIds.has(relation.prestashopId))
      .filter((relation) => categoryByPrestashopId.has(relation.prestashopId))
      .sort((left, right) => {
        const depthDiff = categoryDepth(right.prestashopId) - categoryDepth(left.prestashopId);
        if (depthDiff !== 0) return depthDiff;
        const leftIsDefault = left.prestashopId === source.defaultCategoryId ? 1 : 0;
        const rightIsDefault = right.prestashopId === source.defaultCategoryId ? 1 : 0;
        if (leftIsDefault !== rightIsDefault) return rightIsDefault - leftIsDefault;
        return left.position - right.position || left.prestashopId - right.prestashopId;
      });

    const mostSpecificCategoryId = rankedSourceRelations.length
      ? categoryByPrestashopId.get(rankedSourceRelations[0].prestashopId) ?? null
      : null;

    // La bonne catégorie publique est la catégorie métier la plus précise
    // DANS LA BRANCHE de la catégorie par défaut Prestashop.
    //
    // Exemple réel :
    //   défaut = Luxe
    //   relations = Luxe + Petite Maroquinerie + Informatique + Tablettes
    // => Petite Maroquinerie gagne car elle descend de Luxe.
    // Tablettes est ignorée pour la catégorie principale car elle appartient
    // à une autre branche, même si elle est tout aussi profonde.
    const rankedDefaultBranchRelations =
      !sourceDefaultIsSystem && importedDefaultCategoryId
        ? rankedSourceRelations.filter((relation) =>
            isCategoryInBranch(relation.prestashopId, source.defaultCategoryId),
          )
        : [];

    const branchSpecificCategoryId = rankedDefaultBranchRelations.length
      ? categoryByPrestashopId.get(rankedDefaultBranchRelations[0].prestashopId) ?? null
      : null;

    // Pour les anciens produits dont la catégorie par défaut est système
    // (Accueil) et qui n'ont aucune relation métier exploitable, on conserve
    // une éventuelle catégorisation manuelle déjà faite dans FAST CASH.
    const preservedManualCategoryId =
      sourceDefaultIsSystem && !mostSpecificCategoryId
        ? existing?.categoryId ?? null
        : null;

    const defaultCategoryId =
      branchSpecificCategoryId ??
      (!sourceDefaultIsSystem ? importedDefaultCategoryId : null) ??
      mostSpecificCategoryId ??
      preservedManualCategoryId ??
      importedDefaultCategoryId ??
      categoryLinks[0]?.categoryId ??
      null;

    if (sourceDefaultIsSystem && !importedDefaultCategoryId && defaultCategoryId) {
      report.systemDefaultCategoriesReassigned += 1;
    }
    const needsCategorization = !defaultCategoryId;
    if (needsCategorization) report.uncategorizedProducts += 1;

    if (defaultCategoryId && !categoryLinks.some((link) => link.categoryId === defaultCategoryId)) {
      categoryLinks.push({ categoryId: defaultCategoryId, position: 0 });
    }

    const data = {
      name: source.name || `Produit #${source.prestashopId}`,
      slug: allocatedSlugByPrestashopId.get(source.prestashopId) ?? `produit-${source.prestashopId}`,
      reference: source.reference,
      description: source.description,
      descriptionShort: source.descriptionShort,
      metaTitle: source.metaTitle,
      metaDescription: source.metaDescription,
      metaKeywords: source.metaKeywords,
      price: Math.max(0, source.price),
      active: source.active,
      categoryId: defaultCategoryId,
      brandId,
      prestashopCreatedAt: source.prestashopCreatedAt,
      prestashopUpdatedAt: source.prestashopUpdatedAt,
    };

    try {
      let productId: string;
      let action: PrestashopProductImportAction;

      if (!existing) {
        const created = await input.prisma.product.create({
          data: { ...data, prestashopId: source.prestashopId },
          select: { id: true },
        });
        productId = created.id;
        action = "created";
      } else {
        productId = existing.id;
        const changed =
          existing.name !== data.name ||
          existing.slug !== data.slug ||
          existing.reference !== data.reference ||
          existing.description !== data.description ||
          existing.descriptionShort !== data.descriptionShort ||
          existing.metaTitle !== data.metaTitle ||
          existing.metaDescription !== data.metaDescription ||
          existing.metaKeywords !== data.metaKeywords ||
          existing.price !== data.price ||
          existing.active !== data.active ||
          existing.categoryId !== data.categoryId ||
          existing.brandId !== data.brandId ||
          !sameNullableDate(existing.prestashopCreatedAt, data.prestashopCreatedAt) ||
          !sameNullableDate(existing.prestashopUpdatedAt, data.prestashopUpdatedAt) ||
          !sameStringSet(existing.categoryLinks, categoryLinks);

        if (changed) {
          await input.prisma.product.update({ where: { id: existing.id }, data });
          action = "updated";
        } else {
          action = "unchanged";
        }
      }

      if (action !== "unchanged" || !existing) {
        await input.prisma.productCategory.deleteMany({ where: { productId } });
        if (categoryLinks.length) {
          await input.prisma.productCategory.createMany({
            data: categoryLinks.map((link) => ({ productId, ...link })),
            skipDuplicates: true,
          });
        }
      }

      report.secondaryRelations += categoryLinks.length;
      if (action === "created") report.created += 1;
      else if (action === "updated") report.updated += 1;
      else report.unchanged += 1;

      if (needsCategorization) {
        report.uncategorizedItems.push({
          productId,
          prestashopId: source.prestashopId,
          name: data.name,
          reference: source.reference,
          active: source.active,
        });
      }

      report.items.push({ prestashopId: source.prestashopId, name: data.name, action });
    } catch (error) {
      report.errors += 1;
      report.items.push({
        prestashopId: source.prestashopId,
        name: data.name,
        action: "error",
        message: error instanceof Error ? error.message : "Erreur inconnue",
      });
    }
  };

  const batchSize = 10;
  for (let index = 0; index < sourceProducts.length; index += batchSize) {
    await Promise.all(sourceProducts.slice(index, index + batchSize).map(processSource));
  }

  // Réconciliation finale des produits disparus de la source Prestashop.
  //
  // Un ancien produit déjà importé peut rester dans FAST CASH alors qu'il a
  // ensuite été supprimé de Prestashop. On ne le supprime jamais physiquement
  // (historique de commandes / factures), mais on le retire du catalogue en
  // le passant inactif avec un stock à zéro.
  //
  // Garde-fou : si le dump semble très incomplet par rapport au nombre de
  // produits Prestashop déjà connus en base, on n'applique aucune désactivation.
  const sourcePrestashopIds = new Set(
    products
      .map((row) => numberValue(row, "id_product"))
      .filter((prestashopId) => prestashopId > 0),
  );

  const managedProducts = await input.prisma.product.findMany({
    where: { prestashopId: { not: null } },
    select: { id: true, prestashopId: true, active: true, stock: true },
  });

  const sourceCoverage =
    managedProducts.length > 0 ? sourcePrestashopIds.size / managedProducts.length : 1;

  if (sourceCoverage >= 0.8) {
    const staleProductIds = managedProducts
      .filter(
        (product) =>
          product.prestashopId != null &&
          !sourcePrestashopIds.has(product.prestashopId) &&
          (product.active || product.stock !== 0),
      )
      .map((product) => product.id);

    if (staleProductIds.length) {
      const result = await input.prisma.product.updateMany({
        where: { id: { in: staleProductIds } },
        data: { active: false, stock: 0 },
      });
      report.staleProductsDisabled = result.count;
    }
  } else {
    report.staleReconciliationSkipped = true;
  }

  return report;
}
