import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  CUSTOMER_SESSION_COOKIE,
  createCustomerSessionToken,
  verifyPayload,
  type CustomerMagicLink,
} from "@/lib/session";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token") || undefined;
  const payload = await verifyPayload<CustomerMagicLink>(token, "customer-magic-link");

  if (!payload) {
    return NextResponse.redirect(new URL("/compte/login?error=invalid-link", request.url));
  }

  const customer = await prisma.customer.findUnique({
    where: { email: payload.email },
    select: { id: true, email: true },
  });

  if (!customer) {
    return NextResponse.redirect(new URL("/compte/login?error=account-not-found", request.url));
  }

  const sessionToken = await createCustomerSessionToken({
    customerId: customer.id,
    email: customer.email,
  });

  const response = NextResponse.redirect(new URL("/compte", request.url));
  response.cookies.set(CUSTOMER_SESSION_COOKIE, sessionToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 30 * 24 * 60 * 60,
  });
  return response;
}
