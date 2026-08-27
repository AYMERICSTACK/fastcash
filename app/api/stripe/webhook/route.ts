import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import Stripe from "stripe";
import { Prisma } from "@prisma/client";
import { formatCHF } from "@/lib/format";
import { convertFromCHF, normalizeCurrency, type Currency } from "@/lib/currency";
import { products, type Product } from "@/lib/products";
import { prisma } from "@/lib/prisma";
import { toCatalogProduct } from "@/lib/public-categories";
import { buildInvoiceNumber, buildOrderReference, getShopSettings, type ShopSettings } from "@/lib/settings";
import { getStripeClient, getStripeConfig } from "@/lib/stripe";
import {
  adminNewOrderEmail,
  customerOrderConfirmationEmail,
  sendTransactionalEmail,
} from "@/lib/transactional-emails";

export const runtime = "nodejs";

function revalidateOrderBackOffice(orderId?: string) {
  revalidatePath("/admin");
  revalidatePath("/pilotage");
  revalidatePath("/admin/orders");
  revalidatePath("/pilotage/commandes");
  if (orderId) {
    revalidatePath(`/admin/orders/${orderId}`);
    revalidatePath(`/pilotage/commandes/${orderId}`);
  }
}

type OrderLine = {
  name: string;
  quantity: number;
  amountTotal: number;
};

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatMoney(amount: number, currency: string) {
  if (currency.toUpperCase() === "CHF") return formatCHF(amount);

  return new Intl.NumberFormat("fr-CH", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(amount);
}

async function resolveMetadataItems(value?: string | null) {
  if (!value) return [];

  const entries = value.split(",").map((entry) => {
    const [id, quantity] = entry.split(":");
    return { id, quantity: Math.max(1, Number(quantity) || 1) };
  });

  return Promise.all(
    entries.map(async ({ id, quantity }) => {
      const rawId = String(id);
      const prestashopId = /^\d+$/.test(rawId) ? Number(rawId) : null;
      const dbProduct = prestashopId !== null
        ? await prisma.product.findUnique({
            where: { prestashopId },
            include: {
              category: { select: { name: true, slug: true } },
              brand: { select: { name: true, slug: true } },
            },
          })
        : await prisma.product.findUnique({
            where: { id: rawId },
            include: {
              category: { select: { name: true, slug: true } },
              brand: { select: { name: true, slug: true } },
            },
          });

      if (dbProduct) {
        return { product: toCatalogProduct(dbProduct), quantity, databaseId: dbProduct.id };
      }

      // Compatibilité avec les rares produits encore uniquement présents dans le catalogue statique.
      // Ils restent achetables, mais aucun stock DB ne peut être décrémenté tant qu'ils ne sont pas importés.
      const staticProduct = products.find((candidate) => String(candidate.id) === rawId);
      if (!staticProduct) return null;
      return { product: staticProduct, quantity, databaseId: null as string | null };
    }),
  ).then((items) => items.filter(Boolean) as { product: Product; quantity: number; databaseId: string | null }[]);
}

function splitCustomerName(fullName: string) {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);

  if (!parts.length) {
    return { firstName: "Client", lastName: "FAST CASH" };
  }

  return {
    firstName: parts[0] || "Client",
    lastName: parts.slice(1).join(" ") || null,
  };
}

async function persistStripeOrder({
  session,
  reference,
  customerName,
  customerEmail,
  customerPhone,
  currency,
  total,
  stripeLines,
  settings,
  event,
}: {
  session: Stripe.Checkout.Session;
  reference: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  currency: Currency;
  total: number;
  stripeLines: Stripe.ApiList<Stripe.LineItem>;
  settings: ShopSettings;
  event: Stripe.Event;
}) {
  const existingOrder = await prisma.order.findUnique({
    where: { orderNumber: reference },
    include: { invoice: true, payment: true },
  });

  if (existingOrder) return { order: existingOrder, created: false };

  const metadataItems = await resolveMetadataItems(session.metadata?.items);
  const { firstName, lastName } = splitCustomerName(customerName);
  const safeEmail = customerEmail || `${session.id}@stripe.fastcash.local`;
  const invoiceNumber = buildInvoiceNumber(reference, settings);

  const orderItems = metadataItems.length
    ? metadataItems.map(({ product, quantity, databaseId }, index) => {
        const stripeLine = stripeLines.data[index];
        const amountTotal = stripeLine?.amount_total ? stripeLine.amount_total / 100 : convertFromCHF(product.price, currency) * quantity;

        return {
          productId: databaseId,
          name: product.name,
          quantity,
          price: quantity > 0 ? amountTotal / quantity : amountTotal,
        };
      })
    : stripeLines.data.map((line) => ({
        productId: null,
        name: line.description || "Produit FAST CASH",
        quantity: line.quantity || 1,
        price: line.quantity ? (line.amount_total || 0) / 100 / line.quantity : (line.amount_total || 0) / 100,
      }));

  return prisma.$transaction(async (tx: any) => {
    const customer = await tx.customer.upsert({
      where: { email: safeEmail },
      update: {
        firstName,
        lastName,
        phone: customerPhone !== "Non renseigné" ? customerPhone : undefined,
      },
      create: {
        email: safeEmail,
        firstName,
        lastName,
        phone: customerPhone !== "Non renseigné" ? customerPhone : null,
      },
    });

    const order = await tx.order.create({
      data: {
        orderNumber: reference,
        customerId: customer.id,
        total,
        currency: currency.toUpperCase(),
        status: "PREPARING",
        items: {
          create: orderItems,
        },
        payment: {
          create: {
            provider: "Stripe",
            status: "paid",
            amount: total,
            reference: session.payment_intent ? String(session.payment_intent) : session.id,
            confirmedAt: new Date(),
            providerData: {
              checkoutSessionId: session.id,
              paymentIntentId: session.payment_intent ? String(session.payment_intent) : null,
              latestEventId: event.id,
              latestEventType: event.type,
              checkoutStatus: session.status || null,
              paymentStatus: session.payment_status || null,
            },
          },
        },
        shipment: {
          create: {
            carrier: session.metadata?.shipping_label || settings.defaultCarrier,
            trackingNo: null,
            status: "PREPARING",
          },
        },
        invoice: {
          create: {
            number: invoiceNumber,
            amount: total,
          },
        },
      },
      include: {
        invoice: true,
      },
    });

    for (const item of orderItems) {
      if (!item.productId) continue;

      const stockUpdate = await tx.product.updateMany({
        where: {
          id: item.productId,
          active: true,
          stock: { gte: item.quantity },
        },
        data: { stock: { decrement: item.quantity } },
      });

      if (stockUpdate.count !== 1) {
        throw new Error(`STOCK_CONFLICT:${item.productId}`);
      }
    }

    return { order, created: true };
  });
}

async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}) {
  const apiKey = process.env.RESEND_API_KEY;
  const from =
    process.env.RESEND_FROM_EMAIL || "FAST CASH Genève <onboarding@resend.dev>";

  if (!apiKey) {
    console.warn("[stripe-webhook] RESEND_API_KEY manquant, email non envoyé.");
    return;
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to,
      subject,
      html,
    }),
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Resend email failed: ${details}`);
  }
}

function baseEmailLayout(content: string) {
  return `
    <div style="margin:0;padding:0;background:#050505;font-family:Arial,Helvetica,sans-serif;color:#111;">
      <div style="max-width:680px;margin:0 auto;padding:36px 18px;">
        <div style="text-align:center;margin-bottom:24px;color:#fff;">
          <div style="font-size:24px;font-weight:900;letter-spacing:0.18em;">FAST CASH</div>
          <div style="margin-top:6px;color:#d4af37;font-size:12px;font-weight:800;letter-spacing:0.28em;text-transform:uppercase;">Genève</div>
        </div>
        <div style="background:#ffffff;border:1px solid rgba(212,175,55,.35);border-radius:22px;overflow:hidden;">
          ${content}
        </div>
        <p style="margin:22px 0 0;color:rgba(255,255,255,.58);font-size:12px;line-height:1.6;text-align:center;">
          FAST CASH Genève — Achat, vente et reprise de produits premium.
        </p>
      </div>
    </div>
  `;
}

function orderLinesHtml(lines: OrderLine[], currency: string) {
  return lines
    .map(
      (line) => `
        <tr>
          <td style="padding:14px 0;border-bottom:1px solid #eee;">
            <strong style="display:block;font-size:14px;line-height:1.35;color:#111;">${escapeHtml(line.name)}</strong>
            <span style="display:block;margin-top:4px;color:#777;font-size:12px;">Quantité : ${line.quantity}</span>
          </td>
          <td style="padding:14px 0;border-bottom:1px solid #eee;text-align:right;font-weight:900;color:#111;white-space:nowrap;">
            ${formatMoney(line.amountTotal, currency)}
          </td>
        </tr>
      `,
    )
    .join("");
}

function clientEmailHtml({
  reference,
  lines,
  total,
  currency,
}: {
  reference: string;
  lines: OrderLine[];
  total: number;
  currency: string;
}) {
  return baseEmailLayout(`
    <div style="padding:34px;">
      <p style="margin:0 0 8px;color:#b88a22;font-size:12px;font-weight:900;letter-spacing:.16em;text-transform:uppercase;">Commande confirmée</p>
      <h1 style="margin:0;color:#111;font-size:30px;line-height:1.05;letter-spacing:-.8px;">Merci pour votre commande</h1>
      <p style="margin:16px 0 0;color:#555;font-size:15px;line-height:1.7;">
        Votre paiement a bien été pris en compte. L'équipe FAST CASH Genève va préparer votre commande et revenir vers vous rapidement.
      </p>

      <div style="margin:24px 0;padding:16px 18px;background:#f7f4ee;border:1px solid rgba(212,175,55,.28);border-radius:14px;">
        <span style="display:block;color:#777;font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:.08em;">Référence</span>
        <strong style="display:block;margin-top:4px;color:#111;font-size:18px;">${escapeHtml(reference)}</strong>
      </div>

      <table style="width:100%;border-collapse:collapse;margin-top:10px;">
        <tbody>${orderLinesHtml(lines, currency)}</tbody>
      </table>

      <div style="display:flex;justify-content:space-between;align-items:center;margin-top:22px;padding-top:20px;border-top:2px solid #111;">
        <span style="font-size:14px;font-weight:900;text-transform:uppercase;letter-spacing:.08em;">Total</span>
        <strong style="font-size:24px;color:#111;">${formatMoney(total, currency)}</strong>
      </div>

      <p style="margin:24px 0 0;color:#666;font-size:14px;line-height:1.7;">
        Pour toute question, vous pouvez répondre directement à cet email.
      </p>
    </div>
  `);
}

function adminEmailHtml({
  reference,
  lines,
  total,
  currency,
  customerName,
  customerEmail,
  customerPhone,
  sessionId,
}: {
  reference: string;
  lines: OrderLine[];
  total: number;
  currency: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  sessionId: string;
}) {
  return baseEmailLayout(`
    <div style="padding:34px;">
      <p style="margin:0 0 8px;color:#b88a22;font-size:12px;font-weight:900;letter-spacing:.16em;text-transform:uppercase;">Nouvelle commande</p>
      <h1 style="margin:0;color:#111;font-size:30px;line-height:1.05;letter-spacing:-.8px;">Commande reçue</h1>

      <div style="margin:24px 0;padding:18px;background:#050505;color:#fff;border-radius:16px;">
        <p style="margin:0 0 8px;color:#d4af37;font-size:12px;font-weight:900;text-transform:uppercase;letter-spacing:.12em;">Client</p>
        <p style="margin:0 0 6px;"><strong>${escapeHtml(customerName)}</strong></p>
        <p style="margin:0 0 6px;">Email : ${escapeHtml(customerEmail)}</p>
        <p style="margin:0;">Téléphone : ${escapeHtml(customerPhone)}</p>
      </div>

      <div style="margin:0 0 18px;padding:16px 18px;background:#f7f4ee;border:1px solid rgba(212,175,55,.28);border-radius:14px;">
        <span style="display:block;color:#777;font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:.08em;">Référence commande</span>
        <strong style="display:block;margin-top:4px;color:#111;font-size:18px;">${escapeHtml(reference)}</strong>
      </div>

      <table style="width:100%;border-collapse:collapse;margin-top:10px;">
        <tbody>${orderLinesHtml(lines, currency)}</tbody>
      </table>

      <div style="display:flex;justify-content:space-between;align-items:center;margin-top:22px;padding-top:20px;border-top:2px solid #111;">
        <span style="font-size:14px;font-weight:900;text-transform:uppercase;letter-spacing:.08em;">Total</span>
        <strong style="font-size:24px;color:#111;">${formatMoney(total, currency)}</strong>
      </div>

      <p style="margin:22px 0 0;color:#777;font-size:12px;line-height:1.6;">
        Stripe session : ${escapeHtml(sessionId)}
      </p>
    </div>
  `);
}


function asProviderData(value: Prisma.JsonValue | null | undefined) {
  if (!value || Array.isArray(value) || typeof value !== "object") return {};
  return value as Record<string, unknown>;
}

async function updateStripePaymentState({
  paymentIntentId,
  status,
  event,
  patch = {},
}: {
  paymentIntentId: string;
  status: string;
  event: Stripe.Event;
  patch?: Record<string, unknown>;
}) {
  const payment = await prisma.payment.findFirst({
    where: { provider: "Stripe", reference: paymentIntentId },
  });

  if (!payment) return null;

  return prisma.payment.update({
    where: { id: payment.id },
    data: {
      status,
      providerData: {
        ...asProviderData(payment.providerData),
        ...patch,
        latestEventId: event.id,
        latestEventType: event.type,
        latestEventCreatedAt: new Date(event.created * 1000).toISOString(),
      } as Prisma.InputJsonValue,
    },
  });
}

async function handleRefundEvent(event: Stripe.Event, stripe: Stripe) {
  let charge: Stripe.Charge;

  if (event.type === "charge.refunded") {
    charge = event.data.object as Stripe.Charge;
  } else {
    const refund = event.data.object as Stripe.Refund;
    const chargeId = typeof refund.charge === "string" ? refund.charge : refund.charge?.id;
    if (!chargeId) return { processed: false, reason: "charge_missing" };
    charge = await stripe.charges.retrieve(chargeId);
  }

  const paymentIntentId =
    typeof charge.payment_intent === "string"
      ? charge.payment_intent
      : charge.payment_intent?.id;

  if (!paymentIntentId) return { processed: false, reason: "payment_intent_missing" };

  const payment = await prisma.payment.findFirst({
    where: { provider: "Stripe", reference: paymentIntentId },
    include: { order: true },
  });

  if (!payment) return { processed: false, reason: "payment_not_found" };

  const refundedAmount = charge.amount_refunded / 100;
  const fullyRefunded = charge.refunded || refundedAmount >= payment.amount - 0.005;
  const status = fullyRefunded ? "refunded" : "partially_refunded";

  await prisma.$transaction([
    prisma.payment.update({
      where: { id: payment.id },
      data: {
        status,
        refundedAmount,
        providerData: {
          ...asProviderData(payment.providerData),
          chargeId: charge.id,
          refundedAmount,
          refundStatus: status,
          latestEventId: event.id,
          latestEventType: event.type,
          latestEventCreatedAt: new Date(event.created * 1000).toISOString(),
        } as Prisma.InputJsonValue,
      },
    }),
    ...(fullyRefunded && payment.order.status !== "REFUNDED"
      ? [prisma.order.update({ where: { id: payment.orderId }, data: { status: "REFUNDED" } })]
      : []),
  ]);

  revalidateOrderBackOffice(payment.orderId);

  return { processed: true, fullyRefunded, refundedAmount };
}

async function handleDisputeEvent(event: Stripe.Event) {
  const dispute = event.data.object as Stripe.Dispute;
  const chargeId = typeof dispute.charge === "string" ? dispute.charge : dispute.charge?.id;
  if (!chargeId) return { processed: false, reason: "charge_missing" };

  const stripe = getStripeClient();
  const charge = await stripe.charges.retrieve(chargeId);
  const paymentIntentId =
    typeof charge.payment_intent === "string"
      ? charge.payment_intent
      : charge.payment_intent?.id;

  if (!paymentIntentId) return { processed: false, reason: "payment_intent_missing" };

  const paymentStatus = event.type === "charge.dispute.closed"
    ? `dispute_${dispute.status}`
    : "disputed";

  const updated = await updateStripePaymentState({
    paymentIntentId,
    status: paymentStatus,
    event,
    patch: {
      disputeId: dispute.id,
      disputeStatus: dispute.status,
      disputeAmount: dispute.amount / 100,
      disputeReason: dispute.reason,
    },
  });

  return { processed: Boolean(updated) };
}

export async function POST(req: Request) {
  let stripe: Stripe;
  let webhookSecret: string;

  try {
    stripe = getStripeClient();
    webhookSecret = getStripeConfig().webhookSecret;
  } catch (error) {
    console.error("[stripe-webhook-config]", error);
    return NextResponse.json(
      { error: "Configuration Stripe webhook manquante ou invalide." },
      { status: 503 },
    );
  }

  const signature = req.headers.get("stripe-signature");
  const rawBody = await req.text();

  if (!signature) {
    return NextResponse.json({ error: "Signature Stripe manquante." }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Signature invalide.";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const supportedEvents = new Set([
    "checkout.session.completed",
    "checkout.session.async_payment_succeeded",
    "checkout.session.async_payment_failed",
    "checkout.session.expired",
    "payment_intent.payment_failed",
    "charge.refunded",
    "refund.created",
    "refund.updated",
    "charge.dispute.created",
    "charge.dispute.closed",
  ]);

  if (!supportedEvents.has(event.type)) {
    return NextResponse.json({ received: true, ignored: true });
  }

  try {
    if (["charge.refunded", "refund.created", "refund.updated"].includes(event.type)) {
      const result = await handleRefundEvent(event, stripe);
      return NextResponse.json({ received: true, refund: result });
    }

    if (["charge.dispute.created", "charge.dispute.closed"].includes(event.type)) {
      const result = await handleDisputeEvent(event);
      return NextResponse.json({ received: true, dispute: result });
    }

    if (event.type === "payment_intent.payment_failed") {
      const intent = event.data.object as Stripe.PaymentIntent;
      const updated = await updateStripePaymentState({
        paymentIntentId: intent.id,
        status: "failed",
        event,
        patch: {
          failureCode: intent.last_payment_error?.code || null,
          failureMessage: intent.last_payment_error?.message || null,
        },
      });
      return NextResponse.json({ received: true, failed: true, matched: Boolean(updated) });
    }

    const session = event.data.object as Stripe.Checkout.Session;

    if (["checkout.session.async_payment_failed", "checkout.session.expired"].includes(event.type)) {
      const paymentIntentId = typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id;
      const updated = paymentIntentId
        ? await updateStripePaymentState({
            paymentIntentId,
            status: event.type === "checkout.session.expired" ? "expired" : "failed",
            event,
            patch: { checkoutSessionId: session.id },
          })
        : null;
      return NextResponse.json({ received: true, matched: Boolean(updated) });
    }

    if (session.payment_status !== "paid") {
      return NextResponse.json({ received: true, pending: true });
    }

    const settings = await getShopSettings();
    const currency = normalizeCurrency(session.metadata?.currency || session.currency || settings.defaultCurrency) as Currency;
    const reference = session.metadata?.order_reference || buildOrderReference(settings);
    const amountTotal = (session.amount_total || 0) / 100;
    const customerName = session.customer_details?.name || "Client FAST CASH";
    const customerEmail = session.customer_details?.email || "";
    const customerPhone = session.customer_details?.phone || "Non renseigné";

    const stripeLines = await stripe.checkout.sessions.listLineItems(session.id, {
      limit: 100,
    });

    const fallbackItems = await resolveMetadataItems(session.metadata?.items);
    const lines: OrderLine[] = stripeLines.data.length
      ? stripeLines.data.map((line) => ({
          name: line.description || "Produit FAST CASH",
          quantity: line.quantity || 1,
          amountTotal: (line.amount_total || 0) / 100,
        }))
      : fallbackItems.map(({ product, quantity }) => ({
          name: product.name,
          quantity,
          amountTotal: convertFromCHF(product.price, currency) * quantity,
        }));

    const persistence = await persistStripeOrder({
      session,
      reference,
      customerName,
      customerEmail,
      customerPhone,
      currency,
      total: amountTotal,
      stripeLines,
      settings,
      event,
    });

    if (!persistence.created) {
      return NextResponse.json({ received: true, duplicate: true });
    }

    revalidateOrderBackOffice(persistence.order.id);

    const offerTokens = String(session.metadata?.offer_tokens || "").split(",").filter(Boolean);
    if (offerTokens.length) {
      await prisma.productOffer.updateMany({
        where: { purchaseToken: { in: offerTokens }, usedAt: null },
        data: { status: "PURCHASED", usedAt: new Date() },
      });
    }

    const adminEmail =
      settings.orderEmail ||
      process.env.ORDER_TO_EMAIL ||
      process.env.CONTACT_TO_EMAIL ||
      process.env.NEXT_PUBLIC_CONTACT_EMAIL;

    const emailJobs: Promise<unknown>[] = [];

    if (customerEmail) {
      emailJobs.push(
        sendTransactionalEmail({
          to: customerEmail,
          subject: `Votre commande FAST CASH Genève ${reference}`,
          html: customerOrderConfirmationEmail({ reference, lines, total: amountTotal, currency }),
        }),
      );
    }

    if (adminEmail) {
      emailJobs.push(
        sendTransactionalEmail({
          to: adminEmail,
          subject: `Nouvelle commande FAST CASH ${reference}`,
          html: adminNewOrderEmail({
            reference,
            lines,
            total: amountTotal,
            currency,
            customerName,
            customerEmail: customerEmail || "Non renseigné",
            customerPhone,
            sessionId: session.id,
          }),
        }),
      );
    } else {
      console.warn("[stripe-webhook] Email administrateur manquant.");
    }

    if (emailJobs.length) {
      const emailResults = await Promise.allSettled(emailJobs);
      emailResults.forEach((result, index) => {
        if (result.status === "rejected") {
          console.error(
            `[stripe-webhook] Email transactionnel ${index + 1} non envoyé, commande ${reference} conservée :`,
            result.reason,
          );
        }
      });
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("[stripe-webhook]", error);

    return NextResponse.json(
      { error: "Impossible de traiter la commande Stripe." },
      { status: 500 },
    );
  }
}
