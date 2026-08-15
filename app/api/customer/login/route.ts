import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { CUSTOMER_SESSION_COOKIE, createCustomerSessionToken } from "@/lib/session";
import { checkRateLimit, getRequestIp } from "@/lib/rate-limit";
import { normalizeCustomerEmail, verifyCustomerPassword } from "@/lib/customer-auth";

export async function POST(request: Request) {
  const rate = checkRateLimit(`customer-login:${getRequestIp(request)}`, 8, 15 * 60 * 1000);
  if (!rate.allowed) {
    return NextResponse.json(
      { message: `Trop de tentatives. Réessayez dans ${rate.retryAfterSeconds} secondes.` },
      { status: 429, headers: { "Retry-After": String(rate.retryAfterSeconds) } },
    );
  }

  try {
    const body = await request.json();
    const email = normalizeCustomerEmail(body.email);
    const password = String(body.password || "");

    if (!email || !password) {
      return NextResponse.json({ message: "Email et mot de passe requis." }, { status: 400 });
    }

    const customer = await prisma.customer.findUnique({
      where: { email },
      select: { id: true, email: true, password: true },
    });

    if (!customer?.password || !(await verifyCustomerPassword(password, customer.password))) {
      return NextResponse.json({ message: "Email ou mot de passe incorrect." }, { status: 401 });
    }

    const token = await createCustomerSessionToken({ customerId: customer.id, email: customer.email });
    const response = NextResponse.json({ success: true });
    response.cookies.set(CUSTOMER_SESSION_COOKIE, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 30 * 24 * 60 * 60,
    });
    return response;
  } catch (error) {
    console.error("Customer login failed", error);
    return NextResponse.json({ message: "Impossible de vous connecter pour le moment." }, { status: 500 });
  }
}
