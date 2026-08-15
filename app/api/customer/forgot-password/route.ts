import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createCustomerPasswordResetToken } from "@/lib/session";
import { checkRateLimit, getRequestIp } from "@/lib/rate-limit";
import { normalizeCustomerEmail } from "@/lib/customer-auth";
import { customerPasswordResetEmail, sendTransactionalEmail } from "@/lib/transactional-emails";

function siteUrl(request: Request) {
  return (process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin).replace(/\/$/, "");
}

export async function POST(request: Request) {
  const rate = checkRateLimit(`customer-forgot:${getRequestIp(request)}`, 5, 30 * 60 * 1000);
  if (!rate.allowed) return NextResponse.json({ message: "Trop de demandes. Réessayez plus tard." }, { status: 429 });

  const body = await request.json().catch(() => ({}));
  const email = normalizeCustomerEmail(body.email);
  const customer = email ? await prisma.customer.findUnique({ where: { email }, select: { id: true, email: true, firstName: true } }) : null;

  if (customer) {
    const token = await createCustomerPasswordResetToken({ customerId: customer.id, email: customer.email });
    const link = `${siteUrl(request)}/compte/reinitialiser?token=${encodeURIComponent(token)}`;
    await sendTransactionalEmail({
      to: customer.email,
      subject: "Réinitialisation de votre mot de passe FAST CASH",
      html: customerPasswordResetEmail({ name: customer.firstName || undefined, link }),
    });
  }

  return NextResponse.json({ success: true, message: "Si un compte correspond à cette adresse, un email vient d'être envoyé." });
}
