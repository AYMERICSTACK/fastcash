import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/session";
import { createGoogleBusinessAuthUrl, createGoogleBusinessState } from "@/lib/google-business-oauth";

export async function GET(request: Request) {
  if (!(await getAdminSession())) return NextResponse.redirect(new URL("/pilotage/connexion", request.url));
  try {
    return NextResponse.redirect(createGoogleBusinessAuthUrl(createGoogleBusinessState(), new URL(request.url).origin));
  } catch (error) {
    console.error("FAST CASH Google OAuth connect", error);
    return NextResponse.redirect(new URL("/pilotage/parametres?google=configuration-error", request.url));
  }
}
