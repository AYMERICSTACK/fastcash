import { getShopSettings, DEFAULT_SETTINGS } from "@/lib/settings";

function envValue(name: string) {
  const value = process.env[name]?.trim();
  return value || undefined;
}

export const legalConfig = {
  businessName: envValue("NEXT_PUBLIC_COMPANY_NAME") || DEFAULT_SETTINGS.legalBusinessName,
  tradingName: envValue("NEXT_PUBLIC_BRAND_NAME") || DEFAULT_SETTINGS.shopName,
  companyForm: envValue("NEXT_PUBLIC_LEGAL_COMPANY_FORM") || "",
  address:
    envValue("NEXT_PUBLIC_LEGAL_ADDRESS") ||
    `${DEFAULT_SETTINGS.addressLine1}, ${DEFAULT_SETTINGS.postalCode} ${DEFAULT_SETTINGS.city}, ${DEFAULT_SETTINGS.country}`,
  email: envValue("NEXT_PUBLIC_LEGAL_EMAIL") || DEFAULT_SETTINGS.publicEmail,
  phone: envValue("NEXT_PUBLIC_LEGAL_PHONE") || DEFAULT_SETTINGS.phoneDisplay,
  companyId: envValue("NEXT_PUBLIC_LEGAL_COMPANY_ID") || DEFAULT_SETTINGS.legalCompanyId,
  vatNumber: envValue("NEXT_PUBLIC_LEGAL_VAT_NUMBER") || DEFAULT_SETTINGS.legalVatNumber,
  representative:
    envValue("NEXT_PUBLIC_LEGAL_REPRESENTATIVE") || DEFAULT_SETTINGS.legalRepresentative,
  registrationDate: envValue("NEXT_PUBLIC_LEGAL_REGISTRATION_DATE") || "",
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL || "https://fastcash-geneve.ch",
  governingLaw: "droit suisse",
  jurisdiction:
    envValue("NEXT_PUBLIC_LEGAL_JURISDICTION") || DEFAULT_SETTINGS.legalJurisdiction,
  lastUpdated: DEFAULT_SETTINGS.legalLastUpdated,
} as const;

export async function getLegalConfig() {
  const settings = await getShopSettings();

  return {
    businessName: envValue("NEXT_PUBLIC_COMPANY_NAME") || settings.legalBusinessName,
    tradingName: envValue("NEXT_PUBLIC_BRAND_NAME") || settings.shopName,
    companyForm: envValue("NEXT_PUBLIC_LEGAL_COMPANY_FORM") || "",
    address:
      envValue("NEXT_PUBLIC_LEGAL_ADDRESS") ||
      `${settings.addressLine1}, ${settings.postalCode} ${settings.city}, ${settings.country}`,
    email: envValue("NEXT_PUBLIC_LEGAL_EMAIL") || settings.publicEmail,
    phone: envValue("NEXT_PUBLIC_LEGAL_PHONE") || settings.phoneDisplay,
    companyId: envValue("NEXT_PUBLIC_LEGAL_COMPANY_ID") || settings.legalCompanyId,
    vatNumber: envValue("NEXT_PUBLIC_LEGAL_VAT_NUMBER") || settings.legalVatNumber,
    representative:
      envValue("NEXT_PUBLIC_LEGAL_REPRESENTATIVE") || settings.legalRepresentative,
    registrationDate: envValue("NEXT_PUBLIC_LEGAL_REGISTRATION_DATE") || "",
    siteUrl: process.env.NEXT_PUBLIC_SITE_URL || "https://fastcash-geneve.ch",
    governingLaw: "droit suisse",
    jurisdiction:
      envValue("NEXT_PUBLIC_LEGAL_JURISDICTION") || settings.legalJurisdiction,
    lastUpdated: settings.legalLastUpdated,
  } as const;
}
