import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/session";
import { createGoogleBusinessAuthUrl, GOOGLE_BUSINESS_OAUTH_STATE_COOKIE } from "@/lib/google-business-oauth";

export async function GET(request: Request) {
  if (!(await getAdminSession())) return NextResponse.redirect(new URL("/pilotage/connexion", request.url));
  try {
    const state = crypto.randomBytes(32).toString("base64url");
    const response = NextResponse.redirect(createGoogleBusinessAuthUrl(state, new URL(request.url).origin));
    response.cookies.set(GOOGLE_BUSINESS_OAUTH_STATE_COOKIE, state, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 600 });
    return response;
  } catch (error) {
    console.error("FAST CASH Google OAuth connect", error);
    return NextResponse.redirect(new URL("/pilotage/parametres?google=configuration-error", request.url));
  }
}
