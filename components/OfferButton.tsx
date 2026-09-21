"use client";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import type { Product } from "@/lib/products";
import { productAnalyticsItem, trackAnalyticsEvent } from "@/lib/analytics";

export default function OfferButton({ product }: { product: Product }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [success, setSuccess] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setMsg("");
    const form = e.currentTarget;
    const fd = new FormData(form);
    try {
      const response = await fetch("/api/offers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: String(product.id),
          name: fd.get("name"),
          email: fd.get("email"),
          phone: fd.get("phone"),
          amount: fd.get("amount"),
          message: fd.get("message"),
        }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.error || "Impossible d'envoyer l'offre pour le moment.");
      trackAnalyticsEvent("submit_offer", {
        currency: "CHF",
        value: Number(String(fd.get("amount") || "").replace(",", ".")) || 0,
        items: [productAnalyticsItem(product)],
      });
      setSuccess(true);
      setMsg("Votre offre a bien été transmise à FAST CASH Genève.");
      form.reset();
    } catch (error) {
      setMsg(error instanceof Error ? error.message : "Une erreur est survenue. Merci de réessayer.");
    } finally {
      setBusy(false);
    }
  }

  const modal = open && typeof document !== "undefined" ? createPortal(
    <div className="offer-modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) setOpen(false); }}>
      <div className="offer-modal" role="dialog" aria-modal="true" aria-labelledby="offer-modal-title">
        <button type="button" className="offer-modal-close" aria-label="Fermer" onClick={() => setOpen(false)}>×</button>
        <p className="hero-kicker">Négociation privée</p>
        <h2 id="offer-modal-title">Proposer votre prix</h2>
        <p className="offer-price">Prix affiché : <strong>{product.price.toFixed(2)} CHF</strong></p>
        <p className="muted offer-intro">FAST CASH étudiera votre proposition et pourra l'accepter, la refuser ou vous proposer une contre-offre.</p>
        {msg ? <div className="offer-message" role="status" aria-live="polite">{msg}</div> : null}
        {!success ? (
          <form onSubmit={submit}>
            <label>Votre offre (CHF)<input name="amount" type="text" inputMode="decimal" autoComplete="off" placeholder="Ex. 120 ou 120,50" required maxLength={20} /></label>
            <div className="offer-form-grid">
              <label>Nom<input name="name" autoComplete="name" required maxLength={120} /></label>
              <label>E-mail<input name="email" type="email" inputMode="email" autoComplete="email" required maxLength={160} /></label>
            </div>
            <label>Téléphone<input name="phone" type="tel" inputMode="tel" autoComplete="tel" maxLength={40} /></label>
            <label>Message (facultatif)<textarea name="message" rows={3} maxLength={1000} /></label>
            <button type="submit" className="btn btn-gold" disabled={busy}>{busy ? "Envoi…" : "Envoyer mon offre"}</button>
          </form>
        ) : (
          <button type="button" className="btn btn-gold" style={{ marginTop: 16, width: "100%" }} onClick={() => setOpen(false)}>Fermer</button>
        )}
      </div>
    </div>,
    document.body,
  ) : null;

  return <><button type="button" className="btn offer-trigger" onClick={() => { setSuccess(false); setMsg(""); setOpen(true); }}>Faire une offre</button>{modal}</>;
}
