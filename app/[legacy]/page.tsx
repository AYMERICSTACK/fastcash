import { permanentRedirect } from "next/navigation";

export const revalidate = 86400;

const ROUTES: Record<string, string> = {
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
  "nous-contacter": "/contact",
  magasins: "/contact",
  "nouveaux-produits": "/",
  "2-accueil": "/",
  accueil: "/",
};

type Props = { params: Promise<{ legacy: string }> };

export default async function LegacyPage({ params }: Props) {
  const { legacy } = await params;
  permanentRedirect(ROUTES[legacy] ?? "/recherche");
}
