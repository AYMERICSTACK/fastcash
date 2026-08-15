import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, FileText, PackageCheck, Truck } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getCustomerSession } from "@/lib/session";
import { formatAdminPrice } from "@/lib/admin-data";
import { getTrackingUrl } from "@/lib/tracking";

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

export default async function CustomerOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getCustomerSession();

  if (!session) {
    redirect("/compte/login");
  }

  const { id } = await params;
  const order = await prisma.order.findFirst({
    where: {
      id,
      customer: {
        id: session.customerId,
      },
    },
    include: {
      customer: true,
      items: true,
      invoice: true,
      payment: true,
      shipment: true,
    },
  });

  if (!order) {
    notFound();
  }

  const trackingUrl = getTrackingUrl(order.shipment?.carrier, order.shipment?.trackingNo);

  return (
    <main className="account-page account-subpage">
      <section className="container account-subpage-inner">
        <Link href="/compte/commandes" className="account-back-link">
          <ArrowLeft size={17} /> Retour aux commandes
        </Link>

        <div className="account-subpage-head">
          <p className="hero-kicker">Commande FAST CASH</p>
          <h1>{order.orderNumber}</h1>
          <p>
            Commande du {new Date(order.createdAt).toLocaleDateString("fr-CH")} · {statusLabel(order.status)}
          </p>
        </div>

        <div className="account-preview-grid">
          <article className="account-preview-card">
            <div className="account-preview-top">
              <PackageCheck size={22} />
              <strong>Statut</strong>
            </div>
            <p>{statusLabel(order.status)}</p>
          </article>

          <article className="account-preview-card">
            <div className="account-preview-top">
              <Truck size={22} />
              <strong>Livraison</strong>
            </div>
            <p>
              {order.status === "REFUNDED"
                ? `${order.shipment?.carrier ?? "Mode de réception"} · Commande remboursée`
                : order.status === "READY_FOR_PICKUP"
                  ? "Votre commande est disponible chez FAST CASH Genève."
                  : `${order.shipment?.carrier ?? "Transporteur à confirmer"}${
                    order.shipment?.trackingNo
                      ? ` · Suivi ${order.shipment.trackingNo}`
                      : " · En préparation"
                  }`}
            </p>
            {trackingUrl ? (
              <a href={trackingUrl} target="_blank" rel="noreferrer" className="text-link">
                Suivre mon colis
              </a>
            ) : null}
          </article>
        </div>

        <section className="account-data-card">
          <h2>Articles commandés</h2>
          <div className="account-data-list">
            {order.items.map((item: { id: string; name: string; quantity: number; price: number }) => (
              <div className="account-data-row" key={item.id}>
                <div>
                  <strong>{item.name}</strong>
                  <span>Quantité : {item.quantity}</span>
                </div>
                <b>{formatAdminPrice(item.price * item.quantity)}</b>
              </div>
            ))}
          </div>

          <div className="account-total-row">
            <span>Total</span>
            <strong>{formatAdminPrice(order.total)}</strong>
          </div>
        </section>

        <section className="account-data-card">
          <h2>Paiement & documents</h2>
          <div className="account-data-list">
            <div className="account-data-row">
              <div>
                <strong>Paiement</strong>
                <span>{order.payment?.provider ?? "Paiement"} · {order.payment?.status === "refunded" ? "Remboursé" : order.payment?.status === "partially_refunded" ? "Partiellement remboursé" : order.payment?.status === "paid" ? "Payé" : order.payment?.status ?? "Confirmé"}</span>
              </div>
              <b>{formatAdminPrice(order.payment?.amount ?? order.total)}</b>
            </div>

            {order.invoice ? (
              <div className="account-data-row">
                <div>
                  <strong>{order.invoice.number}</strong>
                  <span>Facture disponible en PDF</span>
                </div>
                <Link href={`/api/invoices/${order.invoice.id}/pdf`} className="btn btn-gold">
                  <FileText size={17} /> Télécharger
                </Link>
              </div>
            ) : null}
          </div>
        </section>
      </section>
    </main>
  );
}