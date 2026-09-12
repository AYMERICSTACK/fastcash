import type { Metadata } from "next";
import CategoryHero from "@/components/CategoryHero";
import CategoryCatalog from "@/components/CategoryCatalog";
import FastCashBlock from "@/components/FastCashBlock";
import { buildBreadcrumbJsonLd } from "@/components/PremiumBreadcrumb";
import { getDealsProducts } from "@/lib/public-categories";
import type { CategoryConfig } from "@/lib/categories";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://fastcash-geneve.ch";
const canonicalUrl = `${siteUrl}/promotions`;

const dealsCategory: CategoryConfig = {
  slug: "promotions",
  title: "Bonnes Affaires",
  subtitle: "Les opportunités FAST CASH à Genève",
  description:
    "Découvrez les bonnes affaires FAST CASH Genève : une sélection de produits d'occasion et de pièces premium proposée selon les arrivages et les opportunités du moment.",
  cta: "Faire estimer votre article",
  keywords: [
    "bonnes affaires Genève",
    "promotions Genève",
    "occasion Genève",
    "FAST CASH Genève",
  ],
  advantages: [
    "Sélection du moment",
    "Produits contrôlés",
    "Stock évolutif",
    "Disponibles selon arrivages",
  ],
  image: "/images/hero/fastcash-luxury-hero.jpg",
  eyebrow: "Sélection FAST CASH",
};

export const metadata: Metadata = {
  title: "Bonnes Affaires à Genève | FAST CASH Genève",
  description:
    "Découvrez les bonnes affaires FAST CASH Genève : produits d'occasion, high-tech, luxe et opportunités du moment selon les arrivages en boutique.",
  keywords: dealsCategory.keywords,
  alternates: {
    canonical: canonicalUrl,
  },
  openGraph: {
    type: "website",
    locale: "fr_CH",
    url: canonicalUrl,
    siteName: "FAST CASH Genève",
    title: "Bonnes Affaires | FAST CASH Genève",
    description:
      "Découvrez la sélection de bonnes affaires FAST CASH Genève, mise à jour selon les arrivages et les opportunités du moment.",
    images: [
      {
        url: dealsCategory.image,
        width: 1200,
        height: 630,
        alt: "Bonnes Affaires FAST CASH Genève",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Bonnes Affaires | FAST CASH Genève",
    description:
      "Découvrez la sélection de bonnes affaires FAST CASH Genève selon les arrivages du moment.",
    images: [dealsCategory.image],
  },
};

export default async function PromotionsPage() {
  const products = await getDealsProducts();
  const breadcrumbItems = [
    { label: "Accueil", href: "/" },
    { label: "Catalogue", href: "/recherche" },
    { label: "Bonnes Affaires", href: "/promotions" },
  ];

  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "CollectionPage",
        "@id": `${canonicalUrl}#collection`,
        name: "Bonnes Affaires | FAST CASH Genève",
        description: dealsCategory.description,
        url: canonicalUrl,
        image: `${siteUrl}${dealsCategory.image}`,
        isPartOf: { "@id": `${siteUrl}/#website` },
        mainEntity: { "@id": `${canonicalUrl}#itemlist` },
      },
      {
        ...buildBreadcrumbJsonLd(breadcrumbItems, siteUrl),
        "@id": `${canonicalUrl}#breadcrumb`,
      },
      {
        "@type": "ItemList",
        "@id": `${canonicalUrl}#itemlist`,
        name: "Bonnes Affaires FAST CASH Genève",
        numberOfItems: products.length,
        itemListElement: products.slice(0, 24).map((product, index) => ({
          "@type": "ListItem",
          position: index + 1,
          url: `${siteUrl}/produits/${product.slug}`,
          name: product.name,
        })),
      },
    ],
  };

  return (
    <main>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />

      <CategoryHero category={dealsCategory} breadcrumbItems={breadcrumbItems} />

      <section className="fc-catalog-section" id="produits">
        <div className="container">
          <CategoryCatalog products={products} categorySlug="promotions" />
        </div>
      </section>

      <FastCashBlock />
    </main>
  );
}
