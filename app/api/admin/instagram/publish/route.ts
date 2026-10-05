import { NextResponse } from "next/server";
import sharp from "sharp";
import { requireAdminSession } from "@/lib/session";
import { uploadImageBufferToCloudinary } from "@/lib/cloudinary";
import { publishInstagramImage } from "@/lib/instagram-publish";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

function safeText(value: FormDataEntryValue | null, max: number) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

export async function POST(request: Request) {
  try {
    await requireAdminSession();

    const form = await request.formData();
    const file = form.get("image");
    const format = form.get("format") === "story" ? "story" : "post";
    const caption = safeText(form.get("caption"), 2200);

    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json({ error: "Le visuel Instagram est manquant." }, { status: 400 });
    }
    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "Le fichier reçu n’est pas une image." }, { status: 400 });
    }
    if (file.size > MAX_IMAGE_BYTES) {
      return NextResponse.json({ error: "Le visuel dépasse 10 Mo." }, { status: 400 });
    }

    const source = Buffer.from(await file.arrayBuffer());
    const jpeg = await sharp(source, { failOn: "none" })
      .flatten({ background: "#ffffff" })
      .jpeg({ quality: 94, chromaSubsampling: "4:4:4" })
      .toBuffer();

    const publicId = `fastcash/instagram/studio-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const uploaded = await uploadImageBufferToCloudinary(jpeg, "image/jpeg", {
      publicId,
      overwrite: false,
    });

    const result = await publishInstagramImage({
      imageUrl: uploaded.secure_url,
      caption,
      format,
    });

    console.info("instagram publish success", {
      mediaId: result.mediaId,
      format,
      username: result.username,
      cloudinaryPublicId: uploaded.public_id,
    });

    return NextResponse.json({
      ok: true,
      mediaId: result.mediaId,
      username: result.username,
      permalink: result.permalink,
      format,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur inconnue";

    if (message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Session administrateur expirée." }, { status: 401 });
    }
    if (message === "INSTAGRAM_NOT_CONNECTED") {
      return NextResponse.json({ error: "Instagram n’est pas connecté au Studio." }, { status: 409 });
    }
    if (message === "INSTAGRAM_TOKEN_EXPIRED") {
      return NextResponse.json({ error: "Le jeton Instagram a expiré. Reconnectez le compte." }, { status: 409 });
    }
    if (message === "CLOUDINARY_NOT_CONFIGURED") {
      return NextResponse.json({ error: "Le stockage d’images Cloudinary n’est pas configuré." }, { status: 503 });
    }

    console.error("instagram publish error", error);
    return NextResponse.json({ error: message || "Impossible de publier sur Instagram." }, { status: 500 });
  }
}
