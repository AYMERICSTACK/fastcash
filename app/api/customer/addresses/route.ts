import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCustomerSession } from "@/lib/session";

function clean(value: unknown, max: number) {
  return String(value ?? "").trim().slice(0, max);
}

export async function POST(request: Request) {
  const session = await getCustomerSession();
  if (!session) return NextResponse.json({ message: "Session expirée." }, { status: 401 });

  try {
    const body = await request.json();
    const label = clean(body.label, 60) || null;
    const line1 = clean(body.line1, 160);
    const line2 = clean(body.line2, 160) || null;
    const postalCode = clean(body.postalCode, 24) || null;
    const city = clean(body.city, 100);
    const country = clean(body.country, 80);

    if (!line1 || !city || !country) {
      return NextResponse.json({ message: "Adresse, ville et pays sont requis." }, { status: 400 });
    }

    const address = await prisma.address.create({
      data: { customerId: session.customerId, label, line1, line2, postalCode, city, country },
    });

    return NextResponse.json({ success: true, address }, { status: 201 });
  } catch (error) {
    console.error("Customer address creation failed", error);
    return NextResponse.json({ message: "Impossible d'ajouter cette adresse." }, { status: 500 });
  }
}
