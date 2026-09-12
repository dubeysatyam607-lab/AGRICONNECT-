import { supabase } from "@/integrations/supabase/client";

/**
 * Shared Crop Scan helpers (Phase 6 — AI Crop Scan).
 *
 * Honesty contract: never fabricate a disease name, a treatment, a confidence
 * score, or a price. When the AI edge is unreachable or uncertain we surface a
 * clear, honest error — the client must NEVER synthesize a "diagnosis" from a
 * free-text keyword match.
 */

export const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
export const MAX_RAW_IMAGE_MB = 25;
export const MAX_PAYLOAD_IMAGE_MB = 8;
export const IMAGE_MAX_DIMENSION = 900;
export const IMAGE_JPEG_QUALITY = 0.7;

export class ImageInputError extends Error {
  code: string;
  constructor(message: string, code: string) {
    super(message);
    this.name = "ImageInputError";
    this.code = code;
  }
}

export interface CompressedImage {
  dataUrl: string;
  blob: Blob;
  width: number;
  height: number;
}

/**
 * Decode an image file honouring EXIF orientation where the platform allows.
 * Falls back to a plain <img> decode on older browsers.
 */
function decodeImage(
  file: File | Blob,
): Promise<{ source: CanvasImageSource; width: number; height: number }> {
  if (typeof window !== "undefined" && "createImageBitmap" in window) {
    try {
      return createImageBitmap(file, { imageOrientation: "from-image" })
        .then((bmp) => ({ source: bmp, width: bmp.width, height: bmp.height }))
        .catch(() => decodeViaImg(file));
    } catch {
      return decodeViaImg(file);
    }
  }
  return decodeViaImg(file);
}

function decodeViaImg(
  file: File | Blob,
): Promise<{ source: CanvasImageSource; width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const dims = { source: img, width: img.width, height: img.height };
      URL.revokeObjectURL(url);
      resolve(dims);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new ImageInputError("Could not read this image file.", "read"));
    };
    img.src = url;
  });
}

export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new ImageInputError("Could not read this image file.", "read"));
    reader.readAsDataURL(blob);
  });
}

export function dataUrlToBlob(dataUrl: string): Blob {
  const [meta, b64 = ""] = dataUrl.split(",");
  const mime = meta.match(/^data:([^;]+)/)?.[1] || "image/jpeg";
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

export function bytesToMB(bytes: number): string {
  return (bytes / (1024 * 1024)).toFixed(1);
}

/**
 * Compress + resize an image to a small JPEG ready for secure upload and the
 * edge function's payload cap. Returns both a data URL (for preview/analysis)
 * and the matching Blob (for storage). Throws ImageInputError with a stable
 * `code` the UI can map to localized copy.
 */
export async function compressImageFile(
  file: File | Blob,
  maxDim: number = IMAGE_MAX_DIMENSION,
  quality: number = IMAGE_JPEG_QUALITY,
): Promise<CompressedImage> {
  if (!file.size || file.size <= 0) {
    throw new ImageInputError("The selected image is empty.", "read");
  }

  const { source, width, height } = await decodeImage(file);
  const scale = Math.min(1, maxDim / Math.max(width || 1, height || 1));
  const w = Math.max(1, Math.round((width || 1) * scale));
  const h = Math.max(1, Math.round((height || 1) * scale));

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new ImageInputError("Could not compress this image.", "compress");

  ctx.drawImage(source, 0, 0, w, h);

  const blob = await new Promise<Blob | null>((resolve) => {
    try {
      canvas.toBlob(resolve, "image/jpeg", quality);
    } catch {
      resolve(null);
    }
  });
  if (!blob) throw new ImageInputError("Could not compress this image.", "compress");

  const dataUrl = await blobToDataUrl(blob);
  return { dataUrl, blob, width: w, height: h };
}

/** Stable error classification the UI maps to localized copy. */
export type ScanErrorCode =
  | "timeout"
  | "network"
  | "deploy"
  | "config"
  | "session"
  | "quota"
  | "rate_limit"
  | "validation"
  | "api"
  | "unknown";

/** i18n key lookup for each stable error code. */
export const SCAN_ERROR_KEYS: Record<ScanErrorCode, string> = {
  timeout: "doctor.error.timeout",
  network: "doctor.error.network",
  deploy: "doctor.error.deploy",
  config: "doctor.error.config",
  session: "doctor.error.session",
  quota: "doctor.error.quota",
  rate_limit: "doctor.error.rateLimit",
  validation: "doctor.error.validation",
  api: "doctor.error.api",
  unknown: "doctor.error.api",
};

/**
 * Classify an edge-call failure into a stable code. Pure and fully unit-testable
 * (no window/navigator access — callers pass online state explicitly).
 */
export function classifyEdgeError(
  error: string | null | undefined,
  timedOut: boolean,
  online = true,
): ScanErrorCode {
  if (timedOut) return "timeout";
  if (!online) return "network";

  const text = (error || "").toLowerCase();
  if (text.includes("deploy")) return "deploy";
  if (text.includes("no ai provider") || text.includes("status 503") || text.includes("not configured")) {
    return "config";
  }
  if (text.includes("session expired") || text.includes("unauthorized") || text.includes("status 401")) {
    return "session";
  }
  if (text.includes("credit") || text.includes("quota") || text.includes("limit exceeded")) return "quota";
  if (text.includes("too many") || text.includes("rate limit")) return "rate_limit";
  if (
    text.includes("invalid image") ||
    text.includes("unsupported image") ||
    text.includes("corrupted") ||
    text.includes("too small") ||
    text.includes("too large") ||
    text.includes("no published") ||
    text.includes("not clear")
  ) {
    return "validation";
  }
  if (text && text.length > 0) return "api";
  return "unknown";
}

export interface CropScanUploadResult {
  ok: boolean;
  storagePath?: string;
}

/**
 * Securely persist the (already compressed) scan image to the private
 * `crop-scan-images` bucket, scoped to the owner's folder. Best-effort: if the
 * bucket is not configured yet we return ok:false and the caller can still run
 * the analysis — scans must never be blocked by optional storage.
 */
export async function uploadScanImage(
  userId: string | null | undefined,
  blob: Blob | null,
): Promise<CropScanUploadResult> {
  if (!userId || !blob) return { ok: false };
  try {
    const mime = blob.type || "image/jpeg";
    const ext = mime === "image/png" ? "png" : mime === "image/webp" ? "webp" : "jpg";
    const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${ext}`;
    const { error } = await supabase.storage
      .from("crop-scan-images")
      .upload(path, blob, {
        cacheControl: "3600",
        upsert: false,
        contentType: mime,
      });
    if (error) return { ok: false };
    return { ok: true, storagePath: path };
  } catch {
    return { ok: false };
  }
}