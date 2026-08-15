import Link from "next/link";
import AdminShell from "./AdminShell";
import styles from "./admin.module.css";
import { prisma } from "@/lib/prisma";
import { formatAdminPrice } from "@/lib/admin-data";
import { formatAdminDate, getCustomerName, getOrderStatusLabel, getStockLabel, getReceptionLabel, isPickupCarrier } from "@/lib/admin-ui";
import { getShopSettings } from "@/lib/settings";

export default async function AdminDashboardPage() {
  const settings = await getShopSettings();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [products, customers, orders, lowStockProducts, outOfStockCount, allOrders, todayOrders, pendingOffers] = await Promise.all([
    prisma.product.count(),
    prisma.customer.count(),
    prisma.order.findMany({ include: { shipment: true, customer: true, payment: true }, orderBy: { createdAt: "desc" }, take: 8 }),
    prisma.product.findMany({ where: { stock: { lte: settings.lowStockThreshold } }, include: { category: true }, orderBy: [{ stock: "asc" }, { updatedAt: "desc" }], take: 6 }),
    prisma.product.count({ where: { stock: { lte: 0 } } }),
    prisma.order.findMany({ select: { total: true, status: true, payment: { select: { status: true } } } }),
    prisma.order.count({ where: { createdAt: { gte: today } } }),
    prisma.productOffer.count({ where: { status: "PENDING" } }),
  ]);

  const paidOrders = allOrders.filter((order) => ["paid", "confirmed"].includes(order.payment?.status || ""));
  const revenue = paidOrders.reduce((sum, order) => sum + order.total, 0);
  const preparing = allOrders.filter((order) => order.status === "PREPARING").length;
  const pending = allOrders.filter((order) => order.status === "PENDING").length;
  const pickup = allOrders.filter((order) => order.status === "READY_FOR_PICKUP").length;
  const shipped = allOrders.filter((order) => order.status === "SHIPPED").length;
  const averageCart = paidOrders.length ? revenue / paidOrders.length : 0;

  return (
    <AdminShell>
      <header className={styles.topbar}>
        <div><p className={styles.kicker}>Centre de pilotage FAST CASH</p><h1 className={styles.title}>Pilotage FAST CASH</h1><p className={styles.subtitle}>Ventes encaissées, commandes prioritaires, clients et alertes de stock en temps réel.</p></div>
        <span className={styles.badge}>Système opérationnel</span>
      </header>

      <section className={styles.grid4}>
        <article className={styles.card}><p className={styles.statLabel}>CA encaissé</p><div className={styles.statValue}>{formatAdminPrice(revenue, settings.defaultCurrency)}</div><p className={styles.statHint}>{paidOrders.length} paiement(s) confirmé(s)</p></article>
        <article className={styles.card}><p className={styles.statLabel}>Commandes aujourd’hui</p><div className={styles.statValue}>{todayOrders}</div><p className={styles.statHint}>{pending + preparing} à traiter</p></article>
        <article className={styles.card}><p className={styles.statLabel}>Panier moyen</p><div className={styles.statValueSmall}>{formatAdminPrice(averageCart, settings.defaultCurrency)}</div><p className={styles.statHint}>Commandes encaissées</p></article>
        <article className={styles.card}><p className={styles.statLabel}>Catalogue</p><div className={styles.statValue}>{products}</div><p className={styles.statHint}>{outOfStockCount} rupture(s) · {customers} client(s)</p></article>
      </section>

      <section className={styles.orderPilotGrid}>
        <Link href="/pilotage/commandes?vue=new" className={styles.orderPilotCard}><span>Nouvelles</span><strong>{pending}</strong><small>Prendre en charge</small></Link>
        <Link href="/pilotage/commandes?vue=preparing" className={styles.orderPilotCard}><span>En préparation</span><strong>{preparing}</strong><small>Continuer le traitement</small></Link>
        <Link href="/pilotage/commandes?vue=pickup" className={styles.orderPilotCard}><span>Prêtes au retrait</span><strong>{pickup}</strong><small>Remettre au client</small></Link>
        <Link href="/pilotage/commandes?vue=shipped" className={styles.orderPilotCard}><span>Expédiées</span><strong>{shipped}</strong><small>Suivre les livraisons</small></Link>
        <Link href="/pilotage/offres" className={`${styles.orderPilotCard} ${pendingOffers > 0 ? styles.offerPilotCard : ""}`}><span>Offres clients</span><strong>{pendingOffers}</strong><small>{pendingOffers > 0 ? "À traiter maintenant" : "Aucune offre en attente"}</small></Link>
      </section>

      <section className={styles.grid2}>
        <article className={styles.card}>
          <div className={styles.sectionHead}><div><p className={styles.kicker}>Priorité</p><h2 className={styles.sectionTitle}>Dernières commandes</h2></div><Link href="/pilotage/commandes" className={styles.tableAction}>Tout voir</Link></div>
          {orders.length === 0 ? <div className={styles.placeholder}><div><h3>Aucune commande</h3><p>Les ventes validées apparaîtront ici.</p></div></div> : (
            <div className={styles.tableScroll}><table className={styles.table}><thead><tr><th>Commande</th><th>Client</th><th>Statut</th><th>Réception</th><th>Total</th><th></th></tr></thead><tbody>{orders.map((order) => (
              <tr key={order.id}><td><span className={styles.stacked}><strong>{order.orderNumber}</strong><span>{formatAdminDate(order.createdAt)}</span></span></td><td>{getCustomerName(order.customer)}</td><td><span className={styles.status}>{getOrderStatusLabel(order.status)}</span></td><td><span className={`${styles.receptionBadge} ${isPickupCarrier(order.shipment?.carrier) ? styles.receptionPickup : styles.receptionShipping}`}>{getReceptionLabel(order.shipment?.carrier, settings.defaultCarrier)}</span></td><td>{formatAdminPrice(order.total, order.currency || settings.defaultCurrency)}</td><td><Link href={`/pilotage/commandes/${order.id}`} className={styles.tableAction}>Ouvrir</Link></td></tr>
            ))}</tbody></table></div>
          )}
        </article>

        <article className={styles.card}>
          <div className={styles.sectionHead}><div><p className={styles.kicker}>Stock</p><h2 className={styles.sectionTitle}>Alertes magasin</h2></div><Link href="/pilotage/stocks" className={styles.tableAction}>Stocks</Link></div>
          <div className={styles.alertList}>{lowStockProducts.length === 0 ? <p className={styles.formNote}>Aucune alerte stock selon le seuil actuel.</p> : lowStockProducts.map((product) => (
            <Link key={product.id} href={`/pilotage/produits/${product.id}`} className={styles.alertRow}><span><strong>{product.name}</strong><small>{product.category?.name || "Sans catégorie"}</small></span><em>{getStockLabel(product.stock, settings.lowStockThreshold)} · {product.stock}</em></Link>
          ))}</div>
        </article>
      </section>
    </AdminShell>
  );
}
