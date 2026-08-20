import type { Metadata } from "next";
import LegalPage from "@/components/legal/LegalPage";
import { getLegalConfig } from "@/lib/legal-config";

export const metadata: Metadata = { title: "Conditions générales de vente", description: "Conditions générales applicables aux commandes FAST CASH Genève.", alternates: { canonical: "/conditions-generales" } };

export default async function TermsPage() {
  const legalConfig = await getLegalConfig();
  return <LegalPage eyebrow="Vente en ligne" title="Conditions générales de vente" intro="Ces conditions encadrent les achats réalisés sur la plateforme FAST CASH Genève.">
    <section><h2>Produits</h2><p>FAST CASH Genève commercialise notamment des articles d'occasion. Chaque fiche présente les caractéristiques connues, le prix et la disponibilité. Les photos sont contractuelles dans la mesure du possible, sous réserve des différences d'affichage.</p></section>
    <section><h2>Prix</h2><p>Les prix sont affichés dans la devise choisie sur le site. Le prix confirmé au moment de la commande est celui facturé. La livraison standard en France et en Suisse est incluse lorsque cette option est proposée.</p></section>
    <section><h2>Commande</h2><p>La commande devient définitive après confirmation du paiement. FAST CASH Genève peut annuler une commande en cas d'indisponibilité, d'erreur manifeste de prix, de suspicion de fraude ou d'impossibilité d'exécution.</p></section>
    <section><h2>Paiement</h2><p>Le paiement est réalisé au moyen des solutions proposées lors du passage de commande. Les transactions sont traitées par des prestataires spécialisés. Les options de paiement fractionné peuvent faire l'objet de conditions propres à leur fournisseur.</p></section>
    <section><h2>Réception</h2><p>Le client choisit entre le retrait en boutique et l'expédition lorsque ces modes sont disponibles. Il lui appartient de fournir des coordonnées exactes et de vérifier l'état du colis lors de sa réception.</p></section>
    <section><h2>Garantie et conformité</h2><p>Les droits légaux applicables aux consommateurs restent réservés. Les garanties commerciales éventuellement proposées sont précisées sur la fiche produit ou la facture.</p></section>
    <section><h2>Réclamations</h2><p>Toute question peut être adressée à <a href={`mailto:${legalConfig.email}`}>{legalConfig.email}</a> ou par téléphone au {legalConfig.phone}. La référence de commande doit être indiquée.</p></section>
    <section><h2>Droit applicable</h2><p>Les présentes conditions sont soumises au {legalConfig.governingLaw}. Le for est à {legalConfig.jurisdiction}, sous réserve des dispositions impératives de protection du consommateur.</p></section>
    <p className="legal-updated">Dernière mise à jour : {legalConfig.lastUpdated}</p>
  </LegalPage>;
}
