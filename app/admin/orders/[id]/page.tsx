import Link from "next/link";
import { notFound } from "next/navigation";
import AdminShell from "../../AdminShell";
import styles from "../../admin.module.css";
import { prisma } from "@/lib/prisma";
import { formatAdminPrice } from "@/lib/admin-data";
import { formatAdminDate, getCustomerName, getOrderStatusLabel, getPaymentStatusLabel } from "@/lib/admin-ui";
import { getShopSettings } from "@/lib/settings";
import { OrderWorkflowForm } from "./OrderWorkflowForm";
import { getTrackingUrl } from "@/lib/tracking";
import { getAllowedOrderTransitions } from "@/lib/order-workflow";
import { getStripePublicStatus } from "@/lib/stripe";
import { StripePaymentPanel } from "./StripePaymentPanel";

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const settings = await getShopSettings();
  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      customer: { include: { addresses: true } },
      items: true,
      payment: true,
      shipment: true,
      invoice: true,
    },
  });
  if (!order) notFound();

  const customerName = getCustomerName(order.customer);
  const deliveryAddress = order.customer.addresses[0];
  const currency = order.currency || settings.defaultCurrency;
  const isPickupOrder = /retrait|pickup/i.test(order.shipment?.carrier || "");
  const trackingUrl = getTrackingUrl(order.shipment?.carrier, order.shipment?.trackingNo);
  const stripeStatus = getStripePublicStatus();
  const providerData = order.payment?.providerData && !Array.isArray(order.payment.providerData) && typeof order.payment.providerData === "object"
    ? order.payment.providerData as Record<string, unknown>
    : {};
  const providerString = (key: string) => typeof providerData[key] === "string" ? String(providerData[key]) : null;
  const isStripePayment = order.payment?.provider.toLowerCase() === "stripe";

  return (
    <AdminShell>
      <header className={styles.topbar}>
        <div>
          <p className={styles.kicker}>Commande</p>
          <h1 className={styles.title}>{order.orderNumber}</h1>
          <p className={styles.subtitle}>
            Suivi complet : client, paiement, préparation, livraison et facture.
          </p>
        </div>
        <div className={styles.headerActions}>
          {order.invoice ? (
            <Link href={`/api/invoices/${order.invoice.id}/pdf`} className={styles.button}>
              Télécharger PDF
            </Link>
          ) : null}
          <Link href="/pilotage/commandes" className={styles.buttonSecondary}>
            ← Retour
          </Link>
        </div>
      </header>

      <section className={styles.grid4}>
        <article className={styles.card}>
          <p className={styles.statLabel}>Total</p>
          <div className={styles.statValueSmall}>{formatAdminPrice(order.total, currency)}</div>
          <p className={styles.statHint}>{order.items.length} ligne(s)</p>
        </article>
        <article className={styles.card}>
          <p className={styles.statLabel}>Commande</p>
          <div className={styles.statValueSmall}>{getOrderStatusLabel(order.status)}</div>
          <p className={styles.statHint}>Créée le {formatAdminDate(order.createdAt)}</p>
        </article>
        <article className={styles.card}>
          <p className={styles.statLabel}>Paiement</p>
          <div className={styles.statValueSmall}>{getPaymentStatusLabel(order.payment?.status)}</div>
          <p className={styles.statHint}>{order.payment?.provider || "Moyen à confirmer"}</p>
        </article>
        <article className={styles.card}>
          <p className={styles.statLabel}>Livraison</p>
          <div className={styles.statValueSmall}>{order.shipment?.readyAt ? "Prête au retrait" : order.shipment?.trackingNo ? "Suivi ajouté" : "À compléter"}</div>
          <p className={styles.statHint}>{order.shipment?.carrier || settings.defaultCarrier}</p>
        </article>
      </section>

      <section className={styles.grid2}>
        <article className={styles.card}>
          <div className={styles.sectionHead}>
            <div>
              <p className={styles.kicker}>Client</p>
              <h2 className={styles.sectionTitle}>{customerName}</h2>
            </div>
            <Link href={`/pilotage/clients/${order.customer.id}`} className={styles.tableAction}>
              Fiche client
            </Link>
          </div>
          <div className={styles.infoList}>
            <div>
              <span>Email</span>
              <strong>{order.customer.email}</strong>
            </div>
            <div>
              <span>Téléphone</span>
              <strong>{order.customer.phone || "—"}</strong>
            </div>
            <div>
              <span>Adresse</span>
              <strong>
                {deliveryAddress
                  ? `${deliveryAddress.line1}${deliveryAddress.line2 ? `, ${deliveryAddress.line2}` : ""}, ${deliveryAddress.postalCode || ""} ${deliveryAddress.city}, ${deliveryAddress.country}`
                  : "Adresse à compléter"}
              </strong>
            </div>
          </div>
        </article>

        <article className={styles.card}>
          <div className={styles.sectionHead}>
            <div>
              <p className={styles.kicker}>Documents</p>
              <h2 className={styles.sectionTitle}>Paiement & facture</h2>
            </div>
            <span className={styles.badge}>{order.invoice?.number || "À générer"}</span>
          </div>
          <div className={styles.infoList}>
            <div>
              <span>Référence paiement</span>
              <strong>{order.payment?.reference || "—"}</strong>
            </div>
            <div>
              <span>Montant payé</span>
              <strong>{order.payment ? formatAdminPrice(order.payment.amount, currency) : "—"}</strong>
            </div>
            <div>
              <span>Facture</span>
              <strong>{order.invoice?.number || "Facture non créée"}</strong>
            </div>
            {order.payment?.confirmedAt ? (
              <div>
                <span>Paiement confirmé</span>
                <strong>{formatAdminDate(order.payment.confirmedAt)}</strong>
              </div>
            ) : null}
            {order.payment && order.payment.refundedAmount > 0 ? (
              <div>
                <span>Montant remboursé</span>
                <strong>{formatAdminPrice(order.payment.refundedAmount, currency)}</strong>
              </div>
            ) : null}
          </div>
        </article>
      </section>

      {isStripePayment && order.payment ? (
        <section className={styles.card}>
          <div className={styles.sectionHead}>
            <div>
              <p className={styles.kicker}>Paiement Stripe</p>
              <h2 className={styles.sectionTitle}>Pilotage de la transaction</h2>
            </div>
            <span className={styles.badge}>{stripeStatus.mode === "live" ? "Production" : "Mode test"}</span>
          </div>
          <StripePaymentPanel
            orderId={order.id}
            currency={currency}
            amount={order.payment.amount}
            refundedAmount={order.payment.refundedAmount}
            paymentStatus={order.payment.status}
            paymentIntentId={order.payment.reference || providerString("paymentIntentId")}
            checkoutSessionId={providerString("checkoutSessionId")}
            chargeId={providerString("chargeId")}
            latestEventType={providerString("latestEventType")}
            latestEventCreatedAt={providerString("latestEventCreatedAt")}
            failureMessage={providerString("failureMessage")}
            disputeStatus={providerString("disputeStatus")}
            stripeMode={stripeStatus.mode}
            stockRestockedAt={providerString("stockRestockedAt")}
          />
        </section>
      ) : null}

      <section className={styles.card}>
        <div className={styles.sectionHead}>
          <div>
            <p className={styles.kicker}>Produits</p>
            <h2 className={styles.sectionTitle}>Contenu de la commande</h2>
          </div>
          <strong>{formatAdminPrice(order.total, currency)}</strong>
        </div>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Produit</th>
              <th>Qté</th>
              <th>Prix unitaire</th>
              <th>Total ligne</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((item) => (
              <tr key={item.id}>
                <td>{item.name}</td>
                <td>{item.quantity}</td>
                <td>{formatAdminPrice(item.price, currency)}</td>
                <td>{formatAdminPrice(item.price * item.quantity, currency)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className={styles.card}>
        <div className={styles.sectionHead}>
          <div>
            <p className={styles.kicker}>Workflow</p>
            <h2 className={styles.sectionTitle}>Statut & livraison</h2>
          </div>
          <span className={styles.badge}>Sauvegarde active</span>
        </div>

        <OrderWorkflowForm
          orderId={order.id}
          currentStatus={order.status}
          allowedStatuses={[...getAllowedOrderTransitions(order.status)]}
          currentShipmentStatus={order.shipment?.status}
          currentTrackingNo={order.shipment?.trackingNo}
          currentCarrier={order.shipment?.carrier || settings.defaultCarrier}
          isPickupOrder={isPickupOrder}
          readyAt={order.shipment?.readyAt?.toISOString() || null}
          readyEmailSentAt={order.shipment?.readyEmailSentAt?.toISOString() || null}
          shippedAt={order.shipment?.shippedAt?.toISOString() || null}
          shippedEmailSentAt={order.shipment?.shippedEmailSentAt?.toISOString() || null}
        />
      </section>

      <section className={styles.card}>
        <h3 className={styles.sectionTitle}>Timeline opérationnelle</h3>
        <div className={styles.timeline}>
          <div>
            <span />
            <strong>Commande créée</strong>
            <p>{formatAdminDate(order.createdAt)} — commande enregistrée dans le système FAST CASH.</p>
          </div>
          {order.payment ? (
            <div>
              <span />
              <strong>Paiement {getPaymentStatusLabel(order.payment.status).toLowerCase()}</strong>
              <p>{formatAdminPrice(order.payment.amount, currency)} via {order.payment.provider}.</p>
            </div>
          ) : null}
          {order.invoice ? (
            <div>
              <span />
              <strong>Facture disponible</strong>
              <p>{order.invoice.number} — PDF téléchargeable depuis le back-office et l'espace client.</p>
            </div>
          ) : null}
          {order.payment && order.payment.refundedAmount > 0 ? (
            <div>
              <span />
              <strong>{order.payment.status === "refunded" ? "Paiement remboursé" : "Remboursement partiel"}</strong>
              <p>{formatAdminPrice(order.payment.refundedAmount, currency)} remboursé via Stripe.</p>
            </div>
          ) : null}
          {providerString("stockRestockedAt") ? (
            <div>
              <span />
              <strong>Retour physique confirmé · stock réintégré</strong>
              <p>{formatAdminDate(new Date(providerString("stockRestockedAt")!))} — les quantités retournées ont été remises en stock depuis le back-office.</p>
            </div>
          ) : null}
          {order.shipment?.readyAt ? (
            <div>
              <span />
              <strong>Commande prête au retrait</strong>
              <p>{formatAdminDate(order.shipment.readyAt)} — {order.shipment.readyEmailSentAt ? "client informé automatiquement par email." : "email client en attente."}</p>
            </div>
          ) : null}
          {order.shipment?.shippedAt ? (
            <div>
              <span />
              <strong>Commande expédiée</strong>
              <p>{formatAdminDate(order.shipment.shippedAt)} — {order.shipment.shippedEmailSentAt ? "client informé automatiquement par email." : "email client en attente."}</p>
            </div>
          ) : null}
          {order.shipment?.trackingNo ? (
            <div>
              <span />
              <strong>Suivi livraison ajouté</strong>
              <p>
                {order.shipment.carrier || settings.defaultCarrier} — {order.shipment.trackingNo}
                {trackingUrl ? <> · <a href={trackingUrl} target="_blank" rel="noreferrer" className={styles.tableAction}>Suivre le colis</a></> : null}
              </p>
            </div>
          ) : null}
        </div>
      </section>
    </AdminShell>
  );
}
