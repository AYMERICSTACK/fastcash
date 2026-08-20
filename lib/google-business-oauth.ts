import crypto from "node:crypto";
import { prisma } from "@/lib/prisma";

export const GOOGLE_BUSINESS_SCOPE = "https://www.googleapis.com/auth/business.manage";
export const GOOGLE_BUSINESS_OAUTH_STATE_COOKIE = "fc_google_business_oauth_state";

const KEYS = {
  refreshToken: "google.business.refreshToken",
  accountId: "google.business.accountId",
  locationId: "google.business.locationId",
  locationName: "google.business.locationName",
  connectedAt: "google.business.connectedAt",
} as const;

function getEncryptionKey() {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) throw new Error("SESSION_SECRET manquant ou trop court.");
  return crypto.createHash("sha256").update(secret).digest();
}

function encrypt(value: string) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", getEncryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `v1.${iv.toString("base64url")}.${tag.toString("base64url")}.${encrypted.toString("base64url")}`;
}

function decrypt(value: string) {
  if (!value.startsWith("v1.")) return value;
  const [, ivRaw, tagRaw, dataRaw] = value.split(".");
  const decipher = crypto.createDecipheriv("aes-256-gcm", getEncryptionKey(), Buffer.from(ivRaw, "base64url"));
  decipher.setAuthTag(Buffer.from(tagRaw, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(dataRaw, "base64url")), decipher.final()]).toString("utf8");
}

export function getGoogleBusinessRedirectUri(requestOrigin?: string) {
  if (process.env.GOOGLE_BUSINESS_REDIRECT_URI) return process.env.GOOGLE_BUSINESS_REDIRECT_URI;
  const base = process.env.NEXT_PUBLIC_SITE_URL || requestOrigin;
  if (!base) throw new Error("NEXT_PUBLIC_SITE_URL ou GOOGLE_BUSINESS_REDIRECT_URI manquant.");
  return `${base.replace(/\/$/, "")}/api/admin/google-business/callback`;
}

export function createGoogleBusinessAuthUrl(state: string, requestOrigin?: string) {
  const clientId = process.env.GOOGLE_BUSINESS_CLIENT_ID;
  if (!clientId) throw new Error("GOOGLE_BUSINESS_CLIENT_ID manquant.");

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: getGoogleBusinessRedirectUri(requestOrigin),
    response_type: "code",
    scope: GOOGLE_BUSINESS_SCOPE,
    access_type: "offline",
    prompt: "consent",
    state,
    include_granted_scopes: "true",
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

export async function exchangeGoogleBusinessCode(code: string, requestOrigin?: string) {
  const clientId = process.env.GOOGLE_BUSINESS_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_BUSINESS_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error("Identifiants OAuth Google Business incomplets.");

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: getGoogleBusinessRedirectUri(requestOrigin),
      grant_type: "authorization_code",
    }),
    cache: "no-store",
  });
  const payload = (await response.json().catch(() => ({}))) as { access_token?: string; refresh_token?: string; error?: string };
  if (!response.ok || !payload.access_token) throw new Error(payload.error || `Échange OAuth impossible (${response.status}).`);
  return payload;
}

type GoogleAccount = { name?: string; accountName?: string; type?: string };
type GoogleLocation = { name?: string; title?: string; metadata?: { mapsUri?: string; newReviewUri?: string } };

async function googleJson<T>(url: string, accessToken: string): Promise<T> {
  const response = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` }, cache: "no-store" });
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`Google Business API ${response.status}${detail ? ` — ${detail.slice(0, 300)}` : ""}`);
  }
  return response.json() as Promise<T>;
}

export async function discoverGoogleBusinessLocation(accessToken: string) {
  const accountPayload = await googleJson<{ accounts?: GoogleAccount[] }>(
    "https://mybusinessaccountmanagement.googleapis.com/v1/accounts?pageSize=20",
    accessToken,
  );

  const candidates: Array<{ accountId: string; locationId: string; title: string }> = [];
  for (const account of accountPayload.accounts ?? []) {
    const accountId = account.name?.replace(/^accounts\//, "");
    if (!accountId) continue;
    try {
      const params = new URLSearchParams({ readMask: "name,title,metadata", pageSize: "100" });
      const locations = await googleJson<{ locations?: GoogleLocation[] }>(
        `https://mybusinessbusinessinformation.googleapis.com/v1/accounts/${encodeURIComponent(accountId)}/locations?${params}`,
        accessToken,
      );
      for (const location of locations.locations ?? []) {
        const locationId = location.name?.replace(/^locations\//, "");
        if (locationId) candidates.push({ accountId, locationId, title: location.title || "Établissement Google" });
      }
    } catch (error) {
      console.warn("FAST CASH Google Business: compte sans établissement lisible", accountId, error);
    }
  }

  if (!candidates.length) throw new Error("Aucun établissement Google Business accessible avec ce compte.");
  const score = (title: string) => {
    const value = title.toLowerCase();
    return (value.includes("fast cash") ? 10 : 0) + (value.includes("genève") || value.includes("geneve") || value.includes("geneva") ? 3 : 0);
  };
  candidates.sort((a, b) => score(b.title) - score(a.title));
  return { selected: candidates[0], candidates };
}

export async function saveGoogleBusinessConnection(input: {
  refreshToken: string;
  accountId: string;
  locationId: string;
  locationName: string;
}) {
  await prisma.$transaction([
    prisma.setting.upsert({ where: { key: KEYS.refreshToken }, update: { value: encrypt(input.refreshToken), label: "Jeton OAuth", group: "Google Business" }, create: { key: KEYS.refreshToken, value: encrypt(input.refreshToken), label: "Jeton OAuth", group: "Google Business" } }),
    prisma.setting.upsert({ where: { key: KEYS.accountId }, update: { value: input.accountId, label: "Compte Google", group: "Google Business" }, create: { key: KEYS.accountId, value: input.accountId, label: "Compte Google", group: "Google Business" } }),
    prisma.setting.upsert({ where: { key: KEYS.locationId }, update: { value: input.locationId, label: "Établissement Google", group: "Google Business" }, create: { key: KEYS.locationId, value: input.locationId, label: "Établissement Google", group: "Google Business" } }),
    prisma.setting.upsert({ where: { key: KEYS.locationName }, update: { value: input.locationName, label: "Nom établissement", group: "Google Business" }, create: { key: KEYS.locationName, value: input.locationName, label: "Nom établissement", group: "Google Business" } }),
    prisma.setting.upsert({ where: { key: KEYS.connectedAt }, update: { value: new Date().toISOString(), label: "Connexion Google", group: "Google Business" }, create: { key: KEYS.connectedAt, value: new Date().toISOString(), label: "Connexion Google", group: "Google Business" } }),
  ]);
}

export async function getGoogleBusinessConnection() {
  const rows = await prisma.setting.findMany({ where: { key: { in: Object.values(KEYS) } } });
  const values = new Map(rows.map((row) => [row.key, row.value]));
  const encryptedRefreshToken = values.get(KEYS.refreshToken);
  return {
    connected: Boolean(encryptedRefreshToken && values.get(KEYS.accountId) && values.get(KEYS.locationId)),
    refreshToken: encryptedRefreshToken ? decrypt(encryptedRefreshToken) : null,
    accountId: values.get(KEYS.accountId) || null,
    locationId: values.get(KEYS.locationId) || null,
    locationName: values.get(KEYS.locationName) || null,
    connectedAt: values.get(KEYS.connectedAt) || null,
  };
}

export async function disconnectGoogleBusiness() {
  await prisma.setting.deleteMany({ where: { key: { in: Object.values(KEYS) } } });
}
