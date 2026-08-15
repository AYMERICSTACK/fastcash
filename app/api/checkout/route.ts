import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { products, type Product } from "@/lib/products";
import { prisma } from "@/lib/prisma";
import { toCatalogProduct } from "@/lib/public-categories";
import { convertFromCHF, normalizeCurrency } from "@/lib/currency";
import { buildOrderReference, getShopSettings } from "@/lib/settings";
import { getShippingFeeCHF, normalizeShippingMethod, resolveCoupon } from "@/lib/checkout-rules";
import { checkRateLimit, getRequestIp } from "@/lib/rate-limit";
import { getStripeClient } from "@/lib/stripe";

export const runtime = "nodejs";

type CheckoutItem = {
  id: number | string;
  quantity: number;
};

function sanitizeQuantity(quantity: unknown) {
  const parsed = Number(quantity);
  if (!Number.isFinite(parsed)) return 1;
  return Math.min(Math.max(Math.floor(parsed), 1), 20);
}

export async function POST(req: Request) {
  const rate = checkRateLimit(`checkout:${getRequestIp(req)}`, 12, 10 * 60 * 1000);
  if (!rate.allowed) {
    return NextResponse.json(
      { error: "Trop de tentatives de paiement. Merci de réessayer dans quelques minutes." },
      { status: 429 },
    );
  }

  try {
    const settings = await getShopSettings();
    if (!settings.paymentCardEnabled) {
      return NextResponse.json({ error: "Le paiement en ligne est actuellement indisponible." }, { status: 400 });
    }

    const stripe = getStripeClient();
    const body = await req.json();
    const checkoutAttemptId = String(body.checkoutAttemptId || "").trim().slice(0, 120);
    const rawItems = Array.isArray(body.items) ? (body.items as CheckoutItem[]) : [];
    const currency = normalizeCurrency(body.currency);
    const shippingMethod = normalizeShippingMethod(body.shippingMethod);

    const resolvedItems = await Promise.all(
      rawItems.map(async (item) => {
        const rawId = String(item.id);
        const prestashopId = /^\d+$/.test(rawId) ? Number(rawId) : null;
        const dbProduct = prestashopId !== null
          ? await prisma.product.findUnique({
              where: { prestashopId },
              include: { category: { select: { name: true, slug: true } }, brand: { select: { name: true, slug: true } } },
            })
          : await prisma.product.findUnique({
              where: { id: rawId },
              include: { category: { select: { name: true, slug: true } }, brand: { select: { name: true, slug: true } } },
            });
        const staticProduct = dbProduct ? null : products.find((candidate) => String(candidate.id) === rawId);
        const product = dbProduct ? toCatalogProduct(dbProduct) : staticProduct;
        const quantity = sanitizeQuantity(item.quantity);

        if (!product || product.price <= 0) return { product: null, quantity, error: "Produit introuvable" };
        if (product.stock <= 0) return { product, quantity, error: `${product.name} est en rupture de stock.` };
        if (quantity > product.stock) {
          return {
            product,
            quantity,
            error: `Stock insuffisant pour ${product.name}. ${product.stock} disponible${product.stock > 1 ? "s" : ""}.`,
          };
        }

        return { product, quantity, error: null };
      }),
    );

    const stockError = resolvedItems.find((item) => item.error)?.error;
    if (stockError) return NextResponse.json({ error: stockError }, { status: 400 });

    const checkoutItems = resolvedItems.filter((item) => item.product) as {
      product: Product;
      quantity: number;
      error: null;
    }[];

    if (!checkoutItems.length) return NextResponse.json({ error: "Panier vide" }, { status: 400 });

    const subtotalCHF = checkoutItems.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
    const shippingFeeCHF = getShippingFeeCHF(shippingMethod, subtotalCHF, settings);
    const coupon = await resolveCoupon(body.couponCode, subtotalCHF);
    const origin = process.env.NEXT_PUBLIC_SITE_URL || new URL(req.url).origin;
    const orderReference = buildOrderReference(settings);

    let stripeDiscount: Stripe.Checkout.SessionCreateParams.Discount[] | undefined;
    if (coupon) {
      const stripeCoupon = await stripe.coupons.create({
        duration: "once",
        name: `FAST CASH ${coupon.code}`,
        ...(coupon.type === "PERCENT"
          ? { percent_off: Math.min(coupon.value, 100) }
          : {
              amount_off: Math.round(convertFromCHF(coupon.discountCHF, currency) * 100),
              currency: currency.toLowerCase(),
            }),
        metadata: { fastcash_code: coupon.code },
      });
      stripeDiscount = [{ coupon: stripeCoupon.id }];
    }

    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = checkoutItems.map(({ product, quantity }) => ({
      quantity,
      price_data: {
        currency: currency.toLowerCase(),
        unit_amount: Math.round(convertFromCHF(product.price, currency) * 100),
        product_data: {
          name: product.name,
          description: product.category,
          metadata: {
            product_id: String(product.id),
            reference: product.reference || "",
            slug: product.slug,
          },
        },
      },
    }));

    if (shippingFeeCHF > 0) {
      lineItems.push({
        quantity: 1,
        price_data: {
          currency: currency.toLowerCase(),
          unit_amount: Math.round(convertFromCHF(shippingFeeCHF, currency) * 100),
          product_data: {
            name: `Livraison — ${settings.defaultCarrier}`,
            description: `Expédition vers ${settings.shippingCountries.join(", ")}`,
          },
        },
      });
    }

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      ui_mode: "embedded_page",
      client_reference_id: checkoutAttemptId || orderReference,
      billing_address_collection: "required",
      shipping_address_collection:
        shippingMethod === "shipping"
          ? { allowed_countries: settings.shippingCountries as any }
          : undefined,
      phone_number_collection: { enabled: true },
      line_items: lineItems,
      discounts: stripeDiscount,
      metadata: {
        order_reference: orderReference,
        source: "fastcash-next-embedded",
        currency,
        shipping_method: shippingMethod,
        shipping_label: shippingMethod === "pickup" ? "Retrait boutique FAST CASH Genève" : settings.defaultCarrier,
        shipping_fee_chf: String(shippingFeeCHF),
        coupon_code: coupon?.code || "",
        coupon_discount_chf: String(coupon?.discountCHF || 0),
        items: checkoutItems.map(({ product, quantity }) => `${product.id}:${quantity}`).join(","),
      },
      return_url: `${origin}/merci?provider=stripe&session_id={CHECKOUT_SESSION_ID}`,
    }, checkoutAttemptId ? { idempotencyKey: `fastcash-embedded-${checkoutAttemptId}` } : undefined);

    if (!session.client_secret) {
      throw new Error("Stripe n’a pas retourné de secret de session embarquée.");
    }

    return NextResponse.json({ clientSecret: session.client_secret, sessionId: session.id });
  } catch (error) {
    console.error("[checkout]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Impossible de créer la session Stripe." },
      { status: 500 },
    );
  }
}
