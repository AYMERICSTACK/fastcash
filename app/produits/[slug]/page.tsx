import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getProductBySlug, products, type Product } from "@/lib/products";
import { getPublicProductBySlug } from "@/lib/public-categories";
import { prisma } from "@/lib/prisma";
import { buildBreadcrumbJsonLd } from "@/components/PremiumBreadcrumb";
import LocalizedPremiumBreadcrumb from "@/components/LocalizedPremiumBreadcrumb";
import { getRelatedProducts } from "@/lib/related-products";
import ProductShowroom from "@/components/ProductShowroom";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://fastcash-geneve.ch";

function absoluteUrl(pathOrUrl: string) {
  if (pathOrUrl.startsWith("http")) return pathOrUrl;
  return `${siteUrl}${pathOrUrl}`;
}

function getProductBrand(productName: string) {
  const brands = [
    "Apple",
    "Samsung",
    "Rolex",
    "Omega",
    "Cartier",
    "Breitling",
    "Tudor",
    "TAG Heuer",
    "Louis Vuitton",
    "Chanel",
    "Gucci",
    "Dior",
    "Sony",
    "Nintendo",
    "PlayStation",
    "Microsoft",
  ];

  return brands.find((brand) => productName.toLowerCase().includes(brand.toLowerCase()));
}

type PageProps = {
  params: Promise<{
    slug: string;
  }>;
};

function getProductSeoDescription(product: Product) {
  return (
    product.description ||
    `${product.name} disponible chez FAST CASH Genève. Produit d'occasion contrôlé, en stock selon disponibilité boutique, avec paiement sécurisé et retrait possible à Genève.`
  );
}

export async function generateStaticParams() {
  const dbProducts = await prisma.product.findMany({
    where: { active: true },
    select: { slug: true },
  });
  const slugs = new Set([...products.map((product) => product.slug), ...dbProducts.map((product) => product.slug)]);

  return Array.from(slugs).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = (await getPublicProductBySlug(slug)) ?? getProductBySlug(slug);

  if (!product) {
    return {
      title: "Produit",
      description: "Produit FAST CASH Genève.",
    };
  }

  const url = `${siteUrl}/produits/${product.slug}`;
  const description = getProductSeoDescription(product);
  const title = `${product.name} - ${product.category} d'occasion Genève`;

  return {
    title,
    description,
    alternates: {
      canonical: url,
    },
    openGraph: {
      type: "website",
      locale: "fr_CH",
      url,
      siteName: "FAST CASH Genève",
      title: `${product.name} | FAST CASH Genève`,
      description,
      images: product.image
        ? [
            {
              url: product.image,
              width: 1200,
              height: 1200,
              alt: product.name,
            },
          ]
        : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: `${product.name} | FAST CASH Genève`,
      description,
      images: product.image ? [product.image] : undefined,
    },
  };
}

export default async function ProductPage({ params }: PageProps) {
  const { slug } = await params;
  const product = (await getPublicProductBySlug(slug)) ?? getProductBySlug(slug);

  if (!product) {
    notFound();
  }

  const productUrl = `${siteUrl}/produits/${product.slug}`;
  const productBrand = product.brand || getProductBrand(product.name);
  const relatedProducts = await getRelatedProducts(product);
  const breadcrumbItems = [
    { label: "Accueil", href: "/" },
    { label: product.category, href: `/categories/${product.categorySlug}` },
    ...(productBrand
      ? [
          {
            label: productBrand,
            href: product.brandSlug ? `/marques/${product.brandSlug}` : undefined,
          },
        ]
      : []),
    { label: product.name, href: `/produits/${product.slug}` },
  ];
  const productJsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Product",
        "@id": `${productUrl}#product`,
        name: product.name,
        description: getProductSeoDescription(product),
        image: product.images?.length ? product.images.map((image) => absoluteUrl(image.url)) : product.image ? [absoluteUrl(product.image)] : undefined,
        sku: product.reference || String(product.id),
        mpn: product.reference || String(product.id),
        category: product.category,
        brand: productBrand
          ? {
              "@type": "Brand",
              name: productBrand,
            }
          : undefined,
        offers: {
          "@type": "Offer",
          url: productUrl,
          priceCurrency: "CHF",
          price: product.price.toFixed(2),
          availability:
            product.stock > 0
              ? "https://schema.org/InStock"
              : "https://schema.org/OutOfStock",
          itemCondition: "https://schema.org/UsedCondition",
          seller: {
            "@id": `${siteUrl}/#store`,
          },
        },
      },
      {
        ...buildBreadcrumbJsonLd(breadcrumbItems, siteUrl),
        "@id": `${productUrl}#breadcrumb`,
      },
    ],
  };

  return (
    <main className="section product-page-section">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd) }}
      />
      <div className="container">
        <LocalizedPremiumBreadcrumb items={breadcrumbItems} variant="light" className="product-premium-breadcrumb" />

        <ProductShowroom product={product} relatedProducts={relatedProducts} />
      </div>
    </main>
  );
}
