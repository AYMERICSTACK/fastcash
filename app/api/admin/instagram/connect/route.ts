import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/session";
import { createInstagramAuthUrl, createInstagramState } from "@/lib/instagram-oauth";

export async function GET(request: Request) {
  if (!(await getAdminSession())) return NextResponse.redirect(new URL("/pilotage/connexion", request.url));
  try {
    const origin = new URL(request.url).origin;
    return NextResponse.redirect(createInstagramAuthUrl(createInstagramState(), origin));
  } catch (error) {
    console.error("FAST CASH Instagram OAuth connect", error);
    return NextResponse.redirect(new URL("/pilotage/marketing/studio?instagram=configuration-error", request.url));
  }
}
