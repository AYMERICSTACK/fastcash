import productsData from "@/data/products.json";
import { slugify } from "./format";

export type Product = {
  id: number | string;
  slug: string;
  name: string;
  reference: string;
  category: string;
  categorySlug: string;
  price: number;
  stock: number;
  image: string;
  images?: Array<{ id: string; url: string; alt?: string; isPrimary?: boolean }>;
  description: string;
  brand?: string;
  brandSlug?: string;
};
export const products = (productsData as Product[]).map((product) => ({
  ...product,
  image: product.image
    .replace("-small_default", "-large_default")
    .replace("-cart_default", "-large_default")
    .replace("-home_default", "-large_default"),
}));

const keywordMap: Record<string, string[]> = {
  apple: ["apple", "iphone", "ipad", "macbook", "airpods", "watch"],
  samsung: ["samsung", "galaxy"],
  montres: [
    "rolex",
    "omega",
    "breitling",
    "tag heuer",
    "cartier",
    "tudor",
    "montre",
  ],
  consoles: [
    "playstation",
    "ps5",
    "ps4",
    "xbox",
    "nintendo",
    "switch",
    "console",
  ],
  informatique: [
    "ordinateur",
    "pc",
    "macbook",
    "imac",
    "laptop",
    "portable",
    "asus",
    "hp",
    "lenovo",
    "dell",
  ],
  "image-son": [
    "appareil photo",
    "camera",
    "caméra",
    "casque",
    "enceinte",
    "sony",
    "bose",
    "canon",
    "nikon",
  ],
  bijoux: ["bijou", "bague", "bracelet", "collier", "or ", "diamant"],
  maroquinerie: [
    "sac",
    "louis vuitton",
    "gucci",
    "prada",
    "chanel",
    "dior",
    "maroquinerie",
  ],
};

export function getProductBySlug(slug: string) {
  return products.find((p) => p.slug === slug);
}
export function getProductsByCategory(slug: string) {
  if (slug === "telephonie" || slug === "informatique")
    return products.filter((p) => p.categorySlug === slug);
  const keys = keywordMap[slug];
  if (!keys) return products.filter((p) => p.categorySlug === slug);
  return products.filter((p) =>
    keys.some((k) => p.name.toLowerCase().includes(k)),
  );
}
function normalizeSearch(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

export function searchProducts(query: string) {
  const q = normalizeSearch(query);

  if (!q) return [];

  const terms = q.split(/\s+/).filter(Boolean);

  return products
    .filter((product) => {
      const searchable = normalizeSearch(
        [
          product.name,
          product.reference,
          product.category,
          product.description,
        ].join(" "),
      );

      return terms.every((term) => searchable.includes(term));
    })
    .sort((a, b) => Number(b.stock > 0) - Number(a.stock > 0));
}
export function categoriesFromProducts() {
  return Array.from(new Set(products.map((p) => p.category))).map((name) => ({
    name,
    slug: slugify(name),
  }));
}
