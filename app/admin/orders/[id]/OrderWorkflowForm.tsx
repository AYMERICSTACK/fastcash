"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import styles from "../../admin.module.css";

const orderStatuses = [
  { value: "PENDING", label: "Nouvelle" },
  { value: "PREPARING", label: "En préparation" },
  { value: "READY_FOR_PICKUP", label: "Prête au retrait" },
  { value: "SHIPPED", label: "Expédiée" },
  { value: "DELIVERED", label: "Livrée" },
  { value: "CANCELLED", label: "Annulée" },
  { value: "REFUNDED", label: "Remboursée" },
];

type OrderWorkflowFormProps = {
  orderId: string;
  currentStatus: string;
  allowedStatuses: string[];
  currentShipmentStatus?: string | null;
  currentTrackingNo?: string | null;
  currentCarrier?: string | null;
  isPickupOrder: boolean;
  readyAt?: string | null;
  readyEmailSentAt?: string | null;
  shippedAt?: string | null;
  shippedEmailSentAt?: string | null;
};

export function OrderWorkflowForm({
  orderId,
  currentStatus,
  allowedStatuses,
  currentShipmentStatus,
  currentTrackingNo,
  currentCarrier,
  isPickupOrder,
  readyAt,
  readyEmailSentAt,
  shippedAt,
  shippedEmailSentAt,
}: OrderWorkflowFormProps) {
  const router = useRouter();
  const [status, setStatus] = useState(currentStatus);
  const [shipmentStatus, setShipmentStatus] = useState(currentShipmentStatus ?? currentStatus);
  const [trackingNo, setTrackingNo] = useState(currentTrackingNo ?? "");
  const [carrier, setCarrier] = useState(currentCarrier ?? "Poste Suisse");
  const [isSaving, setIsSaving] = useState(false);
  const [isMarkingReady, setIsMarkingReady] = useState(false);
  const [isMarkingShipped, setIsMarkingShipped] = useState(false);
  const [message, setMessage] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setMessage("");

    try {
      const response = await fetch(`/api/admin/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, shipmentStatus, trackingNo, carrier }),
      });
      const result = (await response.json()) as { error?: string; emailWarning?: string };

      if (!response.ok) {
        setMessage(result.error || "Impossible d'enregistrer les modifications.");
        return;
      }

      setMessage(result.emailWarning || "Commande mise à jour.");
      router.refresh();
    } finally {
      setIsSaving(false);
    }
  }

  async function markReadyForPickup() {
    setIsMarkingReady(true);
    setMessage("");

    try {
      const response = await fetch(`/api/admin/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "ready_for_pickup" }),
      });
      const result = (await response.json()) as { message?: string; error?: string };

      if (!response.ok) {
        setMessage(result.error || "Impossible de marquer la commande comme prête.");
        return;
      }

      setStatus("READY_FOR_PICKUP");
      setShipmentStatus("READY_FOR_PICKUP");
      setMessage(result.message || "Commande prête : le client a été informé.");
      router.refresh();
    } finally {
      setIsMarkingReady(false);
    }
  }

  async function markAsShipped() {
    setIsMarkingShipped(true);
    setMessage("");

    try {
      const response = await fetch(`/api/admin/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "mark_shipped", carrier, trackingNo }),
      });
      const result = (await response.json()) as { message?: string; error?: string };

      if (!response.ok) {
        setMessage(result.error || "Impossible de marquer la commande comme expédiée.");
        return;
      }

      setStatus("SHIPPED");
      setShipmentStatus("SHIPPED");
      setMessage(result.message || "Commande expédiée : le client a été informé.");
      router.refresh();
    } finally {
      setIsMarkingShipped(false);
    }
  }

  return (
    <div className={styles.workflowForm}>
      {isPickupOrder ? (
        <div className={styles.readyPickupPanel}>
          <div>
            <span className={styles.readyPickupKicker}>Retrait boutique</span>
            <strong>La commande est-elle prête à être remise au client ?</strong>
            <p>Un email automatique indiquera au client qu'il peut venir la récupérer avec sa référence de commande.</p>
            {readyAt ? (
              <small>Marquée prête le {new Date(readyAt).toLocaleString("fr-CH")}{readyEmailSentAt ? " · Email envoyé" : " · Email à renvoyer"}</small>
            ) : null}
          </div>
          <button
            type="button"
            className={styles.readyPickupButton}
            onClick={markReadyForPickup}
            disabled={isMarkingReady || Boolean(readyEmailSentAt)}
          >
            {readyEmailSentAt
              ? "Client déjà informé"
              : isMarkingReady
                ? "Envoi en cours..."
                : "Produit prêt · Informer le client"}
          </button>
        </div>
      ) : null}

      {!isPickupOrder ? (
        <div className={styles.readyPickupPanel}>
          <div>
            <span className={styles.readyPickupKicker}>Expédition</span>
            <strong>Le colis a-t-il été remis au transporteur ?</strong>
            <p>Renseignez le transporteur et le suivi, puis informez automatiquement le client.</p>
            {shippedAt ? (
              <small>Expédiée le {new Date(shippedAt).toLocaleString("fr-CH")}{shippedEmailSentAt ? " · Email envoyé" : " · Email à renvoyer"}</small>
            ) : null}
          </div>
          <button
            type="button"
            className={styles.readyPickupButton}
            onClick={markAsShipped}
            disabled={isMarkingShipped || Boolean(shippedEmailSentAt) || !carrier.trim() || !trackingNo.trim()}
          >
            {shippedEmailSentAt
              ? "Client déjà informé"
              : isMarkingShipped
                ? "Envoi en cours..."
                : "Colis expédié · Informer le client"}
          </button>
        </div>
      ) : null}

      <form className={styles.workflowEditor} onSubmit={handleSubmit}>
        <div className={styles.formGrid}>
          <label className={styles.field}>
            <span>Statut commande</span>
            <select value={status} onChange={(event) => setStatus(event.target.value)}>
              {orderStatuses.filter((item) => allowedStatuses.includes(item.value)).map((item) => (
                <option key={item.value} value={item.value}>{item.label}</option>
              ))}
            </select>
          </label>

          <label className={styles.field}>
            <span>Statut livraison</span>
            <select value={shipmentStatus} onChange={(event) => setShipmentStatus(event.target.value)}>
              {orderStatuses.map((item) => (
                <option key={item.value} value={item.value}>{item.label}</option>
              ))}
            </select>
          </label>

          <label className={styles.field}>
            <span>Transporteur</span>
            <input value={carrier} onChange={(event) => setCarrier(event.target.value)} />
          </label>

          <label className={styles.field}>
            <span>Numéro de suivi</span>
            <input value={trackingNo} onChange={(event) => setTrackingNo(event.target.value)} placeholder="Ex : FASTCASH-POST-001" />
          </label>
        </div>

        <p className={styles.formNote}>Les statuts proposés respectent l’ordre opérationnel de la commande. Les actions retrait et expédition restent disponibles au-dessus.</p>

        <div className={styles.formActions}>
          <button type="submit" className={styles.actionBtn} disabled={isSaving}>
            {isSaving ? "Enregistrement..." : "Enregistrer"}
          </button>
          {message ? <span className={styles.formMessage}>{message}</span> : null}
        </div>
      </form>
    </div>
  );
}
