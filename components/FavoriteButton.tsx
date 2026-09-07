"use client";

import { Heart, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

type FavoriteSnapshot = { authenticated: boolean; ids: string[] };
let snapshot: FavoriteSnapshot | null = null;
let pending: Promise<FavoriteSnapshot> | null = null;
let snapshotExpires = 0;

function loadFavoriteSnapshot(): Promise<FavoriteSnapshot> {
  if (snapshot && Date.now() < snapshotExpires) return Promise.resolve(snapshot);
  if (!pending) {
    pending = fetch("/api/favorites?ids=1", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("Favorites unavailable");
        const data = await response.json();
        return {
          authenticated: !!data.authenticated,
          ids: Array.isArray(data.ids) ? data.ids.map(String) : [],
        };
      })
      .then((data) => { snapshot = data; snapshotExpires = Date.now() + 30000; return data; })
      .finally(() => { pending = null; });
  }
  return pending;
}

function updateFavoriteSnapshot(id: string, active: boolean) {
  if (!snapshot) return;
  snapshot = {
    ...snapshot,
    ids: active
      ? [...new Set([...snapshot.ids, id])]
      : snapshot.ids.filter((value) => value !== id),
  };
}


export default function FavoriteButton({
  productId,
  compact = false,
}: {
  productId: string | number;
  compact?: boolean;
}) {
  const id = String(productId);
  const [active, setActive] = useState(false);
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);

  useEffect(() => {
    let cancelled = false;
    loadFavoriteSnapshot().then((data) => {
      if (cancelled) return;
      setAuthenticated(data.authenticated);
      setActive(data.authenticated && data.ids.includes(id));
    }).catch(() => {
      if (!cancelled) setAuthenticated(false);
    });
    return () => { cancelled = true; };
  }, [id]);

  async function toggle() {
    if (busy) return;

    if (!authenticated) {
      setShowAuthModal(true);
      return;
    }

    const next = !active;
    setBusy(true);

    try {
      const response = await fetch("/api/favorites", {
        method: next ? "POST" : "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: id }),
      });

      const result = await response.json().catch(() => null);

      if (result?.authenticated === false || response.status === 401) {
        setAuthenticated(false);
        setActive(false);
        setShowAuthModal(true);
        return;
      }

      if (!response.ok) {
        throw new Error(result?.error || "Impossible de mettre à jour les favoris.");
      }

      setActive(next);
      updateFavoriteSnapshot(id, next);
    } catch {
      // On conserve l'état précédent si la requête échoue.
    } finally {
      setBusy(false);
    }
  }

  const returnTo =
    typeof window !== "undefined"
      ? `${window.location.pathname}${window.location.search}`
      : "/";

  const loginHref = `/compte/login?next=${encodeURIComponent(returnTo)}`;
  const registerHref = `/compte/inscription?next=${encodeURIComponent(returnTo)}`;

  return (
    <>
      <button
        type="button"
        onClick={toggle}
        disabled={busy}
        className={`favorite-button ${compact ? "favorite-button-compact" : ""} ${
          active ? "is-active" : ""
        }`}
        aria-label={active ? "Retirer des favoris" : "Ajouter aux favoris"}
        title={active ? "Retirer des favoris" : "Ajouter aux favoris"}
      >
        <Heart size={compact ? 19 : 21} fill={active ? "currentColor" : "none"} />
        {compact ? null : (
          <span>{active ? "Dans mes favoris" : "Ajouter aux favoris"}</span>
        )}
      </button>

      {showAuthModal ? (
        <div
          className="favorite-auth-overlay"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setShowAuthModal(false);
            }
          }}
        >
          <div
            className="favorite-auth-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby={`favorite-auth-title-${id}`}
          >
            <button
              type="button"
              className="favorite-auth-close"
              onClick={() => setShowAuthModal(false)}
              aria-label="Fermer"
            >
              <X size={20} />
            </button>

            <div className="favorite-auth-icon">
              <Heart size={28} />
            </div>

            <p className="hero-kicker">Votre sélection FAST CASH</p>
            <h2 id={`favorite-auth-title-${id}`}>
              Enregistrez cet article dans vos favoris.
            </h2>
            <p>
              Connectez-vous à votre espace FAST CASH pour conserver vos favoris
              et les retrouver sur tous vos appareils.
            </p>

            <div className="favorite-auth-actions">
              <Link href={loginHref} className="btn btn-gold">
                Se connecter
              </Link>
              <Link href={registerHref} className="btn favorite-auth-secondary">
                Créer un compte
              </Link>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
