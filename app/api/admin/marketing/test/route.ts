import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/session";
import { marketingCampaignHtml, sendMarketingEmail } from "@/lib/marketing-emails";

export async function POST(request: Request) {
  if (!(await getAdminSession())) return NextResponse.json({ error: "Session administrateur requise." }, { status: 401 });
  const body = await request.json().catch(() => null);
  const to = String(body?.to || "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) return NextResponse.json({ error: "Email de test invalide." }, { status: 400 });
  const origin = (process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin).replace(/\/$/, "");
  const html = marketingCampaignHtml({ firstName: "Client", subject: String(body.subject || "FAST CASH fait peau neuve ✨"), preheader: String(body.preheader || ""), eyebrow: String(body.eyebrow || ""), title: String(body.title || "FAST CASH fait peau neuve"), intro: String(body.intro || ""), body: String(body.body || ""), ctaLabel: String(body.ctaLabel || ""), ctaUrl: String(body.ctaUrl || origin), unsubscribeUrl: `${origin}/desinscription?preview=1` });
  try { await sendMarketingEmail({ to, subject: String(body.subject || "FAST CASH fait peau neuve ✨"), html }); return NextResponse.json({ ok: true }); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Échec de l’envoi." }, { status: 500 }); }
}
