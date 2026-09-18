import { NextResponse } from "next/server";
import { checkRateLimit, getRequestIp } from "@/lib/rate-limit";
import { getShopSettings } from "@/lib/settings";
import {
  contactRequestAdminEmail,
  contactRequestCustomerEmail,
  sendTransactionalEmail,
} from "@/lib/transactional-emails";

function cleanText(value: unknown, maxLength: number) {
  if (typeof value !== "string") return "";
  return value.trim().replace(/\s+/g, " ").slice(0, maxLength);
}

function cleanDescription(value: unknown) {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, 3000);
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export async function POST(request: Request) {
  const requestId = crypto.randomUUID();
  const rate = checkRateLimit(`estimation:${getRequestIp(request)}`, 5, 30 * 60 * 1000);

  if (!rate.allowed) {
    console.warn("[estimation] rate_limited", { requestId });
    return NextResponse.json(
      { message: `Trop de demandes envoyées. Réessayez dans ${rate.retryAfterSeconds} secondes.` },
      { status: 429, headers: { "Retry-After": String(rate.retryAfterSeconds) } },
    );
  }

  try {
    const payload = await request.json();
    const honeypot = cleanText(payload.website, 120);

    if (honeypot) {
      console.warn("[estimation] honeypot", { requestId });
      return NextResponse.json({ message: "Votre demande a bien été envoyée." });
    }

    const name = cleanText(payload.name, 120);
    const email = cleanText(payload.email, 180).toLowerCase();
    const phone = cleanText(payload.phone, 60);
    const category = cleanText(payload.category, 120);
    const description = cleanDescription(payload.description);

    if (!name || !email || !phone || !category || !description) {
      console.warn("[estimation] validation_failed", { requestId, hasName: Boolean(name), hasEmail: Boolean(email), hasPhone: Boolean(phone), hasCategory: Boolean(category), descriptionLength: description.length });
      return NextResponse.json(
        { message: "Merci de renseigner tous les champs avant d'envoyer votre demande." },
        { status: 400 },
      );
    }

    if (!isValidEmail(email)) {
      return NextResponse.json({ message: "Merci de renseigner une adresse email valide." }, { status: 400 });
    }

    if (description.length < 10) {
      return NextResponse.json({ message: "Merci de décrire un peu plus précisément le produit à estimer." }, { status: 400 });
    }

    const settings = await getShopSettings();
    const adminTo =
      process.env.CONTACT_TO_EMAIL ||
      process.env.ORDER_TO_EMAIL ||
      settings.orderEmail ||
      process.env.NEXT_PUBLIC_CONTACT_EMAIL ||
      "info@fastcash-ge.com";

    const subject = `Estimation / reprise — ${category}`;
    const adminMessage = [
      `Catégorie : ${category}`,
      `Téléphone : ${phone}`,
      "",
      description,
    ].join("\n");

    const [adminMail, customerMail] = await Promise.allSettled([
      sendTransactionalEmail({
        to: adminTo,
        subject: `Nouvelle demande d'estimation — ${category}`,
        html: contactRequestAdminEmail({ name, email, phone, subject, message: adminMessage }),
      }),
      sendTransactionalEmail({
        to: email,
        subject: "Votre demande d'estimation FAST CASH Genève",
        html: contactRequestCustomerEmail({ name, subject, message: description }),
      }),
    ]);

    if (adminMail.status === "rejected") {
      console.error("[estimation] admin_email_failed", { requestId, error: adminMail.reason });
      throw adminMail.reason;
    }

    if (customerMail.status === "rejected") {
      console.error("[estimation] customer_email_failed", { requestId, error: customerMail.reason });
    }

    console.info("[estimation] sent", { requestId, category, adminTo, customerEmailDomain: email.split("@")[1] || "" });

    return NextResponse.json({
      message: "Votre demande d'estimation a bien été envoyée. FAST CASH Genève vous répondra rapidement.",
      requestId,
    });
  } catch (error) {
    console.error("[estimation] failed", { requestId, error });
    return NextResponse.json(
      { message: "Impossible d'envoyer votre demande pour le moment. Merci de réessayer." },
      { status: 500 },
    );
  }
}
