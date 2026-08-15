import { products } from "@/lib/products";

export const adminOrders = [
  {
    id: "FC-2026-0001",
    customer: "Exemple client",
    email: "client@example.com",
    phone: "+41 22 000 00 00",
    date: "Aujourd'hui",
    status: "À préparer",
    payment: "Payée Stripe",
    paymentStatus: "paid",
    total: 1239.9,
    carrier: "Poste Suisse",
    tracking: "",
    delivery: "Retrait / expédition à confirmer",
    address: "Rue du Rhône 1, 1204 Genève, Suisse",
    note: "Commande de démonstration pour poser le futur workflow FAST CASH.",
    items: [
      { productId: products[0]?.id ?? 1, name: products[0]?.name ?? "Produit FAST CASH", quantity: 1, price: products[0]?.price ?? 1239.9, image: products[0]?.image ?? "/images/hero-fastcash.png" },
    ],
    history: [
      { label: "Commande créée", date: "Aujourd'hui", detail: "Session Stripe Checkout validée." },
      { label: "Paiement confirmé", date: "Aujourd'hui", detail: "Paiement enregistré côté Stripe." },
    ],
  },
  {
    id: "FC-2026-0002",
    customer: "Client boutique",
    email: "boutique@example.com",
    phone: "+41 22 111 11 11",
    date: "À venir",
    status: "En préparation",
    payment: "Payée Stripe",
    paymentStatus: "paid",
    total: 579.0,
    carrier: "DHL",
    tracking: "",
    delivery: "Expédition standard",
    address: "Genève, Suisse",
    note: "Exemple d'une commande prête à expédier.",
    items: [
      { productId: products[1]?.id ?? 2, name: products[1]?.name ?? "Produit premium", quantity: 1, price: products[1]?.price ?? 579, image: products[1]?.image ?? "/images/hero-fastcash.png" },
    ],
    history: [
      { label: "Commande créée", date: "À venir", detail: "Commande importée dans le back-office." },
    ],
  },
  {
    id: "FC-2026-0003",
    customer: "Ancien client PrestaShop",
    email: "legacy@example.com",
    phone: "+41 22 222 22 22",
    date: "Migration",
    status: "Historique",
    payment: "Import PrestaShop",
    paymentStatus: "imported",
    total: 349.0,
    carrier: "—",
    tracking: "—",
    delivery: "Commande historique",
    address: "Adresse à compléter",
    note: "Prévisualisation de ce que donnera la migration des anciennes commandes.",
    items: [
      { productId: products[2]?.id ?? 3, name: products[2]?.name ?? "Commande historique", quantity: 1, price: products[2]?.price ?? 349, image: products[2]?.image ?? "/images/hero-fastcash.png" },
    ],
    history: [
      { label: "Commande historique", date: "Migration", detail: "Historique prévu lors de la reprise des données FAST CASH." },
    ],
  },
];

const totalRevenue = adminOrders.reduce((sum, order) => sum + order.total, 0);

export const adminStats = {
  revenue: totalRevenue,
  orders: adminOrders.length,
  averageCart: adminOrders.length ? totalRevenue / adminOrders.length : 0,
  products: products.length,
  activeProducts: products.filter((product) => product.stock > 0).length,
  outOfStock: products.filter((product) => product.stock <= 0).length,
  lowStock: products.filter((product) => product.stock > 0 && product.stock <= 3).length,
  customers: 3,
};

export const topAdminProducts = products
  .slice()
  .sort((a, b) => Number(b.stock > 0) - Number(a.stock > 0) || b.price - a.price)
  .slice(0, 8);

export const lowStockProducts = products
  .filter((product) => product.stock <= 3)
  .slice()
  .sort((a, b) => a.stock - b.stock)
  .slice(0, 12);

export const adminCategoryStats = Array.from(
  products.reduce((acc, product) => {
    const current = acc.get(product.category) ?? {
      name: product.category,
      products: 0,
      stock: 0,
      value: 0,
    };

    current.products += 1;
    current.stock += product.stock;
    current.value += product.price * product.stock;

    acc.set(product.category, current);
    return acc;
  }, new Map<string, { name: string; products: number; stock: number; value: number }>()).values(),
).sort((a, b) => b.products - a.products);

export function getAdminOrderById(id: string) {
  return adminOrders.find((order) => order.id === id);
}

export function formatAdminPrice(value: number, currency = "CHF") {
  return new Intl.NumberFormat("fr-CH", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(value);
}
