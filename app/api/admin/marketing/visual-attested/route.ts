import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import {
  createVisualAttestation,
  priceToCents,
} from "@/lib/instagram-visual-attestation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

export async function POST(request: Request) {
  try {
    await requireAdminSession();

    const body: unknown = await request.json();

    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { error: "Paramètres invalides." },
        { status: 400 },
      );
    }

    const input = body as Record<string, unknown>;

    if (
      typeof input.productId !== "string" ||
      !input.productId ||
      (input.format !== "post" && input.format !== "story") ||
      typeof input.visualUrl !== "string"
    ) {
      return NextResponse.json(
        { error: "Paramètres invalides." },
        { status: 400 },
      );
    }

    const product = await prisma.product.findUnique({
      where: { id: input.productId },
      select: {
        id: true,
        price: true,
        stock: true,
        active: true,
      },
    });

    if (
      !product ||
      !product.active ||
      product.stock <= 0 ||
      !Number.isFinite(product.price) ||
      product.price < 0
    ) {
      return NextResponse.json(
        { error: "Produit indisponible ou prix invalide." },
        { status: 409 },
      );
    }

    const url = new URL(input.visualUrl, request.url);
    const origin = new URL(request.url);

    if (
      url.origin !== origin.origin ||
      url.pathname !== "/api/admin/marketing/visual" ||
      url.searchParams.get("productId") !== product.id ||
      url.searchParams.get("format") !== input.format ||
      url.username ||
      url.password
    ) {
      return NextResponse.json(
        { error: "URL du générateur non autorisée." },
        { status: 400 },
      );
    }

    const response = await fetch(url, {
      cache: "no-store",
      redirect: "error",
      headers: {
        cookie: request.headers.get("cookie") || "",
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: "Génération PNG impossible." },
        { status: 409 },
      );
    }

    const contentType = response.headers.get("content-type") || "";

    if (!contentType.startsWith("image/png")) {
      return NextResponse.json(
        { error: "Réponse PNG invalide." },
        { status: 502 },
      );
    }

    const declaredSize = Number(
      response.headers.get("content-length") || 0,
    );

    if (declaredSize > MAX_IMAGE_BYTES) {
      return NextResponse.json(
        { error: "PNG supérieur à 10 Mo." },
        { status: 413 },
      );
    }

    const bytes = new Uint8Array(await response.arrayBuffer());

    if (!bytes.length || bytes.length > MAX_IMAGE_BYTES) {
      return NextResponse.json(
        { error: "Taille du PNG invalide." },
        { status: 413 },
      );
    }

    const latest = await prisma.product.findUnique({
      where: { id: product.id },
      select: {
        price: true,
        stock: true,
        active: true,
      },
    });

    if (
      !latest ||
      !latest.active ||
      latest.stock <= 0 ||
      !Number.isFinite(latest.price) ||
      priceToCents(latest.price) !== priceToCents(product.price)
    ) {
      return NextResponse.json(
        {
          error: "Produit modifié pendant la génération. Réessayez.",
        },
        { status: 409 },
      );
    }

    const attestation = createVisualAttestation({
      productId: product.id,
      price: latest.price,
      format: input.format,
      imageBytes: bytes,
    });

    return NextResponse.json({
      ok: true,
      imageBase64: Buffer.from(bytes).toString("base64"),
      attestation,
      productId: product.id,
      format: input.format,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";

    if (message === "UNAUTHORIZED") {
      return NextResponse.json(
        { error: "Session administrateur expirée." },
        { status: 401 },
      );
    }

    if (message === "INSTAGRAM_VISUAL_SIGNING_KEY_NOT_CONFIGURED") {
      return NextResponse.json(
        { error: "Clé de signature non configurée." },
        { status: 503 },
      );
    }

    console.error("FAST CASH attested visual error", error);

    return NextResponse.json(
      { error: "Impossible de certifier le PNG." },
      { status: 500 },
    );
  }
}