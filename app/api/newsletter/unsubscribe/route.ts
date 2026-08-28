import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const token = String(body?.token || "").trim();
  if (!token) return NextResponse.json({ error: "Lien invalide." }, { status: 400 });
  const subscriber = await prisma.newsletterSubscriber.findUnique({ where: { unsubscribeToken: token } });
  if (!subscriber) return NextResponse.json({ error: "Lien invalide ou expiré." }, { status: 404 });
  if (subscriber.subscribed) await prisma.newsletterSubscriber.update({ where: { id: subscriber.id }, data: { subscribed: false, unsubscribedAt: new Date() } });
  return NextResponse.json({ ok: true });
}
