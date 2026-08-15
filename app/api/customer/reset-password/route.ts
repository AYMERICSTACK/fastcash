import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPayload, type CustomerPasswordReset } from "@/lib/session";
import { hashCustomerPassword, validateCustomerPassword } from "@/lib/customer-auth";
import { checkRateLimit, getRequestIp } from "@/lib/rate-limit";

export async function POST(request: Request) {
  const rate = checkRateLimit(`customer-reset:${getRequestIp(request)}`, 6, 30 * 60 * 1000);
  if (!rate.allowed) {
    return NextResponse.json(
      { message: `Trop de tentatives. Réessayez dans ${rate.retryAfterSeconds} secondes.` },
      { status: 429, headers: { "Retry-After": String(rate.retryAfterSeconds) } },
    );
  }

  try {
    const body = await request.json();
    const token = String(body.token || "");
    const password = String(body.password || "");
    const confirmPassword = String(body.confirmPassword || "");
    const payload = await verifyPayload<CustomerPasswordReset>(token, "customer-password-reset");

    if (!payload) return NextResponse.json({ message: "Ce lien est invalide ou a expiré." }, { status: 400 });
    if (password !== confirmPassword) return NextResponse.json({ message: "Les mots de passe ne correspondent pas." }, { status: 400 });
    const passwordError = validateCustomerPassword(password);
    if (passwordError) return NextResponse.json({ message: passwordError }, { status: 400 });

    const customer = await prisma.customer.findUnique({ where: { id: payload.customerId }, select: { email: true } });
    if (!customer || customer.email !== payload.email) return NextResponse.json({ message: "Compte introuvable." }, { status: 404 });

    await prisma.customer.update({ where: { id: payload.customerId }, data: { password: await hashCustomerPassword(password) } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Customer password reset failed", error);
    return NextResponse.json({ message: "Impossible de modifier le mot de passe." }, { status: 500 });
  }
}
