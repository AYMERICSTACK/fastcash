"use client";

import { useState, type FormEvent } from "react";
import { CheckCircle2, Save } from "lucide-react";

type Props = { firstName: string; lastName: string; phone: string };

export default function ProfileForm({ firstName, lastName, phone }: Props) {
  const [form, setForm] = useState({ firstName, lastName, phone });
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true); setMessage(""); setError(false);
    try {
      const response = await fetch("/api/customer/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const result = await response.json() as { message?: string };
      setError(!response.ok);
      setMessage(response.ok ? "Vos informations ont bien été mises à jour." : result.message || "Modification impossible.");
    } catch {
      setError(true); setMessage("Une erreur réseau est survenue.");
    } finally { setBusy(false); }
  }

  return (
    <form className="account-edit-form" onSubmit={submit}>
      <div className="account-form-grid">
        <label><span>Prénom</span><input required value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} autoComplete="given-name" /></label>
        <label><span>Nom</span><input required value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} autoComplete="family-name" /></label>
        <label className="account-form-wide"><span>Téléphone</span><input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} autoComplete="tel" placeholder="+41 79 000 00 00" /></label>
      </div>
      <div className="account-edit-actions">
        <button className="btn btn-gold" disabled={busy} type="submit"><Save size={17} /> {busy ? "Enregistrement..." : "Enregistrer"}</button>
        {message ? <p className={error ? "account-feedback error" : "account-feedback success"}>{!error ? <CheckCircle2 size={17} /> : null}{message}</p> : null}
      </div>
    </form>
  );
}
