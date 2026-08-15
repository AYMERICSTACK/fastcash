import { prisma } from "@/lib/prisma";
import type { ShopSettings } from "@/lib/settings";

export type ShippingMethod = "pickup" | "shipping";

type ShippingSettings = Pick<
  ShopSettings,
  "pickupEnabled" | "shippingEnabled" | "shippingFee" | "shippingFreeThreshold"
>;

export function normalizeShippingMethod(value: unknown): ShippingMethod {
  return value === "shipping" ? "shipping" : "pickup";
}

export function getShippingFeeCHF(
  method: ShippingMethod,
  subtotalCHF: number,
  settings: ShippingSettings,
) {
  if (method === "pickup") {
    if (!settings.pickupEnabled) throw new Error("Le retrait en boutique n'est pas disponible.");
    return 0;
  }

  if (!settings.shippingEnabled) throw new Error("La livraison n'est pas disponible.");

  const subtotal = Math.max(0, Number(subtotalCHF) || 0);
  const fee = Math.max(0, Number(settings.shippingFee) || 0);
  const freeThreshold = Math.max(0, Number(settings.shippingFreeThreshold) || 0);

  if (freeThreshold > 0 && subtotal >= freeThreshold) return 0;
  return fee;
}

export async function resolveCoupon(codeValue: unknown, subtotalCHF: number) {
  const code = String(codeValue || "").trim().toUpperCase();
  if (!code) return null;

  const coupon = await prisma.coupon.findUnique({ where: { code } });
  const now = new Date();

  if (!coupon || !coupon.active) throw new Error("Ce code promotionnel n'est pas valide.");
  if (coupon.startsAt && coupon.startsAt > now) throw new Error("Ce code promotionnel n'est pas encore actif.");
  if (coupon.expiresAt && coupon.expiresAt < now) throw new Error("Ce code promotionnel a expiré.");

  const rawDiscount = coupon.type === "PERCENT"
    ? subtotalCHF * Math.min(coupon.value, 100) / 100
    : coupon.value;
  const discountCHF = Math.min(Math.max(rawDiscount, 0), subtotalCHF);

  if (discountCHF <= 0) throw new Error("Ce code promotionnel ne peut pas être appliqué.");

  return {
    code: coupon.code,
    type: coupon.type,
    value: coupon.value,
    discountCHF,
  };
}
