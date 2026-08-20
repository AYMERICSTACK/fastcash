import { getShopSettings, DEFAULT_SETTINGS } from "@/lib/settings";


export const legalConfig = {
  businessName: DEFAULT_SETTINGS.legalBusinessName,
  tradingName: DEFAULT_SETTINGS.shopName,
  address: `${DEFAULT_SETTINGS.addressLine1}, ${DEFAULT_SETTINGS.postalCode} ${DEFAULT_SETTINGS.city}, ${DEFAULT_SETTINGS.country}`,
  email: DEFAULT_SETTINGS.publicEmail,
  phone: DEFAULT_SETTINGS.phoneDisplay,
  companyId: DEFAULT_SETTINGS.legalCompanyId,
  vatNumber: DEFAULT_SETTINGS.legalVatNumber,
  representative: DEFAULT_SETTINGS.legalRepresentative,
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL || "https://fastcash-geneve.ch",
  governingLaw: "droit suisse",
  jurisdiction: DEFAULT_SETTINGS.legalJurisdiction,
  lastUpdated: DEFAULT_SETTINGS.legalLastUpdated,
} as const;

export async function getLegalConfig() {
  const settings = await getShopSettings();
  return {
    businessName: settings.legalBusinessName,
    tradingName: settings.shopName,
    address: `${settings.addressLine1}, ${settings.postalCode} ${settings.city}, ${settings.country}`,
    email: settings.publicEmail,
    phone: settings.phoneDisplay,
    companyId: settings.legalCompanyId,
    vatNumber: settings.legalVatNumber,
    representative: settings.legalRepresentative,
    siteUrl: process.env.NEXT_PUBLIC_SITE_URL || "https://fastcash-geneve.ch",
    governingLaw: "droit suisse",
    jurisdiction: settings.legalJurisdiction,
    lastUpdated: settings.legalLastUpdated,
  } as const;
}
