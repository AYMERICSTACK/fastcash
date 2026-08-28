import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminSession } from "@/lib/session";

export async function POST(request: Request) {
  if (!(await getAdminSession())) return NextResponse.json({ error: "Session administrateur requise." }, { status: 401 });
  const body = await request.json().catch(() => null);
  const subject = String(body?.subject || "").trim();
  const title = String(body?.title || "").trim();
  const text = String(body?.body || "").trim();
  if (!subject || !title || !text) return NextResponse.json({ error: "Objet, titre et contenu requis." }, { status: 400 });

  const campaign = await prisma.emailCampaign.create({ data: {
    name: String(body?.name || title).trim().slice(0, 160), subject: subject.slice(0, 200), preheader: String(body?.preheader || "").trim() || null,
    eyebrow: String(body?.eyebrow || "").trim() || null, title: title.slice(0, 220), intro: String(body?.intro || "").trim() || null,
    body: text.slice(0, 12000), ctaLabel: String(body?.ctaLabel || "").trim() || null, ctaUrl: String(body?.ctaUrl || "").trim() || null,
  }});
  return NextResponse.json({ ok: true, campaign });
}
