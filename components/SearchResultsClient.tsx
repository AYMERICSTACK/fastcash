"use client";

import Link from "next/link";
import ProductCard from "@/components/ProductCard";
import type { Product } from "@/lib/products";
import { useI18n } from "@/lib/i18n";

const POPULAR_SEARCHES = [
  "Rolex",
  "iPhone",
  "MacBook",
  "Louis Vuitton",
  "PS5",
  "Samsung",
];

export default function SearchResultsClient({
  query,
  results,
}: {
  query: string;
  results: Product[];
}) {
  const { dict } = useI18n();

  return (
    <main>
      <section className="search-page-hero">
        <div className="container search-page-hero-inner">
          <p className="hero-kicker">{dict.search.kicker}</p>
          <h1>{dict.search.title}</h1>
          <p>{dict.search.intro}</p>

          <form action="/recherche" className="search-page-form">
            <input
              type="search"
              name="q"
              defaultValue={query}
              placeholder={dict.search.placeholder}
              aria-label={dict.search.submit}
            />
            <button type="submit">{dict.search.submit}</button>
          </form>

          <div className="popular-searches" aria-label={dict.search.popularAria}>
            {POPULAR_SEARCHES.map((term) => (
              <Link href={`/recherche?q=${encodeURIComponent(term)}`} key={term}>
                {term}
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="section search-results-section">
        <div className="container">
          {query ? (
            <div className="section-heading section-heading-row">
              <div>
                <p className="hero-kicker">{dict.search.results}</p>
                <h2 className="title-lg">
                  {results.length}{" "}
                  {results.length > 1
                    ? dict.search.productsFound
                    : dict.search.productFound}
                </h2>
              </div>
              <span className="catalog-note">
                {dict.search.query} : {query}
              </span>
            </div>
          ) : null}

          {!query ? (
            <div className="empty search-empty">{dict.search.empty}</div>
          ) : results.length ? (
            <div className="product-grid premium-product-grid fc-product-grid">
              {results.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          ) : (
            <div className="empty search-empty">
              {dict.search.noResults1} “{query}”. {dict.search.noResults2}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
