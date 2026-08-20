import { NextResponse } from "next/server";
import { createGoogleBusinessAuthUrl, createGoogleBusinessState, verifyGoogleBusinessInviteToken } from "@/lib/google-business-oauth";

export async function GET(request: Request) {
  const url = new URL(request.url);
  if (!verifyGoogleBusinessInviteToken(url.searchParams.get("token"))) {
    return NextResponse.redirect(new URL("/pilotage/parametres?google=expired-link", request.url));
  }
  try {
    return NextResponse.redirect(createGoogleBusinessAuthUrl(createGoogleBusinessState(), url.origin));
  } catch (error) {
    console.error("FAST CASH Google OAuth authorize", error);
    return NextResponse.redirect(new URL("/pilotage/parametres?google=configuration-error", request.url));
  }
}
