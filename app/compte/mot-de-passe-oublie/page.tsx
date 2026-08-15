"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    const response = await fetch("/api/customer/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const result = (await response.json()) as { message?: string };
    setMessage(result.message || "Si un compte existe, un email vient d'être envoyé.");
    setLoading(false);
  }

  return <main className="account-login-page"><section className="account-login-hero"><div className="container account-login-grid"><div className="account-login-copy"><p className="hero-kicker">Sécurité du compte</p><h1>Réinitialisez votre mot de passe.</h1><p>Nous vous enverrons un lien personnel valable 30 minutes.</p></div><div className="account-login-card"><h2>Mot de passe oublié</h2><form className="account-login-form" onSubmit={handleSubmit}><label>Adresse email<input className="input" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></label>{message ? <p className="account-login-message">{message}</p> : null}<button className="btn btn-gold" disabled={loading}>{loading ? "Envoi..." : "Envoyer le lien"}</button></form><div className="account-login-links"><Link href="/compte/login">Retour à la connexion</Link></div></div></div></section></main>;
}
