import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/session";
import { uploadMediaToCloudinary } from "@/lib/cloudinary";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    await requireAdminSession();
    const formData = await request.formData();
    const files = formData.getAll("files").filter((entry): entry is File => entry instanceof File && entry.size > 0);
    if (!files.length) return NextResponse.json({ error: "Aucun fichier reçu." }, { status: 400 });
    if (files.length > 12) return NextResponse.json({ error: "12 images maximum par envoi." }, { status: 400 });

    const assets = [];
    for (const file of files) {
      const uploaded = await uploadMediaToCloudinary(file);
      assets.push(await prisma.mediaAsset.create({
        data: {
          url: uploaded.secure_url,
          publicId: uploaded.public_id,
          fileName: file.name || uploaded.original_filename,
          mimeType: file.type,
          format: uploaded.format,
          width: uploaded.width,
          height: uploaded.height,
          bytes: uploaded.bytes,
        },
      }));
    }
    return NextResponse.json({ assets });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur inconnue";
    if (message === "UNAUTHORIZED") return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
    if (message === "CLOUDINARY_NOT_CONFIGURED") return NextResponse.json({ error: "Cloudinary n'est pas encore configuré." }, { status: 503 });
    if (message === "FORMAT_NOT_ALLOWED") return NextResponse.json({ error: "Format non autorisé. Utilisez JPG, PNG, WEBP, GIF ou AVIF." }, { status: 400 });
    if (message === "FILE_TOO_LARGE") return NextResponse.json({ error: "Une image dépasse 10 Mo." }, { status: 400 });
    console.error("media upload", error);
    return NextResponse.json({ error: "Impossible d'importer les images." }, { status: 500 });
  }
}
