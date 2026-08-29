import type { Metadata } from "next";
import LegalPage from "@/components/legal/LegalPage";
import { getLegalConfig } from "@/lib/legal-config";

export const metadata: Metadata = {
  title: "Mentions légales",
  description: "Mentions légales et informations relatives à l'éditeur du site FAST CASH Genève.",
  alternates: { canonical: "/mentions-legales" },
};

export default async function LegalNoticePage() {
  const legalConfig = await getLegalConfig();
  return (
    <LegalPage eyebrow="Informations légales" title="Mentions légales" intro="Les informations essentielles concernant l'éditeur et l'exploitation de la plateforme FAST CASH Genève.">
      <section><h2>Éditeur du site</h2><p><strong>{legalConfig.businessName}</strong>{legalConfig.companyForm ? <><br />Forme juridique : {legalConfig.companyForm}</> : null}<br />{legalConfig.address}<br />Téléphone : <a href={`tel:${legalConfig.phone.replace(/\s/g, "")}`}>{legalConfig.phone}</a><br />Email : <a href={`mailto:${legalConfig.email}`}>{legalConfig.email}</a></p>{legalConfig.companyId ? <p>Identifiant d'entreprise : {legalConfig.companyId}</p> : null}{legalConfig.vatNumber ? <p>IDE : {legalConfig.vatNumber}</p> : null}{legalConfig.representative ? <p>Représentant légal : {legalConfig.representative}</p> : null}{legalConfig.registrationDate ? <p>Date d'inscription au registre : {legalConfig.registrationDate}</p> : null}</section>
      <section><h2>Hébergement</h2><p>La plateforme est hébergée sur une infrastructure cloud sécurisée. Les données applicatives peuvent être confiées à des prestataires techniques spécialisés, notamment pour l'hébergement, la base de données, les images, les emails et les paiements.</p></section>
      <section><h2>Propriété intellectuelle</h2><p>Les contenus, textes, éléments graphiques, marques, logos, photographies et composants de cette plateforme sont protégés. Toute reproduction ou réutilisation non autorisée est interdite.</p></section>
      <section><h2>Responsabilité</h2><p>FAST CASH Genève veille à fournir des informations exactes et actualisées. Les photographies et descriptions sont présentées avec soin, mais de légères différences peuvent exister pour les articles d'occasion.</p></section>
      <section><h2>Droit applicable</h2><p>Le site et son utilisation sont soumis au {legalConfig.governingLaw}. Le for juridique est situé à {legalConfig.jurisdiction}, sous réserve des règles impératives applicables aux consommateurs.</p></section>
      <p className="legal-updated">Dernière mise à jour : 29 août 2026</p>
    </LegalPage>
  );
}
