import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/session";
import { discoverGoogleBusinessLocation, exchangeGoogleBusinessCode, GOOGLE_BUSINESS_OAUTH_STATE_COOKIE, saveGoogleBusinessConnection } from "@/lib/google-business-oauth";

export async function GET(request: Request) {
  const url = new URL(request.url);
  if (!(await getAdminSession())) return NextResponse.redirect(new URL("/pilotage/connexion", request.url));
  const cookieStore = await cookies();
  const expectedState = cookieStore.get(GOOGLE_BUSINESS_OAUTH_STATE_COOKIE)?.value;
  const state = url.searchParams.get("state");
  const code = url.searchParams.get("code");
  const denied = url.searchParams.get("error");

  const redirect = (status: string) => {
    const response = NextResponse.redirect(new URL(`/pilotage/parametres?google=${encodeURIComponent(status)}`, request.url));
    response.cookies.delete(GOOGLE_BUSINESS_OAUTH_STATE_COOKIE);
    return response;
  };

  if (denied) return redirect("denied");
  if (!code || !state || !expectedState || state !== expectedState) return redirect("invalid-state");

  try {
    const tokens = await exchangeGoogleBusinessCode(code, url.origin);
    if (!tokens.refresh_token) return redirect("missing-refresh-token");
    const discovery = await discoverGoogleBusinessLocation(tokens.access_token!);
    await saveGoogleBusinessConnection({
      refreshToken: tokens.refresh_token,
      accountId: discovery.selected.accountId,
      locationId: discovery.selected.locationId,
      locationName: discovery.selected.title,
    });
    return redirect("connected");
  } catch (error) {
    console.error("FAST CASH Google OAuth callback", error);
    return redirect("api-error");
  }
}
