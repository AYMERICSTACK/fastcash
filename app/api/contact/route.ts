import { NextResponse } from "next/server";
import { contactRequestAdminEmail, contactRequestCustomerEmail, sendTransactionalEmail } from "@/lib/transactional-emails";
import { getShopSettings } from "@/lib/settings";
import { checkRateLimit, getRequestIp } from "@/lib/rate-limit";

function cleanText(value: unknown, maxLength: number) {
  if (typeof value !== "string") return "";
  return value.trim().replace(/\s+/g, " ").slice(0, maxLength);
}

function cleanMessage(value: unknown) {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, 2500);
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export async function POST(request: Request) {
  const rate = checkRateLimit(`contact:${getRequestIp(request)}`, 5, 30 * 60 * 1000);
  if (!rate.allowed) {
    return NextResponse.json(
      { message: `Trop de messages envoyés. Réessayez dans ${rate.retryAfterSeconds} secondes.` },
      { status: 429, headers: { "Retry-After": String(rate.retryAfterSeconds) } },
    );
  }

  try {
    const payload = await request.json();
    const name = cleanText(payload.name, 120);
    const email = cleanText(payload.email, 180).toLowerCase();
    const phone = cleanText(payload.phone, 60);
    const subject = cleanText(payload.subject, 160) || "Demande contact FAST CASH";
    const message = cleanMessage(payload.message);

    if (!name || !email || !message) {
      return NextResponse.json(
        { message: "Merci de renseigner votre nom, votre email et votre message." },
        { status: 400 },
      );
    }

    if (!isValidEmail(email)) {
      return NextResponse.json(
        { message: "Merci de renseigner une adresse email valide." },
        { status: 400 },
      );
    }

    const settings = await getShopSettings();
    const adminTo =
      process.env.CONTACT_TO_EMAIL ||
      process.env.ORDER_TO_EMAIL ||
      settings.orderEmail ||
      process.env.NEXT_PUBLIC_CONTACT_EMAIL;

    if (!adminTo) {
      console.warn("[contact] Aucun email destinataire configuré.");
      return NextResponse.json(
        { message: "Le service contact n'est pas encore configuré." },
        { status: 500 },
      );
    }

    await sendTransactionalEmail({
      to: adminTo,
      subject: `Nouvelle demande contact — ${subject}`,
      html: contactRequestAdminEmail({ name, email, phone, subject, message }),
    });

    await sendTransactionalEmail({
      to: email,
      subject: "Votre message a bien été transmis à FAST CASH Genève",
      html: contactRequestCustomerEmail({ name, subject, message }),
    });

    return NextResponse.json({ message: "Votre message a bien été envoyé." });
  } catch (error) {
    console.error("FAST CASH contact error", error);
    return NextResponse.json(
      { message: "Impossible d'envoyer votre message pour le moment." },
      { status: 500 },
    );
  }
}
