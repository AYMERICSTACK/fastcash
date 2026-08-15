export type CategoryConfig = {
  slug: string;
  title: string;
  subtitle: string;
  description: string;
  cta: string;
  keywords: string[];
  advantages: string[];
  image: string;
  eyebrow?: string;
};


export type SupportedLocale = "fr" | "en";

const CATEGORY_TRANSLATIONS_EN: Record<string, string> = {
  "Accueil": "Home",
  "Catalogue": "Catalog",
  "Marques": "Brands",
  "Produits": "Products",
  "Univers FAST CASH": "FAST CASH universe",
  "Marque FAST CASH": "FAST CASH brand",
  "Sélection FAST CASH": "FAST CASH selection",
  "Téléphonie": "Phones",
  "Téléphonie premium": "Premium phones",
  "Telephonie": "Phones",
  "Informatique": "Computers",
  "MacBook • PC • écrans": "MacBook • PC • screens",
  "Image & Son": "Image & Sound",
  "Audio • photo • vidéo": "Audio • photo • video",
  "Image et Son": "Image & Sound",
  "Montres": "Watches",
  "Montres de luxe": "Luxury watches",
  "Montres connectées": "Smartwatches",
  "Maroquinerie": "Leather goods",
  "Sacs & accessoires luxe": "Luxury bags & accessories",
  "Bijoux": "Jewelry",
  "Bijouterie": "Jewelry",
  "Bijouterie & pièces précieuses": "Jewelry & precious pieces",
  "Consoles": "Consoles",
  "Gaming & accessoires": "Gaming & accessories",
  "Horlogerie suisse": "Swiss watchmaking",
  "Consoles, Jeux Vidéo": "Consoles & Video Games",
  "Consoles & Jeux Vidéo": "Consoles & Video Games",
  "Jeux vidéo": "Video Games",
  "Jeux Vidéo": "Video Games",
  "Accessoires": "Accessories",
  "Tablettes": "Tablets",
  "Ordinateurs": "Computers",
  "Ordinateurs portables": "Laptops",
  "PC portable": "Laptops",
  "PC portables": "Laptops",
  "Écrans": "Screens",
  "Ecrans": "Screens",
  "Audio": "Audio",
  "Photo": "Photo",
  "Vidéo": "Video",
  "Video": "Video",
  "TV": "TV",
  "Bague": "Ring",
  "Bagues": "Rings",
  "Bracelet": "Bracelet",
  "Bracelets": "Bracelets",
  "Collier": "Necklace",
  "Colliers": "Necklaces",
  "Or": "Gold",
  "Diamants": "Diamonds",
  "Luxe": "Luxury",
  "Accueil Prestashop": "Home",
  "Promotions": "Promotions",
  "Bonnes Affaires": "Deals",
};

const CATEGORY_SLUG_TRANSLATIONS_EN: Record<string, string> = {
  accueil: "Home",
  catalogue: "Catalog",
  marques: "Brands",
  produits: "Products",
  telephonie: "Phones",
  informatique: "Computers",
  "image-son": "Image & Sound",
  "image-et-son": "Image & Sound",
  montres: "Watches",
  "montres-connectees": "Smartwatches",
  maroquinerie: "Leather goods",
  bijoux: "Jewelry",
  consoles: "Consoles",
  "jeux-video": "Video Games",
  accessoires: "Accessories",
  tablettes: "Tablets",
  ordinateurs: "Computers",
  luxe: "Luxury",
  promotions: "Promotions",
  "bonnes-affaires": "Deals",
};

function normalizeTranslationKey(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function slugifyTranslationKey(value: string) {
  return normalizeTranslationKey(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, "et")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function translateCategoryLabel(
  value: string | null | undefined,
  locale: SupportedLocale,
) {
  if (!value) return "";

  const normalizedValue = normalizeTranslationKey(value);

  if (locale === "fr") return normalizedValue;

  return (
    CATEGORY_TRANSLATIONS_EN[normalizedValue] ??
    CATEGORY_SLUG_TRANSLATIONS_EN[slugifyTranslationKey(normalizedValue)] ??
    normalizedValue
  );
}

export function translateCategoryFilters<T extends { label: string }>(
  items: T[],
  locale: SupportedLocale,
): T[] {
  if (locale === "fr") return items;

  return items.map((item) => ({
    ...item,
    label: translateCategoryLabel(item.label, locale),
  }));
}

export const strategicCategories: CategoryConfig[] = [
  {
    slug: "apple",
    title: "Produits Apple",
    subtitle: "D'occasion à Genève",
    description:
      "Découvrez notre sélection de produits Apple d'occasion à Genève chez FAST CASH. Retrouvez les dernières générations d'iPhone, d'iPad, d'Apple Watch, de MacBook et d'accessoires Apple soigneusement contrôlés par nos équipes.",
    cta: "Faire estimer votre appareil",
    keywords: ["iPhone Genève", "Apple occasion Genève", "Apple Watch Genève"],
    advantages: ["Produits contrôlés", "Testés et vérifiés", "Conseils personnalisés", "Estimation gratuite"],
    image: "/images/categories/apple.jpg",
    eyebrow: "Téléphonie premium",
  },
  {
    slug: "samsung",
    title: "Produits Samsung",
    subtitle: "D'occasion à Genève",
    description:
      "Retrouvez une sélection de smartphones Samsung Galaxy et d'appareils Samsung d'occasion à Genève, contrôlés et proposés au meilleur prix selon les arrivages disponibles en boutique.",
    cta: "Faire estimer votre Samsung",
    keywords: ["Samsung Genève", "Galaxy occasion Genève"],
    advantages: ["Smartphones contrôlés", "Disponibles en boutique", "Qualité au meilleur prix", "Achat / vente / reprise"],
    image: "/images/categories/samsung.jpg",
    eyebrow: "Galaxy & accessoires",
  },
  {
    slug: "montres",
    title: "Montres de luxe",
    subtitle: "D'occasion à Genève",
    description:
      "FAST CASH Genève propose une sélection de montres de luxe d'occasion : Rolex, Omega, Breitling, TAG Heuer, Cartier, Tudor et autres marques prestigieuses selon les arrivages.",
    cta: "Faire estimer votre montre",
    keywords: ["Rolex Genève", "Montres de luxe Genève"],
    advantages: ["Montres authentifiées", "Marques prestigieuses", "Excellent état", "Reprise en magasin"],
    image: "/images/categories/montres.jpg",
    eyebrow: "Horlogerie suisse",
  },
  {
    slug: "consoles",
    title: "PlayStation • Xbox",
    subtitle: "Nintendo Switch",
    description:
      "Découvrez nos consoles et jeux vidéo d'occasion à Genève : PlayStation, Xbox, Nintendo Switch, manettes, jeux et accessoires selon les arrivages FAST CASH.",
    cta: "Faire estimer votre console",
    keywords: ["PS5 occasion Genève", "Xbox Genève", "Nintendo Switch Genève"],
    advantages: ["Consoles testées", "Accessoires disponibles", "Prix attractifs", "Stock évolutif"],
    image: "/images/categories/consoles.jpg",
    eyebrow: "Gaming & accessoires",
  },
  {
    slug: "informatique",
    title: "Informatique",
    subtitle: "D'occasion à Genève",
    description:
      "Ordinateurs, PC portables, MacBook, écrans et accessoires informatiques d'occasion disponibles chez FAST CASH Genève avec conseil en boutique et reprise possible.",
    cta: "Faire estimer votre ordinateur",
    keywords: ["MacBook Genève", "PC portable occasion Genève"],
    advantages: ["Matériel contrôlé", "Grand choix", "Conseil en boutique", "Reprise possible"],
    image: "/images/categories/informatique.jpg",
    eyebrow: "MacBook • PC • écrans",
  },
  {
    slug: "image-son",
    title: "Image & Son",
    subtitle: "D'occasion à Genève",
    description:
      "Appareils photo, caméras, casques audio, enceintes et équipements image & son d'occasion à Genève. Des produits testés et disponibles immédiatement selon le stock.",
    cta: "Faire estimer votre appareil",
    keywords: ["Appareil photo Genève", "Casque audio Genève"],
    advantages: ["Produits testés", "Marques reconnues", "Disponibilité immédiate", "Prix avantageux"],
    image: "/images/categories/image-son.jpg",
    eyebrow: "Audio • photo • vidéo",
  },
  {
    slug: "bijoux",
    title: "Bijoux",
    subtitle: "D'occasion à Genève",
    description:
      "Bijoux d'occasion, bagues, bracelets, colliers et pièces précieuses selon les arrivages FAST CASH Genève. Estimation et reprise directement en magasin.",
    cta: "Faire estimer votre bijou",
    keywords: ["Bijoux Genève", "Rachat bijoux Genève"],
    advantages: ["Estimation en boutique", "Pièces sélectionnées", "Achat / vente", "Service rapide"],
    image: "/images/categories/bijoux.jpg",
    eyebrow: "Bijouterie & pièces précieuses",
  },
  {
    slug: "maroquinerie",
    title: "Maroquinerie",
    subtitle: "D'occasion à Genève",
    description:
      "Sacs et accessoires de maroquinerie d'occasion à Genève : marques premium et luxe selon les arrivages, sélectionnées avec soin par FAST CASH.",
    cta: "Faire estimer votre article",
    keywords: ["Sac luxe Genève", "Maroquinerie occasion Genève"],
    advantages: ["Articles sélectionnés", "Marques premium", "Bon état", "Reprise possible"],
    image: "/images/categories/maroquinerie.jpg",
    eyebrow: "Sacs & accessoires luxe",
  },
  {
    slug: "telephonie",
    title: "Téléphonie",
    subtitle: "D'occasion à Genève",
    description:
      "Smartphones, iPhone, Samsung Galaxy et accessoires de téléphonie d'occasion à Genève. Des appareils contrôlés, disponibles en boutique et repris rapidement.",
    cta: "Faire estimer votre téléphone",
    keywords: ["Téléphone occasion Genève"],
    advantages: ["Appareils contrôlés", "Conseil en boutique", "Prix justes", "Reprise rapide"],
    image: "/images/categories/telephonie.jpg",
    eyebrow: "Smartphones & accessoires",
  },
];

export function getCategory(slug: string) {
  return strategicCategories.find((category) => category.slug === slug);
}
