import Link from "next/link";
import { Prisma } from "@prisma/client";
import AdminShell from "../AdminShell";
import styles from "../admin.module.css";
import { prisma } from "@/lib/prisma";
import { formatAdminPrice } from "@/lib/admin-data";
import { formatAdminDate, getCustomerName, getOrderStatusLabel, getPaymentStatusLabel, getReceptionLabel, isPickupCarrier } from "@/lib/admin-ui";
import { getShopSettings } from "@/lib/settings";

const views = {
  all: { label: "Toutes", statuses: null },
  new: { label: "Nouvelles", statuses: ["PENDING"] },
  preparing: { label: "À préparer", statuses: ["PREPARING"] },
  pickup: { label: "Prêtes au retrait", statuses: ["READY_FOR_PICKUP"] },
  shipping: { label: "À expédier", statuses: ["PREPARING"], shippingOnly: true },
  shipped: { label: "Expédiées", statuses: ["SHIPPED"] },
  completed: { label: "Terminées", statuses: ["DELIVERED"] },
} as const;

type ViewKey = keyof typeof views;

type SearchParams = {
  vue?: string;
  q?: string;
  paiement?: string;
  reception?: string;
};

export default async function AdminOrdersPage({ searchParams }: { searchParams?: Promise<SearchParams> }) {
  const settings = await getShopSettings();
  const params = await searchParams;
  const requestedView = params?.vue;
  const activeView: ViewKey = requestedView && requestedView in views ? (requestedView as ViewKey) : "all";
  const query = params?.q?.trim() || "";
  const paymentFilter = params?.paiement || "all";
  const receptionFilter = params?.reception || "all";

  const conditions: Prisma.OrderWhereInput[] = [];
  if (query) {
    conditions.push({
      OR: [
        { orderNumber: { contains: query, mode: "insensitive" } },
        { customer: { is: { email: { contains: query, mode: "insensitive" } } } },
        { customer: { is: { firstName: { contains: query, mode: "insensitive" } } } },
        { customer: { is: { lastName: { contains: query, mode: "insensitive" } } } },
        { invoice: { is: { number: { contains: query, mode: "insensitive" } } } },
      ],
    });
  }
  if (paymentFilter === "paid") {
    conditions.push({ payment: { is: { status: { in: ["paid", "confirmed"] } } } });
  }
  if (paymentFilter === "pending") {
    conditions.push({
      OR: [
        { payment: { is: null } },
        { payment: { is: { status: { in: ["pending", "unpaid", "failed"] } } } },
      ],
    });
  }
  const where: Prisma.OrderWhereInput = conditions.length ? { AND: conditions } : {};


  const orders = await prisma.order.findMany({
    where,
    include: { customer: true, payment: true, shipment: true, invoice: true },
    orderBy: { createdAt: "desc" },
  });

  const isPickup = isPickupCarrier;
  const counts: Record<ViewKey, number> = {
    all: orders.length,
    new: orders.filter((order) => order.status === "PENDING").length,
    preparing: orders.filter((order) => order.status === "PREPARING").length,
    pickup: orders.filter((order) => order.status === "READY_FOR_PICKUP").length,
    shipping: orders.filter((order) => order.status === "PREPARING" && !isPickup(order.shipment?.carrier)).length,
    shipped: orders.filter((order) => order.status === "SHIPPED").length,
    completed: orders.filter((order) => order.status === "DELIVERED").length,
  };

  const current = views[activeView];
  const filteredOrders = orders.filter((order) => {
    if (current.statuses && !(current.statuses as readonly string[]).includes(order.status)) return false;
    if ("shippingOnly" in current && current.shippingOnly && isPickup(order.shipment?.carrier)) return false;
    if (receptionFilter === "pickup" && !isPickup(order.shipment?.carrier)) return false;
    if (receptionFilter === "shipping" && isPickup(order.shipment?.carrier)) return false;
    return true;
  });

  const revenue = orders
    .filter((order) => ["paid", "confirmed"].includes(order.payment?.status || ""))
    .reduce((sum, order) => sum + order.total, 0);

  const buildViewHref = (view: ViewKey) => {
    const next = new URLSearchParams();
    if (view !== "all") next.set("vue", view);
    if (query) next.set("q", query);
    if (paymentFilter !== "all") next.set("paiement", paymentFilter);
    if (receptionFilter !== "all") next.set("reception", receptionFilter);
    const suffix = next.toString();
    return `/pilotage/commandes${suffix ? `?${suffix}` : ""}`;
  };

  return (
    <AdminShell>
      <header className={styles.topbar}>
        <div>
          <p className={styles.kicker}>Centre opérationnel</p>
          <h1 className={styles.title}>Pilotage des commandes</h1>
          <p className={styles.subtitle}>Recherche, préparation, retraits, expéditions, paiements et factures depuis une vue unique.</p>
        </div>
        <span className={styles.badge}>{orders.length} commande(s)</span>
      </header>

      <section className={styles.orderPilotGrid}>
        {(Object.keys(views) as ViewKey[]).filter((key) => key !== "all").map((key) => (
          <Link key={key} href={buildViewHref(key)} className={`${styles.orderPilotCard} ${activeView === key ? styles.orderPilotCardActive : ""}`}>
            <span>{views[key].label}</span><strong>{counts[key]}</strong><small>Voir les commandes</small>
          </Link>
        ))}
      </section>

      <section className={styles.grid4}>
        <article className={styles.card}><p className={styles.statLabel}>CA encaissé</p><div className={styles.statValue}>{formatAdminPrice(revenue, settings.defaultCurrency)}</div><p className={styles.statHint}>Paiements confirmés</p></article>
        <article className={styles.card}><p className={styles.statLabel}>Vue active</p><div className={styles.statValueSmall}>{current.label}</div><p className={styles.statHint}>{filteredOrders.length} résultat(s)</p></article>
        <article className={styles.card}><p className={styles.statLabel}>À préparer</p><div className={styles.statValue}>{counts.preparing}</div><p className={styles.statHint}>Priorité opérationnelle</p></article>
        <article className={styles.card}><p className={styles.statLabel}>À expédier</p><div className={styles.statValue}>{counts.shipping}</div><p className={styles.statHint}>Suivi à renseigner</p></article>
      </section>

      <section className={styles.card}>
        <form className={styles.filters} method="get">
          {activeView !== "all" ? <input type="hidden" name="vue" value={activeView} /> : null}
          <label className={styles.filter}><span>Recherche</span><input name="q" defaultValue={query} placeholder="Commande, client, email, facture…" /></label>
          <label className={styles.filter}><span>Paiement</span><select name="paiement" defaultValue={paymentFilter}><option value="all">Tous</option><option value="paid">Payés</option><option value="pending">À contrôler</option></select></label>
          <label className={styles.filter}><span>Réception</span><select name="reception" defaultValue={receptionFilter}><option value="all">Toutes</option><option value="pickup">Retrait boutique</option><option value="shipping">Expédition</option></select></label>
          <div className={styles.formActions}><button className={styles.actionBtn} type="submit">Filtrer</button><Link className={styles.buttonSecondary} href="/pilotage/commandes">Réinitialiser</Link></div>
        </form>
      </section>

      <section className={styles.card}>
        <div className={styles.sectionHead}><div><p className={styles.kicker}>File de traitement</p><h2 className={styles.sectionTitle}>{current.label}</h2></div>{activeView !== "all" ? <Link href={buildViewHref("all")} className={styles.tableAction}>Afficher toutes</Link> : null}</div>
        {filteredOrders.length === 0 ? (
          <div className={styles.placeholder}><div><h3>Aucune commande trouvée</h3><p>Modifiez les filtres ou attendez l’arrivée de nouvelles commandes.</p></div></div>
        ) : (
          <div className={styles.tableScroll}>
            <table className={styles.table}>
              <thead><tr><th>Commande</th><th>Client</th><th>Date</th><th>Paiement</th><th>Statut</th><th>Réception</th><th>Total</th><th></th></tr></thead>
              <tbody>{filteredOrders.map((order) => (
                <tr key={order.id}>
                  <td><span className={styles.stacked}><strong>{order.orderNumber}</strong><span>{order.invoice?.number ? `Facture ${order.invoice.number}` : "Facture à générer"}</span></span></td>
                  <td><span className={styles.stacked}><strong>{getCustomerName(order.customer)}</strong><span>{order.customer.email}</span></span></td>
                  <td>{formatAdminDate(order.createdAt)}</td>
                  <td><span className={styles.status}>{getPaymentStatusLabel(order.payment?.status)}</span></td>
                  <td><span className={styles.status}>{getOrderStatusLabel(order.status)}</span></td>
                  <td><span className={`${styles.receptionBadge} ${isPickup(order.shipment?.carrier) ? styles.receptionPickup : styles.receptionShipping}`}>{getReceptionLabel(order.shipment?.carrier, settings.defaultCarrier)}</span></td>
                  <td>{formatAdminPrice(order.total, order.currency || settings.defaultCurrency)}</td>
                  <td><Link className={styles.tableAction} href={`/pilotage/commandes/${order.id}`}>Ouvrir</Link></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </section>
    </AdminShell>
  );
}
