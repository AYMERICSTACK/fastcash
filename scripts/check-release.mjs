import { access, readFile } from "node:fs/promises";
import { constants } from "node:fs";

const clean = (key) => process.env[key]?.trim() || "";
const flag = (key, fallback = false) => {
  const value = clean(key).toLowerCase();
  if (!value) return fallback;
  return ["1", "true", "yes", "on"].includes(value);
};

const errors = [];
const warnings = [];
const ok = [];

function pass(message) { ok.push(message); }
function fail(message) { errors.push(message); }
function warn(message) { warnings.push(message); }

const siteUrl = clean("NEXT_PUBLIC_SITE_URL");
if (!siteUrl.startsWith("https://")) fail("NEXT_PUBLIC_SITE_URL doit être une URL HTTPS de production.");
else if (/localhost|127\.0\.0\.1|vercel\.app/i.test(siteUrl)) warn("NEXT_PUBLIC_SITE_URL n'utilise pas encore le domaine final FAST CASH.");
else pass("URL publique HTTPS configurée.");

const sessionSecret = clean("SESSION_SECRET");
if (sessionSecret.length < 32) fail("SESSION_SECRET doit contenir au moins 32 caractères.");
else if (/generate|change|secret|password|example|xxxx/i.test(sessionSecret)) fail("SESSION_SECRET ressemble à une valeur d'exemple.");
else pass("Secret de session robuste.");

const adminPassword = clean("ADMIN_PASSWORD");
if (adminPassword && adminPassword.length < 12) warn("ADMIN_PASSWORD devrait contenir au moins 12 caractères.");
if (adminPassword && /fastcash2026|password|admin|example/i.test(adminPassword)) warn("ADMIN_PASSWORD semble prévisible : utilisez un mot de passe unique avant la production.");

const stripeMode = clean("STRIPE_MODE").toLowerCase();
const stripeSecret = clean("STRIPE_SECRET_KEY");
const stripePublic = clean("NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY");
const stripeWebhook = clean("STRIPE_WEBHOOK_SECRET");
const allowTestPayments = flag("ALLOW_TEST_PAYMENTS_IN_PREPRODUCTION");

if (!stripeSecret || !stripePublic || !stripeWebhook) fail("Configuration Stripe incomplète.");
if (stripeWebhook && (!stripeWebhook.startsWith("whsec_") || /x{4,}/i.test(stripeWebhook))) fail("STRIPE_WEBHOOK_SECRET est absent ou fictif.");
if (stripeMode === "live") {
  if (!stripeSecret.startsWith("sk_live_") || !stripePublic.startsWith("pk_live_")) fail("STRIPE_MODE=live nécessite les clés Stripe live.");
  else pass("Stripe est configuré en production.");
} else if (stripeMode === "test") {
  if (!stripeSecret.startsWith("sk_test_") || !stripePublic.startsWith("pk_test_")) fail("STRIPE_MODE=test nécessite les clés Stripe test.");
  if (!allowTestPayments) warn("Stripe est encore en mode test. Activez les clés live avant l'ouverture commerciale.");
  else pass("Stripe test autorisé explicitement pour la préproduction.");
} else {
  fail("STRIPE_MODE doit valoir test ou live.");
}

const resendKey = clean("RESEND_API_KEY");
const resendFrom = clean("RESEND_FROM_EMAIL");
if (!resendKey.startsWith("re_") || /x{4,}/i.test(resendKey)) fail("RESEND_API_KEY est absente ou fictive.");
if (!resendFrom || /onboarding@resend\.dev/i.test(resendFrom)) warn("RESEND_FROM_EMAIL utilise encore le domaine de test Resend.");
else pass("Expéditeur email personnalisé.");

const cloudinaryKeys = ["CLOUDINARY_CLOUD_NAME", "CLOUDINARY_API_KEY", "CLOUDINARY_API_SECRET"];
const cloudinaryValues = cloudinaryKeys.map(clean);
if (cloudinaryValues.some(Boolean) && !cloudinaryValues.every(Boolean)) fail("Cloudinary est partiellement configuré : renseignez les trois variables.");
else if (cloudinaryValues.every(Boolean) && !cloudinaryValues.some((value) => /your-|xxxx/i.test(value))) pass("Cloudinary est configuré.");
else warn("Cloudinary n'est pas prêt pour les uploads réels.");

if (flag("HEYLIGHT_ENABLED")) warn("HeyLight est activé. Confirmez que le contrat marchand est de nouveau opérationnel.");
else pass("HeyLight reste désactivé et masqué.");

const requiredFiles = [
  "app/api/stripe/webhook/route.ts",
  "app/api/checkout/route.ts",
  "app/api/checkout/status/route.ts",
  "app/robots.ts",
  "app/sitemap.ts",
  "app/manifest.ts",
  "app/admin/layout.tsx",
];
for (const file of requiredFiles) {
  try { await access(file, constants.R_OK); }
  catch { fail(`Fichier de préproduction manquant : ${file}`); }
}

try {
  const gitignore = await readFile(".gitignore", "utf8");
  if (!gitignore.includes(".env*")) fail(".gitignore ne protège pas les fichiers .env.");
  else pass("Fichiers d'environnement ignorés par Git.");
} catch {
  fail("Impossible de vérifier .gitignore.");
}

console.log("\nFAST CASH — Contrôle RC3.4.5\n");
for (const message of ok) console.log(`✅ ${message}`);
for (const message of warnings) console.warn(`⚠️ ${message}`);
for (const message of errors) console.error(`❌ ${message}`);

if (errors.length) {
  console.error(`\n⛔ ${errors.length} blocage(s) avant mise en ligne.`);
  process.exit(1);
}

console.log(`\n🚀 Aucun blocage détecté${warnings.length ? `, avec ${warnings.length} point(s) à confirmer` : ""}.`);
