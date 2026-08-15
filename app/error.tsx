"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="fc-state-page">
      <div className="container fc-state-shell">
        <p className="hero-kicker">Un imprévu est survenu</p>
        <h1>Cette page n’a pas pu être chargée.</h1>
        <p>Vous pouvez réessayer immédiatement ou revenir à l’accueil.</p>
        <div className="fc-state-actions">
          <button className="btn btn-gold" type="button" onClick={reset}>
            Réessayer
          </button>
          <Link className="btn btn-light" href="/">
            Retour à l’accueil
          </Link>
        </div>
      </div>
    </main>
  );
}
