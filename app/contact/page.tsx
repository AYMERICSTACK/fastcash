import type { Metadata } from "next";
import ContactPageContent from "@/components/ContactPageContent";

export const metadata: Metadata = {
  title: "Contact | FAST CASH Genève",
  description:
    "Contactez FAST CASH Genève pour une estimation, une commande, une disponibilité produit ou une question boutique. Réponse rapide depuis notre magasin Rue de Monthoux 27 à Genève.",
  alternates: {
    canonical: "/contact",
  },
  openGraph: {
    title: "Contact | FAST CASH Genève",
    description:
      "Une question sur un produit premium, une estimation ou une commande ? Contactez FAST CASH Genève.",
    url: "/contact",
  },
};

export default function ContactPage() {
  return <ContactPageContent />;
}
