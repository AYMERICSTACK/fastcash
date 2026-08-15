"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import ProductCard from "@/components/ProductCard";
import { Product } from "@/lib/products";
import { useCurrency } from "@/components/currency/CurrencyProvider";
import { useI18n } from "@/lib/i18n";
import { translateCategoryFilters } from "@/lib/categories";

const PAGE_SIZE = 24;

type FilterOption = {
  label: string;
  value: string;
  keywords: string[];
};

const filterOptionsByCategory: Record<string, FilterOption[]> = {
  apple: [
    { label: "iPhone", value: "iphone", keywords: ["iphone"] },
    { label: "MacBook", value: "macbook", keywords: ["macbook"] },
    { label: "iPad", value: "ipad", keywords: ["ipad"] },
    { label: "Apple Watch", value: "apple-watch", keywords: ["apple watch", "watch"] },
    { label: "AirPods", value: "airpods", keywords: ["airpods"] },
  ],
  samsung: [
    { label: "Galaxy", value: "galaxy", keywords: ["galaxy"] },
    { label: "Fold", value: "fold", keywords: ["fold"] },
    { label: "Watch", value: "watch", keywords: ["watch"] },
    { label: "Tablettes", value: "tablettes", keywords: ["tab", "tablette"] },
  ],
  montres: [
    { label: "Rolex", value: "rolex", keywords: ["rolex"] },
    { label: "Omega", value: "omega", keywords: ["omega"] },
    { label: "Cartier", value: "cartier", keywords: ["cartier"] },
    { label: "Breitling", value: "breitling", keywords: ["breitling"] },
    { label: "Tudor", value: "tudor", keywords: ["tudor"] },
    { label: "TAG Heuer", value: "tag-heuer", keywords: ["tag heuer", "tag"] },
  ],
  maroquinerie: [
    { label: "Louis Vuitton", value: "louis-vuitton", keywords: ["louis vuitton", "vuitton"] },
    { label: "Chanel", value: "chanel", keywords: ["chanel"] },
    { label: "Dior", value: "dior", keywords: ["dior"] },
    { label: "Gucci", value: "gucci", keywords: ["gucci"] },
    { label: "Prada", value: "prada", keywords: ["prada"] },
  ],
  bijoux: [
    { label: "Bagues", value: "bagues", keywords: ["bague"] },
    { label: "Bracelets", value: "bracelets", keywords: ["bracelet"] },
    { label: "Colliers", value: "colliers", keywords: ["collier"] },
    { label: "Or", value: "or", keywords: [" or ", "or "] },
    { label: "Diamants", value: "diamants", keywords: ["diamant"] },
  ],
  informatique: [
    { label: "MacBook", value: "macbook", keywords: ["macbook"] },
    { label: "PC portable", value: "pc-portable", keywords: ["pc portable", "portable", "laptop"] },
    { label: "iMac", value: "imac", keywords: ["imac"] },
    { label: "Écrans", value: "ecrans", keywords: ["ecran", "écran", "moniteur"] },
    { label: "Accessoires", value: "accessoires", keywords: ["clavier", "souris", "accessoire"] },
  ],
  consoles: [
    { label: "PlayStation", value: "playstation", keywords: ["playstation", "ps5", "ps4"] },
    { label: "Xbox", value: "xbox", keywords: ["xbox"] },
    { label: "Nintendo", value: "nintendo", keywords: ["nintendo", "switch"] },
    { label: "Jeux", value: "jeux", keywords: ["jeu", "jeux"] },
    { label: "Accessoires", value: "accessoires", keywords: ["manette", "casque", "accessoire"] },
  ],
  "image-son": [
    { label: "TV", value: "tv", keywords: ["tv", "television", "télévision"] },
    { label: "Audio", value: "audio", keywords: ["audio", "casque", "enceinte", "bose"] },
    { label: "Photo", value: "photo", keywords: ["photo", "canon", "nikon", "appareil"] },
    { label: "Vidéo", value: "video", keywords: ["video", "vidéo", "camera", "caméra"] },
  ],
  telephonie: [
    { label: "iPhone", value: "iphone", keywords: ["iphone"] },
    { label: "Samsung", value: "samsung", keywords: ["samsung", "galaxy"] },
    { label: "Accessoires", value: "accessoires", keywords: ["coque", "chargeur", "accessoire"] },
  ],
};

const priceRanges = [
  { label: "Tous les prix", value: "all", min: 0, max: Number.POSITIVE_INFINITY },
  { label: "Moins de", value: "0-500", min: 0, max: 500 },
  { label: "Entre", value: "500-1000", min: 500, max: 1000 },
  { label: "Entre", value: "1000-5000", min: 1000, max: 5000 },
  { label: "Et plus", value: "5000-plus", min: 5000, max: Number.POSITIVE_INFINITY },
];

function normalize(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function matchesOption(product: Product, option: FilterOption) {
  const searchable = normalize(`${product.name} ${product.category} ${product.description}`);

  return option.keywords.some((keyword) => searchable.includes(normalize(keyword)));
}

function sortProducts(list: Product[], sort: string) {
  return [...list].sort((a, b) => {
    if (sort === "price-asc") return a.price - b.price;
    if (sort === "price-desc") return b.price - a.price;
    if (sort === "stock") return b.stock - a.stock;

    return Number(b.stock > 0) - Number(a.stock > 0);
  });
}

export default function CategoryCatalog({
  products,
  categorySlug,
}: {
  products: Product[];
  categorySlug: string;
}) {
  const rawOptions = filterOptionsByCategory[categorySlug] ?? [];
  const { formatPrice } = useCurrency();
  const { dict, locale } = useI18n();
  const options = useMemo(() => translateCategoryFilters(rawOptions, locale), [rawOptions, locale]);
  const [selectedOption, setSelectedOption] = useState("all");
  const [selectedPrice, setSelectedPrice] = useState("all");
  const [availability, setAvailability] = useState("available");
  const [sort, setSort] = useState("recent");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [currentPage, setCurrentPage] = useState(1);
  const catalogTopRef = useRef<HTMLDivElement>(null);

  const filteredProducts = useMemo(() => {
    const option = options.find((item) => item.value === selectedOption);
    const priceRange = priceRanges.find((range) => range.value === selectedPrice) ?? priceRanges[0];

    const filtered = products.filter((product) => {
      const matchFamily = !option || matchesOption(product, option);
      const matchPrice = product.price >= priceRange.min && product.price < priceRange.max;
      const matchAvailability = availability === "all" || product.stock > 0;

      return matchFamily && matchPrice && matchAvailability;
    });

    return sortProducts(filtered, sort);
  }, [availability, options, products, selectedOption, selectedPrice, sort]);

  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / PAGE_SIZE));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (safeCurrentPage - 1) * PAGE_SIZE;
  const visibleProducts = filteredProducts.slice(startIndex, startIndex + PAGE_SIZE);
  const firstVisible = filteredProducts.length ? startIndex + 1 : 0;
  const lastVisible = startIndex + visibleProducts.length;

  useEffect(() => {
    setCurrentPage(1);
  }, [availability, selectedOption, selectedPrice, sort]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const paginationPages = useMemo(() => {
    const pages = new Set<number>([1, totalPages]);

    for (let page = safeCurrentPage - 2; page <= safeCurrentPage + 2; page += 1) {
      if (page >= 1 && page <= totalPages) {
        pages.add(page);
      }
    }

    return Array.from(pages).sort((a, b) => a - b);
  }, [safeCurrentPage, totalPages]);

  const goToPage = (page: number) => {
    const nextPage = Math.min(Math.max(page, 1), totalPages);
    if (nextPage === safeCurrentPage) return;

    setCurrentPage(nextPage);

    window.requestAnimationFrame(() => {
      catalogTopRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  };

  const formatPriceRangeLabel = (range: (typeof priceRanges)[number]) => {
    if (range.value === "all") return dict.catalog.allPrices;
    if (range.value === "0-500") return `${dict.catalog.lessThan} ${formatPrice(range.max)}`;
    if (range.value === "5000-plus") return `${formatPrice(range.min)} ${dict.catalog.andMore}`;

    return `${formatPrice(range.min)} - ${formatPrice(range.max)}`;
  };

  return (
    <>
      <div ref={catalogTopRef} className="fc-catalog-toolbar">
        <div>
          <p className="fc-toolbar-kicker">{dict.catalog.catalogue}</p>
          <h2>{filteredProducts.length} {dict.catalog.productsAvailable}</h2>
          <span className="fc-result-count">{firstVisible}-{lastVisible} {dict.catalog.shown}</span>
        </div>

        <div className="fc-toolbar-actions" aria-label={locale === "en" ? "Catalog options" : "Options catalogue"}>
          <div className="fc-view-switch" role="group" aria-label={locale === "en" ? "Catalog view" : "Affichage du catalogue"}>
            <button
              type="button"
              className={view === "grid" ? "active" : undefined}
              onClick={() => setView("grid")}
              aria-pressed={view === "grid"}
              aria-label={locale === "en" ? "Grid view" : "Vue grille"}
            >
              ▦
            </button>
            <button
              type="button"
              className={view === "list" ? "active" : undefined}
              onClick={() => setView("list")}
              aria-pressed={view === "list"}
              aria-label={locale === "en" ? "List view" : "Vue liste"}
            >
              ☰
            </button>
          </div>
          <label>
            {dict.catalog.sortBy}
            <select value={sort} onChange={(event) => setSort(event.target.value)}>
              <option value="recent">{dict.catalog.recent}</option>
              <option value="price-asc">{dict.catalog.priceAsc}</option>
              <option value="price-desc">{dict.catalog.priceDesc}</option>
              <option value="stock">{dict.catalog.stock}</option>
            </select>
          </label>
        </div>
      </div>

      <div className="fc-filter-panel" aria-label={locale === "en" ? "Product filters" : "Filtres produits"}>
        <label>
          {dict.catalog.universe}
          <select value={selectedOption} onChange={(event) => setSelectedOption(event.target.value)}>
            <option value="all">{dict.catalog.allProducts}</option>
            {options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label>
          {dict.catalog.budget}
          <select value={selectedPrice} onChange={(event) => setSelectedPrice(event.target.value)}>
            {priceRanges.map((range) => (
              <option key={range.value} value={range.value}>
                {formatPriceRangeLabel(range)}
              </option>
            ))}
          </select>
        </label>

        <label>
          {dict.catalog.availability}
          <select value={availability} onChange={(event) => setAvailability(event.target.value)}>
            <option value="available">{dict.catalog.inStockOnly}</option>
            <option value="all">{dict.catalog.showAll}</option>
          </select>
        </label>

        <button
          className="fc-filter-reset"
          type="button"
          onClick={() => {
            setSelectedOption("all");
            setSelectedPrice("all");
            setAvailability("available");
            setSort("recent");
            setCurrentPage(1);
          }}
        >
          {dict.catalog.reset}
        </button>
      </div>

      {visibleProducts.length ? (
        <>
          <div className={`product-grid premium-product-grid fc-product-grid fc-product-grid-${view}`}>
            {visibleProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>

          {filteredProducts.length > PAGE_SIZE ? (
            <nav className="fc-pagination" aria-label={locale === "en" ? "Catalog pagination" : "Pagination catalogue"}>
              <button
                type="button"
                onClick={() => goToPage(safeCurrentPage - 1)}
                disabled={safeCurrentPage === 1}
              >
                {dict.catalog.previous}
              </button>

              <div className="fc-pagination-pages">
                {paginationPages.map((page, index) => {
                  const previousPage = paginationPages[index - 1];
                  const showGap = previousPage && page - previousPage > 1;

                  return (
                    <span className="fc-pagination-page-group" key={page}>
                      {showGap ? <span className="fc-pagination-gap">…</span> : null}
                      <button
                        type="button"
                        className={page === safeCurrentPage ? "active" : undefined}
                        onClick={() => goToPage(page)}
                        aria-current={page === safeCurrentPage ? "page" : undefined}
                      >
                        {page}
                      </button>
                    </span>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={() => goToPage(safeCurrentPage + 1)}
                disabled={safeCurrentPage === totalPages}
              >
                {dict.catalog.next}
              </button>

              <p>
                {dict.catalog.page} {safeCurrentPage} {dict.catalog.of} {totalPages} · {firstVisible}-{lastVisible} {dict.catalog.of} {filteredProducts.length} {dict.catalog.productsAvailable}
              </p>
            </nav>
          ) : null}
        </>
      ) : (
        <div className="empty">
          {dict.catalog.noResults}
        </div>
      )}
    </>
  );
}
