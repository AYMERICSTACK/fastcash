"use client";

import { useEffect, useRef, useState } from "react";
import { useCart } from "./CartProvider";

type CheckoutState = "checking" | "processing" | "confirmed" | "error";

export default function ClearCartOnSuccess({ sessionId }: { sessionId?: string }) {
  const { clear } = useCart();
  const hasCleared = useRef(false);
  const [state, setState] = useState<CheckoutState>(sessionId ? "checking" : "error");
  const [reference, setReference] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionId) return;

    let cancelled = false;
    let attempts = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const verify = async () => {
      attempts += 1;
      try {
        const response = await fetch(`/api/checkout/status?session_id=${encodeURIComponent(sessionId)}`, {
          cache: "no-store",
        });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || "Vérification impossible.");
        if (cancelled) return;

        setReference(payload.reference || null);

        if (payload.paid && payload.processed) {
          setState("confirmed");
          if (!hasCleared.current) {
            hasCleared.current = true;
            clear();
          }
          return;
        }

        if (payload.paid && attempts < 8) {
          setState("processing");
          timer = setTimeout(verify, 1500);
          return;
        }

        setState(payload.paid ? "processing" : "error");
      } catch {
        if (cancelled) return;
        if (attempts < 4) {
          timer = setTimeout(verify, 1500);
        } else {
          setState("error");
        }
      }
    };

    verify();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [clear, sessionId]);

  return (
    <div className={`checkout-verification checkout-verification-${state}`} role="status" aria-live="polite">
      {state === "checking" ? "Vérification sécurisée du paiement…" : null}
      {state === "processing" ? "Paiement reçu. Finalisation de votre commande…" : null}
      {state === "confirmed" ? `Paiement confirmé${reference ? ` — ${reference}` : ""}.` : null}
      {state === "error" ? "Nous ne pouvons pas encore confirmer ce paiement. Votre panier a été conservé." : null}
    </div>
  );
}
