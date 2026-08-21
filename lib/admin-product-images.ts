import { uploadMediaToCloudinary } from "@/lib/cloudinary";

const MAX_PRODUCT_IMAGE_SIZE = 5 * 1024 * 1024;
const ALLOWED_PRODUCT_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

/**
 * Enregistre l'image principale d'un produit.
 *
 * Important : en production Vercel, le filesystem de l'application (/var/task)
 * est en lecture seule. Les uploads doivent donc être stockés sur Cloudinary et
 * seule l'URL persistante est enregistrée en base.
 */
export async function saveProductImageFromForm(
  fileEntry: FormDataEntryValue | null,
  fallbackImage: string,
  _productSlug: string,
) {
  const fallback = fallbackImage.trim();

  if (!(fileEntry instanceof File) || fileEntry.size === 0) {
    return fallback || null;
  }

  if (!ALLOWED_PRODUCT_IMAGE_TYPES.has(fileEntry.type)) {
    throw new Error("Format image non autorisé. Utilisez JPG, PNG, WEBP ou GIF.");
  }

  if (fileEntry.size > MAX_PRODUCT_IMAGE_SIZE) {
    throw new Error("Image trop lourde. La taille maximale autorisée est de 5 Mo.");
  }

  try {
    const uploaded = await uploadMediaToCloudinary(fileEntry);
    return uploaded.secure_url;
  } catch (error) {
    console.error("FAST CASH product image upload failed", error);

    if (error instanceof Error && error.message === "CLOUDINARY_NOT_CONFIGURED") {
      throw new Error("Le stockage des images n'est pas configuré. Contactez l'administrateur FAST CASH.");
    }

    throw new Error("L'image n'a pas pu être envoyée. Réessayez dans quelques instants.");
  }
}
