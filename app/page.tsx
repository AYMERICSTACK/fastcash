import { unstable_cache } from "next/cache";
import HomeClient from "@/components/HomeClient";
import { getFeaturedPublicProducts, getPublicCategories } from "@/lib/public-categories";
import { getGoogleBusinessReviews } from "@/lib/google-business-reviews";
import { getManualReviewsData } from "@/lib/manual-reviews";

export const dynamic = "force-dynamic";

const getCachedHomeData = unstable_cache(
  async () => Promise.all([
    getPublicCategories(),
    getFeaturedPublicProducts(8),
  ]),
  ["fastcash-home-public-v1"],
  { revalidate: 300, tags: ["fastcash-catalog"] },
);

export default async function Home() {
  const [[categories, featured], googleReviews] = await Promise.all([
    getCachedHomeData(),
    getGoogleBusinessReviews().then(async (google) => google ?? getManualReviewsData()),
  ]);

  return <HomeClient featured={featured} categories={categories} googleReviews={googleReviews} />;
}
