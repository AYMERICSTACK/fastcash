export const ADMIN_SESSION_COOKIE = "fc_admin_session";
export const CUSTOMER_SESSION_COOKIE = "fc_customer_session";

export type AdminSession = {
  kind: "admin";
  userId: string;
  email: string;
  role: "SUPER_ADMIN" | "ADMIN" | "EMPLOYEE";
  exp: number;
};

export type CustomerSession = {
  kind: "customer";
  customerId: string;
  email: string;
  exp: number;
};

export type CustomerMagicLink = {
  kind: "customer-magic-link";
  email: string;
  exp: number;
};

export type CustomerPasswordReset = {
  kind: "customer-password-reset";
  customerId: string;
  email: string;
  exp: number;
};

type SignedPayload = AdminSession | CustomerSession | CustomerMagicLink | CustomerPasswordReset;

const encoder = new TextEncoder();

function getSessionSecret() {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("SESSION_SECRET must contain at least 32 characters.");
  }
  return secret;
}

function encodeBase64Url(value: Uint8Array | string) {
  const bytes = typeof value === "string" ? encoder.encode(value) : value;
  if (typeof Buffer !== "undefined") {
    return Buffer.from(bytes).toString("base64url");
  }
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function decodeBase64Url(value: string) {
  if (typeof Buffer !== "undefined") {
    return new Uint8Array(Buffer.from(value, "base64url"));
  }
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  const binary = atob(padded);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

async function getSigningKey() {
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(getSessionSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

export async function signPayload<T extends SignedPayload>(payload: T) {
  const body = encodeBase64Url(JSON.stringify(payload));
  const key = await getSigningKey();
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(body));
  return `${body}.${encodeBase64Url(new Uint8Array(signature))}`;
}

export async function verifyPayload<T extends SignedPayload>(token: string | undefined, kind: T["kind"]) {
  if (!token) return null;
  const [body, signature] = token.split(".");
  if (!body || !signature) return null;

  try {
    const key = await getSigningKey();
    const valid = await crypto.subtle.verify(
      "HMAC",
      key,
      decodeBase64Url(signature),
      encoder.encode(body),
    );
    if (!valid) return null;

    const payload = JSON.parse(new TextDecoder().decode(decodeBase64Url(body))) as T;
    if (payload.kind !== kind || !Number.isFinite(payload.exp) || payload.exp <= Date.now()) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}


export async function createAdminSessionToken(input: Omit<AdminSession, "kind" | "exp">) {
  return signPayload<AdminSession>({
    kind: "admin",
    ...input,
    exp: Date.now() + 8 * 60 * 60 * 1000,
  });
}

export async function createCustomerSessionToken(input: Omit<CustomerSession, "kind" | "exp">) {
  return signPayload<CustomerSession>({
    kind: "customer",
    ...input,
    exp: Date.now() + 30 * 24 * 60 * 60 * 1000,
  });
}

export async function createCustomerMagicLinkToken(email: string) {
  return signPayload<CustomerMagicLink>({
    kind: "customer-magic-link",
    email,
    exp: Date.now() + 15 * 60 * 1000,
  });
}

export async function createCustomerPasswordResetToken(input: { customerId: string; email: string }) {
  return signPayload<CustomerPasswordReset>({
    kind: "customer-password-reset",
    ...input,
    exp: Date.now() + 30 * 60 * 1000,
  });
}
