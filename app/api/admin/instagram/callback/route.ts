import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/session";
import {
  exchangeInstagramCode,
  exchangeInstagramLongLivedToken,
  fetchInstagramProfile,
  saveInstagramConnection,
  verifyInstagramState,
} from "@/lib/instagram-oauth";

export async function GET(request: Request) {
  if (!(await getAdminSession())) return NextResponse.redirect(new URL("/pilotage/connexion", request.url));

  const url = new URL(request.url);
  const redirect = (status: string) => NextResponse.redirect(new URL(`/pilotage/marketing/studio?instagram=${encodeURIComponent(status)}`, request.url));
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const denied = url.searchParams.get("error") || url.searchParams.get("error_reason");

  if (denied) return redirect("denied");
  if (!code || !verifyInstagramState(state)) return redirect("invalid-state");

  try {
    const short = await exchangeInstagramCode(code, url.origin);
    const long = await exchangeInstagramLongLivedToken(short.accessToken);
    const profile = await fetchInstagramProfile(long.accessToken, short.userId);
    await saveInstagramConnection({
      accessToken: long.accessToken,
      userId: profile.userId || short.userId,
      username: profile.username,
      displayName: profile.displayName,
      profilePictureUrl: profile.profilePictureUrl,
      expiresIn: long.expiresIn,
    });
    return redirect("connected");
  } catch (error) {
    console.error("FAST CASH Instagram OAuth callback", error);
    return redirect("api-error");
  }
}
