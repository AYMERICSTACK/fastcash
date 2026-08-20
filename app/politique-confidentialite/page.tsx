import type { Metadata } from "next";
import LegalPage from "@/components/legal/LegalPage";
import { getLegalConfig } from "@/lib/legal-config";

export const metadata: Metadata = { title: "Politique de confidentialité", description: "Politique de confidentialité et protection des données FAST CASH Genève.", alternates: { canonical: "/politique-confidentialite" } };

export default async function PrivacyPage() {
  const legalConfig = await getLegalConfig();
  return <LegalPage eyebrow="Protection des données" title="Politique de confidentialité" intro="FAST CASH Genève traite vos données avec transparence, uniquement pour fournir ses services et gérer la relation client.">
    <section><h2>Données collectées</h2><p>Nous pouvons collecter les informations communiquées lors de la création d'un compte, d'une commande, d'une demande de contact ou d'une estimation : identité, coordonnées, adresse, historique de commandes et informations nécessaires au suivi de votre demande.</p></section>
    <section><h2>Finalités</h2><p>Ces données sont utilisées pour gérer les comptes clients, traiter les commandes, organiser le retrait ou l'expédition, émettre les factures, répondre aux demandes, prévenir la fraude et respecter nos obligations légales.</p></section>
    <section><h2>Paiements</h2><p>Les données bancaires ne sont pas stockées directement par FAST CASH Genève. Les paiements en ligne sont traités par le prestataire de paiement configuré sur la plateforme, selon ses propres standards de sécurité.</p></section>
    <section><h2>Prestataires techniques</h2><p>Les données peuvent être traitées par des prestataires nécessaires au fonctionnement du service : hébergement, base de données, stockage d'images, envoi d'emails, paiement et livraison. Seules les informations utiles leur sont transmises.</p></section>
    <section><h2>Durée de conservation</h2><p>Les données sont conservées pendant la durée nécessaire au service, à la relation commerciale et aux obligations comptables ou légales. Les comptes inactifs peuvent être supprimés ou anonymisés après expiration des délais utiles.</p></section>
    <section><h2>Vos droits</h2><p>Vous pouvez demander l'accès, la rectification ou, lorsque la loi le permet, la suppression de vos données en écrivant à <a href={`mailto:${legalConfig.email}`}>{legalConfig.email}</a>. Une vérification d'identité peut être demandée.</p></section>
    <section><h2>Sécurité</h2><p>La plateforme met en œuvre des sessions protégées, des mots de passe chiffrés, des accès restreints et des prestataires spécialisés. Aucun système ne pouvant garantir un risque nul, les mesures sont régulièrement adaptées.</p></section>
    <p className="legal-updated">Dernière mise à jour : {legalConfig.lastUpdated}</p>
  </LegalPage>;
}
