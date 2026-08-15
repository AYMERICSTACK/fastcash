"use client";
import { useEffect, useState } from "react";
import { useCart } from "@/components/cart/CartProvider";
export default function HeyLightSuccess({ order }: { order: string }) {
  const { clear } = useCart();
  const [message, setMessage] = useState("Vérification de la réponse HeyLight…");
  useEffect(() => {
    let active = true;
    const check = async () => {
      const response = await fetch(`/api/heylight/return?order=${encodeURIComponent(order)}`, { cache: "no-store" });
      const data = await response.json();
      if (!active) return;
      if (data.processed) { clear(); setMessage(`Paiement confirmé — commande ${data.reference}.`); }
      else setMessage("Votre demande HeyLight est en cours de validation. La commande sera confirmée automatiquement dès réception du statut final.");
    };
    check().catch(() => setMessage("Votre demande HeyLight a été transmise. Nous attendons sa confirmation."));
    return () => { active = false; };
  }, [clear, order]);
  return <div className="cart-alert" aria-live="polite">{message}</div>;
}
