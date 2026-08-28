import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminSession } from "@/lib/session";

function clean(value: unknown) { return String(value ?? "").trim(); }
function validEmail(value: string) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value); }

export async function POST(request: Request) {
  if (!(await getAdminSession())) return NextResponse.json({ error: "Session administrateur requise." }, { status: 401 });
  const body = await request.json().catch(() => null);
  if (!Array.isArray(body?.subscribers)) return NextResponse.json({ error: "Liste invalide." }, { status: 400 });

  const unique = new Map<string, { email: string; firstName: string | null; lastName: string | null }>();
  for (const raw of body.subscribers.slice(0, 5000)) {
    const email = clean(raw?.email).toLowerCase();
    if (!validEmail(email)) continue;
    unique.set(email, { email, firstName: clean(raw?.firstName || raw?.firstname) || null, lastName: clean(raw?.lastName || raw?.lastname) || null });
  }
  if (!unique.size) return NextResponse.json({ error: "Aucun email valide trouvé." }, { status: 400 });

  let imported = 0;
  for (const item of unique.values()) {
    await prisma.newsletterSubscriber.upsert({
      where: { email: item.email },
      update: { firstName: item.firstName, lastName: item.lastName, source: "prestashop-newsletter" },
      create: { ...item, source: "prestashop-newsletter" },
    });
    imported++;
  }
  return NextResponse.json({ ok: true, imported });
}
