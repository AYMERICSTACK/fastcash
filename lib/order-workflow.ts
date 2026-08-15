export const ORDER_STATUSES = [
  "PENDING",
  "PREPARING",
  "READY_FOR_PICKUP",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
  "REFUNDED",
] as const;

export type WorkflowOrderStatus = (typeof ORDER_STATUSES)[number];

const transitions: Record<WorkflowOrderStatus, readonly WorkflowOrderStatus[]> = {
  PENDING: ["PENDING", "PREPARING", "CANCELLED"],
  PREPARING: ["PREPARING", "READY_FOR_PICKUP", "SHIPPED", "CANCELLED"],
  READY_FOR_PICKUP: ["READY_FOR_PICKUP", "DELIVERED", "CANCELLED"],
  SHIPPED: ["SHIPPED", "DELIVERED", "REFUNDED"],
  DELIVERED: ["DELIVERED", "REFUNDED"],
  CANCELLED: ["CANCELLED", "REFUNDED"],
  REFUNDED: ["REFUNDED"],
};

export function isWorkflowOrderStatus(value: unknown): value is WorkflowOrderStatus {
  return typeof value === "string" && ORDER_STATUSES.includes(value as WorkflowOrderStatus);
}

export function getAllowedOrderTransitions(current: string): readonly WorkflowOrderStatus[] {
  if (!isWorkflowOrderStatus(current)) return ORDER_STATUSES;
  return transitions[current];
}

export function canTransitionOrder(current: string, next: string) {
  return isWorkflowOrderStatus(next) && getAllowedOrderTransitions(current).includes(next);
}

export function getTransitionError(current: string, next: string) {
  if (!isWorkflowOrderStatus(next)) return "Le statut demandé est invalide.";
  if (canTransitionOrder(current, next)) return null;
  return `La transition ${current} → ${next} n'est pas autorisée. Utilisez le workflow prévu pour éviter une incohérence de commande.`;
}
