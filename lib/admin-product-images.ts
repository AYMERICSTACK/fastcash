import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";

const MAX_PRODUCT_IMAGE_SIZE = 5 * 1024 * 1024;

const MIME_TO_EXTENSION: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

function sanitizeFilePart(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 70);
}

export async function saveProductImageFromForm(
  fileEntry: FormDataEntryValue | null,
  fallbackImage: string,
  productSlug: string,
) {
  const fallback = fallbackImage.trim();

  if (!(fileEntry instanceof File) || fileEntry.size === 0) {
    return fallback || null;
  }

  const extension = MIME_TO_EXTENSION[fileEntry.type];

  if (!extension) {
    throw new Error("Format image non autorisé. Utilisez JPG, PNG, WEBP ou GIF.");
  }

  if (fileEntry.size > MAX_PRODUCT_IMAGE_SIZE) {
    throw new Error("Image trop lourde. La taille maximale autorisée est de 5 Mo.");
  }

  const uploadDirectory = path.join(process.cwd(), "public", "uploads", "products");
  await mkdir(uploadDirectory, { recursive: true });

  const safeSlug = sanitizeFilePart(productSlug) || "produit-fastcash";
  const fileName = `${safeSlug}-${randomUUID().slice(0, 8)}.${extension}`;
  const filePath = path.join(uploadDirectory, fileName);
  const arrayBuffer = await fileEntry.arrayBuffer();

  await writeFile(filePath, Buffer.from(arrayBuffer));

  return `/uploads/products/${fileName}`;
}
