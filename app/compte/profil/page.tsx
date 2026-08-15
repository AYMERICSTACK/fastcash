import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Mail, Phone, Shield, User } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getCustomerSession } from "@/lib/session";
import CustomerLogoutButton from "../CustomerLogoutButton";
import ProfileForm from "./ProfileForm";

function displayName(firstName?: string | null, lastName?: string | null) {
  const name = [firstName, lastName].filter(Boolean).join(" ").trim();
  return name || "Client FAST CASH";
}

export default async function CustomerProfilePage() {
  const session = await getCustomerSession();

  if (!session) {
    redirect("/compte/login");
  }

  const customer = await prisma.customer.findUnique({
    where: { id: session.customerId },
    include: {
      orders: true,
      addresses: true,
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
          <p className="hero-kicker">Compte client</p>
          <h1>Informations personnelles</h1>
          <p>Consultez les informations principales rattachées à votre espace FAST CASH.</p>
        </div>

        <section className="account-data-card">
          <div className="account-profile-head">
            <span><User size={26} /></span>
            <div>
              <h2>{displayName(customer.firstName, customer.lastName)}</h2>
              <p>Client depuis le {new Date(customer.createdAt).toLocaleDateString("fr-CH")}</p>
            </div>
          </div>

          <ProfileForm
            firstName={customer.firstName ?? ""}
            lastName={customer.lastName ?? ""}
            phone={customer.phone ?? ""}
          />

          <div className="account-data-list">
            <div className="account-data-row">
              <div>
                <strong>Email</strong>
                <span><Mail size={16} /> {customer.email}</span>
              </div>
            </div>

            <div className="account-data-row">
              <div>
                <strong>Téléphone</strong>
                <span><Phone size={16} /> {customer.phone ?? "Non renseigné"}</span>
              </div>
            </div>

            <div className="account-data-row">
              <div>
                <strong>Sécurité</strong>
                <span><Shield size={16} /> Connexion sécurisée à votre espace FAST CASH</span>
              </div>
              <CustomerLogoutButton />
            </div>
          </div>
        </section>

        <div className="account-card-grid" style={{ marginTop: 22 }}>
          <article className="account-card">
            <span><User size={24} /></span>
            <strong>{customer.orders.length} commande{customer.orders.length > 1 ? "s" : ""}</strong>
            <p>Historique lié à ce compte client.</p>
            <small>Compte actif</small>
          </article>

          <article className="account-card">
            <span><Shield size={24} /></span>
            <strong>{customer.addresses.length} adresse{customer.addresses.length > 1 ? "s" : ""}</strong>
            <p>Adresses enregistrées pour livraison et facturation.</p>
            <small>Données à jour</small>
          </article>
        </div>
      </section>
    </main>
  );
}
