export const ORDER_STATUS_LABELS: Record<string, string> = {
  PENDING: "Nouvelle",
  PREPARING: "En préparation",
  READY_FOR_PICKUP: "Prête au retrait",
  SHIPPED: "Expédiée",
  DELIVERED: "Livrée",
  CANCELLED: "Annulée",
  REFUNDED: "Remboursée",
};

export const PAYMENT_STATUS_LABELS: Record<string, string> = {
  paid: "Payé",
  unpaid: "Non payé",
  pending: "En attente",
  failed: "Échec",
  refunded: "Remboursé",
  confirmed: "Confirmé",
  imported: "Importé",
};

export function getOrderStatusLabel(status?: string | null) {
  if (!status) return "—";
  return ORDER_STATUS_LABELS[status] ?? status;
}

export function getPaymentStatusLabel(status?: string | null) {
  if (!status) return "—";
  return PAYMENT_STATUS_LABELS[status] ?? status;
}

export const OFFER_STATUS_LABELS: Record<string, string> = {
  PENDING: "En attente",
  ACCEPTED: "Acceptée",
  COUNTERED: "Contre-offre envoyée",
  REFUSED: "Refusée",
  PURCHASED: "Achat finalisé",
  EXPIRED: "Expirée",
};

export function getOfferStatusLabel(status?: string | null) {
  if (!status) return "—";
  return OFFER_STATUS_LABELS[status] ?? status;
}

export function formatAdminDate(value: Date | string) {
  return new Intl.DateTimeFormat("fr-CH", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function getStockLabel(stock: number, lowStockThreshold: number) {
  if (stock <= 0) return "Rupture";
  if (stock <= lowStockThreshold) return "Stock faible";
  return "Disponible";
}

export function getCustomerName(customer: {
  firstName?: string | null;
  lastName?: string | null;
  email: string;
}) {
  const fullName = [customer.firstName, customer.lastName].filter(Boolean).join(" ").trim();
  return fullName || customer.email;
}

export function isPickupCarrier(carrier?: string | null) {
  return /retrait|pickup/i.test(carrier || "");
}

export function getReceptionLabel(carrier?: string | null, defaultCarrier = "Poste Suisse") {
  return isPickupCarrier(carrier) ? "Retrait boutique" : carrier || defaultCarrier;
}
