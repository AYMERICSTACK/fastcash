import type { MetadataRoute } from "next";
import { products } from "@/lib/products";
import { getPublicCategories } from "@/lib/public-categories";
import { prisma } from "@/lib/prisma";
import { getPublicBrands } from "@/lib/public-brands";

const base = process.env.NEXT_PUBLIC_SITE_URL || "https://fastcash-geneve.ch";
const now = new Date();

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: base,
      lastModified: now,
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${base}/estimation`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.85,
    },
    {
      url: `${base}/contact`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.75,
    },
    {
      url: `${base}/recherche`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.65,
    },
    ...["mentions-legales", "conditions-generales", "livraison-retours", "politique-confidentialite", "politique-cookies"].map((route) => ({
      url: `${base}/${route}`,
      lastModified: now,
      changeFrequency: "yearly" as const,
      priority: 0.3,
    })),
  ];

  const publicCategories = await getPublicCategories();
  const categoryRoutes: MetadataRoute.Sitemap = publicCategories.map((category) => ({
    url: `${base}/categories/${category.slug}`,
    lastModified: now,
    changeFrequency: "daily",
    priority: 0.9,
  }));

  const publicBrands = await getPublicBrands();
  const brandRoutes: MetadataRoute.Sitemap = publicBrands.map((brand) => ({
    url: `${base}/marques/${brand.slug}`,
    lastModified: now,
    changeFrequency: "daily",
    priority: 0.86,
  }));

  const dbProducts = await prisma.product.findMany({
    where: { active: true },
    select: { slug: true, stock: true, updatedAt: true },
  });
  const dbProductSlugs = new Set(dbProducts.map((product) => product.slug));

  const productRoutes: MetadataRoute.Sitemap = [
    ...products
      .filter((product) => !dbProductSlugs.has(product.slug))
      .map((product) => ({
        url: `${base}/produits/${product.slug}`,
        lastModified: now,
        changeFrequency: product.stock > 0 ? ("daily" as const) : ("weekly" as const),
        priority: product.stock > 0 ? 0.8 : 0.55,
      })),
    ...dbProducts.map((product) => ({
      url: `${base}/produits/${product.slug}`,
      lastModified: product.updatedAt,
      changeFrequency: product.stock > 0 ? ("daily" as const) : ("weekly" as const),
      priority: product.stock > 0 ? 0.8 : 0.55,
    })),
  ] satisfies MetadataRoute.Sitemap;

  return [...staticRoutes, ...categoryRoutes, ...brandRoutes, ...productRoutes];
}
