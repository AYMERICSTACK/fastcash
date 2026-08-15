import { getAdminSession, requireAdminSession } from "@/lib/session";

export async function isAdminAuthenticated() {
  return Boolean(await getAdminSession());
}

export { getAdminSession, requireAdminSession };
