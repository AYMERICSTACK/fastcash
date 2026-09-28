import { permanentRedirect } from "next/navigation";

export const revalidate = 86400;

const ROUTES: Record<string, string> = {
  luxe: "/categories/maroquinerie",
  telephonie: "/categories/telephonie",
  informatique: "/categories/informatique",
  "image-son": "/categories/image-son",
  "consoles-jeux-video": "/categories/consoles",
  "console-jeux-video": "/categories/consoles",
  promotions: "/promotions",
  "bonnes-affaires": "/promotions",
  "2-accueil": "/",
  accueil: "/",
};

type Props = { params: Promise<{ legacy: string }> };

export default async function LegacyPage({ params }: Props) {
  const { legacy } = await params;
  permanentRedirect(ROUTES[legacy] ?? "/recherche");
}
