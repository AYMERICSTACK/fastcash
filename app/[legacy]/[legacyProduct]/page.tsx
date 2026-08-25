import { permanentRedirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const revalidate = 0;

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

export default async function LegacyProduct({ params }: Props) {
  const { legacy, legacyProduct } = await params;
  const match = legacyProduct.match(/^(\d+)(?:-|\.html|$)/);
  const prestashopId = match ? Number(match[1]) : null;

  if (prestashopId && Number.isFinite(prestashopId)) {
    const product = await prisma.product.findUnique({
      where: { prestashopId },
      select: { slug: true, active: true },
    });

    if (product?.active) {
      permanentRedirect(`/produits/${product.slug}`);
    }
  }

  permanentRedirect(FALLBACKS[legacy] ?? "/recherche");
}
