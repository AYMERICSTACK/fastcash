const clean = (key) => process.env[key]?.trim() || "";
const flag = (key, fallback = false) => {
  const value = clean(key).toLowerCase();
  if (!value) return fallback;
  return ["1", "true", "yes", "on"].includes(value);
};

const required = [
  "DATABASE_URL",
  "SESSION_SECRET",
  "NEXT_PUBLIC_SITE_URL",
  "RESEND_API_KEY",
  "RESEND_FROM_EMAIL",
  "ORDER_TO_EMAIL",
  "CONTACT_TO_EMAIL",
  "STRIPE_MODE",
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY",
];

if (flag("HEYLIGHT_ENABLED")) {
  required.push(
    "HEYLIGHT_MERCHANT_KEY",
    "HEYLIGHT_WEBHOOK_SECRET",
    "HEYLIGHT_API_BASE_URL",
  );
}

const recommended = [
  "HEALTHCHECK_SECRET",
  "CLOUDINARY_CLOUD_NAME",
  "CLOUDINARY_API_KEY",
  "CLOUDINARY_API_SECRET",
];

const missing = required.filter((key) => !clean(key));
const warnings = recommended.filter((key) => !clean(key));

if (clean("NEXT_PUBLIC_SITE_URL") && !clean("NEXT_PUBLIC_SITE_URL").startsWith("https://")) {
  console.error("❌ NEXT_PUBLIC_SITE_URL doit utiliser HTTPS en production.");
  process.exitCode = 1;
}

if (clean("SESSION_SECRET") && clean("SESSION_SECRET").length < 32) {
  console.error("❌ SESSION_SECRET doit contenir au moins 32 caractères.");
  process.exitCode = 1;
}

const stripeMode = clean("STRIPE_MODE").toLowerCase();
const stripeSecret = clean("STRIPE_SECRET_KEY");
const stripePublic = clean("NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY");
const stripeWebhook = clean("STRIPE_WEBHOOK_SECRET");

if (stripeMode && !["test", "live"].includes(stripeMode)) {
  console.error("❌ STRIPE_MODE doit valoir test ou live.");
  process.exitCode = 1;
}

if (stripeMode === "test" && (!stripeSecret.startsWith("sk_test_") || !stripePublic.startsWith("pk_test_"))) {
  console.error("❌ STRIPE_MODE=test nécessite des clés Stripe de test cohérentes.");
  process.exitCode = 1;
}

if (stripeMode === "live" && (!stripeSecret.startsWith("sk_live_") || !stripePublic.startsWith("pk_live_"))) {
  console.error("❌ STRIPE_MODE=live nécessite des clés Stripe live cohérentes.");
  process.exitCode = 1;
}

if (stripeWebhook && !stripeWebhook.startsWith("whsec_")) {
  console.error("❌ STRIPE_WEBHOOK_SECRET doit commencer par whsec_.");
  process.exitCode = 1;
}

if (missing.length) {
  console.error(`❌ Variables obligatoires manquantes : ${missing.join(", ")}`);
  process.exitCode = 1;
} else {
  console.log("✅ Variables obligatoires présentes.");
}

console.log(`💳 Stripe : mode ${stripeMode || "non défini"}.`);
console.log(`🟢 HeyLight : ${flag("HEYLIGHT_ENABLED") ? "activé" : "désactivé et masqué"}.`);

if (warnings.length) {
  console.warn(`⚠️ Variables recommandées absentes : ${warnings.join(", ")}`);
}

if (!process.exitCode) {
  console.log("🚀 Environnement prêt pour la préproduction.");
}
