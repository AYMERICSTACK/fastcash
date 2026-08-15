
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Download, FileText } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getCustomerSession } from "@/lib/session";
import { formatAdminPrice } from "@/lib/admin-data";
import { getShopSettings } from "@/lib/settings";

export default async function CustomerInvoicesPage() {
  const settings = await getShopSettings();
  const session = await getCustomerSession();

  if (!session) {
    redirect("/compte/login");
  }

  const customer = await prisma.customer.findUnique({
    where: { id: session.customerId },
    include: {
      orders: {
        include: {
          invoice: true,
          payment: true,
        },
        orderBy: {
          createdAt: "desc",
        },
      },
    },
  });

  const invoices = customer?.orders
    .filter((order: { invoice?: { id: string } | null }) => order.invoice)
    .map((order: { orderNumber: string; currency: string; payment?: { status: string } | null; invoice?: { id: string; number: string; amount: number; createdAt: Date } | null }) => ({ order, invoice: order.invoice! })) ?? [];

  return (
    <main className="account-page account-subpage">
      <section className="container account-subpage-inner">
        <Link href="/compte" className="account-back-link">
          <ArrowLeft size={17} /> Retour au compte
        </Link>

        <div className="account-subpage-head">
          <p className="hero-kicker">Documents</p>
          <h1>Mes factures</h1>
          <p>Retrouvez les factures PDF liées à vos commandes FAST CASH.</p>
        </div>

        {invoices.length === 0 ? (
          <div className="account-placeholder-card">
            <FileText size={32} />
            <h3>Aucune facture disponible</h3>
            <p>Vos factures apparaîtront ici après validation des commandes.</p>
          </div>
        ) : (
          <div className="account-order-list">
            {invoices.map(({ order, invoice }: { order: { orderNumber: string; currency: string; payment?: { status: string } | null }; invoice: { id: string; number: string; amount: number; createdAt: Date } }) => {
              const paymentStatus = order.payment?.status?.toLowerCase();
              const isRefunded = paymentStatus === "refunded";
              const isPartiallyRefunded = paymentStatus === "partially_refunded";

              return (
                <article className="account-invoice-card" key={invoice.id}>
                  <div className="account-invoice-identity">
                    <span className="account-invoice-eyebrow">Facture</span>
                    <strong className="account-invoice-number">{invoice.number}</strong>
                    <span className="account-invoice-order">Commande <strong>{order.orderNumber}</strong></span>
                  </div>

                  <div className="account-invoice-meta">
                    <span className="account-invoice-date">{new Date(invoice.createdAt).toLocaleDateString("fr-CH")}</span>
                    {isRefunded ? (
                      <span className="account-invoice-status is-refunded">Remboursée</span>
                    ) : isPartiallyRefunded ? (
                      <span className="account-invoice-status is-partial">Partiellement remboursée</span>
                    ) : (
                      <span className="account-invoice-status">Disponible</span>
                    )}
                  </div>

                  <div className="account-invoice-actions">
                    <strong className="account-invoice-amount">{formatAdminPrice(invoice.amount, order.currency || settings.defaultCurrency)}</strong>
                    <Link href={`/api/invoices/${invoice.id}/pdf`} className="btn btn-gold account-invoice-download">
                      <Download size={17} /> Télécharger PDF
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
