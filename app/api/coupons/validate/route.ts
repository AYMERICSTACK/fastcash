import { NextResponse } from "next/server";
import { resolveCoupon } from "@/lib/checkout-rules";
import { checkRateLimit, getRequestIp } from "@/lib/rate-limit";

export async function POST(request: Request) {
  const rate = checkRateLimit(`coupon:${getRequestIp(request)}`, 20, 15 * 60 * 1000);
  if (!rate.allowed) {
    return NextResponse.json(
      { error: "Trop de tentatives. Merci de réessayer dans quelques minutes." },
      { status: 429 },
    );
  }

  try {
    const body = await request.json();
    const subtotalCHF = Number(body.subtotalCHF);
    if (!Number.isFinite(subtotalCHF) || subtotalCHF <= 0) {
      return NextResponse.json({ error: "Montant du panier invalide." }, { status: 400 });
    }

    const coupon = await resolveCoupon(body.code, subtotalCHF);
    if (!coupon) return NextResponse.json({ error: "Merci de saisir un code promotionnel." }, { status: 400 });

    return NextResponse.json(coupon);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Code promotionnel invalide." },
      { status: 400 },
    );
  }
}
