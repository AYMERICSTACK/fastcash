import "server-only";
import Stripe from "stripe";

export type StripeMode = "test" | "live";

type StripeConfig = {
  mode: StripeMode;
  secretKey: string;
  publishableKey: string;
  webhookSecret: string;
};

function clean(value: string | undefined) {
  return value?.trim() || "";
}

function inferMode(secretKey: string, publishableKey: string): StripeMode | null {
  if (secretKey.startsWith("sk_test_") && publishableKey.startsWith("pk_test_")) return "test";
  if (secretKey.startsWith("sk_live_") && publishableKey.startsWith("pk_live_")) return "live";
  return null;
}

export function getStripeConfig(): StripeConfig {
  const secretKey = clean(process.env.STRIPE_SECRET_KEY);
  const publishableKey = clean(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);
  const webhookSecret = clean(process.env.STRIPE_WEBHOOK_SECRET);

  if (!secretKey || !publishableKey || !webhookSecret) {
    throw new Error("Configuration Stripe incomplète.");
  }

  const inferredMode = inferMode(secretKey, publishableKey);
  if (!inferredMode) {
    throw new Error("Les clés Stripe secrète et publique ne correspondent pas au même environnement.");
  }

  const configuredMode = clean(process.env.STRIPE_MODE).toLowerCase();
  if (configuredMode && configuredMode !== "test" && configuredMode !== "live") {
    throw new Error("STRIPE_MODE doit valoir test ou live.");
  }

  const mode = (configuredMode || inferredMode) as StripeMode;
  if (mode !== inferredMode) {
    throw new Error(`STRIPE_MODE=${mode} ne correspond pas aux clés Stripe ${inferredMode}.`);
  }

  if (!webhookSecret.startsWith("whsec_")) {
    throw new Error("STRIPE_WEBHOOK_SECRET est invalide.");
  }

  return { mode, secretKey, publishableKey, webhookSecret };
}

export function getStripeClient() {
  const config = getStripeConfig();
  return new Stripe(config.secretKey, {
    appInfo: {
      name: "FAST CASH Genève",
      version: "RC3.4.3",
    },
  });
}

export function getStripePublicStatus() {
  try {
    const config = getStripeConfig();
    return {
      configured: true,
      mode: config.mode,
      publishableKey: config.publishableKey,
    } as const;
  } catch {
    return {
      configured: false,
      mode: null,
      publishableKey: null,
    } as const;
  }
}
