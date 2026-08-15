"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { ArrowRight } from "lucide-react";

export default function CustomerRegisterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    const form = event.currentTarget;
    const data = new FormData(form);

    try {
      const response = await fetch("/api/customer/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(Object.fromEntries(data.entries())),
      });
      const result = (await response.json()) as { message?: string };
      if (!response.ok) throw new Error(result.message || "Création du compte impossible.");
      const next =
        typeof window !== "undefined"
          ? new URLSearchParams(window.location.search).get("next")
          : null;
      router.push(next && next.startsWith("/") ? next : "/compte");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Création du compte impossible.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="account-login-page">
      <section className="account-login-hero">
        <div className="container account-login-grid">
          <div className="account-login-copy">
            <p className="hero-kicker">Nouveau client</p>
            <h1>Créez votre compte FAST CASH.</h1>
            <p>Un seul compte pour retrouver vos commandes, télécharger vos factures et suivre vos achats.</p>
          </div>
          <div className="account-login-card">
            <p className="hero-kicker">Inscription</p>
            <h2>Créer mon compte</h2>
            <form className="account-login-form" onSubmit={handleSubmit}>
              <div className="account-form-row">
                <label>Prénom<input className="input" name="firstName" autoComplete="given-name" required /></label>
                <label>Nom<input className="input" name="lastName" autoComplete="family-name" required /></label>
              </div>
              <label>Email<input className="input" name="email" type="email" autoComplete="email" required /></label>
              <label>Téléphone<input className="input" name="phone" type="tel" autoComplete="tel" /></label>
              <label>Mot de passe<input className="input" name="password" type="password" autoComplete="new-password" minLength={8} required /></label>
              <label>Confirmer le mot de passe<input className="input" name="confirmPassword" type="password" autoComplete="new-password" minLength={8} required /></label>
              <small>Au moins 8 caractères, avec une lettre et un chiffre.</small>
              {message ? <p className="account-login-message account-login-message-error">{message}</p> : null}
              <button className="btn btn-gold" type="submit" disabled={loading}>{loading ? "Création..." : "Créer mon compte"} <ArrowRight size={17} /></button>
            </form>
            <div className="account-login-links">
              <Link
                href={
                  typeof window !== "undefined" &&
                  new URLSearchParams(window.location.search).get("next")
                    ? `/compte/login?next=${encodeURIComponent(
                        new URLSearchParams(window.location.search).get("next") || "/compte",
                      )}`
                    : "/compte/login"
                }
              >
                J&apos;ai déjà un compte
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
