import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  createInstagramDeletionConfirmationCode,
  disconnectInstagram,
  verifyInstagramSignedRequest,
} from "@/lib/instagram-oauth";

export const runtime = "nodejs";

function siteUrl(request: Request) {
  return (process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin).replace(/\/$/, "");
}

export async function POST(request: Request) {
  const form = await request.formData().catch(() => null);
  const signedRequest = form?.get("signed_request");
  const payload = verifyInstagramSignedRequest(typeof signedRequest === "string" ? signedRequest : null);

  if (!payload) {
    return NextResponse.json({ error: "Requête Instagram invalide." }, { status: 400 });
  }

  // Les seules données Instagram persistées par FAST CASH sont le jeton OAuth
  // et les métadonnées du profil connecté. Elles sont supprimées immédiatement.
  await disconnectInstagram();

  const confirmationCode = createInstagramDeletionConfirmationCode();
  await prisma.setting.upsert({
    where: { key: `instagram.deletion.${confirmationCode}` },
    update: { value: new Date().toISOString(), label: "Suppression Instagram terminée", group: "Instagram" },
    create: {
      key: `instagram.deletion.${confirmationCode}`,
      value: new Date().toISOString(),
      label: "Suppression Instagram terminée",
      group: "Instagram",
    },
  });

  return NextResponse.json({
    url: `${siteUrl(request)}/api/instagram/data-deletion/status?code=${encodeURIComponent(confirmationCode)}`,
    confirmation_code: confirmationCode,
  });
}
