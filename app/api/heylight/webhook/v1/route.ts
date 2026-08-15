import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyHeyLightSignature, type HeyLightStatus } from "@/lib/heylight";
import { buildInvoiceNumber, getShopSettings } from "@/lib/settings";
import { adminNewOrderEmail, customerOrderConfirmationEmail, sendTransactionalEmail } from "@/lib/transactional-emails";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const rawBody = await request.text();
  if (!verifyHeyLightSignature(rawBody, request.headers.get("x-signature-sha256"))) return NextResponse.json({ error: "Invalid signature" }, { status: 401 });

  let payload: { token?: string; status?: HeyLightStatus };
  try { payload = JSON.parse(rawBody); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
  if (!payload.token || !payload.status) return NextResponse.json({ error: "Invalid payload" }, { status: 400 });

  const payment = await prisma.payment.findUnique({ where: { webhookToken: payload.token }, include: { order: { include: { customer: true, items: true, invoice: true } } } });
  if (!payment || payment.provider !== "HeyLight") return NextResponse.json({ error: "Unknown payment" }, { status: 404 });
  if (payment.status === payload.status) return NextResponse.json({ received: true, duplicate: true });

  if (payload.status === "success") {
    const settings = await getShopSettings();
    const result = await prisma.$transaction(async (tx) => {
      const fresh = await tx.payment.findUnique({ where: { id: payment.id }, include: { order: { include: { customer: true, items: true, invoice: true } } } });
      if (!fresh || fresh.status === "success") return { changed: false, order: fresh?.order };
      for (const item of fresh.order.items) if (item.productId) {
        const updated = await tx.product.updateMany({ where: { id: item.productId, stock: { gte: item.quantity } }, data: { stock: { decrement: item.quantity } } });
        if (updated.count !== 1) throw new Error(`STOCK_CONFLICT:${item.productId}`);
      }
      await tx.payment.update({ where: { id: fresh.id }, data: { status: "success", confirmedAt: new Date() } });
      const order = await tx.order.update({ where: { id: fresh.orderId }, data: { status: "PREPARING" }, include: { customer: true, items: true, invoice: true } });
      if (!order.invoice) await tx.invoice.create({ data: { orderId: order.id, number: buildInvoiceNumber(order.orderNumber, settings), amount: order.total } });
      return { changed: true, order };
    });

    if (result.changed && result.order) {
      const lines = result.order.items.map((item) => ({ name: item.name, quantity: item.quantity, amountTotal: item.price * item.quantity }));
      await Promise.allSettled([
        sendTransactionalEmail({ to: result.order.customer.email, subject: `Commande ${result.order.orderNumber} confirmée`, html: customerOrderConfirmationEmail({ reference: result.order.orderNumber, lines, total: result.order.total, currency: result.order.currency }) }),
        sendTransactionalEmail({ to: settings.orderEmail, subject: `Nouvelle commande HeyLight ${result.order.orderNumber}`, html: adminNewOrderEmail({ reference: result.order.orderNumber, lines, total: result.order.total, currency: result.order.currency, customerName: [result.order.customer.firstName, result.order.customer.lastName].filter(Boolean).join(" ") || "Client", customerEmail: result.order.customer.email, customerPhone: result.order.customer.phone || "", sessionId: payment.reference || "HeyLight" }) }),
      ]);
    }
  } else {
    await prisma.$transaction([
      prisma.payment.update({ where: { id: payment.id }, data: { status: payload.status } }),
      ...(payload.status === "cancelled" ? [prisma.order.update({ where: { id: payment.orderId }, data: { status: "CANCELLED" } })] : []),
    ]);
  }
  return NextResponse.json({ received: true });
}
