import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/session";

async function syncPrimaryImage(productId: string) {
  const primary = await prisma.productMedia.findFirst({
    where: { productId },
    orderBy: [{ isPrimary: "desc" }, { position: "asc" }],
    include: { media: true },
  });
  await prisma.product.update({ where: { id: productId }, data: { image: primary?.media.url ?? null } });
}

async function revalidateProduct(productId: string) {
  const product = await prisma.product.findUnique({ where: { id: productId }, select: { slug: true } });
  revalidatePath(`/admin/products/${productId}`);
  revalidatePath("/admin/products");
  revalidatePath("/admin/media");
  if (product?.slug) revalidatePath(`/produits/${product.slug}`);
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdminSession();
    const { id: productId } = await params;
    const body = await request.json() as { action?: string; mediaId?: string; linkId?: string; alt?: string; orderedIds?: string[] };
    const product = await prisma.product.findUnique({ where: { id: productId }, select: { id: true } });
    if (!product) return NextResponse.json({ error: "Produit introuvable." }, { status: 404 });

    if (body.action === "attach" && body.mediaId) {
      const count = await prisma.productMedia.count({ where: { productId } });
      await prisma.productMedia.upsert({
        where: { productId_mediaId: { productId, mediaId: body.mediaId } },
        update: {},
        create: { productId, mediaId: body.mediaId, position: count, isPrimary: count === 0, alt: body.alt?.trim() || null },
      });
    } else if (body.action === "detach" && body.linkId) {
      await prisma.productMedia.deleteMany({ where: { id: body.linkId, productId } });
      const links = await prisma.productMedia.findMany({ where: { productId }, orderBy: { position: "asc" } });
      if (links.length && !links.some((link) => link.isPrimary)) await prisma.productMedia.update({ where: { id: links[0].id }, data: { isPrimary: true } });
    } else if (body.action === "primary" && body.linkId) {
      await prisma.$transaction([
        prisma.productMedia.updateMany({ where: { productId }, data: { isPrimary: false } }),
        prisma.productMedia.updateMany({ where: { id: body.linkId, productId }, data: { isPrimary: true } }),
      ]);
    } else if (body.action === "alt" && body.linkId) {
      await prisma.productMedia.updateMany({ where: { id: body.linkId, productId }, data: { alt: body.alt?.trim() || null } });
    } else if (body.action === "reorder" && Array.isArray(body.orderedIds)) {
      await prisma.$transaction(body.orderedIds.map((linkId, position) => prisma.productMedia.updateMany({ where: { id: linkId, productId }, data: { position } })));
    } else {
      return NextResponse.json({ error: "Action média invalide." }, { status: 400 });
    }

    await syncPrimaryImage(productId);
    await revalidateProduct(productId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
    console.error("product media", error);
    return NextResponse.json({ error: "Impossible de modifier la galerie." }, { status: 500 });
  }
}
