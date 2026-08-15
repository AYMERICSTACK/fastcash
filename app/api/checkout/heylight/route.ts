import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { products, type Product } from "@/lib/products";
import { toCatalogProduct } from "@/lib/public-categories";
import { buildOrderReference, getShopSettings } from "@/lib/settings";
import { getShippingFeeCHF, normalizeShippingMethod, resolveCoupon } from "@/lib/checkout-rules";
import { checkRateLimit, getRequestIp } from "@/lib/rate-limit";
import { getHeyLightConfig, heylightFetch } from "@/lib/heylight";
import { isHeyLightEnabled } from "@/lib/feature-flags";

export const runtime = "nodejs";

type CheckoutItem = { id: number | string; quantity: number };
function quantity(value: unknown) { const n = Number(value); return Number.isFinite(n) ? Math.min(Math.max(Math.floor(n), 1), 20) : 1; }
function text(value: unknown, max = 180) { return String(value || "").trim().slice(0, max); }

export async function POST(req: Request) {
  const rate = checkRateLimit(`heylight-checkout:${getRequestIp(req)}`, 8, 10 * 60 * 1000);
  if (!rate.allowed) return NextResponse.json({ error: "Trop de tentatives. Réessayez dans quelques minutes." }, { status: 429 });

  try {
    const body = await req.json();
    const settings = await getShopSettings();
    if (!isHeyLightEnabled() || !settings.heylightEnabled) return NextResponse.json({ error: "HeyLight est actuellement indisponible." }, { status: 400 });
    if (!getHeyLightConfig().merchantKey) return NextResponse.json({ error: "Configuration HeyLight incomplète." }, { status: 503 });

    const customer = {
      firstName: text(body.customer?.firstName, 80), lastName: text(body.customer?.lastName, 80),
      email: text(body.customer?.email, 180).toLowerCase(), phone: text(body.customer?.phone, 40),
      line1: text(body.customer?.line1, 180), postalCode: text(body.customer?.postalCode, 20),
      city: text(body.customer?.city, 100), country: text(body.customer?.country || "CH", 2).toUpperCase(),
    };
    if (!customer.firstName || !customer.lastName || !customer.email.includes("@") || !customer.phone) {
      return NextResponse.json({ error: "Nom, prénom, email et téléphone sont obligatoires pour HeyLight." }, { status: 400 });
    }

    const shippingMethod = normalizeShippingMethod(body.shippingMethod);
    if (shippingMethod === "shipping" && (!customer.line1 || !customer.postalCode || !customer.city || customer.country !== "CH")) {
      return NextResponse.json({ error: "Une adresse suisse complète est requise pour la livraison HeyLight." }, { status: 400 });
    }

    const rawItems = Array.isArray(body.items) ? body.items as CheckoutItem[] : [];
    const resolved = await Promise.all(rawItems.map(async (item) => {
      const staticProduct = products.find((p) => String(p.id) === String(item.id));
      const db = staticProduct ? null : await prisma.product.findUnique({ where: { id: String(item.id) }, include: { category: true, brand: true } });
      const product = staticProduct ?? (db ? toCatalogProduct(db) : null);
      return { product, qty: quantity(item.quantity), databaseId: db?.id || null };
    }));
    if (!resolved.length || resolved.some((line) => !line.product)) return NextResponse.json({ error: "Panier invalide." }, { status: 400 });
    for (const line of resolved as { product: Product; qty: number; databaseId: string | null }[]) {
      if (line.product.stock < line.qty) return NextResponse.json({ error: `Stock insuffisant pour ${line.product.name}.` }, { status: 400 });
    }

    const lines = resolved as { product: Product; qty: number; databaseId: string | null }[];
    const subtotal = lines.reduce((sum, line) => sum + line.product.price * line.qty, 0);
    const shipping = getShippingFeeCHF(shippingMethod, subtotal, settings);
    const coupon = await resolveCoupon(body.couponCode, subtotal);
    const total = Math.max(0, subtotal + shipping - (coupon?.discountCHF || 0));
    const reference = buildOrderReference(settings);
    const webhookToken = crypto.randomBytes(32).toString("hex");
    const origin = process.env.NEXT_PUBLIC_SITE_URL || new URL(req.url).origin;

    const dbCustomer = await prisma.customer.upsert({
      where: { email: customer.email }, update: { firstName: customer.firstName, lastName: customer.lastName, phone: customer.phone },
      create: { email: customer.email, firstName: customer.firstName, lastName: customer.lastName, phone: customer.phone },
    });
    if (shippingMethod === "shipping") await prisma.address.create({ data: { customerId: dbCustomer.id, label: `Commande ${reference}`, line1: customer.line1, postalCode: customer.postalCode, city: customer.city, country: customer.country } });

    const order = await prisma.order.create({ data: {
      orderNumber: reference, customerId: dbCustomer.id, total, currency: "CHF", status: "PENDING",
      items: { create: lines.map((line) => ({ productId: line.databaseId, name: line.product.name, quantity: line.qty, price: line.product.price })) },
      shipment: { create: { carrier: shippingMethod === "pickup" ? "Retrait boutique FAST CASH Genève" : settings.defaultCarrier, status: "PENDING" } },
      payment: { create: { provider: "HeyLight", status: "pending", amount: total, webhookToken } },
    }, include: { payment: true } });

    try {
      const { allowedTerms } = getHeyLightConfig();
      const payload = await heylightFetch<{ action: string; redirect_url: string; external_contract_uuid: string }>("/api/checkout/v1/init/", {
        method: "POST",
        body: JSON.stringify({
          amount: { currency: "CHF", amount: total.toFixed(2) }, amount_format: "DECIMAL",
          redirect_urls: { success_url: `${origin}/merci?provider=heylight&order=${encodeURIComponent(reference)}`, failure_url: `${origin}/panier?checkout=heylight-failed` },
          customer_details: { email_address: customer.email, first_name: customer.firstName, last_name: customer.lastName, contact_number: customer.phone },
          products: lines.map((line) => ({ sku: String(line.product.reference || line.product.id), name: line.product.name.slice(0, 180), quantity: line.qty, price: line.product.price.toFixed(2) })),
          webhooks: { mapping_scheme: "DEFAULT", status_url: `${origin}/api/heylight/webhook/v1`, token: webhookToken },
          shipping_address: shippingMethod === "shipping" ? { address_line_1: customer.line1, zip_code: customer.postalCode, city: customer.city, country_code: "CH" } : { address_line_1: "FAST CASH Genève", zip_code: "1200", city: "Genève", country_code: "CH" },
          store_id: "ecommerce", allowed_terms: allowedTerms, order_reference: reference, language: "fr",
        }),
      });
      await prisma.payment.update({ where: { orderId: order.id }, data: { reference: payload.external_contract_uuid, providerData: payload as never } });
      return NextResponse.json({ url: payload.redirect_url, reference });
    } catch (error) {
      await prisma.order.delete({ where: { id: order.id } }).catch(() => null);
      throw error;
    }
  } catch (error) {
    console.error("[heylight-checkout]", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Impossible d'initialiser HeyLight." }, { status: 500 });
  }
}
