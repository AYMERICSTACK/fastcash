"use client";

import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { useCart } from "@/components/cart/CartProvider";
import { useCurrency } from "@/components/currency/CurrencyProvider";
import { useI18n } from "@/lib/i18n";
import { getStockLabel, getStockStatus } from "@/lib/stock";
import StripeEmbeddedCheckout from "@/components/cart/StripeEmbeddedCheckout";

function CartPageContent() {
  const { items, total, hydrated, remove, setQty } = useCart();
  const { currency, formatPrice } = useCurrency();
  const { dict, locale } = useI18n();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [paymentCardEnabled, setPaymentCardEnabled] = useState(true);
  const [heylightEnabled, setHeylightEnabled] = useState(false);
  const [pickupEnabled, setPickupEnabled] = useState(true);
  const [shippingEnabled, setShippingEnabled] = useState(false);
  const [defaultCarrier, setDefaultCarrier] = useState("Poste Suisse");
  const [shippingFee, setShippingFee] = useState(0);
  const [shippingFreeThreshold, setShippingFreeThreshold] = useState(0);
  const [shippingCountries, setShippingCountries] = useState<string[]>(["CH", "FR"]);
  const [shippingMethod, setShippingMethod] = useState<"pickup" | "shipping">("pickup");
  const [couponCode, setCouponCode] = useState("");
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [couponMessage, setCouponMessage] = useState("");
  const [couponLoading, setCouponLoading] = useState(false);
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [checkoutAttemptId, setCheckoutAttemptId] = useState("");
  const [stripeClientSecret, setStripeClientSecret] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"stripe" | "heylight">("stripe");
  const [heylightCustomer, setHeylightCustomer] = useState({
    firstName: "", lastName: "", email: "", phone: "", line1: "", postalCode: "", city: "", country: "CH",
  });

  const checkoutWasCancelled = searchParams.get("checkout") === "cancelled";
  const hasUnavailableItems = items.some((item) => item.product.stock <= 0 || item.quantity > item.product.stock);

  useEffect(() => {
    let mounted = true;

    fetch("/api/settings/checkout")
      .then((res) => res.json())
      .then((data) => {
        if (!mounted) return;
        setPaymentCardEnabled(Boolean(data.paymentCardEnabled));
        setHeylightEnabled(Boolean(data.heylightEnabled));
        if (!data.paymentCardEnabled && data.heylightEnabled) setPaymentMethod("heylight");
        setPickupEnabled(Boolean(data.pickupEnabled));
        setShippingEnabled(Boolean(data.shippingEnabled));
        setDefaultCarrier(String(data.defaultCarrier || "Poste Suisse"));
        setShippingFee(Math.max(0, Number(data.shippingFee) || 0));
        setShippingFreeThreshold(Math.max(0, Number(data.shippingFreeThreshold) || 0));
        setShippingCountries(Array.isArray(data.shippingCountries) ? data.shippingCountries : ["CH", "FR"]);
        if (!data.pickupEnabled && data.shippingEnabled) setShippingMethod("shipping");
        if (!data.pickupEnabled && !data.shippingEnabled) setShippingMethod("pickup");
      })
      .catch(() => {
        if (!mounted) return;
        setPaymentCardEnabled(false);
      })
      .finally(() => {
        if (mounted) setSettingsLoaded(true);
      });

    return () => {
      mounted = false;
    };
  }, []);


  useEffect(() => {
    if (couponDiscount <= 0) return;
    setCouponDiscount(0);
    setCouponMessage(locale === "en" ? "Cart changed. Apply the promo code again." : "Le panier a changé. Appliquez de nouveau le code promotionnel.");
  }, [items, locale]);

  const deliveryIsFree = shippingMethod === "shipping" && (
    shippingFee <= 0 || (shippingFreeThreshold > 0 && total >= shippingFreeThreshold)
  );
  const appliedShippingFee = shippingMethod === "shipping" && !deliveryIsFree ? shippingFee : 0;
  const finalTotal = Math.max(0, total - couponDiscount + appliedShippingFee);
  const countryLabels = shippingCountries
    .map((country) => ({ CH: locale === "en" ? "Switzerland" : "Suisse", FR: "France" }[country] || country))
    .join(" & ");

  async function applyCoupon() {
    const normalized = couponCode.trim().toUpperCase();
    if (!normalized) {
      setCouponDiscount(0);
      setCouponMessage(locale === "en" ? "Enter a promo code." : "Saisissez un code promotionnel.");
      return;
    }

    setCouponLoading(true);
    setCouponMessage("");
    try {
      const response = await fetch("/api/coupons/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: normalized, subtotalCHF: total }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Code promotionnel invalide.");
      setCouponCode(payload.code);
      setCouponDiscount(Number(payload.discountCHF) || 0);
      setCouponMessage(locale === "en" ? "Promo code applied." : "Code promotionnel appliqué.");
    } catch (couponError) {
      setCouponDiscount(0);
      setCouponMessage(couponError instanceof Error ? couponError.message : "Code promotionnel invalide.");
    } finally {
      setCouponLoading(false);
    }
  }

  async function checkout() {
    if (!items.length) {
      setError(locale === "en" ? "Your cart is empty." : "Votre panier est vide.");
      return;
    }

    if (hasUnavailableItems) {
      setError("Votre panier contient un produit indisponible ou une quantité supérieure au stock disponible.");
      return;
    }

    if (shippingMethod === "pickup" && !pickupEnabled) {
      setError(locale === "en" ? "Store pickup is unavailable." : "Le retrait en boutique n'est pas disponible.");
      return;
    }

    if (shippingMethod === "shipping" && !shippingEnabled) {
      setError(locale === "en" ? "Home delivery is unavailable." : "La livraison à domicile n'est pas disponible.");
      return;
    }

    if (paymentMethod === "stripe" && !paymentCardEnabled) {
      setError("Le paiement par carte est actuellement indisponible.");
      return;
    }
    if (paymentMethod === "heylight" && !heylightEnabled) {
      setError("Le paiement HeyLight est actuellement indisponible.");
      return;
    }
    if (paymentMethod === "heylight") {
      const required = [heylightCustomer.firstName, heylightCustomer.lastName, heylightCustomer.email, heylightCustomer.phone];
      if (required.some((value) => !value.trim())) {
        setError("Renseignez vos nom, prénom, email et téléphone pour continuer avec HeyLight.");
        return;
      }
      if (shippingMethod === "shipping" && [heylightCustomer.line1, heylightCustomer.postalCode, heylightCustomer.city].some((value) => !value.trim())) {
        setError("Renseignez une adresse de livraison complète pour HeyLight.");
        return;
      }
    }

    setLoading(true);
    setError("");

    const attemptId = checkoutAttemptId || (typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`);
    if (!checkoutAttemptId) setCheckoutAttemptId(attemptId);

    try {
      const res = await fetch(paymentMethod === "heylight" ? "/api/checkout/heylight" : "/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: items.map((item) => ({
            id: item.product.id,
            quantity: item.quantity,
            offerToken: item.offerToken || undefined,
          })),
          currency,
          shippingMethod,
          couponCode: couponDiscount > 0 ? couponCode : "",
          checkoutAttemptId: attemptId,
          customer: paymentMethod === "heylight" ? heylightCustomer : undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || dict.cart.stripeInitError);
      }

      if (paymentMethod === "heylight") {
        if (!data.url) throw new Error(data.error || dict.cart.stripeInitError);
        window.location.href = data.url;
        return;
      }

      if (!data.clientSecret) {
        throw new Error("Stripe n’a pas retourné la session de paiement sécurisée.");
      }

      setStripeClientSecret(data.clientSecret);
      setLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : dict.cart.genericError);
      setCheckoutAttemptId("");
      setLoading(false);
    }
  }

  return (
    <main className="section cart-page-section">
      <div className="container">
        <div className="cart-page-heading">
          <p className="hero-kicker">{dict.cart.kicker}</p>
          <h1 className="title-lg">{dict.cart.title}</h1>
          <p>{dict.cart.intro}</p>
        </div>

        {checkoutWasCancelled ? (
          <div className="cart-alert">{dict.cart.cancelled}</div>
        ) : null}

        {error ? (
          <div className="cart-alert cart-alert-error">{error}</div>
        ) : null}

        {!hydrated ? (
          <div className="empty cart-empty-state" aria-live="polite">
            <h2>{locale === "en" ? "Loading your cart…" : "Chargement de votre panier…"}</h2>
          </div>
        ) : !items.length ? (
          <div className="empty cart-empty-state">
            <h2>{dict.cart.emptyTitle}</h2>
            <p>{dict.cart.emptyText}</p>
            <Link href="/categories/montres" className="btn btn-gold">
              {dict.cart.discover}
            </Link>
          </div>
        ) : (
          <div className="premium-cart-layout">
            <section
              className="premium-cart-items"
              aria-label={dict.cart.itemsAria}
            >
              {items.map((item) => {
                const stockStatus = getStockStatus(item.product.stock);
                const isUnavailable = stockStatus === "out-of-stock";

                return (
                <article className={`premium-cart-card ${isUnavailable ? "premium-cart-card-unavailable" : ""}`} key={item.product.id}>
                  <Link
                    className="premium-cart-image"
                    href={`/produits/${item.product.slug}`}
                  >
                    <Image
                      src={item.product.image.replace(
                        "small_default",
                        "large_default",
                      )}
                      alt={item.product.name}
                      width={220}
                      height={220}
                    />
                  </Link>

                  <div className="premium-cart-info">
                    <span className="premium-cart-category">
                      {item.product.category || dict.cart.fallbackCategory}
                    </span>
                    <Link
                      className="premium-cart-title"
                      href={`/produits/${item.product.slug}`}
                    >
                      {item.product.name}
                    </Link>

                    <div className="premium-cart-inline-price">
                      <span>{dict.cart.unitPrice}</span>
                      <strong>{formatPrice(item.product.price)}</strong>
                    </div>

                    <p>{dict.cart.checked}</p>
                    <span className={`premium-cart-stock premium-cart-stock-${stockStatus}`}>
                      {getStockLabel(item.product.stock)}
                    </span>

                    <div className="premium-cart-actions">
                      <label>
                        {dict.cart.quantity}
                        <div className="premium-qty-control">
                          <button
                            type="button"
                            onClick={() =>
                              setQty(
                                item.product.id,
                                Math.max(1, item.quantity - 1),
                              )
                            }
                            aria-label={dict.cart.decrease}
                            disabled={isUnavailable}
                          >
                            −
                          </button>
                          <input
                            className="input premium-cart-qty"
                            min={1}
                            max={Math.max(item.product.stock, 1)}
                            type="number"
                            value={item.quantity}
                            disabled={isUnavailable}
                            onChange={(event) =>
                              setQty(
                                item.product.id,
                                Number(event.target.value),
                              )
                            }
                          />
                          <button
                            type="button"
                            onClick={() =>
                              setQty(
                                item.product.id,
                                Math.min(item.product.stock, item.quantity + 1),
                              )
                            }
                            aria-label={dict.cart.increase}
                            disabled={isUnavailable || item.quantity >= item.product.stock}
                          >
                            +
                          </button>
                        </div>
                      </label>

                      <button
                        className="premium-cart-remove"
                        onClick={() => remove(item.product.id)}
                      >
                        {dict.cart.remove}
                      </button>
                    </div>
                  </div>

                  <div className="premium-cart-price">
                    <span>{dict.cart.itemTotal}</span>
                    <strong>
                      {formatPrice(item.product.price * item.quantity)}
                    </strong>
                  </div>
                </article>
                );
              })}
            </section>

            <aside
              className="premium-cart-summary"
              aria-label={dict.cart.summaryAria}
            >
              <p className="hero-kicker">{dict.cart.summary}</p>
              <h2>{dict.cart.totalCart}</h2>

              <div className="premium-summary-lines">
                <div>
                  <span>{dict.cart.subtotal}</span>
                  <strong>{formatPrice(total)}</strong>
                </div>
                <div>
                  <span>{dict.cart.shipping}</span>
                  <strong>{shippingMethod === "pickup" || deliveryIsFree ? dict.cart.free : formatPrice(appliedShippingFee)}</strong>
                </div>
                {couponDiscount > 0 ? (
                  <div>
                    <span>{locale === "en" ? `Promo code ${couponCode}` : `Code promo ${couponCode}`}</span>
                    <strong>− {formatPrice(couponDiscount)}</strong>
                  </div>
                ) : null}
                <div>
                  <span>{dict.cart.payment}</span>
                  <strong>{paymentMethod === "heylight" ? "HeyLight" : paymentCardEnabled ? dict.cart.stripe : "Indisponible"}</strong>
                </div>
              </div>

              <div className="premium-summary-total">
                <span>{dict.cart.total}</span>
                <strong>{formatPrice(finalTotal)}</strong>
              </div>

              <div className="premium-checkout-options">
                <div className="premium-shipping-options">
                  <strong>{locale === "en" ? "Delivery method" : "Mode de réception"}</strong>
                  {pickupEnabled ? (
                    <label className={shippingMethod === "pickup" ? "is-active" : ""}>
                      <input
                        type="radio"
                        name="shippingMethod"
                        value="pickup"
                        checked={shippingMethod === "pickup"}
                        onChange={() => setShippingMethod("pickup")}
                      />
                      <span>
                        <b>{locale === "en" ? "Store pickup" : "Retrait en boutique"}</b>
                        <small>{locale === "en" ? "Free — FAST CASH Geneva" : "Gratuit — FAST CASH Genève"}</small>
                      </span>
                    </label>
                  ) : null}
                  {shippingEnabled ? (
                    <label className={shippingMethod === "shipping" ? "is-active" : ""}>
                      <input
                        type="radio"
                        name="shippingMethod"
                        value="shipping"
                        checked={shippingMethod === "shipping"}
                        onChange={() => setShippingMethod("shipping")}
                      />
                      <span>
                        <b>{locale === "en" ? "Home delivery" : "Livraison à domicile"}</b>
                        <small>
                          {defaultCarrier} · {countryLabels}
                          {shippingFee <= 0
                            ? ` · ${locale === "en" ? "Free delivery" : "Livraison offerte"}`
                            : shippingFreeThreshold > 0
                              ? ` · ${locale === "en" ? "Free from" : "Offerte dès"} ${formatPrice(shippingFreeThreshold)}`
                              : ` · ${formatPrice(shippingFee)}`}
                        </small>
                      </span>
                    </label>
                  ) : null}
                </div>

                <div className="premium-coupon-box">
                  <label htmlFor="coupon-code">{locale === "en" ? "Promo code" : "Code promotionnel"}</label>
                  <div>
                    <input
                      id="coupon-code"
                      className="input"
                      value={couponCode}
                      onChange={(event) => {
                        setCouponCode(event.target.value.toUpperCase());
                        if (couponDiscount) {
                          setCouponDiscount(0);
                          setCouponMessage("");
                        }
                      }}
                      placeholder={locale === "en" ? "Your code" : "Votre code"}
                    />
                    <button type="button" onClick={applyCoupon} disabled={couponLoading || !couponCode.trim()}>
                      {couponLoading ? "…" : locale === "en" ? "Apply" : "Appliquer"}
                    </button>
                  </div>
                  {couponMessage ? <small className={couponDiscount > 0 ? "is-success" : "is-error"}>{couponMessage}</small> : null}
                </div>

                <div className="premium-payment-options">
                  <strong>{locale === "en" ? "Payment method" : "Moyen de paiement"}</strong>
                  {paymentCardEnabled ? (
                    <label className={paymentMethod === "stripe" ? "is-active" : ""}>
                      <input type="radio" name="paymentMethod" checked={paymentMethod === "stripe"} onChange={() => setPaymentMethod("stripe")} />
                      <span><b>Carte bancaire</b><small>Paiement sécurisé par Stripe</small></span>
                    </label>
                  ) : null}
                  {heylightEnabled ? (
                    <label className={paymentMethod === "heylight" ? "is-active" : ""}>
                      <input type="radio" name="paymentMethod" checked={paymentMethod === "heylight"} onChange={() => setPaymentMethod("heylight")} />
                      <span><b>HeyLight</b><small>Paiement en plusieurs fois, sous réserve d'acceptation</small></span>
                    </label>
                  ) : null}
                </div>

                {paymentMethod === "heylight" ? (
                  <div className="premium-heylight-form">
                    <strong>Informations requises par HeyLight</strong>
                    <div className="premium-heylight-grid">
                      {[
                        ["firstName", "Prénom"], ["lastName", "Nom"], ["email", "Email"], ["phone", "Téléphone mobile"],
                        ...(shippingMethod === "shipping" ? [["line1", "Adresse"], ["postalCode", "Code postal"], ["city", "Ville"]] : []),
                      ].map(([key, label]) => (
                        <label key={key}><span>{label}</span><input className="input" type={key === "email" ? "email" : "text"} value={heylightCustomer[key as keyof typeof heylightCustomer]} onChange={(event) => setHeylightCustomer((current) => ({ ...current, [key]: event.target.value }))} /></label>
                      ))}
                    </div>
                    <small>Vous serez redirigé vers HeyLight pour finaliser votre demande.</small>
                  </div>
                ) : null}
              </div>

              {!pickupEnabled && !shippingEnabled ? (
                <div className="premium-checkout-warning" role="alert">
                  {locale === "en"
                    ? "No delivery method is currently available."
                    : "Aucun mode de réception n'est actuellement disponible."}
                </div>
              ) : null}

              <button
                className="btn btn-gold premium-checkout-btn"
                disabled={loading || !settingsLoaded || (paymentMethod === "stripe" ? !paymentCardEnabled : !heylightEnabled) || hasUnavailableItems || (!pickupEnabled && !shippingEnabled)}
                onClick={checkout}
              >
                {loading ? "Préparation du paiement…" : paymentMethod === "heylight" ? "Continuer avec HeyLight" : paymentCardEnabled ? "Payer par carte" : "Paiement indisponible"}
              </button>

              <ul className="premium-cart-reassurance">
                {dict.cart.reassurance.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </aside>

            {stripeClientSecret ? (
              <div className="stripe-embedded-overlay" role="dialog" aria-modal="true" aria-label="Paiement Stripe">
                <div className="stripe-embedded-dialog">
                  <StripeEmbeddedCheckout
                    clientSecret={stripeClientSecret}
                    onClose={() => {
                      setStripeClientSecret("");
                      setCheckoutAttemptId("");
                    }}
                  />
                </div>
              </div>
            ) : null}
          </div>
        )}
      </div>
    </main>
  );
}
export default function CartPage() {
  return (
    <Suspense fallback={null}>
      <CartPageContent />
    </Suspense>
  );
}
