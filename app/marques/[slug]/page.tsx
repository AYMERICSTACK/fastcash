import type { Metadata } from "next";
import { notFound } from "next/navigation";
import CategoryHero from "@/components/CategoryHero";
import FastCashBlock from "@/components/FastCashBlock";
import CategoryCatalog from "@/components/CategoryCatalog";
import { buildBreadcrumbJsonLd } from "@/components/PremiumBreadcrumb";
import {
  getProductsByPublicBrand,
  getPublicBrandBySlug,
  getPublicBrands,
} from "@/lib/public-brands";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://fastcash-geneve.ch";

type PageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export async function generateStaticParams() {
  const brands = await getPublicBrands();

  return brands.map((brand) => ({
    slug: brand.slug,
  }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const brand = await getPublicBrandBySlug(slug);

  if (!brand) {
    return {
      title: "Marque",
      description: "Catalogue FAST CASH Genève.",
    };
  }

  const url = `${siteUrl}/marques/${slug}`;
  const title = `${brand.name} d'occasion à Genève`;

  return {
    title,
    description: brand.description,
    keywords: brand.keywords,
    alternates: {
      canonical: url,
    },
    openGraph: {
      type: "website",
      locale: "fr_CH",
      url,
      siteName: "FAST CASH Genève",
      title: `${title} | FAST CASH Genève`,
      description: brand.description,
      images: [
        {
          url: brand.image,
          width: 1200,
          height: 630,
          alt: `${brand.name} - FAST CASH Genève`,
        },
      ],
    },
  };
}

export default async function BrandPage({ params }: PageProps) {
  const { slug } = await params;
  const brand = await getPublicBrandBySlug(slug);

  if (!brand) {
    notFound();
  }

  const list = await getProductsByPublicBrand(slug);
  const brandUrl = `${siteUrl}/marques/${slug}`;
  const breadcrumbItems = [
    { label: "Accueil", href: "/" },
    { label: "Marques", href: "/recherche" },
    { label: brand.name, href: `/marques/${slug}` },
  ];
  const collectionJsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "CollectionPage",
        "@id": `${brandUrl}#collection`,
        name: `${brand.name} | FAST CASH Genève`,
        description: brand.description,
        url: brandUrl,
        image: brand.image,
      },
      {
        ...buildBreadcrumbJsonLd(breadcrumbItems, siteUrl),
        "@id": `${brandUrl}#breadcrumb`,
      },
      {
        "@type": "ItemList",
        "@id": `${brandUrl}#itemlist`,
        name: `${brand.name} FAST CASH Genève`,
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
      <CategoryHero category={brand} breadcrumbItems={breadcrumbItems} />

      <section className="fc-catalog-section" id="produits">
        <div className="container">
          <CategoryCatalog products={list} categorySlug={slug} />
        </div>
      </section>

      <FastCashBlock />
    </main>
  );
}
