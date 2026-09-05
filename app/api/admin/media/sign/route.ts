import { NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";
import { requireAdminSession } from "@/lib/session";

export const runtime = "nodejs";

function clean(value: string | undefined) { return value?.trim().replace(/^[\'\"]|[\'\"]$/g, ""); }

export async function POST() {
  try {
    await requireAdminSession();
    const cloudName = clean(process.env.CLOUDINARY_CLOUD_NAME);
    const apiKey = clean(process.env.CLOUDINARY_API_KEY);
    const apiSecret = clean(process.env.CLOUDINARY_API_SECRET);
    if (!cloudName || !apiKey || !apiSecret) return NextResponse.json({ error: "Cloudinary non configuré." }, { status: 503 });
    const timestamp = Math.floor(Date.now() / 1000);
    const folder = "fastcash/products";
    const signature = cloudinary.utils.api_sign_request({ timestamp, folder }, apiSecret);
    return NextResponse.json({ cloudName, apiKey, timestamp, folder, signature });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message === "UNAUTHORIZED") return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
    return NextResponse.json({ error: "Impossible de préparer l’import." }, { status: 500 });
  }
}
