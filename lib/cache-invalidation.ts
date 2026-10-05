import { revalidateTag } from "next/cache";
import { CACHE_TAGS } from "@/lib/cache-tags";

function expire(tag: string) {
  revalidateTag(tag, { expire: 0 });
}

function traceCatalogInvalidation(source: string) {
  if (process.env.NEON_TRACE === "1") {
    console.info(
      `[CATALOG_INVALIDATE] ${JSON.stringify({
        source,
        tag: CACHE_TAGS.catalog,
      })}`,
    );
  }
}

export function invalidateCatalogCache(source: string) {
  expire(CACHE_TAGS.catalog);
  traceCatalogInvalidation(source);
}

export function invalidateCategoryCache(source: string) {
  expire(CACHE_TAGS.catalog);
  expire(CACHE_TAGS.categories);
  traceCatalogInvalidation(source);
}

export function invalidateBrandCache(source: string) {
  expire(CACHE_TAGS.catalog);
  expire(CACHE_TAGS.brands);
  traceCatalogInvalidation(source);
}

export function invalidateSettingsCache() {
  expire(CACHE_TAGS.settings);
}
