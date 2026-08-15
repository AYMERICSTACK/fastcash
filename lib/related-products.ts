import { prisma } from "@/lib/prisma";
import { products as staticProducts, type Product } from "@/lib/products";
import { toCatalogProduct } from "@/lib/public-categories";

function scoreRelatedProduct(candidate: Product, current: Product) {
  let score = 0;

  if (candidate.categorySlug === current.categorySlug) score += 6;
  if (candidate.brandSlug && candidate.brandSlug === current.brandSlug) score += 4;
  if (candidate.stock > 0) score += 2;

  return score;
}

function uniqueProducts(products: Product[]) {
  const seen = new Set<string>();

  return products.filter((product) => {
    if (seen.has(product.slug)) return false;
    seen.add(product.slug);
    return true;
  });
}

function getStaticRelatedProducts(currentProduct: Product, limit: number) {
  return staticProducts
    .filter((product) => product.slug !== currentProduct.slug)
    .filter((product) => {
      const sameCategory = product.categorySlug === currentProduct.categorySlug;
      const sameBrand = Boolean(currentProduct.brandSlug && product.brandSlug === currentProduct.brandSlug);
      return sameCategory || sameBrand;
    })
    .sort((a, b) => {
      const scoreDiff = scoreRelatedProduct(b, currentProduct) - scoreRelatedProduct(a, currentProduct);
      if (scoreDiff !== 0) return scoreDiff;
      return b.stock - a.stock;
    })
    .slice(0, limit);
}

export async function getRelatedProducts(currentProduct: Product, limit = 4): Promise<Product[]> {
  const currentDbProduct = await prisma.product.findUnique({
    where: { slug: currentProduct.slug },
    select: {
      id: true,
      slug: true,
      categoryId: true,
      brandId: true,
    },
  });

  if (!currentDbProduct) {
    return getStaticRelatedProducts(currentProduct, limit);
  }

  const relatedFilters = [
    currentDbProduct.categoryId ? { categoryId: currentDbProduct.categoryId } : null,
    currentDbProduct.brandId ? { brandId: currentDbProduct.brandId } : null,
  ].filter(Boolean) as Array<{ categoryId: string } | { brandId: string }>;

  if (!relatedFilters.length) return [];

  const relatedDbProducts = await prisma.product.findMany({
    where: {
      active: true,
      slug: { not: currentDbProduct.slug },
      OR: relatedFilters,
    },
    include: {
      category: { select: { name: true, slug: true } },
      brand: { select: { name: true, slug: true } },
    },
    orderBy: [{ stock: "desc" }, { updatedAt: "desc" }],
    take: Math.max(limit * 3, 8),
  });

  const dbRelatedProducts = relatedDbProducts
    .map(toCatalogProduct)
    .sort((a, b) => {
      const scoreDiff = scoreRelatedProduct(b, currentProduct) - scoreRelatedProduct(a, currentProduct);
      if (scoreDiff !== 0) return scoreDiff;
      return b.stock - a.stock;
    });

  const staticFallbackProducts = getStaticRelatedProducts(currentProduct, limit);

  return uniqueProducts([...dbRelatedProducts, ...staticFallbackProducts]).slice(0, limit);
}
