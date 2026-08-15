require("dotenv").config();

const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");
const { PrismaPg } = require("@prisma/adapter-pg");
const products = require("../data/products.json");

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is missing.");
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});


const knownBrands = [
  "Apple",
  "Samsung",
  "Rolex",
  "Omega",
  "Cartier",
  "Breitling",
  "Tudor",
  "TAG Heuer",
  "Louis Vuitton",
  "Chanel",
  "Gucci",
  "Dior",
  "Sony",
  "Nintendo",
  "PlayStation",
  "Microsoft",
  "Lenovo",
  "HP",
  "Dell",
  "Asus",
  "Bose",
  "Canon",
  "Nikon",
];

const reservedCategorySlugs = new Set(["accueil", "promotions", "bonnes-affaires"]);

const categoryMergeMap = {
  audio: { slug: "image-et-son", name: "Image & Son" },
  video: { slug: "image-et-son", name: "Image & Son" },
  "image-son": { slug: "image-et-son", name: "Image & Son" },
  "image-et-son": { slug: "image-et-son", name: "Image & Son" },
  consoles: { slug: "consoles-jeux-video", name: "Consoles, Jeux Vidéo" },
  "consoles-jeux-video": { slug: "consoles-jeux-video", name: "Consoles, Jeux Vidéo" },
};

function canonicalCategorySlug(slug) {
  if (!slug) return null;
  const normalized = String(slug).trim().toLowerCase();
  if (reservedCategorySlugs.has(normalized)) return null;
  return categoryMergeMap[normalized]?.slug || normalized;
}

function canonicalCategoryName(name, slug) {
  const canonicalSlug = canonicalCategorySlug(slug);
  if (!canonicalSlug) return null;
  return categoryMergeMap[String(slug || "").trim().toLowerCase()]?.name || categoryMergeMap[canonicalSlug]?.name || name || canonicalSlug;
}

function slugify(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " et ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function detectBrand(name) {
  const normalized = String(name || "").toLowerCase();
  return knownBrands.find((brand) => normalized.includes(brand.toLowerCase())) || null;
}

function normalizeProduct(item) {
  return {
    id: String(item.id),
    prestashopId: Number(item.id),
    name: item.name || "Produit FAST CASH",
    slug: item.slug || `produit-${item.id}`,
    reference: item.reference || null,
    description: item.description || null,
    image: item.image || null,
    price: Number(item.price || 0),
    stock: Number(item.stock || 0),
    active: true,
  };
}

async function main() {
  console.log("Seed FAST CASH: démarrage...");

  const adminEmail = process.env.ADMIN_EMAIL?.toLowerCase();
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminEmail || !adminPassword || adminPassword.length < 12) {
    throw new Error("ADMIN_EMAIL and a strong ADMIN_PASSWORD (12+ characters) are required.");
  }
  const adminPasswordHash = await bcrypt.hash(adminPassword, 10);

  await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      role: "SUPER_ADMIN",
      password: adminPasswordHash,
    },
    create: {
      email: adminEmail,
      password: adminPasswordHash,
      role: "SUPER_ADMIN",
    },
  });

  console.log(`Admin seedé : ${adminEmail}`);

  const settings = [
    { key: "shop.name", label: "Nom boutique", value: "FAST CASH Genève", group: "Boutique" },
    { key: "shop.currency", label: "Devise principale", value: "CHF", group: "Boutique" },
    { key: "shop.languages", label: "Langues actives", value: "FR / EN", group: "Boutique" },
    { key: "orders.prefix", label: "Préfixe commandes", value: "FC", group: "Commandes" },
    { key: "invoices.prefix", label: "Préfixe factures", value: "FA", group: "Factures" },
    { key: "orders.defaultStatus", label: "Statut par défaut", value: "Préparation", group: "Commandes" },
    { key: "payments.card", label: "Paiement carte bancaire", value: "Inactif", group: "Paiements" },
    { key: "orders.email", label: "Email commandes", value: process.env.ORDER_TO_EMAIL || "commande@fastcash-geneve.ch", group: "Emails" },
    { key: "emails.customer", label: "Emails clients", value: "Notifications activables", group: "Emails" },
    { key: "shipping.defaultCarrier", label: "Transporteur principal", value: "Poste Suisse", group: "Livraison" },
    { key: "stock.lowThreshold", label: "Seuil stock faible", value: "3", group: "Stock" },
  ];

  for (const setting of settings) {
    await prisma.setting.upsert({
      where: { key: setting.key },
      update: {
        label: setting.label,
        value: setting.value,
        group: setting.group,
      },
      create: setting,
    });
  }

  console.log(`Paramètres seedés : ${settings.length}`);

  const imageSonCategory = await prisma.category.upsert({
    where: { slug: "image-et-son" },
    update: { name: "Image & Son" },
    create: { slug: "image-et-son", name: "Image & Son" },
  });

  const consolesCategory = await prisma.category.upsert({
    where: { slug: "consoles-jeux-video" },
    update: { name: "Consoles, Jeux Vidéo" },
    create: { slug: "consoles-jeux-video", name: "Consoles, Jeux Vidéo" },
  });

  const audioVideoCategories = await prisma.category.findMany({
    where: { slug: { in: ["audio", "video", "image-son"] } },
    select: { id: true, slug: true },
  });

  if (audioVideoCategories.length) {
    await prisma.product.updateMany({
      where: { categoryId: { in: audioVideoCategories.map((category) => category.id) } },
      data: { categoryId: imageSonCategory.id },
    });

    await prisma.category.deleteMany({
      where: { id: { in: audioVideoCategories.map((category) => category.id) } },
    });

    console.log("Catégories fusionnées vers Image & Son : audio, vidéo, image-son");
  }

  const oldConsolesCategory = await prisma.category.findUnique({
    where: { slug: "consoles" },
    select: { id: true },
  });

  if (oldConsolesCategory) {
    await prisma.product.updateMany({
      where: { categoryId: oldConsolesCategory.id },
      data: { categoryId: consolesCategory.id },
    });
    await prisma.category.delete({ where: { id: oldConsolesCategory.id } });
    console.log("Catégorie consoles fusionnée vers Consoles, Jeux Vidéo");
  }

  const reservedCategories = await prisma.category.findMany({
    where: { slug: { in: Array.from(reservedCategorySlugs) } },
    select: { id: true, slug: true },
  });

  if (reservedCategories.length) {
    const reservedCategoryIds = reservedCategories.map((category) => category.id);

    await prisma.product.updateMany({
      where: { categoryId: { in: reservedCategoryIds } },
      data: { categoryId: null },
    });

    await prisma.category.deleteMany({
      where: { id: { in: reservedCategoryIds } },
    });

    console.log(
      `Catégories système/commerciales supprimées : ${reservedCategories
        .map((category) => category.slug)
        .join(", ")}`,
    );
  }


  const brandMap = new Map();
  for (const brandName of knownBrands) {
    const brand = await prisma.brand.upsert({
      where: { slug: slugify(brandName) },
      update: { name: brandName },
      create: {
        name: brandName,
        slug: slugify(brandName),
      },
    });
    brandMap.set(brandName, brand.id);
  }

  const categoryMap = new Map();
  for (const item of products) {
    const canonicalSlug = canonicalCategorySlug(item.categorySlug);
    const canonicalName = canonicalCategoryName(item.category, item.categorySlug);

    if (!canonicalSlug || categoryMap.has(canonicalSlug)) continue;

    const category = await prisma.category.upsert({
      where: { slug: canonicalSlug },
      update: { name: canonicalName || canonicalSlug },
      create: {
        slug: canonicalSlug,
        name: canonicalName || canonicalSlug,
      },
    });
    categoryMap.set(canonicalSlug, category.id);
  }

  let imported = 0;
  for (const item of products) {
    const normalized = normalizeProduct(item);
    await prisma.product.upsert({
      where: { id: normalized.id },
      update: {
        ...normalized,
        categoryId: categoryMap.get(canonicalCategorySlug(item.categorySlug)) || null,
        brandId: brandMap.get(detectBrand(item.name)) || null,
      },
      create: {
        ...normalized,
        categoryId: categoryMap.get(canonicalCategorySlug(item.categorySlug)) || null,
        brandId: brandMap.get(detectBrand(item.name)) || null,
      },
    });
    imported += 1;
  }

  const customer = await prisma.customer.upsert({
    where: { email: "client.demo@fastcash.local" },
    update: {},
    create: {
      email: "client.demo@fastcash.local",
      firstName: "Client",
      lastName: "Démo",
      phone: "+41 22 000 00 00",
      addresses: {
        create: {
          label: "Adresse principale",
          line1: "Rue du Rhône 1",
          postalCode: "1204",
          city: "Genève",
          country: "Suisse",
        },
      },
    },
  });

  const firstProducts = await prisma.product.findMany({
    take: 2,
    orderBy: { updatedAt: "desc" },
  });

  if (firstProducts.length > 0) {
    await prisma.order.upsert({
      where: { orderNumber: "FC-2026-0001" },
      update: {},
      create: {
        orderNumber: "FC-2026-0001",
        customerId: customer.id,
        total: firstProducts.reduce((sum, product) => sum + product.price, 0),
        status: "PREPARING",
        items: {
          create: firstProducts.map((product) => ({
            productId: product.id,
            name: product.name,
            quantity: 1,
            price: product.price,
          })),
        },
        payment: {
          create: {
            provider: "Stripe",
            status: "paid",
            amount: firstProducts.reduce(
              (sum, product) => sum + product.price,
              0,
            ),
            reference: "pi_demo_fastcash",
          },
        },
        shipment: {
          create: {
            carrier: "Poste Suisse",
            trackingNo: "FASTCASH-DEMO-001",
            status: "PREPARING",
          },
        },
        invoice: {
          create: {
            number: "FA-2026-0001",
            amount: firstProducts.reduce(
              (sum, product) => sum + product.price,
              0,
            ),
          },
        },
      },
    });
  }

  console.log(`Seed FAST CASH terminé : ${imported} produits importés.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
