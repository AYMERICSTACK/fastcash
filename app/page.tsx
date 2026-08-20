import HomeClient from "@/components/HomeClient";
import { getFeaturedPublicProducts, getPublicCategories } from "@/lib/public-categories";
import { getGoogleBusinessReviews } from "@/lib/google-business-reviews";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function Home() {
  const [categories, featured, googleReviews] = await Promise.all([
    getPublicCategories(),
    getFeaturedPublicProducts(8),
    getGoogleBusinessReviews(),
  ]);

  return <HomeClient featured={featured} categories={categories} googleReviews={googleReviews} />;
}
