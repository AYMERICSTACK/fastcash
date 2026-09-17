import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/session";
import { disconnectInstagram } from "@/lib/instagram-oauth";

export async function POST(request: Request) {
  if (!(await getAdminSession())) return NextResponse.json({ error: "Session administrateur requise." }, { status: 401 });
  await disconnectInstagram();
  return NextResponse.redirect(new URL("/pilotage/marketing/studio?instagram=disconnected", request.url), 303);
}
