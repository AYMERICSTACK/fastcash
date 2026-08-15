import Link from "next/link";
import { notFound } from "next/navigation";
import AdminShell from "../../AdminShell";
import styles from "../../admin.module.css";
import { prisma } from "@/lib/prisma";
import { formatAdminPrice } from "@/lib/admin-data";
import { formatAdminDate, getCustomerName, getOrderStatusLabel } from "@/lib/admin-ui";
import { getShopSettings } from "@/lib/settings";

export default async function CustomerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const settings = await getShopSettings();

  const customer = await prisma.customer.findUnique({
    where: { id },
    include: {
      addresses: true,
      orders: {
        include: { invoice: true, payment: true },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!customer) notFound();

  const total = customer.orders.reduce((sum, order) => sum + order.total, 0);
  const customerName = getCustomerName(customer);

  return (
    <AdminShell>
      <header className={styles.topbar}>
        <div>
          <p className={styles.kicker}>Client</p>
          <h1 className={styles.title}>{customerName}</h1>
          <p className={styles.subtitle}>Fiche client complète : coordonnées, adresses et historique des commandes.</p>
        </div>
        <Link href="/admin/customers" className={styles.buttonSecondary}>← Retour aux clients</Link>
      </header>

      <section className={styles.grid4}>
        <article className={styles.card}>
          <p className={styles.statLabel}>Commandes</p>
          <div className={styles.statValue}>{customer.orders.length}</div>
          <p className={styles.statHint}>Historique client</p>
        </article>
        <article className={styles.card}>
          <p className={styles.statLabel}>Total dépensé</p>
          <div className={styles.statValueSmall}>{formatAdminPrice(total, settings.defaultCurrency)}</div>
          <p className={styles.statHint}>Toutes commandes</p>
        </article>
        <article className={styles.card}>
          <p className={styles.statLabel}>Adresses</p>
          <div className={styles.statValue}>{customer.addresses.length}</div>
          <p className={styles.statHint}>Enregistrées</p>
        </article>
        <article className={styles.card}>
          <p className={styles.statLabel}>Client depuis</p>
          <div className={styles.statValueSmall}>{formatAdminDate(customer.createdAt)}</div>
          <p className={styles.statHint}>Compte FAST CASH</p>
        </article>
      </section>

      <section className={styles.grid2}>
        <article className={styles.card}>
          <h2 className={styles.sectionTitle}>Coordonnées</h2>
          <div className={styles.infoList}>
            <div><span>Email</span><strong>{customer.email}</strong></div>
            <div><span>Téléphone</span><strong>{customer.phone || "—"}</strong></div>
            <div><span>Nom</span><strong>{customerName}</strong></div>
          </div>
        </article>

        <article className={styles.card}>
          <h2 className={styles.sectionTitle}>Adresses</h2>
          {customer.addresses.length === 0 ? (
            <p className={styles.formNote}>Aucune adresse enregistrée.</p>
          ) : (
            <div className={styles.infoList}>
              {customer.addresses.map((address) => (
                <div key={address.id}>
                  <span>{address.label || "Adresse"}</span>
                  <strong>
                    {address.line1}{address.line2 ? `, ${address.line2}` : ""}<br />
                    {address.postalCode || ""} {address.city}, {address.country}
                  </strong>
                </div>
              ))}
            </div>
          )}
        </article>
      </section>

      <section className={styles.card}>
        <div className={styles.sectionHead}>
          <div>
            <p className={styles.kicker}>Historique</p>
            <h2 className={styles.sectionTitle}>Commandes client</h2>
          </div>
          <span className={styles.badge}>{customer.orders.length} commande(s)</span>
        </div>
        {customer.orders.length === 0 ? (
          <div className={styles.placeholder}>
            <div>
              <h3>Aucune commande</h3>
              <p>Ce client n'a pas encore passé commande.</p>
            </div>
          </div>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Commande</th>
                <th>Date</th>
                <th>Statut</th>
                <th>Total</th>
                <th>Facture</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {customer.orders.map((order) => (
                <tr key={order.id}>
                  <td>{order.orderNumber}</td>
                  <td>{formatAdminDate(order.createdAt)}</td>
                  <td><span className={styles.status}>{getOrderStatusLabel(order.status)}</span></td>
                  <td>{formatAdminPrice(order.total, order.currency || settings.defaultCurrency)}</td>
                  <td>{order.invoice?.number || "—"}</td>
                  <td><Link href={`/admin/orders/${order.id}`} className={styles.tableAction}>Ouvrir</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </AdminShell>
  );
}
