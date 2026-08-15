import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/session";
import { deleteMediaFromCloudinary } from "@/lib/cloudinary";

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdminSession();
    const { id } = await params;
    const asset = await prisma.mediaAsset.findUnique({ where: { id }, include: { _count: { select: { products: true } } } });
    if (!asset) return NextResponse.json({ error: "Média introuvable." }, { status: 404 });
    if (asset._count.products > 0) return NextResponse.json({ error: "Ce média est encore utilisé par un produit." }, { status: 409 });
    if (asset.publicId) await deleteMediaFromCloudinary(asset.publicId);
    await prisma.mediaAsset.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
    console.error("media delete", error);
    return NextResponse.json({ error: "Impossible de supprimer le média." }, { status: 500 });
  }
}
