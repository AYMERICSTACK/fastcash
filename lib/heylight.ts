import crypto from "node:crypto";

const DEFAULT_PROD_URL = "https://origination.heidipay.com";

export type HeyLightStatus = "pending" | "awaiting_confirmation" | "success" | "cancelled";

export function getHeyLightConfig() {
  const merchantKey = process.env.HEYLIGHT_MERCHANT_KEY?.trim();
  const webhookSecret = process.env.HEYLIGHT_WEBHOOK_SECRET?.trim();
  const baseUrl = (process.env.HEYLIGHT_API_BASE_URL || DEFAULT_PROD_URL).replace(/\/$/, "");
  const allowedTerms = (process.env.HEYLIGHT_ALLOWED_TERMS || "3,6,12")
    .split(",")
    .map((value) => Number.parseInt(value.trim(), 10))
    .filter((value) => Number.isInteger(value) && value > 0);

  return { merchantKey, webhookSecret, baseUrl, allowedTerms: allowedTerms.length ? allowedTerms : [3, 6, 12] };
}

export async function getHeyLightToken() {
  const { merchantKey, baseUrl } = getHeyLightConfig();
  if (!merchantKey) throw new Error("HEYLIGHT_MERCHANT_KEY manquante.");

  const response = await fetch(`${baseUrl}/auth/v1/generate/`, {
    method: "POST",
    headers: { accept: "application/json", "content-type": "application/json" },
    body: JSON.stringify({ merchant_key: merchantKey }),
    cache: "no-store",
  });
  const payload = await response.json().catch(() => null) as { data?: { token?: string }; message?: string } | null;
  const token = payload?.data?.token;
  if (!response.ok || !token) throw new Error(payload?.message || "Authentification HeyLight impossible.");
  return token;
}

export async function heylightFetch<T>(path: string, init: RequestInit = {}) {
  const token = await getHeyLightToken();
  const { baseUrl } = getHeyLightConfig();
  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      accept: "application/json",
      "content-type": "application/json",
      authorization: `Bearer ${token}`,
      ...(init.headers || {}),
    },
    cache: "no-store",
  });
  const text = await response.text();
  const payload = text ? JSON.parse(text) as T : ({} as T);
  if (!response.ok) throw new Error(`HeyLight ${response.status}: ${text || "requête refusée"}`);
  return payload;
}

export function verifyHeyLightSignature(rawBody: string, signature: string | null) {
  const { webhookSecret } = getHeyLightConfig();
  if (!webhookSecret || !signature || !/^[a-f0-9]{64}$/.test(signature)) return false;
  const expected = crypto.createHmac("sha256", webhookSecret).update(rawBody, "utf8").digest("hex");
  const actualBuffer = Buffer.from(signature, "hex");
  const expectedBuffer = Buffer.from(expected, "hex");
  return actualBuffer.length === expectedBuffer.length && crypto.timingSafeEqual(actualBuffer, expectedBuffer);
}

export async function getHeyLightApplicationStatus(externalUuid: string) {
  const payload = await heylightFetch<unknown>("/api/checkout/v2/status/", {
    method: "POST",
    body: JSON.stringify({ external_contract_uuids: [externalUuid] }),
  });
  return payload;
}
