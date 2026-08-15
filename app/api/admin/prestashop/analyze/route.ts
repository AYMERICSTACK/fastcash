import { NextResponse } from "next/server";
import {
  analyzePrestashopDump,
  assertValidSqlFile,
  createPrestashopFoundationReport,
} from "@/lib/prestashop";
import { requireAdminSession } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_SQL_FILE_BYTES = 50 * 1024 * 1024;

export async function POST(request: Request) {
  try {
    await requireAdminSession();

    const formData = await request.formData();
    const upload = formData.get("file");

    if (!(upload instanceof File)) {
      return NextResponse.json({ error: "Aucun fichier SQL reçu." }, { status: 400 });
    }

    assertValidSqlFile(upload, MAX_SQL_FILE_BYTES);
    const content = await upload.text();

    if (!content.trim()) {
      return NextResponse.json({ error: "Le fichier SQL est vide." }, { status: 400 });
    }

    const analysis = analyzePrestashopDump({
      content,
      fileName: upload.name,
      fileSize: upload.size,
      mimeType: upload.type || null,
    });

    return NextResponse.json({ ok: true, ...createPrestashopFoundationReport(analysis) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "UNKNOWN_ERROR";

    if (message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Session administrateur requise." }, { status: 401 });
    }
    if (message === "INVALID_EXTENSION") {
      return NextResponse.json({ error: "Format invalide. Sélectionnez un fichier .sql." }, { status: 400 });
    }
    if (message === "EMPTY_FILE") {
      return NextResponse.json({ error: "Le fichier SQL est vide." }, { status: 400 });
    }
    if (message === "FILE_TOO_LARGE") {
      return NextResponse.json({ error: "Le dump SQL dépasse la limite de 50 Mo." }, { status: 413 });
    }
    if (message === "PRESTASHOP_PREFIX_NOT_FOUND") {
      return NextResponse.json(
        { error: "Impossible de détecter un préfixe Prestashop dans ce dump SQL." },
        { status: 422 },
      );
    }

    console.error("FAST CASH Prestashop analysis error", error);
    return NextResponse.json({ error: "Impossible d'analyser le dump Prestashop." }, { status: 500 });
  }
}
