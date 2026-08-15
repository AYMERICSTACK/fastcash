import Link from "next/link";
import ClearCartOnSuccess from "@/components/cart/ClearCartOnSuccess";
import HeyLightSuccess from "@/components/cart/HeyLightSuccess";

type MerciPageProps = {
  searchParams: Promise<{
    session_id?: string;
    provider?: string;
    order?: string;
  }>;
};

export default async function MerciPage({ searchParams }: MerciPageProps) {
  const { session_id: sessionId, provider, order } = await searchParams;

  return (
    <main className="section">
      {provider === "heylight" && order ? <HeyLightSuccess order={order} /> : <ClearCartOnSuccess sessionId={sessionId} />}

      <div className="container">
        <div className="checkout-success-card">
          <p className="hero-kicker">Commande confirmée</p>
          <h1 className="title-lg">Merci pour votre commande</h1>
          <p className="muted">
            Votre paiement est pris en compte. La confirmation ci-dessus vous indique
            dès que la commande est enregistrée dans FAST CASH. Vous recevrez également
            un email récapitulatif.
          </p>

          <div className="checkout-success-actions">
            <Link href="/categories/montres" className="btn btn-dark">
              Continuer mes achats
            </Link>
            <Link href="/" className="text-link">
              Retour à l'accueil
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
