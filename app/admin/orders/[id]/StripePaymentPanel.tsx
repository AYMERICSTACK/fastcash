"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import styles from "../../admin.module.css";
import { useAdminConfirm, useAdminToast } from "../../AdminProviders";

type StripePaymentPanelProps = {
  orderId: string;
  currency: string;
  amount: number;
  refundedAmount: number;
  paymentStatus: string;
  paymentIntentId: string | null;
  checkoutSessionId: string | null;
  chargeId: string | null;
  latestEventType: string | null;
  latestEventCreatedAt: string | null;
  failureMessage: string | null;
  disputeStatus: string | null;
  stripeMode: "test" | "live" | null;
  stockRestockedAt: string | null;
};

function formatMoney(amount: number, currency: string) {
  return new Intl.NumberFormat("fr-CH", {
    style: "currency",
    currency: currency || "CHF",
  }).format(amount);
}

export function StripePaymentPanel({
  orderId,
  currency,
  amount,
  refundedAmount,
  paymentStatus,
  paymentIntentId,
  checkoutSessionId,
  chargeId,
  latestEventType,
  latestEventCreatedAt,
  failureMessage,
  disputeStatus,
  stripeMode,
  stockRestockedAt,
}: StripePaymentPanelProps) {
  const router = useRouter();
  const confirm = useAdminConfirm();
  const toast = useAdminToast();
  const remaining = useMemo(() => Math.max(0, amount - refundedAmount), [amount, refundedAmount]);
  const [refundAmount, setRefundAmount] = useState(remaining ? remaining.toFixed(2) : "0.00");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isRefunding, setIsRefunding] = useState(false);
  const [isRestocking, setIsRestocking] = useState(false);
  const [message, setMessage] = useState("");

  async function runAction(action: "stripe_status" | "stripe_refund" | "restock_refunded_order", payload: Record<string, unknown> = {}) {
    const response = await fetch(`/api/admin/orders/${orderId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, ...payload }),
    });
    const result = (await response.json()) as { message?: string; error?: string };
    if (!response.ok) throw new Error(result.error || "L'action Stripe a échoué.");
    setMessage(result.message || "Action Stripe effectuée.");
    router.refresh();
  }

  async function refreshStatus() {
    setIsRefreshing(true);
    setMessage("");
    try {
      await runAction("stripe_status");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Impossible d'actualiser Stripe.");
    } finally {
      setIsRefreshing(false);
    }
  }

  async function refund() {
    const requested = Number(refundAmount.replace(",", "."));
    if (!Number.isFinite(requested) || requested <= 0 || requested > remaining + 0.005) {
      setMessage(`Saisissez un montant compris entre 0.01 et ${remaining.toFixed(2)} ${currency}.`);
      return;
    }

    const confirmed = await confirm({
      title: "Confirmer le remboursement Stripe ?",
      description: `Vous êtes sur le point de rembourser ${formatMoney(requested, currency)}. Cette action financière est transmise immédiatement à Stripe. Le stock ne sera pas réintégré automatiquement : il ne pourra être remis en vente qu'après confirmation du retour physique en boutique.`,
      confirmLabel: "Confirmer le remboursement",
      cancelLabel: "Annuler",
      tone: "danger",
    });
    if (!confirmed) return;

    setIsRefunding(true);
    setMessage("");
    try {
      await runAction("stripe_refund", { amount: requested });
      toast.success(`Remboursement Stripe de ${formatMoney(requested, currency)} effectué.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Impossible de rembourser cette commande.");
    } finally {
      setIsRefunding(false);
    }
  }


  async function confirmPhysicalReturnAndRestock() {
    const confirmed = await confirm({
      title: "Confirmer le retour physique des articles ?",
      description: "Confirmez uniquement lorsque tous les articles de cette commande sont réellement revenus en boutique et ont été contrôlés. Les quantités commandées seront alors réintégrées au stock disponible. Cette opération ne pourra être effectuée qu'une seule fois.",
      confirmLabel: "Confirmer le retour + remettre en stock",
      cancelLabel: "Annuler",
      tone: "default",
    });
    if (!confirmed) return;

    setIsRestocking(true);
    setMessage("");
    try {
      await runAction("restock_refunded_order");
      toast.success("Retour physique confirmé : les articles ont été réintégrés au stock.");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Impossible de réintégrer les articles au stock.";
      setMessage(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsRestocking(false);
    }
  }

  const canRefund = Boolean(paymentIntentId) && remaining > 0.005 && !paymentStatus.startsWith("dispute_") && paymentStatus !== "disputed";
  const isFullyRefunded = paymentStatus === "refunded" || refundedAmount >= amount - 0.005;

  return (
    <div className={styles.stripePanel}>
      <div className={styles.stripePanelHead}>
        <div>
          <span className={styles.stripeKicker}>Stripe {stripeMode ? `· ${stripeMode === "live" ? "Production" : "Test"}` : ""}</span>
          <strong>Transaction et remboursements</strong>
          <p>Le webhook reste la source de vérité. L'actualisation interroge directement Stripe.</p>
        </div>
        <button type="button" className={styles.buttonSecondary} onClick={refreshStatus} disabled={isRefreshing || !paymentIntentId}>
          {isRefreshing ? "Actualisation..." : "Actualiser le statut"}
        </button>
      </div>

      <div className={styles.stripeFacts}>
        <div><span>Payment Intent</span><strong title={paymentIntentId || undefined}>{paymentIntentId || "—"}</strong></div>
        <div><span>Session Checkout</span><strong title={checkoutSessionId || undefined}>{checkoutSessionId || "—"}</strong></div>
        <div><span>Charge</span><strong title={chargeId || undefined}>{chargeId || "—"}</strong></div>
        <div><span>Dernier événement</span><strong>{latestEventType || "—"}</strong></div>
        <div><span>État local</span><strong>{paymentStatus}</strong></div>
        <div><span>Dernière synchro</span><strong>{latestEventCreatedAt ? new Date(latestEventCreatedAt).toLocaleString("fr-CH") : "—"}</strong></div>
      </div>

      {failureMessage ? <p className={styles.stripeAlert}>Échec Stripe : {failureMessage}</p> : null}
      {disputeStatus ? <p className={styles.stripeAlert}>Litige Stripe : {disputeStatus}. Aucun remboursement manuel n'est proposé ici pendant le litige.</p> : null}

      <div className={styles.stripeRefundBox}>
        <div>
          <span>Remboursé</span>
          <strong>{formatMoney(refundedAmount, currency)}</strong>
          <small>Reste remboursable : {formatMoney(remaining, currency)}</small>
        </div>
        <label>
          <span>Montant à rembourser</span>
          <div className={styles.stripeRefundInput}>
            <input
              inputMode="decimal"
              value={refundAmount}
              onChange={(event) => setRefundAmount(event.target.value)}
              disabled={!canRefund || isRefunding}
              aria-label="Montant du remboursement Stripe"
            />
            <span>{currency}</span>
          </div>
        </label>
        <button type="button" className={styles.dangerButton} onClick={refund} disabled={!canRefund || isRefunding}>
          {isRefunding ? "Remboursement..." : remaining > 0.005 ? "Rembourser via Stripe" : "Remboursement total effectué"}
        </button>
      </div>

      {isFullyRefunded ? (
        <div className={`${styles.refundRestockState} ${stockRestockedAt ? styles.refundRestockStateDone : ""}`}>
          <div>
            <span>{stockRestockedAt ? "Retour physique confirmé" : "Remboursement effectué"}</span>
            <strong>{stockRestockedAt ? "Stock réintégré" : "Stock : non réintégré"}</strong>
            <p>
              {stockRestockedAt
                ? `Articles remis en stock le ${new Date(stockRestockedAt).toLocaleString("fr-CH")}.`
                : "Le remboursement financier est terminé. Attendez le retour physique et le contrôle des articles avant de les remettre en vente."}
            </p>
          </div>
          {!stockRestockedAt ? (
            <button
              type="button"
              className={styles.button}
              onClick={confirmPhysicalReturnAndRestock}
              disabled={isRestocking}
            >
              {isRestocking ? "Réintégration..." : "Confirmer le retour des articles + remettre en stock"}
            </button>
          ) : null}
        </div>
      ) : null}

      {message ? <p className={styles.formMessage}>{message}</p> : null}
    </div>
  );
}
