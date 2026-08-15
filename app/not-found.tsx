import Link from "next/link";

export default function NotFound() {
  return (
    <main className="fc-state-page">
      <div className="container fc-state-shell">
        <p className="hero-kicker">Erreur 404</p>
        <h1>Cette page est introuvable.</h1>
        <p>Le produit ou la page recherchée a peut-être été déplacé.</p>
        <div className="fc-state-actions">
          <Link className="btn btn-gold" href="/">
            Retour à l’accueil
          </Link>
          <Link className="btn btn-light" href="/recherche">
            Rechercher un produit
          </Link>
        </div>
      </div>
    </main>
  );
}
