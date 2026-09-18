import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCustomerSession } from "@/lib/session";
import { sendTransactionalEmail, offerReceivedAdminEmail, offerReceivedCustomerEmail } from "@/lib/transactional-emails";

function clean(value: unknown, max: number) {
  return String(value ?? "").trim().slice(0, max);
}

// Accepte les saisies courantes des claviers FR/CH : 120,50 / 1'200.50 / 1 200,50.
function parseOfferAmount(value: unknown) {
  const normalized = clean(value, 40)
    .replace(/[\s'’]/g, "")
    .replace(/,/g, ".")
    .replace(/[^0-9.]/g, "");
  if (!normalized || (normalized.match(/\./g) || []).length > 1) return Number.NaN;
  return Number(normalized);
}

function validEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function emailDomain(email: string) {
  return email.includes("@") ? email.split("@").pop() || "unknown" : "invalid";
}

export async function POST(req: Request) {
  const requestId = randomUUID();
  try {
    const body = await req.json();
    const rawProductId = clean(body.productId, 80);
    const prestashopId = /^\d+$/.test(rawProductId) ? Number(rawProductId) : null;
    const product = prestashopId !== null
      ? await prisma.product.findUnique({ where: { prestashopId } })
      : await prisma.product.findUnique({ where: { id: rawProductId } });

    if (!product || !product.active || product.stock < 1) {
      console.warn("[offers] rejected_product", {
        requestId,
        productId: rawProductId,
        found: Boolean(product),
        active: product?.active ?? null,
        stock: product?.stock ?? null,
      });
      return NextResponse.json({ error: "Ce produit n'est plus disponible pour une offre." }, { status: 400 });
    }

    const name = clean(body.name, 120);
    const email = clean(body.email, 160).toLowerCase();
    const phone = clean(body.phone, 40) || null;
    const message = clean(body.message, 1000) || null;
    const amount = parseOfferAmount(body.amount);

    if (!name) {
      console.warn("[offers] rejected_validation", { requestId, reason: "missing_name", productId: product.id });
      return NextResponse.json({ error: "Merci d'indiquer votre nom." }, { status: 400 });
    }
    if (!validEmail(email)) {
      console.warn("[offers] rejected_validation", { requestId, reason: "invalid_email", productId: product.id });
      return NextResponse.json({ error: "Merci d'indiquer une adresse e-mail valide." }, { status: 400 });
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      console.warn("[offers] rejected_validation", { requestId, reason: "invalid_amount", productId: product.id });
      return NextResponse.json({ error: "Merci d'indiquer un montant valide, par exemple 120 ou 120,50 CHF." }, { status: 400 });
    }

    // Une session client absente/expirée ne doit jamais empêcher une offre invitée.
    let customerId: string | null = null;
    try {
      const session = await getCustomerSession();
      customerId = session?.customerId || null;
    } catch (error) {
      console.warn("[offers] customer_session_ignored", { requestId, error });
    }

    const offer = await prisma.productOffer.create({
      data: {
        productId: product.id,
        customerId,
        customerName: name,
        customerEmail: email,
        customerPhone: phone,
        message,
        listPrice: product.price,
        offeredPrice: Math.round(amount * 100) / 100,
      },
    });

    console.info("[offers] created", {
      requestId,
      offerId: offer.id,
      productId: product.id,
      prestashopId: product.prestashopId,
      offeredPrice: offer.offeredPrice,
      emailDomain: emailDomain(email),
      authenticatedCustomer: Boolean(customerId),
    });

    const admin = process.env.CONTACT_TO_EMAIL || process.env.ORDER_TO_EMAIL || "info@fastcash-ge.com";
    const [adminMail, customerMail] = await Promise.allSettled([
      sendTransactionalEmail({
        to: admin,
        subject: `Nouvelle offre — ${product.name}`,
        html: offerReceivedAdminEmail({ offerId: offer.id, productName: product.name, listPrice: product.price, offeredPrice: offer.offeredPrice, name, email, phone, message }),
      }),
      sendTransactionalEmail({
        to: email,
        subject: `Votre offre FAST CASH — ${product.name}`,
        html: offerReceivedCustomerEmail({ productName: product.name, offeredPrice: offer.offeredPrice, name }),
      }),
    ]);

    if (adminMail.status === "rejected") {
      console.error("[offers] admin_email_failed", { requestId, offerId: offer.id, error: adminMail.reason });
    }
    if (customerMail.status === "rejected") {
      console.error("[offers] customer_email_failed", { requestId, offerId: offer.id, error: customerMail.reason });
    }

    return NextResponse.json({ ok: true, requestId });
  } catch (error) {
    console.error("[offers] failed", { requestId, error });
    return NextResponse.json({ error: "Impossible d'envoyer l'offre pour le moment. Merci de réessayer." }, { status: 500 });
  }
}
