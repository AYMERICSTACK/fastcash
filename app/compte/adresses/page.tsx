import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, ReceiptText, Truck } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getCustomerSession } from "@/lib/session";
import AddressManager from "./AddressManager";

export const metadata = {
  title: "Mes adresses | FAST CASH Genève",
  description: "Gestion des adresses de livraison et de facturation FAST CASH Genève.",
};

export default async function CustomerAddressesPage() {
  const session = await getCustomerSession();

  if (!session) {
    redirect("/compte/login");
  }

  const customer = await prisma.customer.findUnique({
    where: { id: session.customerId },
    include: {
      addresses: {
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
          <p className="hero-kicker">Informations client</p>
          <h1>Mes adresses</h1>
          <p>
            Retrouvez les adresses utilisées pour la livraison et la facturation de vos commandes FAST CASH.
          </p>
        </div>

        <AddressManager addresses={customer.addresses} />

        <div className="account-step-grid" style={{ marginTop: 22 }}>
          <article className="account-step-card">
            <span><Truck size={22} /></span>
            <strong>Livraison</strong>
            <p>Adresse utilisée pour l'expédition des commandes.</p>
          </article>
          <article className="account-step-card">
            <span><ReceiptText size={22} /></span>
            <strong>Facturation</strong>
            <p>Adresse affichée sur les documents de commande.</p>
          </article>
        </div>
      </section>
    </main>
  );
}
