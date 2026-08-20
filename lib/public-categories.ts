import { prisma } from "@/lib/prisma";
import { getCategory, strategicCategories, type CategoryConfig } from "@/lib/categories";
import type { Product } from "@/lib/products";

const DEFAULT_CATEGORY_IMAGE = "/images/hero/fastcash-luxury-hero.jpg";

const RESERVED_CATEGORY_SLUGS = new Set(["accueil", "promotions", "bonnes-affaires", "apple", "samsung"]);

// Legacy Prestashop aliases that must not create duplicate public universes.
const PUBLIC_CATEGORY_ALIASES: Record<string, string> = {
  "bijouterie": "bijoux",
  "bijouterie-2": "bijoux",
  "image-son": "image-et-son",
  "imageson": "image-et-son",
  "consoles": "consoles-jeux-video",
  "montre": "montres",
};

export function resolvePublicCategorySlug(slug: string) {
  return PUBLIC_CATEGORY_ALIASES[slug] ?? slug;
}

function isLegacyPublicAlias(slug: string) {
  return Boolean(PUBLIC_CATEGORY_ALIASES[slug]);
}

function isPublicCategorySlug(slug: string) {
  return !RESERVED_CATEGORY_SLUGS.has(slug);
}

function defaultCategoryConfig(name: string, slug: string): CategoryConfig {
  return {
    slug,
    title: name,
    subtitle: "D'occasion à Genève",
    description: `Découvrez la sélection ${name} disponible chez FAST CASH Genève. Les produits sont ajoutés selon les arrivages, contrôlés en boutique et proposés avec un accompagnement clair.`,
    cta: "Faire estimer votre article",
    keywords: [`${name} Genève`, `${name} occasion Genève`, "FAST CASH Genève"],
    advantages: ["Produits contrôlés", "Stock évolutif", "Conseil en boutique", "Reprise possible"],
    image: DEFAULT_CATEGORY_IMAGE,
    eyebrow: "Univers FAST CASH",
  };
}

export type PublicCategory = CategoryConfig & {
  id?: string;
  productCount: number;
};

type PublicCategorySource = {
  id?: string;
  prestashopId?: number | null;
  name: string;
  slug: string;
  active?: boolean;
  image?: string | null;
  parentId?: string | null;
  parent?: { name: string } | null;
  _count?: { products?: number };
};

function isLegacyRootAccessories(category: PublicCategorySource) {
  return (
    category.prestashopId == null &&
    category.parentId == null &&
    category.name.trim().toLowerCase() === "accessoires"
  );
}

function normalizedCategoryName(name: string) {
  return name.trim().toLocaleLowerCase("fr");
}

function contextualCategoryName(
  category: PublicCategorySource,
  duplicatedNames?: ReadonlySet<string>,
) {
  const name = category.name.trim();
  const parentName = category.parent?.name?.trim();

  if (!parentName || !duplicatedNames?.has(normalizedCategoryName(name))) {
    return name;
  }

  return `${name} ${parentName}`;
}

export function toPublicCategory(
  category: PublicCategorySource,
  duplicatedNames?: ReadonlySet<string>,
): PublicCategory {
  const staticConfig = getCategory(category.slug);
  const displayName = contextualCategoryName(category, duplicatedNames);
  const fallback = defaultCategoryConfig(displayName, category.slug);

  return {
    ...fallback,
    ...staticConfig,
    id: category.id,
    slug: category.slug,
    title: staticConfig?.title ?? displayName,
    image: category.image || staticConfig?.image || fallback.image,
    productCount: category._count?.products ?? 0,
  };
}

export async function getPublicCategories(): Promise<PublicCategory[]> {
  const dbCategories = await prisma.category.findMany({
    where: { active: true },
    orderBy: { name: "asc" },
    include: {
      parent: { select: { name: true } },
      _count: { select: { products: true } },
    },
  });

  if (!dbCategories.length) {
    return strategicCategories.map((category) => ({ ...category, productCount: 0 }));
  }

  const eligibleCategories = dbCategories.filter(
    (category) =>
      !isLegacyRootAccessories(category) &&
      isPublicCategorySlug(category.slug) &&
      !isLegacyPublicAlias(category.slug) &&
      category._count.products > 0,
  );

  const nameCounts = new Map<string, number>();
  for (const category of eligibleCategories) {
    const key = normalizedCategoryName(category.name);
    nameCounts.set(key, (nameCounts.get(key) ?? 0) + 1);
  }

  const duplicatedNames = new Set(
    [...nameCounts.entries()]
      .filter(([, count]) => count > 1)
      .map(([name]) => name),
  );

  const dynamic = eligibleCategories.map((category) =>
    toPublicCategory(category, duplicatedNames),
  );
  const knownSlugs = new Set(dynamic.map((category) => category.slug));
  const staticMissing = strategicCategories
    .filter((category) => !knownSlugs.has(category.slug) && isPublicCategorySlug(category.slug))
    .map((category) => ({ ...category, productCount: 0 }));

  return [...dynamic, ...staticMissing].sort((a, b) => a.title.localeCompare(b.title, "fr"));
}

export async function getPublicCategoryBySlug(slug: string): Promise<PublicCategory | null> {
  const category = await prisma.category.findUnique({
    where: { slug },
    include: {
      parent: { select: { name: true } },
      _count: { select: { products: true } },
    },
  });

  if (
    category &&
    category.active &&
    !isLegacyRootAccessories(category) &&
    isPublicCategorySlug(category.slug)
  ) {
    const duplicateCount = await prisma.category.count({
      where: {
        active: true,
        name: { equals: category.name, mode: "insensitive" },
        products: { some: {} },
      },
    });

    const duplicatedNames =
      duplicateCount > 1
        ? new Set([normalizedCategoryName(category.name)])
        : undefined;

    return toPublicCategory(category, duplicatedNames);
  }

  if (!isPublicCategorySlug(slug)) return null;

  const staticCategory = getCategory(slug);
  return staticCategory ? { ...staticCategory, productCount: 0 } : null;
}

export function toCatalogProduct(product: {
  id: string;
  slug: string;
  name: string;
  reference: string | null;
  description: string | null;
  image: string | null;
  price: number;
  stock: number;
  condition?: string | null;
  category?: { name: string; slug: string } | null;
  brand?: { name: string; slug: string } | null;
  media?: Array<{ id: string; alt: string | null; isPrimary: boolean; media: { url: string } }>;
}): Product {
  return {
    id: product.id,
    slug: product.slug,
    name: product.name,
    reference: product.reference ?? "",
    category: product.category?.name ?? "Catalogue",
    categorySlug: product.category?.slug ?? "catalogue",
    price: product.price,
    stock: product.stock,
    condition: product.condition ?? "GOOD",
    image: product.media?.find((item) => item.isPrimary)?.media.url ?? product.image ?? product.media?.[0]?.media.url ?? "",
    images: product.media?.map((item) => ({ id: item.id, url: item.media.url, alt: item.alt ?? undefined, isPrimary: item.isPrimary })) ?? [],
    description: product.description ?? "",
    brand: product.brand?.name,
    brandSlug: product.brand?.slug,
  };
}


function normalizePublicSearch(value: string) {
  return value.trim();
}

export async function searchPublicProducts(query: string, limit = 48): Promise<Product[]> {
  const q = normalizePublicSearch(query);
  if (!q) return [];

  const terms = q.split(/\s+/).filter(Boolean);

  const products = await prisma.product.findMany({
    where: {
      active: true,
      AND: terms.map((term) => ({
        OR: [
          { name: { contains: term, mode: "insensitive" } },
          { reference: { contains: term, mode: "insensitive" } },
          { description: { contains: term, mode: "insensitive" } },
          { category: { name: { contains: term, mode: "insensitive" } } },
          { brand: { name: { contains: term, mode: "insensitive" } } },
        ],
      })),
    },
    include: {
      category: { select: { name: true, slug: true } },
      brand: { select: { name: true, slug: true } },
      media: { orderBy: { position: "asc" }, include: { media: { select: { url: true } } } },
    },
    orderBy: [{ stock: "desc" }, { updatedAt: "desc" }],
    take: limit,
  });

  return products.map(toCatalogProduct);
}

export async function getFeaturedPublicProducts(limit = 8): Promise<Product[]> {
  const products = await prisma.product.findMany({
    where: {
      active: true,
      stock: { gt: 0 },
    },
    include: {
      category: { select: { name: true, slug: true } },
      brand: { select: { name: true, slug: true } },
      media: { orderBy: { position: "asc" }, include: { media: { select: { url: true } } } },
    },
    orderBy: [{ updatedAt: "desc" }],
    take: limit,
  });

  return products.map(toCatalogProduct);
}

export async function getProductsByPublicCategory(slug: string): Promise<Product[]> {
  const resolvedSlug = resolvePublicCategorySlug(slug);
  const categorySlugs =
    resolvedSlug === "bijoux"
      ? ["bijoux", "bijouterie", "bijouterie-2"]
      : resolvedSlug === "image-et-son"
        ? ["image-et-son", "image-son", "imageson"]
        : resolvedSlug === "consoles-jeux-video"
          ? ["consoles-jeux-video", "consoles"]
          : resolvedSlug === "montres"
            ? ["montres", "montre"]
            : [resolvedSlug];

  // Une page d'univers doit inclure les produits dont la catégorie principale
  // est la catégorie demandée OU l'une de ses sous-catégories. On ne s'appuie
  // volontairement pas sur toutes les relations ProductCategory : cela évite
  // qu'une relation secondaire historique fasse remonter un produit dans un
  // mauvais univers (ex. maroquinerie dans Informatique).
  const roots = await prisma.category.findMany({
    where: { slug: { in: categorySlugs }, active: true },
    select: { id: true },
  });

  const categoryIds = new Set(roots.map((category) => category.id));
  let frontier = [...categoryIds];
  while (frontier.length) {
    const children = await prisma.category.findMany({
      where: { parentId: { in: frontier }, active: true },
      select: { id: true },
    });
    const next = children.map((category) => category.id).filter((id) => !categoryIds.has(id));
    next.forEach((id) => categoryIds.add(id));
    frontier = next;
  }

  const products = await prisma.product.findMany({
    where: {
      active: true,
      categoryId: { in: [...categoryIds] },
    },
    include: {
      category: { select: { name: true, slug: true } },
      brand: { select: { name: true, slug: true } },
      media: { orderBy: { position: "asc" }, include: { media: { select: { url: true } } } },
    },
    orderBy: [{ stock: "desc" }, { updatedAt: "desc" }],
  });

  return products.map(toCatalogProduct);
}

export async function getPublicProductBySlug(slug: string): Promise<Product | null> {
  const product = await prisma.product.findUnique({
    where: { slug },
    include: {
      category: { select: { name: true, slug: true } },
      brand: { select: { name: true, slug: true } },
      media: { orderBy: { position: "asc" }, include: { media: { select: { url: true } } } },
    },
  });

  if (!product || !product.active) return null;
  return toCatalogProduct(product);
}
