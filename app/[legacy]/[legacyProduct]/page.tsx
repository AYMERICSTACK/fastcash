import { unstable_cache } from "next/cache";
import { permanentRedirect } from "next/navigation";
import { CACHE_TAGS } from "@/lib/cache-tags";
import { prisma } from "@/lib/prisma";
import { traceNeonRead } from "@/lib/neon-trace";

export const revalidate = 3600;

const FALLBACKS: Record<string, string> = {
  luxe: "/categories/maroquinerie",
  telephonie: "/categories/telephonie",
  informatique: "/categories/informatique",
  "image-son": "/categories/image-son",
  "consoles-jeux-video": "/categories/consoles",
  promotions: "/promotions",
  "bonnes-affaires": "/promotions",
};

type Props = {
  params: Promise<{ legacy: string; legacyProduct: string }>;
};

const getLegacyProductTarget = unstable_cache(
  async (prestashopId: number) => {
    const product = await traceNeonRead({ source: "getLegacyProductTarget", model: "Product", operation: "findUnique", route_type: "legacy_product_redirect", lookup_key: "prestashopId", prestashop_id: prestashopId }, () => prisma.product.findUnique({
      where: { prestashopId },
      select: { slug: true, active: true },
    }));

    return product?.active ? `/produits/${product.slug}` : null;
  },
  ["legacy-product-redirect-v1"],
  { revalidate: 3600, tags: [CACHE_TAGS.catalog] },
);

export default async function LegacyProduct({ params }: Props) {
  const { legacy, legacyProduct } = await params;
  const match = legacyProduct.match(/^(\d+)(?:-|\.html|$)/);
  const prestashopId = match ? Number(match[1]) : null;

  if (prestashopId && Number.isFinite(prestashopId)) {
    const target = await getLegacyProductTarget(prestashopId);
    if (target) permanentRedirect(target);
  }

  permanentRedirect(FALLBACKS[legacy] ?? "/recherche");
}
