"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { ArrowRight, LockKeyhole, ShieldCheck } from "lucide-react";

export default function CustomerLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      const response = await fetch("/api/customer/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const result = (await response.json()) as { message?: string };
      if (!response.ok) throw new Error(result.message || "Connexion impossible.");
      const next =
        typeof window !== "undefined"
          ? new URLSearchParams(window.location.search).get("next")
          : null;
      router.push(next && next.startsWith("/") ? next : "/compte");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Connexion impossible.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="account-login-page">
      <section className="account-login-hero">
        <div className="container account-login-grid">
          <div className="account-login-copy">
            <p className="hero-kicker">Espace client FAST CASH</p>
            <h1>Connectez-vous à votre espace personnel.</h1>
            <p>Retrouvez vos commandes, factures, adresses et informations de livraison depuis un espace sécurisé.</p>
            <div className="account-login-benefits">
              <span><ShieldCheck size={18} /> Session sécurisée</span>
              <span><LockKeyhole size={18} /> Mot de passe chiffré</span>
            </div>
          </div>

          <div className="account-login-card">
            <div>
              <p className="hero-kicker">Déjà client</p>
              <h2>Connexion</h2>
              <p>Utilisez l'adresse email et le mot de passe associés à votre compte FAST CASH.</p>
            </div>

            <form className="account-login-form" onSubmit={handleSubmit}>
              <label>
                Adresse email
                <input className="input" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
              </label>
              <label>
                Mot de passe
                <input className="input" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required />
              </label>
              {message ? <p className="account-login-message account-login-message-error">{message}</p> : null}
              <button className="btn btn-gold" type="submit" disabled={loading}>
                {loading ? "Connexion..." : "Me connecter"} <ArrowRight size={17} />
              </button>
            </form>

            <div className="account-login-links">
              <Link href="/compte/mot-de-passe-oublie">Mot de passe oublié ?</Link>
              <Link
                href={
                  typeof window !== "undefined" &&
                  new URLSearchParams(window.location.search).get("next")
                    ? `/compte/inscription?next=${encodeURIComponent(
                        new URLSearchParams(window.location.search).get("next") || "/compte",
                      )}`
                    : "/compte/inscription"
                }
              >
                Créer un compte
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
