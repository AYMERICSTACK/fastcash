import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const configuredSecret = process.env.HEALTHCHECK_SECRET?.trim();
  if (process.env.NODE_ENV === "production") {
    if (!configuredSecret) {
      return NextResponse.json({ status: "healthcheck-not-configured" }, { status: 503 });
    }

    const authorization = request.headers.get("authorization");
    if (authorization !== `Bearer ${configuredSecret}`) {
      return NextResponse.json({ status: "unauthorized" }, { status: 401 });
    }
  }

  try {
    await prisma.$queryRaw`SELECT 1`;

    return NextResponse.json({
      database: "ok",
      provider: "postgresql",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[DB_HEALTH_CHECK]", error);

    return NextResponse.json(
      {
        database: "error",
        message: "Database connection failed.",
      },
      { status: 500 },
    );
  }
}
