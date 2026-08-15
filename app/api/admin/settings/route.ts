import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminSession } from "@/lib/session";

const editableSettings = {
  "shop.name": {
    label: "Nom boutique",
    group: "Boutique",
    validate: (value: string) => value.trim().length >= 2,
  },
  "shop.currency": {
    label: "Devise principale",
    group: "Boutique",
    validate: (value: string) => ["CHF", "EUR"].includes(value),
  },
  "shop.languages": {
    label: "Langues actives",
    group: "Boutique",
    validate: (value: string) => value.split("/").map((item) => item.trim()).every((item) => ["FR", "EN"].includes(item)) && value.trim().length > 0,
  },
  "orders.prefix": {
    label: "Préfixe commandes",
    group: "Commandes",
    validate: (value: string) => /^[A-Z0-9-]{2,12}$/.test(value.trim()),
  },
  "invoices.prefix": {
    label: "Préfixe factures",
    group: "Factures",
    validate: (value: string) => /^[A-Z0-9-]{2,12}$/.test(value.trim()),
  },
  "orders.email": {
    label: "Email commandes",
    group: "Emails",
    validate: (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim()),
  },
  "payments.card": {
    label: "Paiement carte bancaire",
    group: "Paiements",
    validate: (value: string) => ["Actif", "Inactif"].includes(value),
  },
  "payments.heylight": {
    label: "Paiement HeyLight",
    group: "Paiements",
    validate: (value: string) => ["Actif", "Inactif"].includes(value),
  },
  "shipping.pickupEnabled": {
    label: "Retrait en boutique",
    group: "Livraison",
    validate: (value: string) => ["Actif", "Inactif"].includes(value),
  },
  "shipping.deliveryEnabled": {
    label: "Livraison à domicile",
    group: "Livraison",
    validate: (value: string) => ["Actif", "Inactif"].includes(value),
  },
  "shipping.fee": {
    label: "Frais de livraison",
    group: "Livraison",
    validate: (value: string) => Number.isFinite(Number(value)) && Number(value) >= 0 && Number(value) <= 10000,
  },
  "shipping.freeThreshold": {
    label: "Seuil livraison offerte",
    group: "Livraison",
    validate: (value: string) => Number.isFinite(Number(value)) && Number(value) >= 0 && Number(value) <= 1000000,
  },
  "shipping.countries": {
    label: "Pays desservis",
    group: "Livraison",
    validate: (value: string) => value.split("/").map((item) => item.trim()).filter(Boolean).every((item) => /^[A-Z]{2}$/.test(item)),
  },
  "shipping.defaultCarrier": {
    label: "Transporteur principal",
    group: "Livraison",
    validate: (value: string) => value.trim().length >= 2,
  },
  "stock.lowThreshold": {
    label: "Seuil stock faible",
    group: "Stock",
    validate: (value: string) => Number.isInteger(Number(value)) && Number(value) >= 0 && Number(value) <= 999,
  },
} as const;

type EditableSettingKey = keyof typeof editableSettings;

function isEditableSettingKey(key: string): key is EditableSettingKey {
  return key in editableSettings;
}

function normalizeValue(key: EditableSettingKey, value: unknown) {
  const normalized = String(value ?? "").trim();

  if (key === "orders.prefix" || key === "invoices.prefix") {
    return normalized.toUpperCase();
  }

  if (key === "stock.lowThreshold" || key === "shipping.fee" || key === "shipping.freeThreshold") {
    return String(Number(normalized.replace(",", ".")));
  }

  if (key === "shipping.countries") {
    return normalized.split("/").map((item) => item.trim().toUpperCase()).filter(Boolean).join(" / ");
  }

  if (key === "shop.languages") {
    return normalized
      .split("/")
      .map((item) => item.trim().toUpperCase())
      .filter(Boolean)
      .join(" / ");
  }

  return normalized;
}

export async function PATCH(request: Request) {
  const isAdmin = await getAdminSession();

  if (!isAdmin) {
    return NextResponse.json({ error: "Session administrateur requise." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const receivedSettings = body?.settings;

  if (!receivedSettings || typeof receivedSettings !== "object") {
    return NextResponse.json({ error: "Paramètres invalides." }, { status: 400 });
  }

  let updates: Array<{ key: EditableSettingKey; value: string; label: string; group: string }> = [];

  try {
    updates = Object.entries(receivedSettings)
      .filter(([key]) => isEditableSettingKey(key))
      .map(([key, rawValue]) => {
        const settingKey = key as EditableSettingKey;
        const value = normalizeValue(settingKey, rawValue);
        const config = editableSettings[settingKey];

        if (!config.validate(value)) {
          throw new Error(`Valeur invalide pour ${config.label}.`);
        }

        return {
          key: settingKey,
          value,
          label: config.label,
          group: config.group,
        };
      });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Paramètre invalide." },
      { status: 400 },
    );
  }

  if (updates.length === 0) {
    return NextResponse.json({ error: "Aucun paramètre éditable reçu." }, { status: 400 });
  }

  try {
    await prisma.$transaction(
      updates.map((setting) =>
        prisma.setting.upsert({
          where: { key: setting.key },
          update: {
            value: setting.value,
            label: setting.label,
            group: setting.group,
          },
          create: setting,
        }),
      ),
    );
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Valeur invalide")) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    console.error("FAST CASH settings update error", error);
    return NextResponse.json({ error: "Erreur lors de l'enregistrement." }, { status: 500 });
  }

  return NextResponse.json({ ok: true, updated: updates.length });
}
