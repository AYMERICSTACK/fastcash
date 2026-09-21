import type { Metadata } from "next";
import LegalPage from "@/components/legal/LegalPage";

export const metadata: Metadata = { title: "Politique relative aux cookies", description: "Informations sur les cookies utilisés par FAST CASH Genève.", alternates: { canonical: "/politique-cookies" } };

export default function CookiePolicyPage() {
  return <LegalPage eyebrow="Navigation" title="Politique relative aux cookies" intro="FAST CASH Genève distingue les technologies indispensables au fonctionnement du site des outils de mesure d’audience facultatifs.">
    <section><h2>Cookies et stockage nécessaires</h2><p>Le site utilise des mécanismes nécessaires au panier, à la connexion, à la sécurité et au bon fonctionnement du parcours de commande. Ils ne sont pas utilisés pour établir des statistiques marketing.</p></section>
    <section><h2>Mesure d’audience Google Analytics</h2><p>Avec votre accord, FAST CASH Genève utilise Google Analytics 4 afin de mesurer la fréquentation du site, les pages et produits consultés, les sources de trafic et certaines étapes du parcours d’achat. La mesure d’audience n’est activée qu’après votre choix positif dans le bandeau de consentement.</p></section>
    <section><h2>Votre choix</h2><p>Vous pouvez accepter ou refuser la mesure d’audience sans empêcher l’utilisation des fonctions essentielles du site. Votre préférence est enregistrée dans votre navigateur et peut être modifiée à tout moment via le lien « Gérer les cookies » présent en pied de page.</p></section>
    <section><h2>Paiement et services tiers</h2><p>Lors du paiement ou de l’utilisation d’un service externe, le prestataire concerné peut déposer ses propres cookies strictement nécessaires selon sa politique de confidentialité.</p></section>
  </LegalPage>;
}
