import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCustomerSession } from "@/lib/session";

function clean(value: unknown, max: number) {
  return String(value ?? "").trim().slice(0, max);
}

export async function PATCH(request: Request) {
  const session = await getCustomerSession();
  if (!session) return NextResponse.json({ message: "Session expirée." }, { status: 401 });

  try {
    const body = await request.json();
    const firstName = clean(body.firstName, 80);
    const lastName = clean(body.lastName, 80);
    const phone = clean(body.phone, 40) || null;

    if (!firstName || !lastName) {
      return NextResponse.json({ message: "Le prénom et le nom sont requis." }, { status: 400 });
    }

    const customer = await prisma.customer.update({
      where: { id: session.customerId },
      data: { firstName, lastName, phone },
      select: { firstName: true, lastName: true, phone: true },
    });

    return NextResponse.json({ success: true, customer });
  } catch (error) {
    console.error("Customer profile update failed", error);
    return NextResponse.json({ message: "Impossible de mettre à jour le profil." }, { status: 500 });
  }
}
