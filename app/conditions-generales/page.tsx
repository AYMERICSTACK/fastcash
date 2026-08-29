import type { Metadata } from "next";
import LegalPage from "@/components/legal/LegalPage";
import { getLegalConfig } from "@/lib/legal-config";

export const metadata: Metadata = {
  title: "Conditions générales de vente",
  description:
    "Conditions générales applicables aux commandes FAST CASH Genève.",
  alternates: { canonical: "/conditions-generales" },
};

export default async function TermsPage() {
  const legalConfig = await getLegalConfig();

  return (
    <LegalPage
      eyebrow="Vente en ligne"
      title="Conditions générales de vente"
      intro="Les présentes conditions générales de vente encadrent les achats réalisés sur la plateforme FAST CASH Genève."
    >
      <section>
        <h2>1. Vendeur et champ d’application</h2>
        <p>
          Le site FAST CASH Genève est exploité par {legalConfig.businessName},{" "}
          {legalConfig.companyForm || "société de droit suisse"}, dont le siège
          est situé {legalConfig.address}. Les présentes conditions générales de
          vente s’appliquent aux commandes passées sur le site par des clients
          particuliers ou professionnels, sauf conditions particulières
          expressément convenues par écrit.
        </p>
        <p>
          Le client peut contacter FAST CASH Genève à l’adresse{" "}
          <a href={`mailto:${legalConfig.email}`}>{legalConfig.email}</a> ou par
          téléphone au {legalConfig.phone}.
        </p>
      </section>

      <section>
        <h2>2. Produits et articles d’occasion</h2>
        <p>
          FAST CASH Genève commercialise notamment des produits neufs et
          d’occasion. Les caractéristiques essentielles, l’état annoncé, le prix
          et la disponibilité sont indiqués sur la fiche du produit au moment de
          la commande.
        </p>
        <p>
          Pour les articles d’occasion, des traces d’utilisation, variations
          esthétiques ou signes d’usure compatibles avec l’état annoncé peuvent
          être présents. Les photographies et descriptions sont réalisées avec
          soin afin de représenter le produit aussi fidèlement que possible,
          sous réserve notamment des différences d’affichage liées aux écrans.
        </p>
      </section>

      <section>
        <h2>3. Prix et devises</h2>
        <p>
          Les prix sont affichés dans la devise sélectionnée sur le site,
          notamment en francs suisses (CHF) ou en euros (EUR). Le montant
          récapitulé et accepté au moment de la validation de la commande est
          celui dû par le client. Les éventuels frais de livraison sont indiqués
          avant la validation définitive de la commande.
        </p>
        <p>
          Pour une livraison internationale, d’éventuels impôts, droits de
          douane ou frais exigés par les autorités ou intermédiaires du pays de
          destination peuvent s’ajouter au prix lorsque la réglementation
          applicable le prévoit.
        </p>
      </section>

      <section>
        <h2>4. Commande et conclusion du contrat</h2>
        <p>
          Avant de confirmer sa commande, le client peut vérifier son panier,
          ses coordonnées, le mode de livraison et le montant total, et corriger
          les éventuelles erreurs. La validation finale de la commande implique
          l’acceptation des présentes conditions générales et l’obligation de
          paiement.
        </p>
        <p>
          Une confirmation est envoyée par voie électronique après la commande.
          La vente est considérée comme conclue lorsque la commande est
          confirmée et que le paiement a été accepté. FAST CASH Genève peut
          refuser ou annuler une commande notamment en cas d’indisponibilité du
          produit, d’erreur manifeste de prix, de paiement refusé, de suspicion
          de fraude ou d’impossibilité d’exécuter la commande. En cas
          d’annulation après encaissement, les sommes concernées sont
          remboursées.
        </p>
      </section>

      <section>
        <h2>5. Paiement</h2>
        <p>
          Le paiement est effectué au moyen des solutions proposées lors du
          passage de la commande. Les transactions peuvent être traitées par des
          prestataires de paiement spécialisés. FAST CASH Genève ne conserve pas
          les données complètes de carte bancaire lorsque celles-ci sont
          directement traitées par le prestataire de paiement.
        </p>
        <p>
          Lorsqu’un paiement échelonné ou une solution de financement est
          proposé, son acceptation peut être soumise aux conditions et à la
          décision du prestataire concerné.
        </p>
      </section>

      <section>
        <h2>6. Disponibilité</h2>
        <p>
          Les produits sont proposés dans la limite des stocks disponibles. En
          raison notamment du caractère unique de nombreux articles d’occasion,
          un produit peut devenir indisponible. Si une indisponibilité est
          constatée après la commande, le client en est informé dans les
          meilleurs délais et le montant payé pour le produit indisponible est
          remboursé ou, avec son accord, une autre solution peut lui être
          proposée.
        </p>
      </section>

      <section>
        <h2>7. Livraison et retrait</h2>
        <p>
          Selon les options disponibles au moment de la commande, le client peut
          choisir une expédition ou un retrait en boutique. Pour une expédition,
          le client doit fournir une adresse complète et exacte. Les frais et
          informations de livraison applicables sont présentés avant la
          validation de la commande et complétés par la page « Livraison &
          retours ».
        </p>
        <p>
          Le client est invité à contrôler l’état du colis et du produit à
          réception et à signaler rapidement à FAST CASH Genève toute anomalie,
          détérioration, produit manquant ou erreur de livraison, en joignant si
          possible des photographies utiles au traitement de la réclamation.
        </p>
      </section>

      <section>
        <h2>8. Retour volontaire sous 14 jours</h2>
        <p>
          Le droit suisse ne prévoit pas de droit général de révocation pour les
          achats effectués sur Internet. FAST CASH Genève accorde néanmoins
          volontairement à ses clients un délai de 14 jours à compter de la
          réception de la commande pour demander le retour d’un produit qui ne
          leur convient pas. Lorsque des dispositions impératives de protection
          des consommateurs accordent au client un droit plus favorable,
          celles-ci demeurent applicables.
        </p>
        <p>
          Avant tout retour, le client doit contacter FAST CASH Genève. Le
          produit doit être retourné complet, avec ses accessoires et, lorsqu’il
          existe, son emballage, dans un état permettant sa vérification et sa
          remise en vente compte tenu de son état initial. Les produits
          endommagés par le client, incomplets ou ayant fait l’objet d’une
          utilisation allant au-delà de ce qui est nécessaire pour les examiner
          peuvent faire l’objet d’un refus de retour ou d’une réduction du
          remboursement correspondant à la dépréciation constatée.
        </p>
        <p>
          En cas de retour pour simple changement d’avis, les frais de retour
          sont à la charge du client. En cas d’erreur imputable à FAST CASH
          Genève, de produit reçu endommagé ou de non-conformité reconnue, les
          frais de retour nécessaires sont pris en charge par FAST CASH Genève.
        </p>
        <p>
          Après réception et contrôle du produit retourné, le remboursement est
          effectué par un moyen approprié, en principe via le moyen de paiement
          utilisé lors de la commande, dans les meilleurs délais.
        </p>
      </section>

      <section>
        <h2>9. Garantie et défauts</h2>
        <p>
          FAST CASH Genève répond des défauts du produit conformément aux
          dispositions applicables du Code des obligations suisse, notamment les
          articles 197 et suivants, sous réserve des caractéristiques, défauts
          et traces d’usage clairement annoncés et acceptés lors de l’achat d’un
          produit d’occasion.
        </p>
        <p>
          Pour les ventes à des consommateurs, le délai de garantie est de deux
          ans à compter de la livraison pour les produits neufs. Pour les
          produits d’occasion, ce délai est fixé à un an à compter de la
          livraison. Les garanties commerciales ou garanties constructeur
          éventuellement plus favorables sont indiquées, lorsqu’elles existent,
          sur la fiche produit, la facture ou les documents accompagnant le
          produit.
        </p>
        <p>
          Le client doit signaler le défaut constaté à FAST CASH Genève dans les
          meilleurs délais. Selon la situation et les droits applicables, une
          réparation, un remplacement, une réduction du prix, un remboursement
          ou une autre solution appropriée peut être proposé. La garantie ne
          couvre pas notamment l’usure normale, les défauts expressément
          annoncés avant l’achat, les dommages causés après la livraison par une
          mauvaise utilisation, un accident, une intervention non autorisée ou
          le non-respect des recommandations du fabricant.
        </p>
      </section>

      <section>
        <h2>10. Réclamations et service client</h2>
        <p>
          Pour toute question relative à une commande, un retour ou une
          garantie, le client peut écrire à{" "}
          <a href={`mailto:${legalConfig.email}`}>{legalConfig.email}</a> ou
          appeler le {legalConfig.phone}. Afin de faciliter le traitement de la
          demande, la référence de commande et les informations permettant
          d’identifier le produit concerné doivent être communiquées.
        </p>
      </section>

      <section>
        <h2>11. Responsabilité</h2>
        <p>
          FAST CASH Genève s’engage à exécuter ses obligations avec diligence.
          Sa responsabilité ne saurait être engagée pour un retard ou une
          inexécution résultant d’un événement échappant raisonnablement à son
          contrôle, sous réserve des dispositions légales impératives. Aucune
          disposition des présentes conditions ne vise à exclure une
          responsabilité qui ne pourrait légalement être exclue.
        </p>
      </section>

      <section>
        <h2>12. Données personnelles</h2>
        <p>
          Les données nécessaires à la création d’un compte, au traitement d’une
          commande, au paiement, à la livraison et au service client sont
          traitées conformément à la politique de confidentialité du site. Les
          informations relatives aux cookies et technologies similaires figurent
          sur la page « Cookies ».
        </p>
      </section>

      <section>
        <h2>13. Propriété intellectuelle</h2>
        <p>
          Les textes, visuels, logos, marques, éléments graphiques et autres
          contenus du site sont protégés par les droits applicables. Leur
          reproduction ou réutilisation sans autorisation est interdite, sous
          réserve des exceptions prévues par la loi et des droits appartenant à
          leurs titulaires respectifs.
        </p>
      </section>

      <section>
        <h2>14. Droit applicable et litiges</h2>
        <p>
          Les présentes conditions sont soumises au {legalConfig.governingLaw}.
          En cas de difficulté, le client est invité à contacter FAST CASH
          Genève afin de rechercher une solution amiable. Le for est à{" "}
          {legalConfig.jurisdiction}, sous réserve des fors et dispositions
          impératives applicables, notamment en matière de protection des
          consommateurs.
        </p>
      </section>

      <section>
        <h2>15. Modification des conditions</h2>
        <p>
          FAST CASH Genève peut modifier les présentes conditions générales pour
          les commandes futures. La version applicable à une commande est celle
          mise à disposition du client au moment où cette commande est passée.
        </p>
      </section>

      <p className="legal-updated">Dernière mise à jour : 29 août 2026</p>
    </LegalPage>
  );
}
