import { requireAdminSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { defaultLaunchCampaign } from "@/lib/marketing-emails";
import MarketingCampaigns from "./MarketingCampaigns";

export const dynamic = "force-dynamic";

export default async function MarketingPage() {
  await requireAdminSession();
  const [subscribers, campaigns] = await Promise.all([
    prisma.newsletterSubscriber.findMany({ orderBy: { importedAt: "desc" }, take: 500 }),
    prisma.emailCampaign.findMany({ orderBy: { createdAt: "desc" }, take: 20, include: { _count: { select: { recipients: true } } } }),
  ]);
  return <MarketingCampaigns initialSubscribers={subscribers.map((s) => ({ id:s.id,email:s.email,firstName:s.firstName,lastName:s.lastName,subscribed:s.subscribed,source:s.source }))} initialCampaigns={campaigns.map((c)=>({id:c.id,name:c.name,subject:c.subject,status:c.status,sentAt:c.sentAt?.toISOString()||null,createdAt:c.createdAt.toISOString(),recipients:c._count.recipients}))} defaults={defaultLaunchCampaign()} />;
}
