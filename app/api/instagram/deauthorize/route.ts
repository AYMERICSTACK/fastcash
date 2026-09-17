import { NextResponse } from "next/server";
import { disconnectInstagram, verifyInstagramSignedRequest } from "@/lib/instagram-oauth";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const form = await request.formData().catch(() => null);
  const signedRequest = form?.get("signed_request");
  const payload = verifyInstagramSignedRequest(typeof signedRequest === "string" ? signedRequest : null);

  if (!payload) {
    return NextResponse.json({ error: "Requête Instagram invalide." }, { status: 400 });
  }

  // FAST CASH ne conserve qu'une connexion Instagram Business active à la fois.
  // Si Meta révoque cette autorisation, le jeton et les métadonnées locales sont supprimés.
  await disconnectInstagram();

  return NextResponse.json({ success: true });
}
