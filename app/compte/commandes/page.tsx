import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, FileText, PackageCheck, Truck } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getCustomerSession } from "@/lib/session";
import { formatAdminPrice } from "@/lib/admin-data";

export const metadata = {
  title: "Mes commandes | FAST CASH Genève",
  description: "Historique des commandes client FAST CASH Genève.",
};

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    PENDING: "Commande reçue",
    PREPARING: "En préparation",
    READY_FOR_PICKUP: "Prête au retrait",
    SHIPPED: "Expédiée",
    DELIVERED: "Livrée",
    CANCELLED: "Annulée",
    REFUNDED: "Remboursée",
  };

  return labels[status] ?? status;
}

export default async function CustomerOrdersPage() {
  const session = await getCustomerSession();

  if (!session) {
    redirect("/compte/login");
  }

  const customer = await prisma.customer.findUnique({
    where: { id: session.customerId },
    include: {
      orders: {
        include: {
          items: true,
          invoice: true,
          shipment: true,
          payment: true,
        },
        orderBy: {
          createdAt: "desc",
        },
      },
    },
  });

  if (!customer) {
    redirect("/compte/login");
  }

  return (
    <main className="account-page account-subpage">
      <section className="container account-subpage-inner">
        <Link href="/compte" className="account-back-link">
          <ArrowLeft size={17} /> Retour au compte
        </Link>

        <div className="account-subpage-head">
          <p className="hero-kicker">Historique client</p>
          <h1>Mes commandes</h1>
          <p>
            Retrouvez vos achats FAST CASH, leur statut de préparation, les informations de livraison et les factures associées.
          </p>
        </div>

        {customer.orders.length === 0 ? (
          <div className="account-empty-state">
            <PackageCheck size={34} />
            <strong>Aucune commande pour le moment</strong>
            <p>Vos commandes apparaîtront ici après validation d'un achat FAST CASH.</p>
            <Link href="/categories/apple" className="btn btn-gold">Voir le catalogue</Link>
          </div>
        ) : (
          <div className="account-order-list">
            {customer.orders.map((order: { id: string; orderNumber: string; status: string; createdAt: Date; total: number; currency: string; invoice?: { id: string } | null; items: Array<{ id: string }>; shipment?: { trackingNo: string | null } | null }) => (
              <article className="account-order-card" key={order.id}>
                <div className="account-order-main">
                  <span className="account-pill">{statusLabel(order.status)}</span>
                  <strong>{order.orderNumber}</strong>
                  <p>
                    {order.items.length} article{order.items.length > 1 ? "s" : ""} · {new Date(order.createdAt).toLocaleDateString("fr-CH")}
                  </p>
                </div>

                <div className="account-order-meta">
                  <strong>{formatAdminPrice(order.total)}</strong>
                  {order.status === "REFUNDED" ? (
                    <span><PackageCheck size={16} /> Commande remboursée</span>
                  ) : order.status === "READY_FOR_PICKUP" ? (
                    <span><PackageCheck size={16} /> Disponible en boutique</span>
                  ) : order.shipment?.trackingNo ? (
                    <span><Truck size={16} /> Suivi {order.shipment.trackingNo}</span>
                  ) : (
                    <span><PackageCheck size={16} /> Livraison en préparation</span>
                  )}
                  {order.invoice ? (
                    <Link href={`/api/invoices/${order.invoice.id}/pdf`} className="account-inline-link">
                      <FileText size={16} /> Facture PDF
                    </Link>
                  ) : null}
                </div>

                <Link href={`/compte/commandes/${order.id}`} className="btn btn-light">
                  Voir le détail
                </Link>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
