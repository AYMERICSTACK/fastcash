import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const code = new URL(request.url).searchParams.get("code");
  if (!code) return NextResponse.json({ error: "Code de confirmation manquant." }, { status: 400 });

  const row = await prisma.setting.findUnique({ where: { key: `instagram.deletion.${code}` } });
  if (!row) return NextResponse.json({ status: "not_found" }, { status: 404 });

  return NextResponse.json({
    status: "completed",
    completed_at: row.value,
    confirmation_code: code,
  });
}
