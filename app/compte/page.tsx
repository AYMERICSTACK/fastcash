import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, FileText, MapPin, Package, ShieldCheck, UserRound } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getCustomerSession } from "@/lib/session";
import { formatAdminPrice } from "@/lib/admin-data";
import { getOrderStatusLabel } from "@/lib/admin-ui";
import { getShopSettings } from "@/lib/settings";
import CustomerLogoutButton from "./CustomerLogoutButton";

export const metadata = {
  title: "Mon compte | FAST CASH Genève",
  description: "Espace client FAST CASH Genève : commandes, factures, adresses et suivi de livraison.",
};

function displayName(firstName?: string | null, lastName?: string | null) {
  const name = [firstName, lastName].filter(Boolean).join(" ").trim();
  return name || "Client FAST CASH";
}

export default async function AccountPage() {
  const settings = await getShopSettings();
  const session = await getCustomerSession();

  if (!session) {
    redirect("/compte/login");
  }

  const customer = await prisma.customer.findUnique({
    where: { id: session.customerId },
    include: {
      addresses: true,
      orders: {
        include: {
          invoice: true,
          shipment: true,
        },
        orderBy: {
          createdAt: "desc",
        },
      },
    },
  });

  if (!customer) {
    return (
      <main className="account-page">
        <section className="account-hero">
          <div className="container account-hero-grid">
            <div>
              <p className="hero-kicker">Espace client</p>
              <h1>Compte introuvable.</h1>
              <p>
                Aucun compte FAST CASH n'est encore rattaché à cette session. Lors de la reprise de l'historique FAST CASH, les anciens clients seront importés automatiquement.
              </p>
              <div className="account-hero-actions">
                <Link href="/compte/login" className="btn btn-gold">
                  Essayer un autre email <ArrowRight size={18} />
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>
    );
  }

  const orders = customer.orders;
  const invoicesCount = orders.filter((order: { invoice?: { id: string } | null }) => order.invoice).length;
  const lastOrder = orders[0];
  const totalSpent = orders.reduce((sum: number, order: { total: number }) => sum + order.total, 0);

  return (
    <main className="account-page">
      <section className="account-hero">
        <div className="container account-hero-grid">
          <div>
            <p className="hero-kicker">Espace client</p>
            <h1>Bonjour {displayName(customer.firstName, customer.lastName)}.</h1>
            <p>
              Retrouvez vos commandes, factures, adresses et suivis de livraison FAST CASH depuis un espace simple et sécurisé.
            </p>
            <div className="account-hero-actions">
              <Link href="/compte/commandes" className="btn btn-gold">
                Voir mes commandes <ArrowRight size={18} />
              </Link>
              <CustomerLogoutButton />
            </div>
          </div>

          <aside className="account-status-card">
            <div className="account-status-icon"><ShieldCheck size={26} /></div>
            <span>Compte connecté</span>
            <strong>{customer.email}</strong>
            <p>
              Vos informations FAST CASH sont à jour et sécurisées.
            </p>
          </aside>
        </div>
      </section>

      <section className="section account-section">
        <div className="container">
          <div className="account-section-head">
            <div>
              <p className="hero-kicker">Tableau de bord client</p>
              <h2>Vos informations FAST CASH.</h2>
            </div>
            <Link href="/contact" className="text-link">Besoin d'aide</Link>
          </div>

          <div className="account-card-grid">
            <Link href="/compte/commandes" className="account-card">
              <span><Package size={24} /></span>
              <strong>{orders.length} commande{orders.length > 1 ? "s" : ""}</strong>
              <p>Historique des achats liés à ce compte.</p>
              <small>Commandes <ArrowRight size={15} /></small>
            </Link>
            <Link href="/compte/factures" className="account-card">
              <span><FileText size={24} /></span>
              <strong>{invoicesCount} facture{invoicesCount > 1 ? "s" : ""}</strong>
              <p>Documents de paiement et factures disponibles.</p>
              <small>Factures <ArrowRight size={15} /></small>
            </Link>
            <Link href="/compte/adresses" className="account-card">
              <span><MapPin size={24} /></span>
              <strong>{customer.addresses.length} adresse{customer.addresses.length > 1 ? "s" : ""}</strong>
              <p>Adresses enregistrées pour livraison et facturation.</p>
              <small>Adresses <ArrowRight size={15} /></small>
            </Link>
          </div>

          <div className="account-preview-grid">
            <article className="account-preview-card">
              <div className="account-preview-top">
                <UserRound size={22} />
                <strong>Total dépensé</strong>
              </div>
              <p>{formatAdminPrice(totalSpent, settings.defaultCurrency)}</p>
            </article>
            {lastOrder ? (
              <Link href={`/compte/commandes/${lastOrder.id}`} className="account-preview-card account-preview-card-link">
                <div className="account-preview-top">
                  <Package size={22} />
                  <strong>Dernière commande</strong>
                </div>
                <p>
                  {lastOrder.orderNumber} — {formatAdminPrice(lastOrder.total, lastOrder.currency || settings.defaultCurrency)} — {getOrderStatusLabel(lastOrder.status)}
                  {lastOrder.shipment?.trackingNo ? ` — Suivi ${lastOrder.shipment.trackingNo}` : ""}
                </p>
              </Link>
            ) : (
              <article className="account-preview-card">
                <div className="account-preview-top">
                  <Package size={22} />
                  <strong>Dernière commande</strong>
                </div>
                <p>Aucune commande liée à ce compte pour le moment.</p>
              </article>
            )}
          </div>

        </div>
      </section>
    </main>
  );
}
