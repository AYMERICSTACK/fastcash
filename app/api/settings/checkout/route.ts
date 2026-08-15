import { NextResponse } from "next/server";
import { getShopSettings } from "@/lib/settings";
import { isHeyLightEnabled } from "@/lib/feature-flags";
import { getStripePublicStatus } from "@/lib/stripe";

export async function GET() {
  const settings = await getShopSettings();
  const stripe = getStripePublicStatus();

  return NextResponse.json({
    paymentCardEnabled: settings.paymentCardEnabled && stripe.configured,
    stripeConfigured: stripe.configured,
    stripeMode: stripe.mode,
    heylightEnabled: settings.heylightEnabled && isHeyLightEnabled(),
    pickupEnabled: settings.pickupEnabled,
    shippingEnabled: settings.shippingEnabled,
    shippingFee: settings.shippingFee,
    shippingFreeThreshold: settings.shippingFreeThreshold,
    shippingCountries: settings.shippingCountries,
    defaultCarrier: settings.defaultCarrier,
  });
}
