import type { PrismaClient } from "@prisma/client";
import { uploadImageBufferToCloudinary } from "@/lib/cloudinary";
import { parsePrestashopDump } from "@/lib/prestashop/parser";
import type { PrestashopSqlRow } from "@/lib/prestashop/types";

export type PrestashopImageImportAction = "created" | "updated" | "unchanged" | "ignored" | "error";
export type PrestashopImageImportStage = "product" | "download" | "validation" | "cloudinary" | "database" | "completed";

export interface PrestashopImageImportItem {
  prestashopImageId: number;
  prestashopProductId: number;
  action: PrestashopImageImportAction;
  stage: PrestashopImageImportStage;
  sourceUrl: string;
  httpStatus?: number;
  contentType?: string;
  downloadedBytes?: number;
  cloudinaryPublicId?: string;
  message?: string;
}

export interface PrestashopImageImportReport {
  total: number;
  processed: number;
  created: number;
  updated: number;
  unchanged: number;
  ignored: number;
  errors: number;
  missingProducts: number;
  offset: number;
  nextOffset: number | null;
  completed: boolean;
  items: PrestashopImageImportItem[];
  importedAt: string;
}

const MAX_SOURCE_IMAGE_BYTES = 10 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"]);

const numberValue = (row: PrestashopSqlRow | undefined, key: string) => {
  const value = Number(row?.[key]);
  return Number.isFinite(value) ? value : 0;
};

const textValue = (row: PrestashopSqlRow | undefined, key: string) => String(row?.[key] ?? "").trim();

function normalizeBaseUrl(value: string) {
  const url = new URL(value);
  if (!/^https?:$/.test(url.protocol)) throw new Error("INVALID_IMAGE_BASE_URL");
  const hostname = url.hostname.toLowerCase();
  if (
    hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1" || hostname.endsWith(".local") ||
    /^10\./.test(hostname) || /^192\.168\./.test(hostname) || /^172\.(1[6-9]|2\d|3[01])\./.test(hostname)
  ) throw new Error("PRIVATE_IMAGE_BASE_URL");
  return url.toString().replace(/\/+$/, "");
}

export function buildPrestashopImageUrl(baseUrl: string, imageId: number) {
  const path = String(imageId).split("").join("/");
  return `${normalizeBaseUrl(baseUrl)}/img/p/${path}/${imageId}.jpg`;
}

function detectLanguage(rows: PrestashopSqlRow[], requested?: number | null) {
  if (requested && rows.some((row) => numberValue(row, "id_lang") === requested)) return requested;
  const counts = new Map<number, number>();
  for (const row of rows) {
    const id = numberValue(row, "id_lang");
    if (id > 0) counts.set(id, (counts.get(id) ?? 0) + (textValue(row, "legend") ? 2 : 1));
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0] - b[0])[0]?.[0] ?? 0;
}

async function mapWithConcurrency<T, R>(items: T[], concurrency: number, worker: (item: T) => Promise<R>) {
  const results: R[] = new Array(items.length);
  let cursor = 0;
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (true) {
      const index = cursor++;
      if (index >= items.length) return;
      results[index] = await worker(items[index]);
    }
  }));
  return results;
}

function cleanContentType(value: string | null) {
  return (value ?? "").split(";")[0].trim().toLowerCase();
}

async function downloadSourceImage(sourceUrl: string) {
  const response = await fetch(sourceUrl, {
    redirect: "follow",
    cache: "no-store",
    headers: { Accept: "image/avif,image/webp,image/png,image/jpeg,image/*;q=0.8,*/*;q=0.1", "User-Agent": "FastCash-Prestashop-Migrator/2.0" },
    signal: AbortSignal.timeout(30_000),
  });
  const contentType = cleanContentType(response.headers.get("content-type"));
  if (!response.ok) throw Object.assign(new Error(`SOURCE_HTTP_ERROR:${response.status}`), { stage: "download", httpStatus: response.status, contentType });
  if (!ALLOWED_IMAGE_TYPES.has(contentType)) throw Object.assign(new Error(`SOURCE_NOT_IMAGE:${contentType || "unknown"}`), { stage: "validation", httpStatus: response.status, contentType });
  const buffer = Buffer.from(await response.arrayBuffer());
  if (!buffer.length) throw Object.assign(new Error("SOURCE_EMPTY_FILE"), { stage: "validation", httpStatus: response.status, contentType, downloadedBytes: 0 });
  if (buffer.length > MAX_SOURCE_IMAGE_BYTES) throw Object.assign(new Error(`SOURCE_FILE_TOO_LARGE:${buffer.length}`), { stage: "validation", httpStatus: response.status, contentType, downloadedBytes: buffer.length });
  return { buffer, httpStatus: response.status, contentType, downloadedBytes: buffer.length };
}

export async function importPrestashopImages(input: {
  content: string;
  prisma: PrismaClient;
  imageBaseUrl: string;
  languageId?: number | null;
  offset?: number;
  limit?: number;
  imageIds?: number[];
}): Promise<PrestashopImageImportReport> {
  const parsed = parsePrestashopDump(input.content);
  const imageRows = parsed.data.image?.rows ?? [];
  const imageShopRows = parsed.data.image_shop?.rows ?? [];
  const imageLangRows = parsed.data.image_lang?.rows ?? [];
  if (!imageRows.length) throw new Error("IMAGE_TABLE_MISSING");

  const baseUrl = normalizeBaseUrl(input.imageBaseUrl);
  const languageId = detectLanguage(imageLangRows, input.languageId);
  const offset = Math.max(0, Math.floor(input.offset ?? 0));
  const limit = Math.min(100, Math.max(1, Math.floor(input.limit ?? 40)));
  const requestedIds = new Set((input.imageIds ?? []).filter((id) => Number.isInteger(id) && id > 0));

  const shopByImage = new Map<number, PrestashopSqlRow[]>();
  for (const row of imageShopRows) {
    const id = numberValue(row, "id_image");
    const rows = shopByImage.get(id) ?? [];
    rows.push(row);
    shopByImage.set(id, rows);
  }
  const legendByImage = new Map<number, string>();
  for (const row of imageLangRows) {
    if (languageId && numberValue(row, "id_lang") !== languageId) continue;
    const id = numberValue(row, "id_image");
    if (!legendByImage.has(id)) legendByImage.set(id, textValue(row, "legend"));
  }

  const allImages = imageRows.map((row) => {
    const imageId = numberValue(row, "id_image");
    const shops = shopByImage.get(imageId) ?? [];
    return {
      imageId,
      productId: numberValue(row, "id_product"),
      position: numberValue(row, "position"),
      cover: numberValue(row, "cover") === 1 || shops.some((shop) => numberValue(shop, "cover") === 1),
      legend: legendByImage.get(imageId) || null,
    };
  }).filter((image) => image.imageId > 0 && image.productId > 0).sort((a, b) => a.imageId - b.imageId);

  const imagesByProduct = new Map<number, typeof allImages>();
  for (const image of allImages) {
    const productImages = imagesByProduct.get(image.productId) ?? [];
    productImages.push(image);
    imagesByProduct.set(image.productId, productImages);
  }
  for (const productImages of imagesByProduct.values()) {
    if (!productImages.some((image) => image.cover)) {
      const fallback = [...productImages].sort((a, b) => a.position - b.position || a.imageId - b.imageId)[0];
      if (fallback) fallback.cover = true;
    }
  }

  const selected = requestedIds.size ? allImages.filter((image) => requestedIds.has(image.imageId)) : allImages;
  const batch = selected.slice(offset, offset + limit);
  const productIds = [...new Set(batch.map((item) => item.productId))];
  const products = await input.prisma.product.findMany({ where: { prestashopId: { in: productIds } }, select: { id: true, prestashopId: true, name: true } });
  const productsByPrestashopId = new Map(products.flatMap((p) => p.prestashopId == null ? [] : [[p.prestashopId, p] as const]));
  const publicIds = batch.map((item) => `fastcash/prestashop/images/${item.imageId}`);
  const existingAssets = await input.prisma.mediaAsset.findMany({ where: { publicId: { in: publicIds } }, select: { id: true, publicId: true, url: true } });
  const assetByPublicId = new Map(existingAssets.flatMap((asset) => asset.publicId ? [[asset.publicId, asset] as const] : []));

  const items = await mapWithConcurrency(batch, 4, async (source): Promise<PrestashopImageImportItem> => {
    const sourceUrl = buildPrestashopImageUrl(baseUrl, source.imageId);
    const product = productsByPrestashopId.get(source.productId);
    if (!product) return { prestashopImageId: source.imageId, prestashopProductId: source.productId, action: "ignored", stage: "product", sourceUrl, message: "PRODUCT_NOT_IMPORTED" };
    const publicId = `fastcash/prestashop/images/${source.imageId}`;
    let diagnostic: Partial<PrestashopImageImportItem> = { sourceUrl, cloudinaryPublicId: publicId };
    try {
      let asset = assetByPublicId.get(publicId);
      let action: PrestashopImageImportAction = "unchanged";
      if (!asset) {
        let downloaded;
        try { downloaded = await downloadSourceImage(sourceUrl); }
        catch (error) { throw error; }
        diagnostic = { ...diagnostic, ...downloaded };
        let uploaded;
        try { uploaded = await uploadImageBufferToCloudinary(downloaded.buffer, downloaded.contentType, { publicId, overwrite: false }); }
        catch (error) { throw Object.assign(error instanceof Error ? error : new Error("CLOUDINARY_UNKNOWN_ERROR"), { stage: "cloudinary", ...diagnostic }); }
        try {
          asset = await input.prisma.mediaAsset.create({
            data: { url: uploaded.secure_url, publicId: uploaded.public_id, fileName: `${source.imageId}.${uploaded.format}`, mimeType: `image/${uploaded.format === "jpg" ? "jpeg" : uploaded.format}`, format: uploaded.format, width: uploaded.width, height: uploaded.height, bytes: uploaded.bytes },
            select: { id: true, publicId: true, url: true },
          });
        } catch (error) { throw Object.assign(error instanceof Error ? error : new Error("MEDIA_ASSET_CREATE_FAILED"), { stage: "database", ...diagnostic }); }
        assetByPublicId.set(publicId, asset);
        action = "created";
      }

      const existingLink = await input.prisma.productMedia.findUnique({ where: { productId_mediaId: { productId: product.id, mediaId: asset.id } }, select: { id: true, alt: true, position: true, isPrimary: true } });
      const alt = source.legend || product.name;
      if (!existingLink) {
        if (source.cover) await input.prisma.productMedia.updateMany({ where: { productId: product.id }, data: { isPrimary: false } });
        await input.prisma.productMedia.create({ data: { productId: product.id, mediaId: asset.id, alt, position: source.position, isPrimary: source.cover } });
        if (action === "unchanged") action = "updated";
      } else if (existingLink.alt !== alt || existingLink.position !== source.position || existingLink.isPrimary !== source.cover) {
        if (source.cover) await input.prisma.productMedia.updateMany({ where: { productId: product.id, id: { not: existingLink.id } }, data: { isPrimary: false } });
        await input.prisma.productMedia.update({ where: { id: existingLink.id }, data: { alt, position: source.position, isPrimary: source.cover } });
        action = action === "created" ? "created" : "updated";
      }
      if (source.cover) await input.prisma.product.update({ where: { id: product.id }, data: { image: asset.url } });
      console.info(`[Prestashop image ${source.imageId}] OK ${sourceUrl} -> ${publicId}`);
      return { ...diagnostic, prestashopImageId: source.imageId, prestashopProductId: source.productId, action, stage: "completed", sourceUrl };
    } catch (error) {
      const details = error as Error & { stage?: PrestashopImageImportStage; httpStatus?: number; contentType?: string; downloadedBytes?: number };
      const item: PrestashopImageImportItem = {
        prestashopImageId: source.imageId,
        prestashopProductId: source.productId,
        action: "error",
        stage: details.stage ?? "database",
        sourceUrl,
        httpStatus: details.httpStatus ?? diagnostic.httpStatus,
        contentType: details.contentType ?? diagnostic.contentType,
        downloadedBytes: details.downloadedBytes ?? diagnostic.downloadedBytes,
        cloudinaryPublicId: publicId,
        message: details.message?.slice(0, 1000) || "UNKNOWN_ERROR",
      };
      console.error(`[Prestashop image ${source.imageId}] ${item.stage} ${item.message}`, { sourceUrl, httpStatus: item.httpStatus, contentType: item.contentType, downloadedBytes: item.downloadedBytes, publicId });
      return item;
    }
  });

  const nextOffset = offset + batch.length < selected.length ? offset + batch.length : null;
  return {
    total: selected.length,
    processed: batch.length,
    created: items.filter((item) => item.action === "created").length,
    updated: items.filter((item) => item.action === "updated").length,
    unchanged: items.filter((item) => item.action === "unchanged").length,
    ignored: items.filter((item) => item.action === "ignored").length,
    errors: items.filter((item) => item.action === "error").length,
    missingProducts: items.filter((item) => item.message === "PRODUCT_NOT_IMPORTED").length,
    offset,
    nextOffset,
    completed: nextOffset == null,
    items,
    importedAt: new Date().toISOString(),
  };
}
