import HomeClient from "@/components/HomeClient";
import { getFeaturedPublicProducts, getPublicCategories } from "@/lib/public-categories";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function Home() {
  const [categories, featured] = await Promise.all([
    getPublicCategories(),
    getFeaturedPublicProducts(8),
  ]);

  return <HomeClient featured={featured} categories={categories} />;
}
