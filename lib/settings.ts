import { prisma } from "@/lib/prisma";
import { normalizeCurrency, type Currency } from "@/lib/currency";

export type ShopSettings = {
  shopName: string;
  defaultCurrency: Currency;
  activeLanguages: string[];
  orderPrefix: string;
  invoicePrefix: string;
  orderEmail: string;
  paymentCardEnabled: boolean;
  heylightEnabled: boolean;
  pickupEnabled: boolean;
  shippingEnabled: boolean;
  shippingFee: number;
  shippingFreeThreshold: number;
  shippingCountries: string[];
  defaultCarrier: string;
  lowStockThreshold: number;

  addressLine1: string;
  postalCode: string;
  city: string;
  country: string;
  phoneDisplay: string;
  phoneHref: string;
  publicEmail: string;
  mapsUrl: string;
  instagramUrl: string;

  hours: Array<{ key: string; fr: string; en: string; time: string }>;

  heroImage: string;
  heroKickerFr: string;
  heroKickerEn: string;
  heroTitle1Fr: string;
  heroTitle1En: string;
  heroTitle2Fr: string;
  heroTitle2En: string;
  heroIntroFr: string;
  heroIntroEn: string;
  heroProof1Fr: string;
  heroProof1En: string;
  heroProof2Fr: string;
  heroProof2En: string;
  heroProof3Fr: string;
  heroProof3En: string;

  legalBusinessName: string;
  legalCompanyId: string;
  legalVatNumber: string;
  legalRepresentative: string;
  legalJurisdiction: string;
  legalLastUpdated: string;
};

export const DEFAULT_SETTINGS: ShopSettings = {
  shopName: "FAST CASH Genève",
  defaultCurrency: "CHF",
  activeLanguages: ["FR", "EN"],
  orderPrefix: "FC",
  invoicePrefix: "FA",
  orderEmail: process.env.ORDER_TO_EMAIL || "commande@fastcash-geneve.ch",
  paymentCardEnabled: false,
  heylightEnabled: false,
  pickupEnabled: true,
  shippingEnabled: true,
  shippingFee: 0,
  shippingFreeThreshold: 0,
  shippingCountries: ["CH", "FR"],
  defaultCarrier: "Poste Suisse",
  lowStockThreshold: 3,

  addressLine1: "Rue de Monthoux 27",
  postalCode: "1201",
  city: "Genève",
  country: "Suisse",
  phoneDisplay: "+41 22 731 16 63",
  phoneHref: "+41227311663",
  publicEmail: "contact@fastcash-geneve.ch",
  mapsUrl: "https://www.google.com/maps/search/?api=1&query=Rue%20de%20Monthoux%2027%201201%20Gen%C3%A8ve",
  instagramUrl: process.env.NEXT_PUBLIC_INSTAGRAM_URL?.trim() || "",

  hours: [
    { key: "monday", fr: "Lundi", en: "Monday", time: "11:30 – 20:00" },
    { key: "tuesday", fr: "Mardi", en: "Tuesday", time: "10:00 – 20:00" },
    { key: "wednesday", fr: "Mercredi", en: "Wednesday", time: "10:00 – 20:00" },
    { key: "thursday", fr: "Jeudi", en: "Thursday", time: "10:00 – 20:00" },
    { key: "friday", fr: "Vendredi", en: "Friday", time: "10:00 – 13:30 / 14:30 – 20:00" },
    { key: "saturday", fr: "Samedi", en: "Saturday", time: "10:00 – 18:00" },
    { key: "sunday", fr: "Dimanche", en: "Sunday", time: "Fermé" },
  ],

  heroImage: "/images/hero/fastcash-luxury-hero.jpg",
  heroKickerFr: "Achat • Vente • Reprise",
  heroKickerEn: "Buy • Sell • Trade-in",
  heroTitle1Fr: "Vos objets de valeur",
  heroTitle1En: "Your valuables",
  heroTitle2Fr: "Notre expertise",
  heroTitle2En: "Our expertise",
  heroIntroFr: "Montres de luxe, iPhone, informatique, bijoux, maroquinerie et consoles : FAST CASH Genève sélectionne, contrôle et valorise vos produits premium.",
  heroIntroEn: "Luxury watches, iPhones, computers, jewelry, leather goods and consoles: FAST CASH Geneva selects, checks and values premium products.",
  heroProof1Fr: "Paiement immédiat",
  heroProof1En: "Immediate payment",
  heroProof2Fr: "Expertise gratuite",
  heroProof2En: "Free appraisal",
  heroProof3Fr: "Articles garantis",
  heroProof3En: "Guaranteed items",

  legalBusinessName: "FAST CASH Genève",
  legalCompanyId: "",
  legalVatNumber: "",
  legalRepresentative: "",
  legalJurisdiction: "Genève, Suisse",
  legalLastUpdated: "20 août 2026",
};

function cleanPrefix(value: string, fallback: string) {
  const cleaned = value.trim().toUpperCase().replace(/[^A-Z0-9-]/g, "");
  return cleaned || fallback;
}
function prefixWithDash(value: string) { return value.endsWith("-") ? value : `${value}-`; }
function parseLanguages(value: string) {
  const items = value.split("/").map((v) => v.trim().toUpperCase()).filter(Boolean);
  return items.length ? items : DEFAULT_SETTINGS.activeLanguages;
}
function parseLowStockThreshold(value: string) {
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) && n >= 0 ? n : DEFAULT_SETTINGS.lowStockThreshold;
}
function parsePositiveNumber(value: string, fallback: number) {
  const n = Number.parseFloat(value.replace(",", "."));
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}
function parseCountries(value: string) {
  const items = value.split(/[\/,]/).map((v) => v.trim().toUpperCase()).filter(Boolean);
  return items.length ? Array.from(new Set(items)) : DEFAULT_SETTINGS.shippingCountries;
}
function value(map: Map<string, string>, key: string, fallback: string) {
  return map.get(key)?.trim() || fallback;
}

export async function getShopSettings(): Promise<ShopSettings> {
  try {
    const rows = await prisma.setting.findMany();
    const s = new Map(rows.map((row) => [row.key, row.value]));

    return {
      shopName: value(s, "shop.name", DEFAULT_SETTINGS.shopName),
      defaultCurrency: normalizeCurrency(value(s, "shop.currency", DEFAULT_SETTINGS.defaultCurrency)),
      activeLanguages: parseLanguages(value(s, "shop.languages", DEFAULT_SETTINGS.activeLanguages.join(" / "))),
      orderPrefix: cleanPrefix(value(s, "orders.prefix", DEFAULT_SETTINGS.orderPrefix), DEFAULT_SETTINGS.orderPrefix),
      invoicePrefix: cleanPrefix(value(s, "invoices.prefix", DEFAULT_SETTINGS.invoicePrefix), DEFAULT_SETTINGS.invoicePrefix),
      orderEmail: value(s, "orders.email", DEFAULT_SETTINGS.orderEmail),
      paymentCardEnabled: value(s, "payments.card", "Inactif") === "Actif",
      heylightEnabled: value(s, "payments.heylight", "Inactif") === "Actif",
      pickupEnabled: value(s, "shipping.pickupEnabled", "Actif") === "Actif",
      shippingEnabled: value(s, "shipping.deliveryEnabled", "Actif") === "Actif",
      shippingFee: parsePositiveNumber(value(s, "shipping.fee", String(DEFAULT_SETTINGS.shippingFee)), DEFAULT_SETTINGS.shippingFee),
      shippingFreeThreshold: parsePositiveNumber(value(s, "shipping.freeThreshold", String(DEFAULT_SETTINGS.shippingFreeThreshold)), DEFAULT_SETTINGS.shippingFreeThreshold),
      shippingCountries: parseCountries(value(s, "shipping.countries", DEFAULT_SETTINGS.shippingCountries.join(" / "))),
      defaultCarrier: value(s, "shipping.defaultCarrier", DEFAULT_SETTINGS.defaultCarrier),
      lowStockThreshold: parseLowStockThreshold(value(s, "stock.lowThreshold", String(DEFAULT_SETTINGS.lowStockThreshold))),

      addressLine1: value(s, "contact.addressLine1", DEFAULT_SETTINGS.addressLine1),
      postalCode: value(s, "contact.postalCode", DEFAULT_SETTINGS.postalCode),
      city: value(s, "contact.city", DEFAULT_SETTINGS.city),
      country: value(s, "contact.country", DEFAULT_SETTINGS.country),
      phoneDisplay: value(s, "contact.phoneDisplay", DEFAULT_SETTINGS.phoneDisplay),
      phoneHref: value(s, "contact.phoneHref", DEFAULT_SETTINGS.phoneHref),
      publicEmail: value(s, "contact.email", DEFAULT_SETTINGS.publicEmail),
      mapsUrl: value(s, "contact.mapsUrl", DEFAULT_SETTINGS.mapsUrl),
      instagramUrl: value(s, "social.instagram", DEFAULT_SETTINGS.instagramUrl),

      hours: DEFAULT_SETTINGS.hours.map((day) => ({
        ...day,
        time: value(s, `hours.${day.key}`, day.time),
      })),

      heroImage: value(s, "home.heroImage", DEFAULT_SETTINGS.heroImage),
      heroKickerFr: value(s, "home.heroKickerFr", DEFAULT_SETTINGS.heroKickerFr),
      heroKickerEn: value(s, "home.heroKickerEn", DEFAULT_SETTINGS.heroKickerEn),
      heroTitle1Fr: value(s, "home.heroTitle1Fr", DEFAULT_SETTINGS.heroTitle1Fr),
      heroTitle1En: value(s, "home.heroTitle1En", DEFAULT_SETTINGS.heroTitle1En),
      heroTitle2Fr: value(s, "home.heroTitle2Fr", DEFAULT_SETTINGS.heroTitle2Fr),
      heroTitle2En: value(s, "home.heroTitle2En", DEFAULT_SETTINGS.heroTitle2En),
      heroIntroFr: value(s, "home.heroIntroFr", DEFAULT_SETTINGS.heroIntroFr),
      heroIntroEn: value(s, "home.heroIntroEn", DEFAULT_SETTINGS.heroIntroEn),
      heroProof1Fr: value(s, "home.heroProof1Fr", DEFAULT_SETTINGS.heroProof1Fr),
      heroProof1En: value(s, "home.heroProof1En", DEFAULT_SETTINGS.heroProof1En),
      heroProof2Fr: value(s, "home.heroProof2Fr", DEFAULT_SETTINGS.heroProof2Fr),
      heroProof2En: value(s, "home.heroProof2En", DEFAULT_SETTINGS.heroProof2En),
      heroProof3Fr: value(s, "home.heroProof3Fr", DEFAULT_SETTINGS.heroProof3Fr),
      heroProof3En: value(s, "home.heroProof3En", DEFAULT_SETTINGS.heroProof3En),

      legalBusinessName: value(s, "legal.businessName", DEFAULT_SETTINGS.legalBusinessName),
      legalCompanyId: value(s, "legal.companyId", DEFAULT_SETTINGS.legalCompanyId),
      legalVatNumber: value(s, "legal.vatNumber", DEFAULT_SETTINGS.legalVatNumber),
      legalRepresentative: value(s, "legal.representative", DEFAULT_SETTINGS.legalRepresentative),
      legalJurisdiction: value(s, "legal.jurisdiction", DEFAULT_SETTINGS.legalJurisdiction),
      legalLastUpdated: value(s, "legal.lastUpdated", DEFAULT_SETTINGS.legalLastUpdated),
    };
  } catch (error) {
    console.error("FAST CASH settings fallback", error);
    return DEFAULT_SETTINGS;
  }
}

export function buildOrderReference(settings: Pick<ShopSettings, "orderPrefix">) {
  return `${prefixWithDash(settings.orderPrefix)}${Date.now()}`;
}
export function buildInvoiceNumber(orderReference: string, settings: Pick<ShopSettings, "orderPrefix" | "invoicePrefix">) {
  const orderPrefix = prefixWithDash(settings.orderPrefix);
  const invoicePrefix = prefixWithDash(settings.invoicePrefix);
  if (orderReference.startsWith(orderPrefix)) return orderReference.replace(orderPrefix, invoicePrefix);
  return `${invoicePrefix}${new Date().getFullYear()}-${orderReference.slice(-8)}`;
}
