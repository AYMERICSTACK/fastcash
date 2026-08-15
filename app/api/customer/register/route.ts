import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { CUSTOMER_SESSION_COOKIE, createCustomerSessionToken } from "@/lib/session";
import { checkRateLimit, getRequestIp } from "@/lib/rate-limit";
import { hashCustomerPassword, normalizeCustomerEmail, validateCustomerPassword } from "@/lib/customer-auth";

export async function POST(request: Request) {
  const rate = checkRateLimit(`customer-register:${getRequestIp(request)}`, 5, 30 * 60 * 1000);
  if (!rate.allowed) return NextResponse.json({ message: "Trop de créations de compte. Réessayez plus tard." }, { status: 429 });

  try {
    const body = await request.json();
    const email = normalizeCustomerEmail(body.email);
    const firstName = String(body.firstName || "").trim().slice(0, 80);
    const lastName = String(body.lastName || "").trim().slice(0, 80);
    const phone = String(body.phone || "").trim().slice(0, 40) || null;
    const password = String(body.password || "");
    const confirmPassword = String(body.confirmPassword || "");

    if (!email.includes("@") || !firstName || !lastName) {
      return NextResponse.json({ message: "Nom, prénom et adresse email valides sont requis." }, { status: 400 });
    }
    if (password !== confirmPassword) return NextResponse.json({ message: "Les mots de passe ne correspondent pas." }, { status: 400 });
    const passwordError = validateCustomerPassword(password);
    if (passwordError) return NextResponse.json({ message: passwordError }, { status: 400 });

    const existing = await prisma.customer.findUnique({ where: { email }, select: { id: true, password: true } });
    if (existing?.password) return NextResponse.json({ message: "Un compte existe déjà avec cette adresse email." }, { status: 409 });

    const passwordHash = await hashCustomerPassword(password);
    const customer = existing
      ? await prisma.customer.update({ where: { id: existing.id }, data: { firstName, lastName, phone, password: passwordHash } })
      : await prisma.customer.create({ data: { email, firstName, lastName, phone, password: passwordHash } });

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
    console.error("Customer registration failed", error);
    return NextResponse.json({ message: "Impossible de créer le compte pour le moment." }, { status: 500 });
  }
}
