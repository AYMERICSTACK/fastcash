import crypto from "node:crypto";

const FALLBACK_SITE_URL = "https://www.fastcash-geneve.ch";

export type MarketingTemplateInput = {
  firstName?: string | null;
  subject: string;
  preheader?: string | null;
  eyebrow?: string | null;
  title: string;
  intro?: string | null;
  body: string;
  ctaLabel?: string | null;
  ctaUrl?: string | null;
  unsubscribeUrl: string;
};

function siteUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL || FALLBACK_SITE_URL).replace(/\/$/, "");
}

function esc(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

function paragraphs(value: string) {
  return value
    .split(/\n\s*\n/)
    .map((part) => `<p style="margin:0 0 16px;color:#4d4a45;font-size:15px;line-height:1.75;">${esc(part.trim()).replace(/\n/g, "<br />")}</p>`)
    .join("");
}

export function defaultLaunchCampaign() {
  return {
    name: "FAST CASH fait peau neuve",
    subject: "FAST CASH fait peau neuve ✨",
    preheader: "Découvrez le nouveau site FAST CASH Genève.",
    eyebrow: "Nouveau site",
    title: "FAST CASH fait peau neuve",
    intro: "Nous sommes heureux de vous présenter notre nouvelle boutique en ligne.",
    body:
      "Nouvelle interface, navigation repensée et expérience d’achat améliorée : FAST CASH Genève évolue pour vous offrir un parcours plus simple, plus rapide et plus agréable.\n\nSi vous disposiez d’un compte sur notre ancien site, celui-ci n’a pas été transféré vers la nouvelle plateforme. Pour vos prochains achats, il vous suffit de créer un nouveau compte.\n\nMerci pour votre confiance et bienvenue sur le nouveau FAST CASH Genève.",
    ctaLabel: "Découvrir le nouveau site",
    ctaUrl: siteUrl(),
  };
}

export function marketingCampaignHtml(input: MarketingTemplateInput) {
  const logo = process.env.EMAIL_LOGO_URL?.trim();
  const home = siteUrl();
  const hello = input.firstName?.trim() ? `Bonjour ${esc(input.firstName.trim())},` : "Bonjour,";
  const preheader = input.preheader || input.subject;
  const cta = input.ctaLabel && input.ctaUrl
    ? `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:28px 0 8px;"><tr><td align="left"><table role="presentation" cellspacing="0" cellpadding="0" border="0"><tr><td bgcolor="#d9b72f" style="border-radius:6px;"><a href="${esc(input.ctaUrl)}" style="display:inline-block;padding:16px 24px;color:#080808;text-decoration:none;font-family:Arial,Helvetica,sans-serif;font-size:13px;font-weight:900;line-height:1;letter-spacing:.06em;text-transform:uppercase;">${esc(input.ctaLabel)}</a></td></tr></table></td></tr></table>`
    : "";

  return `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light only">
<meta name="supported-color-schemes" content="light">
<title>${esc(input.subject)}</title>
<style>
  body,table,td,a{-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;}
  table,td{mso-table-lspace:0pt;mso-table-rspace:0pt;}
  table{border-collapse:collapse!important;}
  img{-ms-interpolation-mode:bicubic;border:0;outline:none;text-decoration:none;}
  @media only screen and (max-width:620px){
    .fc-shell{width:100%!important;max-width:100%!important;}
    .fc-pad{padding-left:22px!important;padding-right:22px!important;}
    .fc-title{font-size:30px!important;line-height:1.1!important;}
    .fc-outer{padding:12px 8px!important;}
    .fc-header{padding:26px 18px!important;}
    .fc-cta a{display:block!important;text-align:center!important;padding:16px 14px!important;}
  }
</style>
</head>
<body style="margin:0!important;padding:0!important;background:#f1eee7;font-family:Arial,Helvetica,sans-serif;color:#111;-webkit-font-smoothing:antialiased;">
<div style="display:none!important;max-height:0;max-width:0;overflow:hidden;opacity:0;color:transparent;mso-hide:all;">${esc(preheader)}&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;</div>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="#f1eee7" style="width:100%;background:#f1eee7;">
<tr><td class="fc-outer" align="center" valign="top" style="padding:32px 12px;">
<!--[if mso]><table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0"><tr><td><![endif]-->
<table role="presentation" class="fc-shell" width="600" cellspacing="0" cellpadding="0" border="0" align="center" style="width:600px;max-width:600px;margin:0 auto;">
<tr><td class="fc-header" align="center" bgcolor="#070707" style="padding:30px 20px;border-radius:18px 18px 0 0;border-bottom:1px solid #765f17;">
<a href="${esc(home)}" style="display:block;text-decoration:none;">${logo && /^https:\/\//i.test(logo) ? `<img src="${esc(logo)}" alt="FAST CASH Genève" width="64" style="display:block;width:64px;height:auto;margin:0 auto 12px;">` : ""}<span style="display:block;color:#fff;font-family:Arial,Helvetica,sans-serif;font-size:27px;line-height:1.1;font-weight:900;letter-spacing:.20em;">FAST CASH</span><span style="display:block;margin-top:7px;color:#d9b72f;font-family:Arial,Helvetica,sans-serif;font-size:10px;line-height:1.2;font-weight:900;letter-spacing:.32em;text-transform:uppercase;">GENÈVE</span></a>
</td></tr>
<tr><td class="fc-pad" bgcolor="#ffffff" style="padding:34px 36px 18px;border-left:1px solid #e4ddcf;border-right:1px solid #e4ddcf;">
<table role="presentation" cellspacing="0" cellpadding="0" border="0"><tr><td bgcolor="#fbf7e8" style="padding:7px 11px;border:1px solid #d9b72f;color:#806410;font-family:Arial,Helvetica,sans-serif;font-size:10px;line-height:1;font-weight:900;letter-spacing:.14em;text-transform:uppercase;">${esc(input.eyebrow || "FAST CASH Genève")}</td></tr></table>
<h1 class="fc-title" style="margin:20px 0 12px;color:#0b0b0b;font-family:Arial,Helvetica,sans-serif;font-size:34px;line-height:1.08;font-weight:800;letter-spacing:-.6px;">${esc(input.title)}</h1>
${input.intro ? `<p style="margin:0;color:#68635b;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.65;">${esc(input.intro)}</p>` : ""}
</td></tr>
<tr><td class="fc-pad" bgcolor="#ffffff" style="padding:10px 36px 34px;border:1px solid #e4ddcf;border-top:0;border-radius:0 0 18px 18px;">
<p style="margin:0 0 20px;color:#111;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:700;line-height:1.7;">${hello}</p>
${paragraphs(input.body)}
<div class="fc-cta">${cta}</div>
<div style="margin-top:30px;padding-top:20px;border-top:1px solid #eee8dc;color:#777168;font-family:Arial,Helvetica,sans-serif;font-size:11px;line-height:1.65;">Vous recevez cet email car vous étiez inscrit(e) aux communications FAST CASH Genève.<br><a href="${esc(input.unsubscribeUrl)}" style="color:#8b6c13;text-decoration:underline;">Se désinscrire</a></div>
</td></tr>
<tr><td align="center" style="padding:18px 10px 0;color:#766f64;font-family:Arial,Helvetica,sans-serif;font-size:10px;line-height:1.7;"><strong style="color:#111;letter-spacing:.12em;">FAST CASH GENÈVE</strong><br>Rue de Monthoux 27, 1201 Genève</td></tr>
</table>
<!--[if mso]></td></tr></table><![endif]-->
</td></tr></table>
</body></html>`;
}

export async function sendMarketingEmail({ to, subject, html }: { to: string; subject: string; html: string }) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.MARKETING_FROM_EMAIL || process.env.RESEND_FROM_EMAIL || "FAST CASH Genève <onboarding@resend.dev>";
  if (!apiKey) throw new Error("RESEND_API_KEY manquant.");

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to, subject, html }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(typeof payload?.message === "string" ? payload.message : "Échec de l’envoi Resend.");
  return typeof payload?.id === "string" ? payload.id : null;
}

export function previewUnsubscribeToken() {
  return crypto.randomBytes(12).toString("hex");
}
