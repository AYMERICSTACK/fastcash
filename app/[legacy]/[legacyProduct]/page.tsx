import { permanentRedirect } from "next/navigation";

export const revalidate = 86400;

const FALLBACKS: Record<string, string> = {
  luxe: "/categories/luxe",
  telephonie: "/categories/telephonie",
  informatique: "/categories/informatique",
  imageson: "/categories/image-et-son",
  "image-son": "/categories/image-et-son",
  "consoles-jeux-video": "/categories/consoles-jeux-video",
  "console-jeux-video": "/categories/consoles-jeux-video",
  promotions: "/promotions",
  "bonnes-affaires": "/categories/bonnes-affaires",
  maroquinerie: "/categories/maroquinerie",
  montre: "/categories/montre",
};

type Props = {
  params: Promise<{ legacy: string; legacyProduct: string }>;
};

function legacyProductTarget(legacyProduct: string) {
  const match = legacyProduct.match(/^(\d+)-(.+)\.html$/i);
  if (!match) return null;

  const [, id, slug] = match;
  if (!id || !slug) return null;

  return `/produits/${slug}-${id}`;
}

export default async function LegacyProduct({ params }: Props) {
  const { legacy, legacyProduct } = await params;
  const target = legacyProductTarget(legacyProduct);

  if (target) permanentRedirect(target);

  permanentRedirect(FALLBACKS[legacy] ?? "/recherche");
}
