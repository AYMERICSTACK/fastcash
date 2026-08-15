import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, getRequestIp } from "@/lib/rate-limit";
import { getStripeClient } from "@/lib/stripe";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const rate = checkRateLimit(`checkout-status:${getRequestIp(req)}`, 30, 10 * 60 * 1000);
  if (!rate.allowed) {
    return NextResponse.json({ error: "Trop de vérifications. Réessayez dans quelques minutes." }, { status: 429 });
  }

  const sessionId = new URL(req.url).searchParams.get("session_id")?.trim();
  if (!sessionId || !sessionId.startsWith("cs_")) {
    return NextResponse.json({ error: "Session de paiement invalide." }, { status: 400 });
  }

  try {
    const stripe = getStripeClient();
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    const reference = session.metadata?.order_reference || null;
    const paid = session.payment_status === "paid";
    const order = reference
      ? await prisma.order.findUnique({
          where: { orderNumber: reference },
          select: { orderNumber: true, status: true, total: true, currency: true },
        })
      : null;

    return NextResponse.json({
      paid,
      processed: Boolean(order),
      reference: order?.orderNumber || reference,
      status: order?.status || null,
      total: order?.total ?? (session.amount_total || 0) / 100,
      currency: order?.currency || session.currency?.toUpperCase() || "CHF",
    });
  } catch (error) {
    console.error("[checkout-status]", error);
    return NextResponse.json({ error: "Impossible de vérifier le paiement." }, { status: 404 });
  }
}
