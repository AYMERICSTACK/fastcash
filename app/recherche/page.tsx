import SearchResultsClient from "@/components/SearchResultsClient";
import { searchPublicProducts } from "@/lib/public-categories";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type SearchPageProps = {
  searchParams: Promise<{
    q?: string | string[];
  }>;
};

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const params = await searchParams;
  const rawQuery = Array.isArray(params.q) ? params.q[0] : params.q;
  const query = rawQuery?.trim() ?? "";
  const results = query ? await searchPublicProducts(query, 48) : [];

  return <SearchResultsClient query={query} results={results} />;
}
