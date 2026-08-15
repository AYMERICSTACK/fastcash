export const RESERVED_CATEGORY_SLUGS = new Set([
  "accueil",
  "promotions",
  "bonnes-affaires",
]);

export const BRAND_PAGE_SLUGS = new Set([
  "apple",
  "samsung",
]);

export const CATEGORY_MERGE_MAP: Record<string, { slug: string; name: string }> = {
  audio: { slug: "image-et-son", name: "Image & Son" },
  video: { slug: "image-et-son", name: "Image & Son" },
  "image-son": { slug: "image-et-son", name: "Image & Son" },
  "image-et-son": { slug: "image-et-son", name: "Image & Son" },
  consoles: { slug: "consoles-jeux-video", name: "Consoles, Jeux Vidéo" },
  "consoles-jeux-video": { slug: "consoles-jeux-video", name: "Consoles, Jeux Vidéo" },
};

export function canonicalCategorySlug(slug?: string | null) {
  if (!slug) return null;

  const normalized = slug.trim().toLowerCase();
  if (RESERVED_CATEGORY_SLUGS.has(normalized)) return null;

  return CATEGORY_MERGE_MAP[normalized]?.slug ?? normalized;
}

export function canonicalCategoryName(name?: string | null, slug?: string | null) {
  const canonicalSlug = canonicalCategorySlug(slug);
  if (!canonicalSlug) return null;

  const merged = CATEGORY_MERGE_MAP[canonicalSlug] ?? (slug ? CATEGORY_MERGE_MAP[slug] : undefined);
  return merged?.name ?? name ?? canonicalSlug;
}

export function isCommercialOrSystemCategory(slug: string) {
  return RESERVED_CATEGORY_SLUGS.has(slug) || BRAND_PAGE_SLUGS.has(slug);
}
