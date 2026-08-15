import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { ADMIN_SESSION_COOKIE, verifyPayload, type AdminSession } from "@/lib/session-token";

const PILOTAGE_ROUTES: Record<string, string> = {
  "/pilotage": "/admin",
  "/pilotage/commandes": "/admin/orders",
  "/pilotage/offres": "/admin/offers",
  "/pilotage/produits": "/admin/products",
  "/pilotage/medias": "/admin/media",
  "/pilotage/stocks": "/admin/inventory",
  "/pilotage/categories": "/admin/categories",
  "/pilotage/marques": "/admin/brands",
  "/pilotage/clients": "/admin/customers",
  "/pilotage/factures": "/admin/invoices",
  "/pilotage/coupons": "/admin/coupons",
  "/pilotage/migration-prestashop": "/admin/prestashop",
  "/pilotage/parametres": "/admin/settings",
};

function resolvePilotagePath(pathname: string) {
  const exact = PILOTAGE_ROUTES[pathname];
  if (exact) return exact;

  const mappings = [
    ["/pilotage/commandes/", "/admin/orders/"],
    ["/pilotage/offres/", "/admin/offers/"],
    ["/pilotage/produits/", "/admin/products/"],
    ["/pilotage/categories/", "/admin/categories/"],
    ["/pilotage/marques/", "/admin/brands/"],
    ["/pilotage/clients/", "/admin/customers/"],
    ["/pilotage/factures/", "/admin/invoices/"],
    ["/pilotage/coupons/", "/admin/coupons/"],
  ] as const;

  for (const [publicPrefix, internalPrefix] of mappings) {
    if (pathname.startsWith(publicPrefix)) return pathname.replace(publicPrefix, internalPrefix);
  }

  return null;
}

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const isAdminArea = pathname.startsWith("/admin") || pathname.startsWith("/pilotage");
  const isLoginPage = pathname === "/admin/login" || pathname === "/pilotage/connexion";

  if (!isAdminArea || isLoginPage) return NextResponse.next();

  const token = request.cookies.get(ADMIN_SESSION_COOKIE)?.value;
  const session = await verifyPayload<AdminSession>(token, "admin");
  if (!session) {
    const response = NextResponse.redirect(new URL("/pilotage/connexion", request.url));
    response.cookies.delete(ADMIN_SESSION_COOKIE);
    return response;
  }

  if (pathname.startsWith("/pilotage")) {
    const internalPath = resolvePilotagePath(pathname);
    if (internalPath) {
      const url = request.nextUrl.clone();
      url.pathname = internalPath;
      return NextResponse.rewrite(url);
    }
  }

  return NextResponse.next();
}

export const config = { matcher: ["/admin/:path*", "/pilotage/:path*"] };
