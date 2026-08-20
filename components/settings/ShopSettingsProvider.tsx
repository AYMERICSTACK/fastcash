"use client";

import { createContext, useContext } from "react";
import type { ShopSettings } from "@/lib/settings";

const ShopSettingsContext = createContext<ShopSettings | null>(null);

export function ShopSettingsProvider({
  settings,
  children,
}: {
  settings: ShopSettings;
  children: React.ReactNode;
}) {
  return <ShopSettingsContext.Provider value={settings}>{children}</ShopSettingsContext.Provider>;
}

export function useShopSettings() {
  const context = useContext(ShopSettingsContext);
  if (!context) throw new Error("useShopSettings must be used inside ShopSettingsProvider");
  return context;
}
