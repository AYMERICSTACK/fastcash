import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL est manquante.");
}

const APPLY = process.argv.includes("--apply");
const cutoff = new Date(
  process.env.PRELAUNCH_CLEANUP_BEFORE || "2026-08-28T00:00:00+02:00",
);

if (Number.isNaN(cutoff.getTime())) {
  throw new Error("PRELAUNCH_CLEANUP_BEFORE est invalide.");
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

function isGeneratedTestOrder(orderNumber) {
  return /^FC-\d{13}$/.test(orderNumber);
}

function isKnownDemoOrder(order) {
  return (
    order.orderNumber === "FC-2026-0001" ||
    order.payment?.reference === "pi_demo_fastcash"
  );
}

function isPrelaunchTestOrder(order) {
  if (order.createdAt >= cutoff) return false;
  return isKnownDemoOrder(order) || isGeneratedTestOrder(order.orderNumber);
}

function hasCheckoutSession(payment) {
  const data = payment?.providerData;
  return Boolean(
    data &&
      typeof data === "object" &&
      !Array.isArray(data) &&
      typeof data.checkoutSessionId === "string" &&
      data.checkoutSessionId.length > 0,
  );
}

function money(value, currency = "CHF") {
  return `${Number(value || 0).toFixed(2)} ${currency || "CHF"}`;
}

async function main() {
  console.log("\nFAST CASH — nettoyage pré-lancement");
  console.log(`Mode : ${APPLY ? "APPLICATION" : "APERÇU (aucune écriture)"}`);
  console.log(`Coupe : commandes créées avant ${cutoff.toISOString()}\n`);

  const orders = await prisma.order.findMany({
    where: { createdAt: { lt: cutoff } },
    include: {
      customer: true,
      items: true,
      payment: true,
      invoice: true,
      shipment: true,
    },
    orderBy: { createdAt: "asc" },
  });

  const candidates = orders.filter(isPrelaunchTestOrder);

  if (!candidates.length) {
    console.log("Aucune commande de test pré-lancement détectée. Rien à faire.");
    return;
  }

  console.log(`Commandes détectées : ${candidates.length}`);
  for (const order of candidates) {
    console.log(
      `- ${order.orderNumber} | ${order.customer.email} | ${money(order.total, order.currency)} | ${order.status}`,
    );
  }

  const candidateOrderIds = new Set(candidates.map((order) => order.id));
  const customerIds = [...new Set(candidates.map((order) => order.customerId))];

  const restoreByProduct = new Map();
  for (const order of candidates) {
    // Le seed FC-2026-0001 ne décrémente pas le stock. Les vraies sessions
    // Checkout, elles, le décrémentent dans persistStripeOrder().
    if (!hasCheckoutSession(order.payment)) continue;

    for (const item of order.items) {
      if (!item.productId) continue;
      restoreByProduct.set(
        item.productId,
        (restoreByProduct.get(item.productId) || 0) + item.quantity,
      );
    }
  }

  const customers = await prisma.customer.findMany({
    where: { id: { in: customerIds } },
    include: { orders: { select: { id: true } } },
  });

  const orphanCustomers = customers.filter((customer) =>
    customer.orders.every((order) => candidateOrderIds.has(order.id)),
  );

  const testProducts = await prisma.product.findMany({
    where: {
      createdAt: { lt: cutoff },
      OR: [
        { name: { contains: "test paiement", mode: "insensitive" } },
        { slug: { contains: "test-paiement", mode: "insensitive" } },
        { reference: { contains: "TEST", mode: "insensitive" } },
      ],
    },
    select: { id: true, name: true, slug: true, stock: true },
  });

  console.log(`\nStock à restaurer : ${restoreByProduct.size} produit(s)`);
  for (const [productId, quantity] of restoreByProduct) {
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { name: true, stock: true },
    });
    console.log(
      `- ${product?.name || productId}: +${quantity} (stock actuel ${product?.stock ?? "?"})`,
    );
  }

  console.log(`\nClients devenant orphelins : ${orphanCustomers.length}`);
  for (const customer of orphanCustomers) {
    console.log(`- ${customer.email}`);
  }

  console.log(`\nProduits de test détectés : ${testProducts.length}`);
  for (const product of testProducts) {
    console.log(`- ${product.name} (${product.slug})`);
  }

  if (!APPLY) {
    console.log("\nAPERÇU UNIQUEMENT — aucune donnée n'a été modifiée.");
    console.log("Si cette liste est correcte, lance : npm run cleanup:prelaunch:apply\n");
    return;
  }

  await prisma.$transaction(async (tx) => {
    for (const [productId, quantity] of restoreByProduct) {
      await tx.product.update({
        where: { id: productId },
        data: { stock: { increment: quantity } },
      });
    }

    await tx.order.deleteMany({
      where: { id: { in: [...candidateOrderIds] } },
    });

    // Suppression uniquement des clients qui n'ont plus aucune commande.
    // Les relations Favorite sont en cascade et ProductOffer passe à null.
    for (const customer of orphanCustomers) {
      const remainingOrders = await tx.order.count({
        where: { customerId: customer.id },
      });
      if (remainingOrders === 0) {
        await tx.customer.delete({ where: { id: customer.id } });
      }
    }

    // Le produit créé pour le paiement Live à 1 CHF n'a pas vocation à rester au catalogue.
    for (const product of testProducts) {
      const remainingItems = await tx.orderItem.count({
        where: { productId: product.id },
      });
      if (remainingItems === 0) {
        await tx.product.delete({ where: { id: product.id } });
      }
    }
  });

  console.log("\nNettoyage appliqué avec succès.");
  console.log(`- ${candidates.length} commande(s) de test supprimée(s)`);
  console.log(`- ${orphanCustomers.length} client(s) de test orphelin(s) supprimé(s)`);
  console.log(`- ${testProducts.length} produit(s) de test traité(s)`);
  console.log(`- stock restauré sur ${restoreByProduct.size} produit(s)\n`);
}

main()
  .catch((error) => {
    console.error("\nÉchec du nettoyage :", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
