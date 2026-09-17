import crypto from "node:crypto";
import { prisma } from "@/lib/prisma";

export const INSTAGRAM_SCOPES = [
  "instagram_business_basic",
  "instagram_business_content_publish",
] as const;

const KEYS = {
  accessToken: "instagram.business.accessToken",
  userId: "instagram.business.userId",
  username: "instagram.business.username",
  displayName: "instagram.business.displayName",
  profilePictureUrl: "instagram.business.profilePictureUrl",
  expiresAt: "instagram.business.expiresAt",
  connectedAt: "instagram.business.connectedAt",
} as const;

function signingSecret() {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) throw new Error("SESSION_SECRET manquant ou trop court.");
  return secret;
}

function signPayload(payload: string) {
  return crypto.createHmac("sha256", signingSecret()).update(payload).digest("base64url");
}

export function createInstagramState() {
  const payload = Buffer.from(JSON.stringify({
    kind: "instagram-oauth",
    exp: Math.floor(Date.now() / 1000) + 10 * 60,
    nonce: crypto.randomBytes(18).toString("base64url"),
  })).toString("base64url");
  return `${payload}.${signPayload(payload)}`;
}

export function verifyInstagramState(token: string | null) {
  if (!token) return false;
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return false;
  const expected = signPayload(payload);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return false;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as { kind?: string; exp?: number };
    return data.kind === "instagram-oauth" && typeof data.exp === "number" && data.exp >= Math.floor(Date.now() / 1000);
  } catch {
    return false;
  }
}

function getEncryptionKey() {
  return crypto.createHash("sha256").update(signingSecret()).digest();
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

export function getInstagramRedirectUri(requestOrigin?: string) {
  if (process.env.INSTAGRAM_REDIRECT_URI) return process.env.INSTAGRAM_REDIRECT_URI;
  const base = process.env.NEXT_PUBLIC_SITE_URL || requestOrigin;
  if (!base) throw new Error("NEXT_PUBLIC_SITE_URL ou INSTAGRAM_REDIRECT_URI manquant.");
  return `${base.replace(/\/$/, "")}/api/admin/instagram/callback`;
}

export function createInstagramAuthUrl(state: string, requestOrigin?: string) {
  const clientId = process.env.INSTAGRAM_APP_ID;
  if (!clientId) throw new Error("INSTAGRAM_APP_ID manquant.");

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: getInstagramRedirectUri(requestOrigin),
    response_type: "code",
    scope: INSTAGRAM_SCOPES.join(","),
    state,
    enable_fb_login: "0",
    force_authentication: "1",
  });
  return `https://www.instagram.com/oauth/authorize?${params.toString()}`;
}

type ShortTokenResponse = {
  access_token?: string;
  user_id?: number | string;
  permissions?: string;
  error_type?: string;
  code?: number;
  error_message?: string;
};

type LongTokenResponse = {
  access_token?: string;
  token_type?: string;
  expires_in?: number;
  error?: { message?: string; type?: string; code?: number };
};

export async function exchangeInstagramCode(code: string, requestOrigin?: string) {
  const clientId = process.env.INSTAGRAM_APP_ID;
  const clientSecret = process.env.INSTAGRAM_APP_SECRET;
  if (!clientId || !clientSecret) throw new Error("Identifiants Instagram OAuth incomplets.");

  const form = new FormData();
  form.set("client_id", clientId);
  form.set("client_secret", clientSecret);
  form.set("grant_type", "authorization_code");
  form.set("redirect_uri", getInstagramRedirectUri(requestOrigin));
  form.set("code", code);

  const response = await fetch("https://api.instagram.com/oauth/access_token", {
    method: "POST",
    body: form,
    cache: "no-store",
  });
  const payload = (await response.json().catch(() => ({}))) as ShortTokenResponse;
  if (!response.ok || !payload.access_token || !payload.user_id) {
    throw new Error(payload.error_message || `Échange OAuth Instagram impossible (${response.status}).`);
  }
  return { accessToken: payload.access_token, userId: String(payload.user_id) };
}

export async function exchangeInstagramLongLivedToken(shortToken: string) {
  const clientSecret = process.env.INSTAGRAM_APP_SECRET;
  if (!clientSecret) throw new Error("INSTAGRAM_APP_SECRET manquant.");
  const params = new URLSearchParams({
    grant_type: "ig_exchange_token",
    client_secret: clientSecret,
    access_token: shortToken,
  });
  const response = await fetch(`https://graph.instagram.com/access_token?${params.toString()}`, { cache: "no-store" });
  const payload = (await response.json().catch(() => ({}))) as LongTokenResponse;
  if (!response.ok || !payload.access_token) {
    throw new Error(payload.error?.message || `Conversion du token Instagram impossible (${response.status}).`);
  }
  return { accessToken: payload.access_token, expiresIn: payload.expires_in ?? 60 * 24 * 60 * 60 };
}

type InstagramProfile = {
  id?: string;
  user_id?: string;
  username?: string;
  name?: string;
  profile_picture_url?: string;
  error?: { message?: string };
};

export async function fetchInstagramProfile(accessToken: string, fallbackUserId?: string) {
  const params = new URLSearchParams({ fields: "id,user_id,username,name,profile_picture_url" });
  const response = await fetch(`https://graph.instagram.com/v26.0/me?${params.toString()}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });
  const payload = (await response.json().catch(() => ({}))) as InstagramProfile;
  if (!response.ok) throw new Error(payload.error?.message || `Lecture du profil Instagram impossible (${response.status}).`);
  return {
    userId: String(payload.user_id || payload.id || fallbackUserId || ""),
    username: payload.username || "",
    displayName: payload.name || "",
    profilePictureUrl: payload.profile_picture_url || "",
  };
}


export type InstagramSignedRequestPayload = {
  algorithm?: string;
  user_id?: string | number;
  issued_at?: number;
  [key: string]: unknown;
};

function instagramAppSecret() {
  const secret = process.env.INSTAGRAM_APP_SECRET;
  if (!secret) throw new Error("INSTAGRAM_APP_SECRET manquant.");
  return secret;
}

export function verifyInstagramSignedRequest(signedRequest: string | null) {
  if (!signedRequest) return null;
  const [encodedSignature, encodedPayload] = signedRequest.split(".");
  if (!encodedSignature || !encodedPayload) return null;

  try {
    const signature = Buffer.from(encodedSignature, "base64url");
    const expected = crypto
      .createHmac("sha256", instagramAppSecret())
      .update(encodedPayload)
      .digest();

    if (signature.length !== expected.length || !crypto.timingSafeEqual(signature, expected)) return null;

    const payload = JSON.parse(
      Buffer.from(encodedPayload, "base64url").toString("utf8"),
    ) as InstagramSignedRequestPayload;

    if (payload.algorithm && String(payload.algorithm).toUpperCase() !== "HMAC-SHA256") return null;
    return payload;
  } catch {
    return null;
  }
}

export function createInstagramDeletionConfirmationCode() {
  return crypto.randomBytes(24).toString("base64url");
}

export async function saveInstagramConnection(input: {
  accessToken: string;
  userId: string;
  username?: string;
  displayName?: string;
  profilePictureUrl?: string;
  expiresIn: number;
}) {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + input.expiresIn * 1000);
  const rows = [
    [KEYS.accessToken, encrypt(input.accessToken), "Jeton OAuth Instagram"],
    [KEYS.userId, input.userId, "ID compte Instagram"],
    [KEYS.username, input.username || "", "Nom d’utilisateur Instagram"],
    [KEYS.displayName, input.displayName || "", "Nom Instagram"],
    [KEYS.profilePictureUrl, input.profilePictureUrl || "", "Photo de profil Instagram"],
    [KEYS.expiresAt, expiresAt.toISOString(), "Expiration du jeton Instagram"],
    [KEYS.connectedAt, now.toISOString(), "Connexion Instagram"],
  ] as const;

  await prisma.$transaction(rows.map(([key, value, label]) => prisma.setting.upsert({
    where: { key },
    update: { value, label, group: "Instagram" },
    create: { key, value, label, group: "Instagram" },
  })));
}

export async function getInstagramConnection() {
  const rows = await prisma.setting.findMany({ where: { key: { in: Object.values(KEYS) } } });
  const values = new Map(rows.map((row) => [row.key, row.value]));
  const encryptedToken = values.get(KEYS.accessToken);
  const expiresAtRaw = values.get(KEYS.expiresAt) || null;
  const expiresAt = expiresAtRaw ? new Date(expiresAtRaw) : null;
  return {
    connected: Boolean(encryptedToken && values.get(KEYS.userId)),
    accessToken: encryptedToken ? decrypt(encryptedToken) : null,
    userId: values.get(KEYS.userId) || null,
    username: values.get(KEYS.username) || null,
    displayName: values.get(KEYS.displayName) || null,
    profilePictureUrl: values.get(KEYS.profilePictureUrl) || null,
    expiresAt: expiresAt && !Number.isNaN(expiresAt.getTime()) ? expiresAt : null,
    connectedAt: values.get(KEYS.connectedAt) || null,
  };
}

export async function disconnectInstagram() {
  await prisma.setting.deleteMany({ where: { key: { in: Object.values(KEYS) } } });
}
