import { prisma } from "@/lib/prisma";
import type { Product } from "@/lib/products";
import { toCatalogProduct } from "@/lib/public-categories";
import type { CategoryConfig } from "@/lib/categories";

const brandImages: Record<string, string> = {
  apple: "/images/categories/apple.jpg",
  samsung: "/images/categories/samsung.jpg",
  rolex: "/images/categories/montres.jpg",
  omega: "/images/categories/montres.jpg",
  sony: "/images/categories/image-son.jpg",
  nintendo: "/images/categories/consoles.jpg",
};

export type PublicBrand = CategoryConfig & {
  id: string;
  name: string;
  productCount: number;
};

function defaultBrandConfig(brand: { id: string; name: string; slug: string; _count?: { products?: number } }): PublicBrand {
  return {
    id: brand.id,
    name: brand.name,
    slug: brand.slug,
    title: brand.name,
    subtitle: "D'occasion à Genève",
    description: `Découvrez la sélection ${brand.name} disponible chez FAST CASH Genève. Les produits sont contrôlés en boutique et proposés selon les arrivages.`,
    cta: "Faire estimer votre article",
    keywords: [`${brand.name} Genève`, `${brand.name} occasion Genève`, "FAST CASH Genève"],
    advantages: ["Produits contrôlés", "Stock évolutif", "Conseil en boutique", "Reprise possible"],
    image: brandImages[brand.slug] ?? "/images/hero/fastcash-luxury-hero.jpg",
    eyebrow: "Marque FAST CASH",
    productCount: brand._count?.products ?? 0,
  };
}

export async function getPublicBrands(): Promise<PublicBrand[]> {
  const brands = await prisma.brand.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { products: true } } },
  });

  return brands.filter((brand) => brand._count.products > 0).map(defaultBrandConfig);
}

export async function getPublicBrandBySlug(slug: string): Promise<PublicBrand | null> {
  const brand = await prisma.brand.findUnique({
    where: { slug },
    include: { _count: { select: { products: true } } },
  });

  if (!brand || brand._count.products === 0) return null;
  return defaultBrandConfig(brand);
}

export async function getProductsByPublicBrand(slug: string): Promise<Product[]> {
  const products = await prisma.product.findMany({
    where: {
      active: true,
      brand: { slug },
    },
    include: {
      category: { select: { name: true, slug: true } },
      brand: { select: { name: true, slug: true } },
      media: { orderBy: { position: "asc" }, include: { media: { select: { url: true } } } },
    },
    orderBy: [{ stock: "desc" }, { updatedAt: "desc" }],
  });

  return products.map(toCatalogProduct);
}
