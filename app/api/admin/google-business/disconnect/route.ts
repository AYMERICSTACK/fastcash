import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/session";
import { disconnectGoogleBusiness } from "@/lib/google-business-oauth";

export async function POST(request: Request) {
  if (!(await getAdminSession())) return NextResponse.json({ error: "Session administrateur requise." }, { status: 401 });
  await disconnectGoogleBusiness();
  return NextResponse.redirect(new URL("/pilotage/parametres?google=disconnected", request.url), 303);
}
