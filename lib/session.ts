import { cookies } from "next/headers";
import {
  ADMIN_SESSION_COOKIE,
  CUSTOMER_SESSION_COOKIE,
  createAdminSessionToken,
  createCustomerMagicLinkToken,
  createCustomerPasswordResetToken,
  createCustomerSessionToken,
  verifyPayload,
  type AdminSession,
  type CustomerMagicLink,
  type CustomerPasswordReset,
  type CustomerSession,
} from "@/lib/session-token";

export async function getAdminSession() {
  const store = await cookies();
  return verifyPayload<AdminSession>(store.get(ADMIN_SESSION_COOKIE)?.value, "admin");
}

export async function requireAdminSession() {
  const session = await getAdminSession();
  if (!session) throw new Error("UNAUTHORIZED");
  return session;
}

export async function getCustomerSession() {
  const store = await cookies();
  return verifyPayload<CustomerSession>(store.get(CUSTOMER_SESSION_COOKIE)?.value, "customer");
}

export {
  ADMIN_SESSION_COOKIE,
  CUSTOMER_SESSION_COOKIE,
  createAdminSessionToken,
  createCustomerMagicLinkToken,
  createCustomerPasswordResetToken,
  createCustomerSessionToken,
  verifyPayload,
};
export type { AdminSession, CustomerMagicLink, CustomerPasswordReset, CustomerSession };
