import type { Metadata } from "next";
import LegalPage from "@/components/legal/LegalPage";
import { legalConfig } from "@/lib/legal-config";

export const metadata: Metadata = { title: "Livraison et retours", description: "Modalités de retrait, livraison et retour FAST CASH Genève.", alternates: { canonical: "/livraison-retours" } };

export default function ShippingReturnsPage() {
  return <LegalPage eyebrow="Réception de commande" title="Livraison et retours" intro="Choisissez le retrait dans notre boutique genevoise ou l'expédition offerte vers la France et la Suisse.">
    <section><h2>Retrait en boutique</h2><p>Le retrait est gratuit à l'adresse suivante : <strong>{legalConfig.address}</strong>. Une confirmation vous informe lorsque la commande est prête. Une pièce d'identité et la référence de commande peuvent être demandées.</p></section>
    <section><h2>Livraison offerte</h2><p>La livraison standard est offerte pour les adresses situées en France et en Suisse. Le transporteur et le numéro de suivi sont communiqués lorsque la commande est expédiée.</p></section>
    <section><h2>Délais</h2><p>Les délais dépendent de la préparation, du transporteur, de la destination et des éventuels contrôles. Une estimation plus précise sera affichée ou communiquée au client dès que le transporteur final aura été validé.</p></section>
    <section><h2>Réception du colis</h2><p>Le client doit vérifier l'état extérieur du colis et signaler rapidement toute anomalie au transporteur et à FAST CASH Genève, idéalement avec des photographies.</p></section>
    <section><h2>Retours</h2><p>Avant tout retour, contactez FAST CASH Genève afin d'obtenir les instructions et l'adresse de retour. L'article doit être renvoyé dans l'état où il a été reçu, avec ses accessoires et protections éventuelles.</p></section>
    <section><h2>Articles d'occasion</h2><p>Les traces d'usage décrites ou visibles sur la fiche ne constituent pas un défaut de conformité. Chaque retour est examiné en tenant compte de la description initiale et de l'état du produit retourné.</p></section>
    <p className="legal-note"><strong>À confirmer avec FAST CASH :</strong> transporteur, délais cibles, assurance, procédure détaillée et répartition des frais de retour.</p>
    <p className="legal-updated">Dernière mise à jour : {legalConfig.lastUpdated}</p>
  </LegalPage>;
}
