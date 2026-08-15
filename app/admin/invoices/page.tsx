
import Link from "next/link";
import AdminShell from "../AdminShell";
import styles from "../admin.module.css";
import { prisma } from "@/lib/prisma";
import { formatAdminPrice } from "@/lib/admin-data";

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
        <table className={styles.table}>
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
                <td>{invoice.order.payment?.status ?? "-"}</td>
                <td>
                  <div className={styles.actionsCompact}>
                    <Link className={styles.tableAction} href={`/admin/invoices/${invoice.id}`}>Ouvrir</Link>
                    <Link className={styles.tableAction} href={`/api/invoices/${invoice.id}/pdf`}>PDF</Link>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </AdminShell>
  );
}
