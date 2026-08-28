import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminSession } from "@/lib/session";
import { marketingCampaignHtml, sendMarketingEmail } from "@/lib/marketing-emails";

function rootUrl(request: Request) { return (process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin).replace(/\/$/, ""); }

export async function POST(request: Request) {
  if (!(await getAdminSession())) return NextResponse.json({ error: "Session administrateur requise." }, { status: 401 });
  const body = await request.json().catch(() => null);
  const campaignId = String(body?.campaignId || "");
  if (!campaignId) return NextResponse.json({ error: "Campagne requise." }, { status: 400 });

  const campaign = await prisma.emailCampaign.findUnique({ where: { id: campaignId } });
  if (!campaign) return NextResponse.json({ error: "Campagne introuvable." }, { status: 404 });

  const active = await prisma.newsletterSubscriber.findMany({ where: { subscribed: true }, select: { id: true } });
  if (!active.length) return NextResponse.json({ error: "Aucun abonné actif." }, { status: 400 });
  await prisma.emailCampaignRecipient.createMany({ data: active.map((s) => ({ campaignId, subscriberId: s.id })), skipDuplicates: true });

  const recipients = await prisma.emailCampaignRecipient.findMany({
    where: { campaignId, status: "PENDING", subscriber: { subscribed: true } }, include: { subscriber: true }, take: 6, orderBy: { createdAt: "asc" },
  });
  let sent = 0; let failed = 0;
  for (const [index, recipient] of recipients.entries()) {
    if (index > 0) await new Promise((resolve) => setTimeout(resolve, 600));
    const unsub = `${rootUrl(request)}/desinscription?token=${encodeURIComponent(recipient.subscriber.unsubscribeToken)}`;
    const html = marketingCampaignHtml({ firstName: recipient.subscriber.firstName, subject: campaign.subject, preheader: campaign.preheader, eyebrow: campaign.eyebrow, title: campaign.title, intro: campaign.intro, body: campaign.body, ctaLabel: campaign.ctaLabel, ctaUrl: campaign.ctaUrl, unsubscribeUrl: unsub });
    try {
      const providerId = await sendMarketingEmail({ to: recipient.subscriber.email, subject: campaign.subject, html });
      await prisma.emailCampaignRecipient.update({ where: { id: recipient.id }, data: { status: "SENT", providerId, sentAt: new Date(), error: null } }); sent++;
    } catch (error) {
      await prisma.emailCampaignRecipient.update({ where: { id: recipient.id }, data: { status: "FAILED", error: error instanceof Error ? error.message.slice(0, 1000) : "Erreur inconnue" } }); failed++;
    }
  }
  const pending = await prisma.emailCampaignRecipient.count({ where: { campaignId, status: "PENDING", subscriber: { subscribed: true } } });
  const counts = await prisma.emailCampaignRecipient.groupBy({ by: ["status"], where: { campaignId }, _count: { _all: true } });
  if (pending === 0) {
    const failedTotal = await prisma.emailCampaignRecipient.count({ where: { campaignId, status: "FAILED" } });
    await prisma.emailCampaign.update({ where: { id: campaignId }, data: { status: failedTotal > 0 ? "COMPLETED_WITH_ERRORS" : "SENT", sentAt: new Date() } });
  } else {
    await prisma.emailCampaign.update({ where: { id: campaignId }, data: { status: "SENDING" } });
  }
  return NextResponse.json({ ok: true, sent, failed, pending, counts });
}
