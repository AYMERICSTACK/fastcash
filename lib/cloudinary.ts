import { v2 as cloudinary, type UploadApiErrorResponse, type UploadApiResponse } from "cloudinary";

const MAX_MEDIA_SIZE = 10 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"]);

export type CloudinaryUploadResult = {
  secure_url: string;
  public_id: string;
  original_filename: string;
  format: string;
  width: number;
  height: number;
  bytes: number;
  resource_type: string;
};

let configured = false;

function cleanEnvValue(value: string | undefined) {
  return value?.trim().replace(/^['"]|['"]$/g, "");
}

function configureCloudinary() {
  if (configured) return;

  const cloudName = cleanEnvValue(process.env.CLOUDINARY_CLOUD_NAME);
  const apiKey = cleanEnvValue(process.env.CLOUDINARY_API_KEY);
  const apiSecret = cleanEnvValue(process.env.CLOUDINARY_API_SECRET);

  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error("CLOUDINARY_NOT_CONFIGURED");
  }

  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
    secure: true,
  });

  configured = true;
}

function formatCloudinaryError(error: unknown, prefix: string) {
  if (error instanceof Error) return new Error(`${prefix}:${error.message}`);

  if (typeof error === "object" && error !== null) {
    const candidate = error as Partial<UploadApiErrorResponse> & { message?: string; http_code?: number };
    const code = candidate.http_code ? `${candidate.http_code}:` : "";
    return new Error(`${prefix}:${code}${candidate.message ?? JSON.stringify(error)}`);
  }

  return new Error(`${prefix}:${String(error)}`);
}

function normalizeUploadResult(result: UploadApiResponse): CloudinaryUploadResult {
  return {
    secure_url: result.secure_url,
    public_id: result.public_id,
    original_filename: result.original_filename,
    format: result.format,
    width: result.width,
    height: result.height,
    bytes: result.bytes,
    resource_type: result.resource_type,
  };
}

async function uploadBuffer(
  buffer: Buffer,
  options: { publicId?: string; folder?: string; overwrite?: boolean; invalidate?: boolean },
): Promise<CloudinaryUploadResult> {
  configureCloudinary();

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        resource_type: "image",
        public_id: options.publicId,
        folder: options.folder,
        overwrite: options.overwrite,
        invalidate: options.invalidate,
      },
      (error, result) => {
        if (error) {
          reject(formatCloudinaryError(error, "CLOUDINARY_SDK_UPLOAD_FAILED"));
          return;
        }
        if (!result) {
          reject(new Error("CLOUDINARY_SDK_UPLOAD_FAILED:EMPTY_RESPONSE"));
          return;
        }
        resolve(normalizeUploadResult(result));
      },
    );

    stream.on("error", (error) => reject(formatCloudinaryError(error, "CLOUDINARY_SDK_STREAM_FAILED")));
    stream.end(buffer);
  });
}

export function validateMediaFile(file: File) {
  if (!ALLOWED_TYPES.has(file.type)) throw new Error("FORMAT_NOT_ALLOWED");
  if (file.size > MAX_MEDIA_SIZE) throw new Error("FILE_TOO_LARGE");
}

export async function uploadMediaToCloudinary(file: File) {
  validateMediaFile(file);
  const buffer = Buffer.from(await file.arrayBuffer());
  return uploadBuffer(buffer, { folder: "fastcash/products" });
}

export async function deleteMediaFromCloudinary(publicId: string) {
  configureCloudinary();

  try {
    const result = await cloudinary.uploader.destroy(publicId, {
      resource_type: "image",
      invalidate: true,
    });

    if (result.result !== "ok" && result.result !== "not found") {
      throw new Error(`UNEXPECTED_RESULT:${result.result}`);
    }
  } catch (error) {
    throw formatCloudinaryError(error, "CLOUDINARY_SDK_DELETE_FAILED");
  }
}

export async function uploadRemoteImageToCloudinary(
  sourceUrl: string,
  options: { publicId: string; overwrite?: boolean },
) {
  configureCloudinary();

  try {
    const result = await cloudinary.uploader.upload(sourceUrl, {
      resource_type: "image",
      public_id: options.publicId,
      overwrite: options.overwrite ?? true,
      invalidate: true,
    });
    return normalizeUploadResult(result);
  } catch (error) {
    throw formatCloudinaryError(error, "CLOUDINARY_SDK_REMOTE_UPLOAD_FAILED");
  }
}

export async function uploadImageBufferToCloudinary(
  buffer: Buffer,
  mimeType: string,
  options: { publicId: string; overwrite?: boolean },
) {
  if (!ALLOWED_TYPES.has(mimeType)) throw new Error(`FORMAT_NOT_ALLOWED:${mimeType}`);
  if (buffer.length === 0) throw new Error("EMPTY_IMAGE_FILE");
  if (buffer.length > MAX_MEDIA_SIZE) throw new Error(`FILE_TOO_LARGE:${buffer.length}`);

  return uploadBuffer(buffer, {
    publicId: options.publicId,
    overwrite: options.overwrite ?? true,
    invalidate: true,
  });
}
