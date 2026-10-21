import { createHash, createHmac, timingSafeEqual } from "node:crypto";

export type VisualFormat = "post" | "story";

export type VisualAttestationPayload = {
  version: 1;
  productId: string;
  priceCents: number;
  format: VisualFormat;
  imageSha256: string;
  issuedAt: number;
  expiresAt: number;
};

const MAX_AGE_SECONDS = 30 * 60;

function signingKey(): Buffer {
  const configured = process.env.INSTAGRAM_VISUAL_SIGNING_KEY;

  if (!configured || configured.length < 32) {
    throw new Error("INSTAGRAM_VISUAL_SIGNING_KEY_NOT_CONFIGURED");
  }

  return Buffer.from(configured, "utf8");
}

export function imageSha256(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

export function priceToCents(price: number): number {
  if (!Number.isFinite(price) || price < 0) {
    throw new Error("INVALID_PRODUCT_PRICE");
  }

  return Math.round((price + Number.EPSILON) * 100);
}

function signature(payloadBase64: string): string {
  return createHmac("sha256", signingKey())
    .update(payloadBase64)
    .digest("base64url");
}

export function createVisualAttestation(input: {
  productId: string;
  price: number;
  format: VisualFormat;
  imageBytes: Uint8Array;
}): string {
  const now = Math.floor(Date.now() / 1000);

  const payload: VisualAttestationPayload = {
    version: 1,
    productId: input.productId,
    priceCents: priceToCents(input.price),
    format: input.format,
    imageSha256: imageSha256(input.imageBytes),
    issuedAt: now,
    expiresAt: now + MAX_AGE_SECONDS,
  };

  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");

  return `${encoded}.${signature(encoded)}`;
}

export function verifyVisualAttestation(
  token: string,
  imageBytes: Uint8Array,
  format: VisualFormat,
): VisualAttestationPayload | null {
  try {
    if (token.length > 4096) return null;

    const parts = token.split(".");
    if (parts.length !== 2) return null;

    const [encoded, receivedSignature] = parts;
    const expected = Buffer.from(signature(encoded), "utf8");
    const received = Buffer.from(receivedSignature, "utf8");

    if (expected.length !== received.length) return null;
    if (!timingSafeEqual(expected, received)) return null;

    const payload: unknown = JSON.parse(
      Buffer.from(encoded, "base64url").toString("utf8"),
    );

    if (!payload || typeof payload !== "object") return null;

    const data = payload as Partial<VisualAttestationPayload>;
    const now = Math.floor(Date.now() / 1000);

    if (data.version !== 1) return null;
    if (typeof data.productId !== "string" || !data.productId) return null;
    if (data.format !== format) return null;
    if (!Number.isSafeInteger(data.priceCents) || (data.priceCents ?? -1) < 0) return null;
    if (!Number.isSafeInteger(data.issuedAt)) return null;
    if (!Number.isSafeInteger(data.expiresAt)) return null;
    if (typeof data.imageSha256 !== "string") return null;

    if ((data.issuedAt ?? 0) > now + 60) return null;
    if ((data.expiresAt ?? 0) <= now) return null;
    if ((data.expiresAt ?? 0) - (data.issuedAt ?? 0) !== MAX_AGE_SECONDS) return null;
    if (data.imageSha256 !== imageSha256(imageBytes)) return null;

    return data as VisualAttestationPayload;
  } catch {
    return null;
  }
}