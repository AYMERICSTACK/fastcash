"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useState, type FormEvent } from "react";

function ResetForm() {
  const token = useSearchParams().get("token") || "";
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    const data = new FormData(event.currentTarget);
    const response = await fetch("/api/customer/reset-password", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token, password: data.get("password"), confirmPassword: data.get("confirmPassword") }) });
    const result = (await response.json()) as { message?: string };
    setSuccess(response.ok);
    setMessage(response.ok ? "Votre mot de passe a bien été modifié." : result.message || "Réinitialisation impossible.");
    setLoading(false);
  }

  return <div className="account-login-card"><h2>Nouveau mot de passe</h2>{!token ? <p className="account-login-message account-login-message-error">Lien de réinitialisation manquant.</p> : <form className="account-login-form" onSubmit={handleSubmit}><label>Nouveau mot de passe<input className="input" name="password" type="password" minLength={8} required /></label><label>Confirmer<input className="input" name="confirmPassword" type="password" minLength={8} required /></label>{message ? <p className={`account-login-message ${success ? "" : "account-login-message-error"}`}>{message}</p> : null}{success ? <Link href="/compte/login" className="btn btn-gold">Me connecter</Link> : <button className="btn btn-gold" disabled={loading}>{loading ? "Validation..." : "Modifier le mot de passe"}</button>}</form>}</div>;
}

export default function ResetPasswordPage() {
  return <main className="account-login-page"><section className="account-login-hero"><div className="container account-login-grid"><div className="account-login-copy"><p className="hero-kicker">Espace client</p><h1>Choisissez un nouveau mot de passe.</h1><p>Votre lien est personnel et expire automatiquement.</p></div><Suspense fallback={null}><ResetForm /></Suspense></div></section></main>;
}
