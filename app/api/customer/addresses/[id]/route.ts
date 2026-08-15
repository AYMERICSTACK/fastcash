import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCustomerSession } from "@/lib/session";

function clean(value: unknown, max: number) {
  return String(value ?? "").trim().slice(0, max);
}

async function ownedAddress(id: string, customerId: string) {
  return prisma.address.findFirst({ where: { id, customerId }, select: { id: true } });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getCustomerSession();
  if (!session) return NextResponse.json({ message: "Session expirée." }, { status: 401 });
  const { id } = await params;

  try {
    if (!(await ownedAddress(id, session.customerId))) {
      return NextResponse.json({ message: "Adresse introuvable." }, { status: 404 });
    }

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

    const address = await prisma.address.update({
      where: { id },
      data: { label, line1, line2, postalCode, city, country },
    });
    return NextResponse.json({ success: true, address });
  } catch (error) {
    console.error("Customer address update failed", error);
    return NextResponse.json({ message: "Impossible de modifier cette adresse." }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getCustomerSession();
  if (!session) return NextResponse.json({ message: "Session expirée." }, { status: 401 });
  const { id } = await params;

  try {
    if (!(await ownedAddress(id, session.customerId))) {
      return NextResponse.json({ message: "Adresse introuvable." }, { status: 404 });
    }
    await prisma.address.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Customer address deletion failed", error);
    return NextResponse.json({ message: "Impossible de supprimer cette adresse." }, { status: 500 });
  }
}
