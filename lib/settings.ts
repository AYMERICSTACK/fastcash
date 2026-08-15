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
};

const DEFAULT_SETTINGS: ShopSettings = {
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
};

function cleanPrefix(value: string, fallback: string) {
  const cleaned = value.trim().toUpperCase().replace(/[^A-Z0-9-]/g, "");
  return cleaned || fallback;
}

function prefixWithDash(value: string) {
  return value.endsWith("-") ? value : `${value}-`;
}

function parseLanguages(value: string) {
  const languages = value
    .split("/")
    .map((language) => language.trim().toUpperCase())
    .filter(Boolean);

  return languages.length ? languages : DEFAULT_SETTINGS.activeLanguages;
}

function parseLowStockThreshold(value: string) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 0) return DEFAULT_SETTINGS.lowStockThreshold;
  return parsed;
}

function parsePositiveNumber(value: string, fallback: number) {
  const parsed = Number.parseFloat(value.replace(",", "."));
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

function parseCountries(value: string) {
  const countries = value.split(/[\/,]/).map((item) => item.trim().toUpperCase()).filter(Boolean);
  return countries.length ? Array.from(new Set(countries)) : DEFAULT_SETTINGS.shippingCountries;
}

export async function getShopSettings(): Promise<ShopSettings> {
  try {
    const rows = await prisma.setting.findMany();
    const settings = new Map(rows.map((setting) => [setting.key, setting.value]));

    return {
      shopName: settings.get("shop.name") || DEFAULT_SETTINGS.shopName,
      defaultCurrency: normalizeCurrency(settings.get("shop.currency") || DEFAULT_SETTINGS.defaultCurrency),
      activeLanguages: parseLanguages(settings.get("shop.languages") || DEFAULT_SETTINGS.activeLanguages.join(" / ")),
      orderPrefix: cleanPrefix(settings.get("orders.prefix") || DEFAULT_SETTINGS.orderPrefix, DEFAULT_SETTINGS.orderPrefix),
      invoicePrefix: cleanPrefix(settings.get("invoices.prefix") || DEFAULT_SETTINGS.invoicePrefix, DEFAULT_SETTINGS.invoicePrefix),
      orderEmail: settings.get("orders.email") || DEFAULT_SETTINGS.orderEmail,
      paymentCardEnabled: (settings.get("payments.card") || "Inactif") === "Actif",
      heylightEnabled: (settings.get("payments.heylight") || "Inactif") === "Actif",
      pickupEnabled: (settings.get("shipping.pickupEnabled") || "Actif") === "Actif",
      shippingEnabled: (settings.get("shipping.deliveryEnabled") || "Actif") === "Actif",
      shippingFee: parsePositiveNumber(
        settings.get("shipping.fee") || String(DEFAULT_SETTINGS.shippingFee),
        DEFAULT_SETTINGS.shippingFee,
      ),
      shippingFreeThreshold: parsePositiveNumber(
        settings.get("shipping.freeThreshold") || String(DEFAULT_SETTINGS.shippingFreeThreshold),
        DEFAULT_SETTINGS.shippingFreeThreshold,
      ),
      shippingCountries: parseCountries(
        settings.get("shipping.countries") || DEFAULT_SETTINGS.shippingCountries.join(" / "),
      ),
      defaultCarrier: settings.get("shipping.defaultCarrier") || DEFAULT_SETTINGS.defaultCarrier,
      lowStockThreshold: parseLowStockThreshold(settings.get("stock.lowThreshold") || String(DEFAULT_SETTINGS.lowStockThreshold)),
    };
  } catch (error) {
    console.error("FAST CASH settings fallback", error);
    return DEFAULT_SETTINGS;
  }
}

export function buildOrderReference(settings: Pick<ShopSettings, "orderPrefix">) {
  return `${prefixWithDash(settings.orderPrefix)}${Date.now()}`;
}

export function buildInvoiceNumber(
  orderReference: string,
  settings: Pick<ShopSettings, "orderPrefix" | "invoicePrefix">,
) {
  const orderPrefix = prefixWithDash(settings.orderPrefix);
  const invoicePrefix = prefixWithDash(settings.invoicePrefix);

  if (orderReference.startsWith(orderPrefix)) {
    return orderReference.replace(orderPrefix, invoicePrefix);
  }

  return `${invoicePrefix}${new Date().getFullYear()}-${orderReference.slice(-8)}`;
}
