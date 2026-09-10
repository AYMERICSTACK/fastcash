import { revalidateTag } from "next/cache";
import { CACHE_TAGS } from "@/lib/cache-tags";

function expire(tag: string) {
  revalidateTag(tag, { expire: 0 });
}

export function invalidateCatalogCache() {
  expire(CACHE_TAGS.catalog);
}

export function invalidateCategoryCache() {
  expire(CACHE_TAGS.catalog);
  expire(CACHE_TAGS.categories);
}

export function invalidateBrandCache() {
  expire(CACHE_TAGS.catalog);
  expire(CACHE_TAGS.brands);
}

export function invalidateSettingsCache() {
  expire(CACHE_TAGS.settings);
}
