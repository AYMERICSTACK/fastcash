
import Link from "next/link";
import AdminShell from "../AdminShell";
import styles from "../admin.module.css";
import { prisma } from "@/lib/prisma";
import { formatAdminPrice } from "@/lib/admin-data";


function paymentStatusLabel(status?: string | null) {
  switch ((status ?? "").toLowerCase()) {
    case "paid":
      return "Payée";
    case "refunded":
      return "Remboursée";
    case "pending":
      return "En attente";
    case "failed":
      return "Échouée";
    case "canceled":
    case "cancelled":
      return "Annulée";
    case "requires_payment_method":
      return "Paiement requis";
    case "processing":
      return "En cours";
    default:
      return status || "-";
  }
}

export default async function InvoicesPage() {
  const invoices = await prisma.invoice.findMany({
    include: {
      order: {
        include: {
          customer: true,
          payment: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return (
    <AdminShell>
      <header className={styles.topbar}>
        <div>
          <p className={styles.kicker}>Facturation</p>
          <h1 className={styles.title}>Factures</h1>
          <p className={styles.subtitle}>Documents de commande, téléchargement PDF et suivi paiement.</p>
        </div>
        <span className={styles.badge}>{invoices.length} facture(s)</span>
      </header>

      <section className={styles.card}>
        <div className={styles.adminDesktopTable}><table className={styles.table}>
          <thead>
            <tr>
              <th>Facture</th>
              <th>Commande</th>
              <th>Client</th>
              <th>Montant</th>
              <th>Paiement</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {invoices.map((invoice) => (
              <tr key={invoice.id}>
                <td>{invoice.number}</td>
                <td>{invoice.order.orderNumber}</td>
                <td>{invoice.order.customer.firstName} {invoice.order.customer.lastName}</td>
                <td>{formatAdminPrice(invoice.amount)}</td>
                <td><span className={styles.badge}>{paymentStatusLabel(invoice.order.payment?.status)}</span></td>
                <td>
                  <div className={styles.actionsCompact}>
                    <Link className={styles.tableAction} href={`/admin/invoices/${invoice.id}`}>Ouvrir</Link>
                    <Link className={styles.tableAction} href={`/api/invoices/${invoice.id}/pdf`}>PDF</Link>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table></div>
        <div className={styles.adminMobileList}>
          {invoices.map((invoice) => (
            <article key={invoice.id} className={styles.adminMobileCard}>
              <div className={styles.adminMobileCardTop}>
                <strong>{invoice.number}</strong>
                <span className={styles.badge}>{paymentStatusLabel(invoice.order.payment?.status)}</span>
              </div>
              <div className={styles.adminMobileMain}>
                <strong>{invoice.order.customer.firstName} {invoice.order.customer.lastName}</strong>
                <span>Commande {invoice.order.orderNumber}</span>
              </div>
              <div className={styles.adminMobileMetaGrid}>
                <span><small>Montant</small><strong>{formatAdminPrice(invoice.amount)}</strong></span>
                <span><small>Paiement</small><strong>{paymentStatusLabel(invoice.order.payment?.status)}</strong></span>
              </div>
              <div className={styles.adminMobileActions}>
                <Link className={styles.adminMobileOpen} href={`/pilotage/factures/${invoice.id}`}>Ouvrir →</Link>
                <Link className={styles.adminMobileOpen} href={`/api/invoices/${invoice.id}/pdf`}>PDF ↓</Link>
              </div>
            </article>
          ))}
        </div>
      </section>
    </AdminShell>
  );
}
