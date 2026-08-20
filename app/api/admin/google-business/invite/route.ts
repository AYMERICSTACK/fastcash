import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/session";
import { createGoogleBusinessInviteToken } from "@/lib/google-business-oauth";

export async function GET(request: Request) {
  if (!(await getAdminSession())) return NextResponse.redirect(new URL("/pilotage/connexion", request.url));
  const origin = new URL(request.url).origin;
  const token = createGoogleBusinessInviteToken();
  const invite = `${origin}/api/admin/google-business/authorize?token=${encodeURIComponent(token)}`;
  const destination = new URL("/pilotage/parametres", request.url);
  destination.searchParams.set("google", "invite");
  destination.searchParams.set("googleInvite", invite);
  return NextResponse.redirect(destination);
}
