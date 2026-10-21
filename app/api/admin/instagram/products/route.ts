import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    await requireAdminSession();
    const url = new URL(request.url);
    const q = (url.searchParams.get("q") || "").trim().slice(0, 120);

    if (!q) return NextResponse.json({ products: [] });

    const products = await prisma.product.findMany({
      where: {
        active: true,
        stock: { gt: 0 },
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { reference: { contains: q, mode: "insensitive" } },
          { slug: { contains: q, mode: "insensitive" } },
          { brand: { name: { contains: q, mode: "insensitive" } } },
        ],
      },
      orderBy: [{ stock: "desc" }, { updatedAt: "desc" }],
      take: 12,
      select: {
        id: true,
        name: true,
        slug: true,
        reference: true,
        price: true,
        stock: true,
        image: true,
        brand: { select: { name: true } },
      },
    });

    return NextResponse.json({
      products: products.map((product) => ({
        id: product.id,
        name: product.name,
        slug: product.slug,
        reference: product.reference,
        price: product.price,
        stock: product.stock,
        image: product.image,
        brand: product.brand?.name || null,
      })),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur inconnue";
    if (message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Session administrateur expirée." }, { status: 401 });
    }
    console.error("instagram product search error", error);
    return NextResponse.json({ error: "Recherche produit impossible." }, { status: 500 });
  }
}
