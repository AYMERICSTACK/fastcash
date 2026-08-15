import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
export async function GET(request: Request) {
  const reference = new URL(request.url).searchParams.get("order")?.trim();
  if (!reference) return NextResponse.json({ error: "Référence manquante." }, { status: 400 });
  const order = await prisma.order.findUnique({ where: { orderNumber: reference }, include: { payment: true } });
  if (!order || order.payment?.provider !== "HeyLight") return NextResponse.json({ error: "Commande introuvable." }, { status: 404 });
  return NextResponse.json({ reference, status: order.payment.status, processed: order.payment.status === "success", total: order.total, currency: order.currency });
}
