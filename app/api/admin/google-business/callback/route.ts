import { NextResponse } from "next/server";
import { discoverGoogleBusinessLocation, exchangeGoogleBusinessCode, saveGoogleBusinessConnection, verifyGoogleBusinessState } from "@/lib/google-business-oauth";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const state = url.searchParams.get("state");
  const code = url.searchParams.get("code");
  const denied = url.searchParams.get("error");
  const redirect = (status: string) => NextResponse.redirect(new URL(`/pilotage/parametres?google=${encodeURIComponent(status)}`, request.url));

  if (denied) return redirect("denied");
  if (!code || !verifyGoogleBusinessState(state)) return redirect("invalid-state");

  try {
    const tokens = await exchangeGoogleBusinessCode(code, url.origin);
    if (!tokens.refresh_token) return redirect("missing-refresh-token");
    const discovery = await discoverGoogleBusinessLocation(tokens.access_token!);
    await saveGoogleBusinessConnection({ refreshToken: tokens.refresh_token, accountId: discovery.selected.accountId, locationId: discovery.selected.locationId, locationName: discovery.selected.title });
    return redirect("connected");
  } catch (error) {
    console.error("FAST CASH Google OAuth callback", error);
    return redirect("api-error");
  }
}
