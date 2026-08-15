import { NextResponse } from "next/server";
import { assertValidSqlFile } from "@/lib/prestashop";
import { importPrestashopBrands } from "@/lib/prestashop/importer/brands";
import { prisma } from "@/lib/prisma";
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
    const report = await importPrestashopBrands({ content, prisma });

    return NextResponse.json({ ok: true, report });
  } catch (error) {
    const message = error instanceof Error ? error.message : "UNKNOWN_ERROR";

    if (message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Session administrateur requise." }, { status: 401 });
    }
    if (message === "BRAND_TABLE_MISSING") {
      return NextResponse.json({ error: "La table manufacturer est requise." }, { status: 422 });
    }
    if (message === "INVALID_EXTENSION" || message === "EMPTY_FILE") {
      return NextResponse.json({ error: "Le fichier SQL est invalide." }, { status: 400 });
    }
    if (message === "FILE_TOO_LARGE") {
      return NextResponse.json({ error: "Le dump SQL dépasse la limite de 50 Mo." }, { status: 413 });
    }

    console.error("FAST CASH Prestashop brand import error", error);
    return NextResponse.json({ error: "Impossible d’importer les marques Prestashop." }, { status: 500 });
  }
}
