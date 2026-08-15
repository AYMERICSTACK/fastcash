import { NextResponse } from "next/server";
import { assertValidSqlFile } from "@/lib/prestashop";
import { importPrestashopStock } from "@/lib/prestashop/importer/stock";
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
    if (!(upload instanceof File)) {
      return NextResponse.json({ error: "Aucun fichier SQL reçu." }, { status: 400 });
    }

    assertValidSqlFile(upload, 50 * 1024 * 1024);
    const report = await importPrestashopStock({
      content: await upload.text(),
      prisma,
    });
    return NextResponse.json({ ok: true, report });
  } catch (error) {
    const message = error instanceof Error ? error.message : "UNKNOWN_ERROR";
    if (message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Session administrateur requise." }, { status: 401 });
    }
    if (message === "STOCK_TABLE_MISSING") {
      return NextResponse.json({ error: "La table stock_available est absente ou vide dans ce dump." }, { status: 422 });
    }
    console.error("FAST CASH Prestashop stock import error", error);
    return NextResponse.json({ error: "Impossible de synchroniser les stocks Prestashop." }, { status: 500 });
  }
}
