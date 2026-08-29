import type { Metadata } from "next";
import LegalPage from "@/components/legal/LegalPage";
import { getLegalConfig } from "@/lib/legal-config";
import { getShopSettings } from "@/lib/settings";

export const metadata: Metadata = {
  title: "Livraison et retours",
  description: "Modalités de retrait, livraison, réception et retour FAST CASH Genève.",
  alternates: { canonical: "/livraison-retours" },
};

const COUNTRY_LABELS: Record<string, string> = {
  CH: "Suisse",
  FR: "France",
};

function formatCountries(countries: string[]) {
  const labels = countries.map((country) => COUNTRY_LABELS[country] || country);
  if (labels.length <= 1) return labels[0] || "les destinations proposées lors de la commande";
  if (labels.length === 2) return `${labels[0]} et ${labels[1]}`;
  return `${labels.slice(0, -1).join(", ")} et ${labels.at(-1)}`;
}

export default async function ShippingReturnsPage() {
  const [legalConfig, settings] = await Promise.all([
    getLegalConfig(),
    getShopSettings(),
  ]);

  const destinations = formatCountries(settings.shippingCountries);
  const shippingIsAlwaysFree = settings.shippingFee <= 0;
  const shippingHasFreeThreshold = settings.shippingFee > 0 && settings.shippingFreeThreshold > 0;

  return (
    <LegalPage
      eyebrow="Réception de commande"
      title="Livraison et retours"
      intro="Retrouvez ici les modalités de retrait en boutique, d'expédition, de réception et de retour des commandes FAST CASH Genève."
    >
      <section>
        <h2>1. Retrait en boutique</h2>
        <p>
          Lorsque cette option est proposée lors de la commande, le retrait en boutique est gratuit à l’adresse suivante : <strong>{legalConfig.address}</strong>. Une confirmation est envoyée lorsque la commande est prête à être retirée.
        </p>
        <p>
          Lors du retrait, une pièce d’identité ainsi que la référence de commande peuvent être demandées afin de vérifier l’identité de la personne venant récupérer l’achat.
        </p>
      </section>

      <section>
        <h2>2. Livraison</h2>
        <p>
          Lorsque l’expédition est proposée, FAST CASH Genève livre actuellement vers {destinations}. Le transporteur utilisé est indiqué lors du traitement de la commande et un numéro de suivi est communiqué lorsqu’il est disponible.
        </p>
        <p>
          {shippingIsAlwaysFree
            ? "La livraison standard est actuellement offerte pour les destinations proposées lors de la commande."
            : shippingHasFreeThreshold
              ? "Les frais de livraison applicables sont affichés dans le panier avant la validation de la commande. Une livraison offerte peut être proposée lorsque le montant de la commande atteint le seuil indiqué sur le site."
              : "Les frais de livraison applicables sont affichés dans le panier avant la validation définitive de la commande."}
        </p>
      </section>

      <section>
        <h2>3. Délais de préparation et de livraison</h2>
        <p>
          Les commandes sont préparées dans les meilleurs délais après confirmation du paiement. Le délai de livraison dépend notamment du transporteur, de la destination, des jours ouvrables et, le cas échéant, des formalités douanières ou contrôles indépendants de FAST CASH Genève.
        </p>
        <p>
          Lorsqu’une estimation de livraison est disponible, elle est communiquée au client au moment de la commande, de l’expédition ou dans les informations de suivi. En cas de retard inhabituel, le client peut contacter FAST CASH Genève afin qu’une vérification soit effectuée.
        </p>
      </section>

      <section>
        <h2>4. Adresse de livraison</h2>
        <p>
          Le client doit fournir une adresse complète et exacte. FAST CASH Genève ne peut être tenue responsable d’un retard ou d’un échec de livraison résultant d’informations erronées ou incomplètes communiquées par le client. Les éventuels frais liés à une nouvelle expédition rendue nécessaire par une erreur d’adresse peuvent être mis à la charge du client.
        </p>
      </section>

      <section>
        <h2>5. Réception du colis</h2>
        <p>
          À réception, le client est invité à vérifier l’état extérieur du colis ainsi que le contenu de la commande. En cas de colis endommagé, d’article manquant, d’erreur de livraison ou de détérioration du produit, le client doit contacter FAST CASH Genève dans les meilleurs délais et, si possible, transmettre des photographies du colis et du produit concerné.
        </p>
        <p>
          Lorsque cela est possible, une anomalie visible lors de la remise du colis doit également être signalée au transporteur afin de faciliter le traitement de la réclamation.
        </p>
      </section>

      <section>
        <h2>6. Retour sous 14 jours</h2>
        <p>
          FAST CASH Genève accorde à ses clients un délai de 14 jours à compter de la réception de la commande pour demander le retour d’un produit qui ne leur convient pas. Ce retour volontaire s’applique sous réserve des Conditions générales de vente et des éventuelles dispositions impératives plus favorables applicables au client.
        </p>
        <p>
          Avant tout retour, le client doit contacter FAST CASH Genève à l’adresse <a href={`mailto:${legalConfig.email}`}>{legalConfig.email}</a> ou par téléphone au {legalConfig.phone} afin d’obtenir les instructions nécessaires. Aucun retour ne doit être expédié sans avoir préalablement pris contact avec FAST CASH Genève.
        </p>
      </section>

      <section>
        <h2>7. État du produit retourné</h2>
        <p>
          Le produit doit être retourné complet, avec ses accessoires et, lorsqu’il existe, son emballage, dans un état permettant sa vérification et sa remise en vente compte tenu de son état initial. Les produits endommagés par le client, incomplets ou ayant fait l’objet d’une utilisation allant au-delà de ce qui est nécessaire pour les examiner peuvent faire l’objet d’un refus de retour ou d’une réduction du remboursement correspondant à la dépréciation constatée.
        </p>
        <p>
          Pour un article d’occasion, les traces d’utilisation, défauts esthétiques ou particularités qui étaient clairement décrits ou visibles sur la fiche produit au moment de l’achat ne constituent pas, à eux seuls, un motif de non-conformité.
        </p>
      </section>

      <section>
        <h2>8. Frais de retour</h2>
        <p>
          En cas de retour pour simple changement d’avis, les frais de retour sont à la charge du client. En cas d’erreur imputable à FAST CASH Genève, de produit reçu endommagé ou de non-conformité reconnue, les frais de retour nécessaires sont pris en charge par FAST CASH Genève.
        </p>
      </section>

      <section>
        <h2>9. Remboursement</h2>
        <p>
          Après réception et contrôle du produit retourné, FAST CASH Genève procède au remboursement dans les meilleurs délais. Le remboursement est effectué, en principe, via le moyen de paiement utilisé lors de la commande, sauf impossibilité technique ou accord différent avec le client.
        </p>
        <p>
          Lorsqu’une dépréciation du produit est constatée du fait d’une manipulation ou d’une utilisation excédant ce qui était nécessaire pour l’examiner, le montant remboursé peut être ajusté dans les conditions prévues par les Conditions générales de vente et par la réglementation applicable.
        </p>
      </section>

      <section>
        <h2>10. Contact</h2>
        <p>
          Pour toute question concernant une livraison, un retrait, un retour ou un remboursement, le client peut contacter FAST CASH Genève à l’adresse <a href={`mailto:${legalConfig.email}`}>{legalConfig.email}</a> ou par téléphone au {legalConfig.phone}. La référence de commande doit être indiquée afin de faciliter le traitement de la demande.
        </p>
      </section>

      <p className="legal-updated">Dernière mise à jour : 29 août 2026</p>
    </LegalPage>
  );
}
