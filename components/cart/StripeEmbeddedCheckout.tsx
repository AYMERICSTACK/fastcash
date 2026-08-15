"use client";

import { loadStripe, type StripeEmbeddedCheckout } from "@stripe/stripe-js";
import { useEffect, useRef, useState } from "react";

let stripePromise: ReturnType<typeof loadStripe> | null = null;

function getStripePromise() {
  const key = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.trim();
  if (!key) return null;
  if (!stripePromise) stripePromise = loadStripe(key);
  return stripePromise;
}

export default function StripeEmbeddedCheckout({
  clientSecret,
  onClose,
}: {
  clientSecret: string;
  onClose: () => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const checkoutRef = useRef<StripeEmbeddedCheckout | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function mountCheckout() {
      const stripeLoader = getStripePromise();
      if (!stripeLoader) {
        setError("La clé publique Stripe est absente.");
        return;
      }

      try {
        const stripe = await stripeLoader;
        if (!stripe || cancelled || !containerRef.current) return;

        const checkout = await stripe.createEmbeddedCheckoutPage({
          fetchClientSecret: async () => clientSecret,
        });

        if (cancelled || !containerRef.current) {
          checkout.destroy();
          return;
        }

        checkoutRef.current = checkout;
        checkout.mount(containerRef.current);
      } catch (checkoutError) {
        console.error("[stripe-embedded-checkout]", checkoutError);
        setError("Impossible d’afficher le paiement sécurisé Stripe.");
      }
    }

    mountCheckout();

    return () => {
      cancelled = true;
      checkoutRef.current?.destroy();
      checkoutRef.current = null;
    };
  }, [clientSecret]);

  return (
    <section className="stripe-embedded-shell" aria-label="Paiement sécurisé Stripe">
      <div className="stripe-embedded-heading">
        <div>
          <p className="hero-kicker">Paiement sécurisé</p>
          <h2>Finalisez votre commande</h2>
          <p>Vos informations bancaires sont traitées directement par Stripe.</p>
        </div>
        <button type="button" className="stripe-embedded-close" onClick={onClose} aria-label="Fermer le paiement Stripe">
          ×
        </button>
      </div>

      {error ? <div className="cart-alert cart-alert-error">{error}</div> : null}
      <div ref={containerRef} className="stripe-embedded-container" />
    </section>
  );
}
