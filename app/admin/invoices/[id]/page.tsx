
import Link from "next/link";
import { notFound } from "next/navigation";
import AdminShell from "../../AdminShell";
import styles from "../../admin.module.css";
import { prisma } from "@/lib/prisma";
import { formatAdminPrice } from "@/lib/admin-data";

export default async function InvoiceDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const invoice = await prisma.invoice.findUnique({
    where: { id },
    include: {
      order: {
        include: {
          customer: { include: { addresses: true } },
          items: true,
          payment: true,
        },
      },
    },
  });

  if (!invoice) notFound();

  const customer = invoice.order.customer;
  const customerName = [customer.firstName, customer.lastName].filter(Boolean).join(" ") || customer.email;

  return (
    <AdminShell>
      <header className={styles.topbar}>
        <div>
          <p className={styles.kicker}>Facture</p>
          <h1 className={styles.title}>{invoice.number}</h1>
          <p className={styles.subtitle}>Commande {invoice.order.orderNumber} · {customerName}</p>
        </div>
        <div className={styles.actions}>
          <Link className={styles.button} href={`/api/invoices/${invoice.id}/pdf`}>Télécharger PDF</Link>
          <Link className={styles.buttonSecondary} href={`/admin/orders/${invoice.order.id}`}>Voir commande</Link>
        </div>
      </header>

      <section className={styles.grid2}>
        <article className={styles.card}>
          <h2 className={styles.sectionTitle}>Client</h2>
          <div className={styles.infoList}>
            <div><span>Nom</span><strong>{customerName}</strong></div>
            <div><span>Email</span><strong>{customer.email}</strong></div>
            <div><span>Paiement</span><strong>{invoice.order.payment?.provider ?? "-"} · {invoice.order.payment?.status ?? "-"}</strong></div>
          </div>
        </article>

        <article className={styles.card}>
          <h2 className={styles.sectionTitle}>Résumé</h2>
          <div className={styles.invoicePreview}>
            <strong>{invoice.number}</strong>
            <span>Total</span>
            <p>{formatAdminPrice(invoice.amount)}</p>
            <span>Date</span>
            <p>{invoice.createdAt.toLocaleDateString("fr-CH")}</p>
          </div>
        </article>
      </section>

      <section className={styles.card}>
        <h2 className={styles.sectionTitle}>Produits facturés</h2>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Produit</th>
              <th>Qté</th>
              <th>Prix</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            {invoice.order.items.map((item) => (
              <tr key={item.id}>
                <td>{item.name}</td>
                <td>{item.quantity}</td>
                <td>{formatAdminPrice(item.price)}</td>
                <td>{formatAdminPrice(item.price * item.quantity)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </AdminShell>
  );
}
