import type { Metadata } from "next";
import LegalPage from "@/components/legal/LegalPage";

export const metadata: Metadata = { title: "Politique relative aux cookies", description: "Informations sur les cookies utilisés par FAST CASH Genève.", alternates: { canonical: "/politique-cookies" } };

export default function CookiesPage() {
  return <LegalPage eyebrow="Navigation" title="Politique relative aux cookies" intro="La plateforme utilise principalement les cookies indispensables à son fonctionnement et à sa sécurité.">
    <section><h2>Cookies essentiels</h2><p>Ils permettent notamment de conserver le panier, la devise, la langue, la session client et la session d'administration. Ils sont nécessaires au service demandé et ne sont pas utilisés pour établir un profil publicitaire.</p></section>
    <section><h2>Paiement et services tiers</h2><p>Lors du paiement ou de l'utilisation d'un service externe, le prestataire concerné peut déposer ses propres cookies strictement nécessaires, selon sa politique de confidentialité.</p></section>
    <section><h2>Mesure d'audience</h2><p>Aucun outil publicitaire ou de mesure d'audience non essentiel ne doit être activé sans mise à jour de cette politique et, lorsque cela est requis, sans recueillir le choix préalable du visiteur.</p></section>
    <section><h2>Gestion</h2><p>Vous pouvez supprimer ou bloquer les cookies depuis les réglages de votre navigateur. Certaines fonctions, comme le panier ou la connexion, risquent alors de ne plus fonctionner correctement.</p></section>
  </LegalPage>;
}
