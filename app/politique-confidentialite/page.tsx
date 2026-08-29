import type { Metadata } from "next";
import LegalPage from "@/components/legal/LegalPage";
import { getLegalConfig } from "@/lib/legal-config";

export const metadata: Metadata = {
  title: "Politique de confidentialité",
  description:
    "Politique de confidentialité et protection des données FAST CASH Genève.",
  alternates: { canonical: "/politique-confidentialite" },
};

export default async function PrivacyPage() {
  const legalConfig = await getLegalConfig();

  return (
    <LegalPage
      eyebrow="Protection des données"
      title="Politique de confidentialité"
      intro="Cette politique explique quelles données personnelles FAST CASH Genève traite, pourquoi elles sont utilisées, avec quels prestataires elles peuvent être partagées et quels sont vos droits."
    >
      <section>
        <h2>1. Responsable du traitement</h2>
        <p>
          Le responsable du traitement des données personnelles collectées sur
          le site est {legalConfig.businessName},{" "}
          {legalConfig.companyForm || "société de droit suisse"}, dont le siège
          est situé {legalConfig.address}.
        </p>
        <p>
          Pour toute question relative à la protection des données, vous pouvez
          écrire à{" "}
          <a href={`mailto:${legalConfig.email}`}>{legalConfig.email}</a> ou
          appeler le {legalConfig.phone}.
        </p>
      </section>

      <section>
        <h2>2. Données collectées</h2>
        <p>
          Selon votre utilisation du site, FAST CASH Genève peut traiter les
          informations que vous fournissez lors de la création d&apos;un compte,
          d&apos;une commande, d&apos;une demande de contact, d&apos;une
          estimation, d&apos;une offre ou d&apos;une inscription à une
          communication commerciale.
        </p>
        <p>
          Ces informations peuvent notamment comprendre vos nom et prénom,
          adresse email, numéro de téléphone, adresses de facturation ou de
          livraison, historique de commandes, produits favoris, informations
          relatives à une demande ou à une offre, ainsi que les éléments
          nécessaires au traitement d&apos;un paiement, d&apos;un retrait,
          d&apos;une livraison, d&apos;un retour ou d&apos;un remboursement.
        </p>
        <p>
          Des données techniques nécessaires au fonctionnement et à la sécurité
          du site peuvent également être traitées, par exemple l&apos;adresse
          IP, des informations de session, le navigateur utilisé, des journaux
          techniques et des informations liées à la prévention des abus ou de la
          fraude.
        </p>
      </section>

      <section>
        <h2>3. Finalités du traitement</h2>
        <p>Les données personnelles sont principalement utilisées afin de :</p>
        <ul>
          <li>créer et sécuriser les comptes clients ;</li>
          <li>
            traiter les commandes, paiements, retraits, livraisons, retours et
            remboursements ;
          </li>
          <li>
            établir et conserver les documents commerciaux et comptables
            nécessaires ;
          </li>
          <li>
            répondre aux demandes de contact, d&apos;estimation, d&apos;offre ou
            de service après-vente ;
          </li>
          <li>gérer les garanties, réclamations et litiges éventuels ;</li>
          <li>
            prévenir la fraude, les abus et les atteintes à la sécurité du site
            ;
          </li>
          <li>
            respecter les obligations légales et réglementaires applicables ;
          </li>
          <li>
            envoyer des communications commerciales lorsque le destinataire y a
            consenti ou lorsque la réglementation applicable le permet.
          </li>
        </ul>
      </section>

      <section>
        <h2>4. Paiements</h2>
        <p>
          Les paiements en ligne par carte sont traités par Stripe. Les données
          complètes de carte bancaire saisies dans l&apos;interface de paiement
          ne sont pas stockées directement par FAST CASH Genève. Stripe traite
          les données nécessaires à l&apos;exécution, à la sécurisation et, le
          cas échéant, au remboursement du paiement selon ses propres
          obligations de sécurité et de conformité.
        </p>
        <p>
          Si une solution de financement ou de paiement échelonné est proposée à
          l&apos;avenir, les informations nécessaires pourront être transmises
          au prestataire concerné après que le client a choisi cette solution.
          Les conditions et informations de confidentialité du prestataire
          s&apos;appliquent alors également à son traitement.
        </p>
      </section>

      <section>
        <h2>5. Prestataires techniques et destinataires</h2>
        <p>
          FAST CASH Genève fait appel à des prestataires strictement nécessaires
          au fonctionnement de la plateforme. Selon le service utilisé,
          certaines données peuvent notamment être traitées par :
        </p>
        <ul>
          <li>
            <strong>Vercel</strong>, pour l&apos;hébergement et l&apos;exécution
            de l&apos;application ;
          </li>
          <li>
            <strong>Neon</strong>, pour l&apos;hébergement de la base de données
            PostgreSQL ;
          </li>
          <li>
            <strong>Cloudinary</strong>, pour l&apos;hébergement et la diffusion
            de médias et images ;
          </li>
          <li>
            <strong>Stripe</strong>, pour le traitement des paiements ;
          </li>
          <li>
            <strong>Resend</strong>, pour l&apos;envoi d&apos;emails
            transactionnels et, lorsque cela est autorisé, de communications
            commerciales ;
          </li>
          <li>
            les transporteurs ou partenaires logistiques nécessaires à la
            livraison d&apos;une commande.
          </li>
        </ul>
        <p>
          Seules les données nécessaires à la prestation concernée sont
          transmises. FAST CASH Genève ne vend pas les données personnelles de
          ses clients.
        </p>
      </section>

      <section>
        <h2>6. Transferts de données à l&apos;étranger</h2>
        <p>
          Certains prestataires peuvent traiter ou héberger des données en
          Suisse, dans l&apos;Union européenne ou dans d&apos;autres pays.
          Lorsqu&apos;un transfert de données vers l&apos;étranger nécessite des
          garanties particulières, FAST CASH Genève s&apos;appuie sur les
          mécanismes prévus par la réglementation applicable, notamment les
          engagements contractuels appropriés du prestataire.
        </p>
      </section>

      <section>
        <h2>7. Emails commerciaux et désinscription</h2>
        <p>
          Lorsqu&apos;une personne s&apos;inscrit à une newsletter ou accepte de
          recevoir des communications commerciales, son adresse email et les
          informations nécessaires au suivi de cette inscription peuvent être
          conservées à cette fin. Chaque communication commerciale envoyée par
          la plateforme comporte un moyen permettant de se désinscrire.
        </p>
        <p>
          Une désinscription met fin aux communications commerciales concernées
          mais n&apos;empêche pas l&apos;envoi d&apos;emails nécessaires à
          l&apos;exécution d&apos;une commande, à la sécurité d&apos;un compte
          ou au traitement d&apos;une demande en cours.
        </p>
      </section>

      <section>
        <h2>8. Durée de conservation</h2>
        <p>
          Les données sont conservées pendant la durée nécessaire aux finalités
          pour lesquelles elles ont été collectées, puis pendant les délais
          imposés ou autorisés par les obligations comptables, fiscales,
          contractuelles ou légales applicables.
        </p>
        <p>
          Les données liées à un compte peuvent être conservées tant que le
          compte reste actif ou qu&apos;elles sont nécessaires à la relation
          commerciale. Les informations qui ne sont plus nécessaires peuvent
          être supprimées ou anonymisées, sous réserve des obligations de
          conservation et de la nécessité éventuelle de constater, exercer ou
          défendre un droit.
        </p>
      </section>

      <section>
        <h2>9. Vos droits</h2>
        <p>
          Dans les limites prévues par le droit applicable, vous pouvez demander
          des informations sur le traitement de vos données, accéder aux données
          vous concernant, demander la rectification de données inexactes et
          solliciter leur suppression lorsqu&apos;aucune obligation ou
          justification ne s&apos;oppose à cette suppression. D&apos;autres
          droits peuvent s&apos;appliquer selon votre lieu de résidence et la
          réglementation qui vous protège.
        </p>
        <p>
          Pour exercer vos droits, contactez FAST CASH Genève à l&apos;adresse{" "}
          <a href={`mailto:${legalConfig.email}`}>{legalConfig.email}</a>. Afin
          d&apos;éviter qu&apos;une personne non autorisée accède à vos données,
          une vérification raisonnable de votre identité peut être demandée.
        </p>
      </section>

      <section>
        <h2>10. Sécurité</h2>
        <p>
          FAST CASH Genève met en œuvre des mesures techniques et
          organisationnelles destinées à protéger les données contre
          l&apos;accès non autorisé, la perte, l&apos;altération ou la
          divulgation. Les accès d&apos;administration sont restreints, les
          communications avec le site utilisent des connexions sécurisées et les
          mots de passe enregistrés par la plateforme sont stockés sous forme
          hachée, et non en clair.
        </p>
        <p>
          Aucun système informatique ne pouvant garantir un risque nul, les
          mesures de sécurité sont adaptées en fonction des risques et de
          l&apos;évolution de la plateforme.
        </p>
      </section>

      <section>
        <h2>11. Cookies et technologies similaires</h2>
        <p>
          Le site utilise des cookies ou mécanismes similaires nécessaires à son
          fonctionnement, notamment pour la session, le panier et certaines
          préférences. Les informations détaillées figurent sur la page «
          Politique de cookies ».
        </p>
      </section>

      <section>
        <h2>12. Modification de cette politique</h2>
        <p>
          FAST CASH Genève peut mettre à jour cette politique afin de tenir
          compte de l&apos;évolution de la plateforme, de ses prestataires ou de
          la réglementation. La version publiée sur le site est la version en
          vigueur.
        </p>
      </section>

      <p className="legal-updated">Dernière mise à jour : 29 août 2026</p>
    </LegalPage>
  );
}
