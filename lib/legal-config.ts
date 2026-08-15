export const legalConfig = {
  businessName: process.env.NEXT_PUBLIC_LEGAL_BUSINESS_NAME || "FAST CASH Genève",
  tradingName: "FAST CASH Genève",
  address: process.env.NEXT_PUBLIC_LEGAL_ADDRESS || "Rue de Monthoux 27, 1201 Genève, Suisse",
  email: process.env.NEXT_PUBLIC_LEGAL_EMAIL || "contact@fastcash-geneve.ch",
  phone: process.env.NEXT_PUBLIC_LEGAL_PHONE || "+41 22 731 16 63",
  companyId: process.env.NEXT_PUBLIC_LEGAL_COMPANY_ID || "",
  vatNumber: process.env.NEXT_PUBLIC_LEGAL_VAT_NUMBER || "",
  representative: process.env.NEXT_PUBLIC_LEGAL_REPRESENTATIVE || "",
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL || "https://fastcash-geneve.ch",
  governingLaw: "droit suisse",
  jurisdiction: process.env.NEXT_PUBLIC_LEGAL_JURISDICTION || "Genève, Suisse",
  lastUpdated: "14 juillet 2026",
} as const;
