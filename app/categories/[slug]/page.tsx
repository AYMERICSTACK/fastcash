import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import CategoryHero from "@/components/CategoryHero";
import FastCashBlock from "@/components/FastCashBlock";
import CategoryCatalog from "@/components/CategoryCatalog";
import { buildBreadcrumbJsonLd } from "@/components/PremiumBreadcrumb";
import {
  getProductsByPublicCategory,
  getPublicCategories,
  getPublicCategoryBySlug,
  resolvePublicCategorySlug,
} from "@/lib/public-categories";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://fastcash-geneve.ch";

function absoluteUrl(pathOrUrl: string) {
  if (pathOrUrl.startsWith("http")) return pathOrUrl;
  return `${siteUrl}${pathOrUrl}`;
}

type PageProps = {
  params: Promise<{
    slug: string;
  }>;
};

const categorySeo: Record<string, { title: string; description: string }> = {
  montres: {
    title: "Montres de luxe d'occasion à Genève",
    description:
      "Découvrez les montres de luxe d'occasion disponibles chez FAST CASH Genève : Rolex, Omega, Cartier, Breitling, Tudor, TAG Heuer et autres marques premium selon arrivages.",
  },
  apple: {
    title: "Apple d'occasion à Genève",
    description:
      "iPhone, MacBook, iPad, Apple Watch et AirPods d'occasion à Genève. Produits Apple contrôlés, disponibles en boutique chez FAST CASH Genève.",
  },
  samsung: {
    title: "Samsung Galaxy d'occasion à Genève",
    description:
      "Smartphones Samsung Galaxy, Fold, Watch et accessoires d'occasion à Genève. Produits contrôlés et disponibles chez FAST CASH Genève selon stock.",
  },
  bijoux: {
    title: "Bijoux d'occasion à Genève",
    description:
      "Bagues, bracelets, colliers et bijoux d'occasion sélectionnés chez FAST CASH Genève. Estimation, achat, vente et reprise directement en boutique.",
  },
  maroquinerie: {
    title: "Maroquinerie de luxe d'occasion à Genève",
    description:
      "Sacs et accessoires de maroquinerie premium d'occasion à Genève : Louis Vuitton, Chanel, Gucci, Dior et autres marques selon arrivages FAST CASH.",
  },
  informatique: {
    title: "Informatique d'occasion à Genève",
    description:
      "MacBook, PC portables, écrans, ordinateurs et accessoires informatiques d'occasion à Genève. Produits contrôlés et disponibles chez FAST CASH Genève.",
  },
  consoles: {
    title: "Consoles et jeux vidéo d'occasion à Genève",
    description:
      "PlayStation, Xbox, Nintendo Switch, jeux vidéo, manettes et accessoires gaming d'occasion à Genève chez FAST CASH Genève.",
  },
  "image-son": {
    title: "Image & Son d'occasion à Genève",
    description:
      "TV, audio, photo, vidéo, casques, enceintes et appareils image & son d'occasion à Genève. Produits testés et sélectionnés par FAST CASH.",
  },
  telephonie: {
    title: "Téléphones d'occasion à Genève",
    description:
      "Smartphones, iPhone, Samsung Galaxy et accessoires de téléphonie d'occasion à Genève. Appareils contrôlés et repris rapidement chez FAST CASH.",
  },
};

export async function generateStaticParams() {
  const categories = await getPublicCategories();

  return categories.map((category) => ({
    slug: category.slug,
  }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const category = await getPublicCategoryBySlug(slug);

  if (!category) {
    return {
      title: "Catégorie",
      description: "Catalogue FAST CASH Genève.",
    };
  }

  const seo = categorySeo[slug] || {
    title: `${category.title} ${category.subtitle}`,
    description: category.description,
  };

  const url = `${siteUrl}/categories/${slug}`;

  return {
    title: seo.title,
    description: seo.description,
    keywords: category.keywords,
    alternates: {
      canonical: url,
    },
    openGraph: {
      type: "website",
      locale: "fr_CH",
      url,
      siteName: "FAST CASH Genève",
      title: `${seo.title} | FAST CASH Genève`,
      description: seo.description,
      images: [
        {
          url: category.image,
          width: 1200,
          height: 630,
          alt: `${category.title} - FAST CASH Genève`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: `${seo.title} | FAST CASH Genève`,
      description: seo.description,
      images: [category.image],
    },
  };
}

export default async function CategoryPage({ params }: PageProps) {
  const { slug } = await params;
  const resolvedSlug = resolvePublicCategorySlug(slug);
  if (resolvedSlug !== slug) permanentRedirect(`/categories/${resolvedSlug}`);

  const category = await getPublicCategoryBySlug(resolvedSlug);

  if (!category) {
    notFound();
  }

  // The database is the source of truth after the Prestashop migration.
  // Do not fall back to keyword matching: it caused false positives such as
  // "Dior" matching the old jewelry keyword "or ".
  const list = await getProductsByPublicCategory(resolvedSlug);
  const categoryUrl = `${siteUrl}/categories/${slug}`;
  const breadcrumbItems = [
    { label: "Accueil", href: "/" },
    { label: "Catalogue", href: "/recherche" },
    { label: category.title, href: `/categories/${slug}` },
  ];
  const collectionJsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "CollectionPage",
        "@id": `${categoryUrl}#collection`,
        name: `${category.title} | FAST CASH Genève`,
        description: category.description,
        url: categoryUrl,
        image: absoluteUrl(category.image),
        isPartOf: {
          "@id": `${siteUrl}/#website`,
        },
        mainEntity: {
          "@id": `${categoryUrl}#itemlist`,
        },
      },
      {
        ...buildBreadcrumbJsonLd(breadcrumbItems, siteUrl),
        "@id": `${categoryUrl}#breadcrumb`,
      },
      {
        "@type": "ItemList",
        "@id": `${categoryUrl}#itemlist`,
        name: `${category.title} FAST CASH Genève`,
        numberOfItems: list.length,
        itemListElement: list.slice(0, 24).map((product, index) => ({
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
        dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionJsonLd) }}
      />
      <CategoryHero category={category} breadcrumbItems={breadcrumbItems} />

      <section className="fc-catalog-section" id="produits">
        <div className="container">
          <CategoryCatalog products={list} categorySlug={slug} />
        </div>
      </section>

      <FastCashBlock />
    </main>
  );
}
