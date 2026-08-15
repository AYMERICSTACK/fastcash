import { formatCHF } from "@/lib/format";

export type TransactionalOrderLine = {
  name: string;
  quantity: number;
  amountTotal: number;
};

export type OrderEmailPayload = {
  reference: string;
  lines: TransactionalOrderLine[];
  total: number;
  currency: string;
};

export type AdminOrderEmailPayload = OrderEmailPayload & {
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  sessionId: string;
};

export type ContactRequestEmailPayload = {
  name: string;
  email?: string;
  phone?: string;
  subject: string;
  message: string;
};

type EmailLayoutOptions = {
  preheader: string;
  eyebrow: string;
  title: string;
  intro?: string;
  content: string;
  cta?: {
    label: string;
    href: string;
  };
};

const FALLBACK_SITE_URL = "https://fastcash-geneve.ch";

function getSiteUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL || FALLBACK_SITE_URL).replace(/\/$/, "");
}

function getLogoUrl() {
  const value = process.env.EMAIL_LOGO_URL?.trim();
  return value && /^https:\/\//i.test(value) ? value : "";
}

function getContactEmail() {
  return process.env.CONTACT_TO_EMAIL || process.env.ORDER_TO_EMAIL || "contact@fastcash-geneve.ch";
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function nl2br(value: string) {
  return escapeHtml(value).replace(/\n/g, "<br />");
}

function formatMoney(amount: number, currency: string) {
  if (currency.toUpperCase() === "CHF") return formatCHF(amount);

  return new Intl.NumberFormat("fr-CH", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(amount);
}

function emailButton(label: string, href: string) {
  return `
    <table role="presentation" cellspacing="0" cellpadding="0" style="margin-top:26px;">
      <tr>
        <td style="border-radius:999px;background:#d4af37;box-shadow:0 12px 30px rgba(212,175,55,.22);">
          <a href="${escapeHtml(href)}" style="display:inline-block;padding:14px 22px;border-radius:999px;color:#050505;text-decoration:none;font-size:13px;font-weight:900;letter-spacing:.08em;text-transform:uppercase;">
            ${escapeHtml(label)}
          </a>
        </td>
      </tr>
    </table>
  `;
}

function infoCard(label: string, value: string, dark = false) {
  return `
    <div style="padding:16px 18px;border-radius:16px;${dark ? "background:#050505;color:#fff;border:1px solid rgba(212,175,55,.38);" : "background:#f7f4ee;border:1px solid rgba(212,175,55,.28);"}">
      <span style="display:block;color:${dark ? "#d4af37" : "#777"};font-size:11px;font-weight:900;text-transform:uppercase;letter-spacing:.12em;">${escapeHtml(label)}</span>
      <strong style="display:block;margin-top:6px;color:${dark ? "#fff" : "#111"};font-size:17px;line-height:1.35;">${escapeHtml(value)}</strong>
    </div>
  `;
}

function baseEmailLayout({ preheader, eyebrow, title, intro, content, cta }: EmailLayoutOptions) {
  const siteUrl = getSiteUrl();
  const logoUrl = getLogoUrl();
  const contactEmail = getContactEmail();
  const logo = logoUrl
    ? `<img src="${escapeHtml(logoUrl)}" width="64" height="64" alt="FAST CASH Genève" style="display:block;width:64px;height:64px;margin:0 auto 12px;border:0;outline:none;text-decoration:none;object-fit:contain;" />`
    : "";

  return `
    <!doctype html>
    <html lang="fr">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <meta name="color-scheme" content="light only" />
        <meta name="supported-color-schemes" content="light" />
        <title>${escapeHtml(title)} — FAST CASH Genève</title>
      </head>
      <body style="margin:0;padding:0;background:#f3f1ec;font-family:Arial,Helvetica,sans-serif;color:#111111;-webkit-font-smoothing:antialiased;">
        <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;mso-hide:all;">
          ${escapeHtml(preheader)}
        </div>
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" bgcolor="#f3f1ec" style="width:100%;margin:0;padding:0;background:#f3f1ec;">
          <tr>
            <td align="center" style="padding:28px 12px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="width:100%;max-width:660px;">
                <tr>
                  <td align="center" bgcolor="#ffffff" style="padding:28px 18px 22px;background:#ffffff;border:1px solid #e6dfcf;border-bottom:0;border-radius:22px 22px 0 0;">
                    <a href="${escapeHtml(siteUrl)}" style="display:block;text-decoration:none;color:#111111;">
                      ${logo}
                      <div style="color:#111111;font-size:25px;font-weight:900;letter-spacing:.20em;line-height:1.05;">FAST CASH</div>
                      <div style="margin-top:7px;color:#a98020;font-size:11px;font-weight:900;letter-spacing:.32em;text-transform:uppercase;">Genève</div>
                    </a>
                  </td>
                </tr>
                <tr>
                  <td bgcolor="#ffffff" style="padding:10px 26px 28px;background:#ffffff;border-left:1px solid #e6dfcf;border-right:1px solid #e6dfcf;">
                    <div style="display:inline-block;padding:7px 11px;border-radius:999px;background:#f8f2df;border:1px solid #d8b84f;color:#8a6814;font-size:11px;font-weight:900;letter-spacing:.14em;text-transform:uppercase;">
                      ${escapeHtml(eyebrow)}
                    </div>
                    <h1 style="margin:18px 0 0;color:#111111;font-size:30px;line-height:1.12;letter-spacing:-.7px;font-weight:900;">
                      ${escapeHtml(title)}
                    </h1>
                    ${
                      intro
                        ? `<p style="margin:15px 0 0;color:#565656;font-size:15px;line-height:1.7;">${escapeHtml(intro)}</p>`
                        : ""
                    }
                  </td>
                </tr>
                <tr>
                  <td bgcolor="#ffffff" style="padding:0 26px 30px;background:#ffffff;border:1px solid #e6dfcf;border-top:0;border-radius:0 0 22px 22px;color:#111111;">
                    ${content}
                    ${cta ? emailButton(cta.label, cta.href) : ""}
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding:20px 12px 0;color:#706b62;font-size:12px;line-height:1.7;">
                    <strong style="display:block;color:#111111;font-size:13px;letter-spacing:.10em;text-transform:uppercase;">FAST CASH Genève</strong>
                    <span style="color:#9b771d;">Achat · Vente · Dépôt-vente · Expertise</span><br />
                    Rue de Monthoux 27, 1201 Genève · +41 22 731 16 63<br />
                    ${escapeHtml(contactEmail)}
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;
}

function orderLinesHtml(lines: TransactionalOrderLine[], currency: string) {
  return lines
    .map(
      (line) => `
        <tr>
          <td style="padding:15px 0;border-bottom:1px solid #eee;">
            <strong style="display:block;font-size:14px;line-height:1.4;color:#111;">${escapeHtml(line.name)}</strong>
            <span style="display:block;margin-top:5px;color:#777;font-size:12px;">Quantité : ${line.quantity}</span>
          </td>
          <td style="padding:15px 0;border-bottom:1px solid #eee;text-align:right;font-weight:900;color:#111;white-space:nowrap;">
            ${formatMoney(line.amountTotal, currency)}
          </td>
        </tr>
      `,
    )
    .join("");
}

function orderSummaryHtml(lines: TransactionalOrderLine[], total: number, currency: string) {
  return `
    <table role="presentation" style="width:100%;border-collapse:collapse;margin-top:6px;">
      <tbody>${orderLinesHtml(lines, currency)}</tbody>
    </table>

    <div style="margin-top:22px;padding-top:20px;border-top:2px solid #111;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
        <tr>
          <td style="font-size:13px;font-weight:900;text-transform:uppercase;letter-spacing:.1em;color:#333;">Total</td>
          <td align="right" style="font-size:25px;font-weight:900;color:#111;">${formatMoney(total, currency)}</td>
        </tr>
      </table>
    </div>
  `;
}

export function customerOrderConfirmationEmail({
  reference,
  lines,
  total,
  currency,
}: OrderEmailPayload) {
  return baseEmailLayout({
    preheader: `Votre paiement est confirmé pour la commande ${reference}.`,
    eyebrow: "Paiement confirmé",
    title: "Merci pour votre commande",
    intro: "Votre paiement a bien été pris en compte. L'équipe FAST CASH Genève prépare votre commande avec le plus grand soin.",
    content: `
      ${infoCard("Référence commande", reference)}

      <div style="height:24px;line-height:24px;">&nbsp;</div>

      ${orderSummaryHtml(lines, total, currency)}

      <div style="margin-top:24px;padding:18px;border-radius:16px;background:#fbfaf7;border:1px solid #eee;color:#555;font-size:14px;line-height:1.75;">
        <strong style="display:block;margin-bottom:6px;color:#111;">Prochaine étape</strong>
        Vous recevrez les prochaines informations de préparation et de livraison dès que votre commande avancera.
      </div>
    `,
    cta: process.env.NEXT_PUBLIC_SITE_URL
      ? {
          label: "Accéder à mon espace client",
          href: `${getSiteUrl()}/compte`,
        }
      : undefined,
  });
}

export function adminNewOrderEmail({
  reference,
  lines,
  total,
  currency,
  customerName,
  customerEmail,
  customerPhone,
  sessionId,
}: AdminOrderEmailPayload) {
  const adminUrl = process.env.NEXT_PUBLIC_SITE_URL ? `${getSiteUrl()}/pilotage/commandes` : "";

  return baseEmailLayout({
    preheader: `Nouvelle commande confirmée : ${reference}.`,
    eyebrow: "Nouvelle commande",
    title: "Commande reçue",
    intro: "Une nouvelle commande vient d'être confirmée par paiement en ligne.",
    content: `
      <div style="margin-bottom:20px;">
        ${infoCard("Client", customerName, true)}
      </div>

      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom:20px;">
        <tr>
          <td style="padding:0 8px 0 0;">
            ${infoCard("Email", customerEmail)}
          </td>
          <td style="padding:0 0 0 8px;">
            ${infoCard("Téléphone", customerPhone || "Non renseigné")}
          </td>
        </tr>
      </table>

      ${infoCard("Référence commande", reference)}

      <div style="height:24px;line-height:24px;">&nbsp;</div>

      ${orderSummaryHtml(lines, total, currency)}

      <p style="margin:22px 0 0;color:#777;font-size:12px;line-height:1.6;">
        Stripe session : ${escapeHtml(sessionId)}
      </p>
    `,
    cta: adminUrl
      ? {
          label: "Ouvrir le back-office",
          href: adminUrl,
        }
      : undefined,
  });
}

export function contactRequestAdminEmail({
  name,
  email = "",
  phone = "",
  subject,
  message,
}: ContactRequestEmailPayload) {
  return baseEmailLayout({
    preheader: `Nouvelle demande contact FAST CASH de ${name}.`,
    eyebrow: "Nouvelle demande contact",
    title: "Message reçu depuis le site",
    intro: "Un visiteur vient d'envoyer une demande depuis la page contact FAST CASH Genève.",
    content: `
      <div style="margin-bottom:20px;">
        ${infoCard("Contact", name, true)}
      </div>

      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom:20px;">
        <tr>
          <td style="padding:0 8px 0 0;">
            ${infoCard("Email", email || "Non renseigné")}
          </td>
          <td style="padding:0 0 0 8px;">
            ${infoCard("Téléphone", phone || "Non renseigné")}
          </td>
        </tr>
      </table>

      ${infoCard("Sujet", subject)}

      <div style="margin-top:20px;padding:19px;border:1px solid #eee;border-radius:16px;color:#333;font-size:15px;line-height:1.75;background:#fff;">
        ${nl2br(message)}
      </div>
    `,
  });
}

export function contactRequestCustomerEmail({
  name,
  subject,
  message,
}: Pick<ContactRequestEmailPayload, "name" | "subject" | "message">) {
  return baseEmailLayout({
    preheader: "Votre message a bien été transmis à FAST CASH Genève.",
    eyebrow: "Message transmis",
    title: `Merci ${name}`,
    intro: "Votre message a bien été transmis à l'équipe FAST CASH Genève. Nous reviendrons vers vous dès que possible.",
    content: `
      ${infoCard("Votre demande", subject)}

      <div style="margin-top:20px;padding:19px;border:1px solid #eee;border-radius:16px;color:#333;font-size:15px;line-height:1.75;background:#fff;">
        ${nl2br(message)}
      </div>

      <div style="margin-top:24px;padding:18px;border-radius:16px;background:#fbfaf7;border:1px solid #eee;color:#555;font-size:14px;line-height:1.75;">
        <strong style="display:block;margin-bottom:6px;color:#111;">Besoin urgent ?</strong>
        Vous pouvez également contacter la boutique au +41 22 731 16 63.
      </div>
    `,
    cta: {
      label: "Retourner sur le site",
      href: getSiteUrl(),
    },
  });
}

export function customerMagicLinkEmail({ name, link }: { name?: string; link: string }) {
  const greeting = name ? `Bonjour ${escapeHtml(name)},` : "Bonjour,";
  return baseEmailLayout({
    preheader: "Votre lien sécurisé de connexion FAST CASH.",
    eyebrow: "Connexion sécurisée",
    title: "Accédez à votre espace client",
    intro: `${greeting} utilisez le bouton ci-dessous pour consulter vos commandes, factures et informations FAST CASH.`,
    content: `
      <div style="padding:18px;border-radius:16px;background:#fbfaf7;border:1px solid #eee;color:#555;font-size:14px;line-height:1.75;">
        Ce lien est personnel et valable pendant <strong style="color:#111;">15 minutes</strong>. Si vous n'êtes pas à l'origine de cette demande, vous pouvez ignorer cet email.
      </div>
    `,
    cta: {
      label: "Accéder à mon espace client",
      href: link,
    },
  });
}


export function customerOrderReadyForPickupEmail({
  name,
  reference,
}: {
  name?: string | null;
  reference: string;
}) {
  const greeting = name ? `Bonjour ${escapeHtml(name)},` : "Bonjour,";

  return baseEmailLayout({
    preheader: `Votre commande ${reference} est prête à être retirée.`,
    eyebrow: "Commande prête",
    title: "Votre commande vous attend",
    intro: `${greeting} votre commande FAST CASH est maintenant prête à être retirée en boutique.`,
    content: `
      ${infoCard("Référence commande", reference, true)}

      <div style="margin-top:24px;padding:20px;border-radius:18px;background:#fbfaf7;border:1px solid rgba(212,175,55,.28);color:#555;font-size:14px;line-height:1.75;">
        <strong style="display:block;margin-bottom:8px;color:#111;font-size:16px;">Retrait chez FAST CASH Genève</strong>
        Rue de Monthoux 27, 1201 Genève
      </div>

      <div style="margin-top:18px;padding:20px;border-radius:18px;background:#fff;border:1px solid #eee;color:#555;font-size:14px;line-height:1.75;">
        <strong style="display:block;margin-bottom:8px;color:#111;font-size:16px;">À présenter lors du retrait</strong>
        Une pièce d'identité ainsi que la référence de commande peuvent être demandées.
      </div>
    `,
    cta: {
      label: "Voir ma commande",
      href: `${getSiteUrl()}/compte/commandes`,
    },
  });
}

export function customerPasswordResetEmail({ name, link }: { name?: string; link: string }) {
  const greeting = name ? `Bonjour ${escapeHtml(name)},` : "Bonjour,";
  return baseEmailLayout({
    preheader: "Réinitialisez votre mot de passe FAST CASH.",
    eyebrow: "Sécurité du compte",
    title: "Nouveau mot de passe",
    intro: `${greeting} une demande de réinitialisation a été effectuée pour votre espace client FAST CASH.`,
    content: `
      <div style="padding:18px;border-radius:16px;background:#fbfaf7;border:1px solid #eee;color:#555;font-size:14px;line-height:1.75;">
        Ce lien est personnel et valable pendant <strong style="color:#111;">30 minutes</strong>. Si vous n'êtes pas à l'origine de cette demande, ignorez simplement cet email.
      </div>
    `,
    cta: { label: "Choisir un nouveau mot de passe", href: link },
  });
}

export async function sendTransactionalEmail({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}) {
  const apiKey = process.env.RESEND_API_KEY;
  const from =
    process.env.ORDER_FROM_EMAIL ||
    process.env.RESEND_FROM_EMAIL ||
    "FAST CASH Genève <onboarding@resend.dev>";

  if (!apiKey) {
    console.warn("[resend] RESEND_API_KEY manquant, email non envoyé.");
    return;
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to,
      subject,
      html,
    }),
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Resend email failed: ${details}`);
  }
}

export function customerOrderStatusEmail({
  name,
  reference,
  status,
}: {
  name?: string | null;
  reference: string;
  status: "PREPARING" | "DELIVERED" | "CANCELLED" | "REFUNDED";
}) {
  const greeting = name ? `Bonjour ${escapeHtml(name)},` : "Bonjour,";
  const contentByStatus = {
    PREPARING: { eyebrow: "Commande en préparation", title: "Nous préparons votre commande", intro: `${greeting} votre commande FAST CASH est maintenant prise en charge par notre équipe.`, detail: "Nous vous informerons dès qu'elle sera prête au retrait ou remise au transporteur." },
    DELIVERED: { eyebrow: "Commande livrée", title: "Votre commande est arrivée", intro: `${greeting} votre commande FAST CASH est indiquée comme livrée.`, detail: "Nous espérons que votre achat vous donne entière satisfaction. Notre équipe reste à votre disposition en cas de question." },
    CANCELLED: { eyebrow: "Commande annulée", title: "Mise à jour de votre commande", intro: `${greeting} votre commande FAST CASH a été annulée.`, detail: "Pour toute question concernant cette annulation, contactez directement notre équipe en indiquant votre référence de commande." },
    REFUNDED: { eyebrow: "Remboursement confirmé", title: "Votre remboursement est traité", intro: `${greeting} le remboursement lié à votre commande FAST CASH a été enregistré.`, detail: "Le délai d'apparition sur votre compte dépend ensuite de votre établissement bancaire et du moyen de paiement utilisé." },
  } as const;
  const copy = contentByStatus[status];

  return baseEmailLayout({
    preheader: `${copy.title} — ${reference}.`,
    eyebrow: copy.eyebrow,
    title: copy.title,
    intro: copy.intro,
    content: `
      ${infoCard("Référence commande", reference, true)}
      <div style="margin-top:20px;padding:20px;border-radius:18px;background:#fbfaf7;border:1px solid rgba(212,175,55,.28);color:#555;font-size:14px;line-height:1.75;">
        ${escapeHtml(copy.detail)}
      </div>
    `,
    cta: { label: "Voir ma commande", href: `${getSiteUrl()}/compte/commandes` },
  });
}

export function customerOrderShippedEmail({
  name,
  reference,
  carrier,
  trackingNo,
  trackingUrl,
}: {
  name?: string | null;
  reference: string;
  carrier: string;
  trackingNo: string;
  trackingUrl?: string | null;
}) {
  const greeting = name ? `Bonjour ${escapeHtml(name)},` : "Bonjour,";

  return baseEmailLayout({
    preheader: `Votre commande ${reference} a été expédiée.`,
    eyebrow: "Commande expédiée",
    title: "Votre colis est en route",
    intro: `${greeting} votre commande FAST CASH a été confiée au transporteur.`,
    content: `
      ${infoCard("Référence commande", reference, true)}
      <div style="margin-top:20px;padding:20px;border-radius:18px;background:#fbfaf7;border:1px solid rgba(212,175,55,.28);color:#555;font-size:14px;line-height:1.75;">
        <strong style="display:block;margin-bottom:8px;color:#111;font-size:16px;">${escapeHtml(carrier)}</strong>
        Numéro de suivi : <strong style="color:#111;">${escapeHtml(trackingNo)}</strong>
      </div>
      <div style="margin-top:18px;padding:18px;border-radius:16px;background:#fff;border:1px solid #eee;color:#555;font-size:14px;line-height:1.7;">
        Le suivi peut nécessiter quelques heures avant d'être visible sur le site du transporteur.
      </div>
    `,
    cta: trackingUrl
      ? { label: "Suivre mon colis", href: trackingUrl }
      : { label: "Voir ma commande", href: `${getSiteUrl()}/compte/commandes` },
  });
}
