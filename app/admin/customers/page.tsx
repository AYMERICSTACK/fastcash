import Link from "next/link";
import AdminShell from "../AdminShell";
import styles from "../admin.module.css";
import { prisma } from "@/lib/prisma";
import { formatAdminPrice } from "@/lib/admin-data";
import { formatAdminDate, getCustomerName } from "@/lib/admin-ui";
import { getShopSettings } from "@/lib/settings";

export default async function AdminCustomersPage() {
  const settings = await getShopSettings();
  const customers = await prisma.customer.findMany({
    include: { orders: true, addresses: true },
    orderBy: { createdAt: "desc" },
  });

  const totalRevenue = customers.reduce(
    (sum, customer) => sum + customer.orders.reduce((orderSum, order) => orderSum + order.total, 0),
    0,
  );
  const customersWithOrders = customers.filter((customer) => customer.orders.length > 0).length;

  return (
    <AdminShell>
      <header className={styles.topbar}>
        <div>
          <p className={styles.kicker}>Relation client</p>
          <h1 className={styles.title}>Clients</h1>
          <p className={styles.subtitle}>
            Historique d'achat, coordonnées, adresses et accès rapide aux commandes client.
          </p>
        </div>
        <span className={styles.badge}>{customers.length} clients</span>
      </header>

      <section className={styles.grid4}>
        <article className={styles.card}>
          <p className={styles.statLabel}>Clients</p>
          <div className={styles.statValue}>{customers.length}</div>
          <p className={styles.statHint}>Comptes en base</p>
        </article>
        <article className={styles.card}>
          <p className={styles.statLabel}>Acheteurs</p>
          <div className={styles.statValue}>{customersWithOrders}</div>
          <p className={styles.statHint}>Avec au moins une commande</p>
        </article>
        <article className={styles.card}>
          <p className={styles.statLabel}>Adresses</p>
          <div className={styles.statValue}>{customers.reduce((sum, customer) => sum + customer.addresses.length, 0)}</div>
          <p className={styles.statHint}>Livraison / facturation</p>
        </article>
        <article className={styles.card}>
          <p className={styles.statLabel}>CA clients</p>
          <div className={styles.statValue}>{formatAdminPrice(totalRevenue, settings.defaultCurrency)}</div>
          <p className={styles.statHint}>Toutes commandes</p>
        </article>
      </section>

      <section className={styles.card}>
        {customers.length === 0 ? (
          <div className={styles.placeholder}>
            <div>
              <h3>Aucun client</h3>
              <p>Les clients apparaîtront ici après création de compte ou commande.</p>
            </div>
          </div>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Client</th>
                <th>Email</th>
                <th>Commandes</th>
                <th>Total</th>
                <th>Créé le</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {customers.map((customer) => {
                const total = customer.orders.reduce((sum, order) => sum + order.total, 0);
                return (
                  <tr key={customer.id}>
                    <td><strong>{getCustomerName(customer)}</strong></td>
                    <td>{customer.email}</td>
                    <td>{customer.orders.length}</td>
                    <td>{formatAdminPrice(total, settings.defaultCurrency)}</td>
                    <td>{formatAdminDate(customer.createdAt)}</td>
                    <td><Link className={styles.tableAction} href={`/admin/customers/${customer.id}`}>Ouvrir</Link></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>
    </AdminShell>
  );
}
