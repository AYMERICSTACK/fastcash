import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminSession } from "@/lib/session";

const definitions: Record<string, { label: string; group: string; validate: (value: string) => boolean }> = {};

function add(keys: string[], group: string, validate: (value: string) => boolean = (v) => v.length <= 5000) {
  for (const key of keys) definitions[key] = { label: key, group, validate };
}

add(["shop.name"], "Boutique", (v) => v.length >= 2 && v.length <= 120);
add(["shop.currency"], "Boutique", (v) => ["CHF","EUR"].includes(v));
add(["shop.languages"], "Boutique", (v) => v.split("/").map(x=>x.trim()).filter(Boolean).every(x=>["FR","EN"].includes(x)));

add(["contact.addressLine1","contact.postalCode","contact.city","contact.country","contact.phoneDisplay","contact.phoneHref"], "Coordonnées", (v) => v.length >= 1 && v.length <= 250);
add(["contact.email"], "Coordonnées", (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v));
add(["contact.mapsUrl","social.instagram"], "Coordonnées", (v) => !v || /^https?:\/\//i.test(v));

add(["hours.monday","hours.tuesday","hours.wednesday","hours.thursday","hours.friday","hours.saturday","hours.sunday"], "Horaires", (v) => v.length >= 2 && v.length <= 80);

add(["home.heroImage"], "Accueil", (v) => /^https?:\/\//i.test(v) || v.startsWith("/"));
add(["home.heroKickerFr","home.heroKickerEn","home.heroTitle1Fr","home.heroTitle1En","home.heroTitle2Fr","home.heroTitle2En","home.heroProof1Fr","home.heroProof1En","home.heroProof2Fr","home.heroProof2En","home.heroProof3Fr","home.heroProof3En"], "Accueil", (v) => v.length >= 1 && v.length <= 180);
add(["home.heroIntroFr","home.heroIntroEn"], "Accueil", (v) => v.length >= 10 && v.length <= 1200);

add(["legal.businessName","legal.jurisdiction","legal.lastUpdated"], "Informations légales", (v) => v.length >= 2 && v.length <= 250);
add(["legal.companyId","legal.vatNumber","legal.representative"], "Informations légales", (v) => v.length <= 250);

add(["orders.prefix"], "Commandes", (v) => /^[A-Z0-9-]{2,12}$/.test(v));
add(["invoices.prefix"], "Factures", (v) => /^[A-Z0-9-]{2,12}$/.test(v));
add(["orders.email"], "Emails", (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v));
add(["payments.card","payments.heylight"], "Paiements", (v) => ["Actif","Inactif"].includes(v));
add(["shipping.pickupEnabled","shipping.deliveryEnabled"], "Livraison", (v) => ["Actif","Inactif"].includes(v));
add(["shipping.fee","shipping.freeThreshold"], "Livraison", (v) => Number.isFinite(Number(v)) && Number(v) >= 0);
add(["shipping.countries","shipping.defaultCarrier"], "Livraison", (v) => v.length >= 2 && v.length <= 250);
add(["stock.lowThreshold"], "Stock", (v) => Number.isInteger(Number(v)) && Number(v) >= 0 && Number(v) <= 999);

function normalize(key: string, raw: unknown) {
  let v = String(raw ?? "").trim();
  if (["orders.prefix","invoices.prefix","shop.languages","shipping.countries"].includes(key)) v = v.toUpperCase();
  if (["stock.lowThreshold","shipping.fee","shipping.freeThreshold"].includes(key)) v = String(Number(v.replace(",", ".")));
  return v;
}

export async function PATCH(request: Request) {
  if (!(await getAdminSession())) return NextResponse.json({ error:"Session administrateur requise." }, { status:401 });

  const body = await request.json().catch(() => null);
  if (!body?.settings || typeof body.settings !== "object") return NextResponse.json({ error:"Paramètres invalides." }, { status:400 });

  const updates: Array<{key:string;value:string;label:string;group:string}> = [];
  for (const [key, raw] of Object.entries(body.settings)) {
    const def = definitions[key];
    if (!def) continue;
    const value = normalize(key, raw);
    if (!def.validate(value)) return NextResponse.json({ error:`Valeur invalide pour ${key}.` }, { status:400 });
    updates.push({ key, value, label:def.label, group:def.group });
  }
  if (!updates.length) return NextResponse.json({ error:"Aucun paramètre éditable reçu." }, { status:400 });

  await prisma.$transaction(updates.map((item) => prisma.setting.upsert({
    where:{ key:item.key },
    update:{ value:item.value, label:item.label, group:item.group },
    create:item,
  })));

  return NextResponse.json({ ok:true, updated:updates.length });
}
