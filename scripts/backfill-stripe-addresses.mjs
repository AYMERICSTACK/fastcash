import "dotenv/config";
import Stripe from "stripe";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const connectionString = process.env.DATABASE_URL?.trim();
const stripeSecretKey = process.env.STRIPE_LIVE_SECRET_KEY?.trim();

if (!connectionString) throw new Error("DATABASE_URL est manquante.");
if (!stripeSecretKey) {
  throw new Error(
    "STRIPE_LIVE_SECRET_KEY est manquante. Ajoute une cle sk_live_ dediee au backfill dans .env.local.",
  );
}
if (!stripeSecretKey.startsWith("sk_live_")) {
  throw new Error(
    "STRIPE_LIVE_SECRET_KEY doit etre une cle Stripe LIVE (sk_live_...). La cle test locale reste dans STRIPE_SECRET_KEY.",
  );
}

const APPLY = process.argv.includes("--apply");

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

const stripe = new Stripe(stripeSecretKey, {
  appInfo: {
    name: "FAST CASH Geneve - backfill adresses",
    version: "V19.1.1",
  },
});

function providerDataObject(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value;
}

function normalizeAddress(address) {
  if (!address?.line1 || !address.city || !address.country) return null;
  return {
    line1: address.line1,
    line2: address.line2 || null,
    postalCode: address.postal_code || null,
    city: address.city,
    country: address.country,
  };
}

function getCheckoutAddress(session) {
  const shipping =
    session?.collected_information?.shipping_details?.address ||
    session?.shipping_details?.address ||
    null;
  const billing = session?.customer_details?.address || null;

  const shippingAddress = normalizeAddress(shipping);
  if (shippingAddress) return { address: shippingAddress, source: "livraison" };

  const billingAddress = normalizeAddress(billing);
  if (billingAddress) return { address: billingAddress, source: "facturation" };

  return null;
}

function addressOneLine(address) {
  return [
    [address.line1, address.line2].filter(Boolean).join(", "),
    [address.postalCode, address.city].filter(Boolean).join(" "),
    address.country,
  ]
    .filter(Boolean)
    .join(" | ");
}

async function resolveCheckoutSession(order) {
  const data = providerDataObject(order.payment?.providerData);
  const storedSessionId =
    typeof data?.checkoutSessionId === "string" ? data.checkoutSessionId.trim() : "";

  if (storedSessionId.startsWith("cs_")) {
    return stripe.checkout.sessions.retrieve(storedSessionId);
  }

  const paymentReference = order.payment?.reference?.trim() || "";
  if (paymentReference.startsWith("cs_")) {
    return stripe.checkout.sessions.retrieve(paymentReference);
  }

  if (paymentReference.startsWith("pi_")) {
    const sessions = await stripe.checkout.sessions.list({
      payment_intent: paymentReference,
      limit: 5,
    });
    if (sessions.data.length) return sessions.data[0];
  }

  return null;
}

async function main() {
  console.log("\nFAST CASH - Backfill adresses Stripe V19.1.1");
  console.log(`Mode : ${APPLY ? "APPLICATION" : "APERÇU (aucune écriture)"}`);
  console.log("Cible : commandes avec livraison Poste Suisse sans adresse propre a la commande.\n");

  const orders = await prisma.order.findMany({
    where: {
      shipment: {
        is: {
          carrier: { contains: "poste", mode: "insensitive" },
        },
      },
    },
    include: {
      customer: {
        include: {
          addresses: {
            orderBy: { createdAt: "desc" },
          },
        },
      },
      payment: true,
      shipment: true,
    },
    orderBy: { createdAt: "asc" },
  });

  if (!orders.length) {
    console.log("Aucune commande Poste Suisse trouvee.");
    return;
  }

  const stats = {
    total: orders.length,
    alreadyPresent: 0,
    recovered: 0,
    missingSession: 0,
    missingAddress: 0,
    errors: 0,
  };

  for (const order of orders) {
    const label = `Commande ${order.orderNumber}`;
    const existing = order.customer.addresses.find((address) => address.label === label);

    if (existing) {
      stats.alreadyPresent += 1;
      console.log(`- ${order.orderNumber} | deja presente -> ${addressOneLine(existing)}`);
      continue;
    }

    try {
      const session = await resolveCheckoutSession(order);
      if (!session) {
        stats.missingSession += 1;
        console.log(`- ${order.orderNumber} | ATTENTION session Stripe introuvable`);
        continue;
      }

      const recovered = getCheckoutAddress(session);
      if (!recovered) {
        stats.missingAddress += 1;
        console.log(`- ${order.orderNumber} | ATTENTION aucune adresse dans Stripe (${session.id})`);
        continue;
      }

      console.log(
        `- ${order.orderNumber} | OK ${recovered.source} | ${addressOneLine(recovered.address)}`,
      );

      if (APPLY) {
        await prisma.address.create({
          data: {
            customerId: order.customerId,
            label,
            ...recovered.address,
          },
        });
      }

      stats.recovered += 1;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const code =
        error && typeof error === "object" && "code" in error
          ? String(error.code || "")
          : "";

      if (code === "resource_missing" || /No such checkout\.session/i.test(message)) {
        stats.missingSession += 1;
        console.log(`- ${order.orderNumber} | ATTENTION session Stripe introuvable`);
        continue;
      }

      stats.errors += 1;
      console.log(`- ${order.orderNumber} | ERREUR ${message}`);
    }
  }

  console.log("\nResume");
  console.log(`- Commandes Poste Suisse analysees : ${stats.total}`);
  console.log(`- Adresse deja presente : ${stats.alreadyPresent}`);
  console.log(`- Adresse recuperable Stripe : ${stats.recovered}`);
  console.log(`- Session Stripe introuvable : ${stats.missingSession}`);
  console.log(`- Session trouvee mais adresse absente : ${stats.missingAddress}`);
  console.log(`- Erreurs : ${stats.errors}`);

  if (!APPLY) {
    console.log("\nAPERÇU UNIQUEMENT : aucune donnee n'a ete modifiee.");
    console.log("Si la liste est correcte, lance : npm run backfill:stripe-addresses:apply\n");
  } else {
    console.log("\nBackfill applique. Recharge le BO pour verifier les adresses.\n");
  }
}

main()
  .catch((error) => {
    console.error("\nEchec du backfill :", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
