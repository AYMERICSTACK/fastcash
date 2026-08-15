import { NextResponse } from "next/server";
import { assertValidSqlFile } from "@/lib/prestashop";
import { importPrestashopImages } from "@/lib/prestashop/importer/images";
import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function POST(request: Request) {
  try {
    await requireAdminSession();
    const formData = await request.formData();
    const upload = formData.get("file");
    const imageBaseUrl = String(formData.get("imageBaseUrl") ?? "").trim();
    if (!(upload instanceof File)) return NextResponse.json({ error: "Aucun fichier SQL reçu." }, { status: 400 });
    if (!imageBaseUrl) return NextResponse.json({ error: "L’URL de l’ancien site Prestashop est requise." }, { status: 400 });
    assertValidSqlFile(upload, 50 * 1024 * 1024);
    const report = await importPrestashopImages({
      content: await upload.text(),
      prisma,
      imageBaseUrl,
      languageId: Number(formData.get("languageId")) || null,
      offset: Number(formData.get("offset")) || 0,
      limit: Number(formData.get("limit")) || 40,
      imageIds: String(formData.get("imageIds") ?? "")
        .split(",")
        .map((value) => Number(value.trim()))
        .filter((value) => Number.isInteger(value) && value > 0),
    });
    return NextResponse.json({ ok: true, report });
  } catch (error) {
    const message = error instanceof Error ? error.message : "UNKNOWN_ERROR";
    if (message === "UNAUTHORIZED") return NextResponse.json({ error: "Session administrateur requise." }, { status: 401 });
    if (message === "IMAGE_TABLE_MISSING") return NextResponse.json({ error: "La table image est absente du dump." }, { status: 422 });
    if (message === "INVALID_IMAGE_BASE_URL" || message === "PRIVATE_IMAGE_BASE_URL") return NextResponse.json({ error: "L’URL de l’ancien site est invalide ou non publique." }, { status: 400 });
    console.error("FAST CASH Prestashop image import error", error);
    return NextResponse.json({ error: "Impossible d’importer les images Prestashop." }, { status: 500 });
  }
}
