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
export const IMAGE_MAX_DIMENSION = 1600;
export const IMAGE_JPEG_QUALITY = 0.80;

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

export interface ImageQualityResult {
  isUsable: boolean;
  issue?: "low_res" | "too_dark" | "overexposed" | "low_contrast";
  warningEn?: string;
  warningHi?: string;
}

/**
 * Perform client-side quality check on an image canvas:
 * Inspects resolution, average brightness, and contrast (variance).
 */
export function checkImageQuality(canvas: HTMLCanvasElement): ImageQualityResult {
  const w = canvas.width;
  const h = canvas.height;

  if (w < 180 || h < 180) {
    return {
      isUsable: false,
      issue: "low_res",
      warningEn: "Photo resolution is too low. Please take a closer photo of the affected plant part.",
      warningHi: "फोटो का रिज़ॉल्यूशन बहुत कम है। कृपया प्रभावित पौधे के हिस्से की पास से फोटो लें।",
    };
  }

  const ctx = canvas.getContext("2d");
  if (!ctx) return { isUsable: true };

  // Sample center 70% of image to avoid edge backgrounds
  const startX = Math.floor(w * 0.15);
  const startY = Math.floor(h * 0.15);
  const sampleW = Math.floor(w * 0.7);
  const sampleH = Math.floor(h * 0.7);

  try {
    const imgData = ctx.getImageData(startX, startY, sampleW, sampleH);
    const data = imgData.data;

    let totalLuminance = 0;
    const pixelCount = data.length / 4;
    const luminances = new Float32Array(pixelCount);

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      // Rec. 709 relative luminance calculation
      const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      luminances[i / 4] = lum;
      totalLuminance += lum;
    }

    const avgLum = totalLuminance / pixelCount;

    // Brightness guards
    if (avgLum < 22) {
      return {
        isUsable: false,
        issue: "too_dark",
        warningEn: "Photo is too dark. Please take a well-lit photo of the affected leaf/crop in daylight.",
        warningHi: "फोटो बहुत अंधेरी है। कृपया दिन की रोशनी में प्रभावित पत्ती/फसल की अच्छी फोटो लें।",
      };
    }
    if (avgLum > 248) {
      return {
        isUsable: false,
        issue: "overexposed",
        warningEn: "Photo is overexposed/too bright. Please avoid direct harsh glare when taking the photo.",
        warningHi: "फोटो बहुत अधिक चमकीली है। कृपया फोटो लेते समय तेज धूप के रिफ्लेक्शन से बचें।",
      };
    }

    // Variance/contrast check for extreme blur or blank images
    let sumVariance = 0;
    for (let i = 0; i < pixelCount; i++) {
      const diff = luminances[i] - avgLum;
      sumVariance += diff * diff;
    }
    const stdDev = Math.sqrt(sumVariance / pixelCount);

    if (stdDev < 12) {
      return {
        isUsable: false,
        issue: "low_contrast",
        warningEn: "Photo is too blurry or lacks contrast. Please focus clearly on the leaf symptoms.",
        warningHi: "फोटो बहुत धुंधली है या लक्षण स्पष्ट नहीं हैं। कृपया पत्तियों के लक्षणों पर स्पष्ट फोकस करें।",
      };
    }
  } catch {
    // If canvas sampling is blocked by CORS/security, default to usable
  }

  return { isUsable: true };
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
  if (text.includes("deploy") || text.includes("not deployed") || text.includes("not found")) return "deploy";
  if (
    text.includes("no ai provider") ||
    text.includes("status 503") ||
    text.includes("status 500") ||
    text.includes("status 502") ||
    text.includes("not configured") ||
    text.includes("check ai provider key")
  ) {
    return "config";
  }
  if (
    text.includes("session expired") ||
    text.includes("unauthorized") ||
    text.includes("status 401") ||
    text.includes("invalid or expired token") ||
    text.includes("missing authorization header") ||
    text.includes("expired token") ||
    text.includes("invalid token")
  ) {
    return "session";
  }
  if (text.includes("credit") || text.includes("quota") || text.includes("limit exceeded") || text.includes("status 402")) return "quota";
  if (text.includes("too many") || text.includes("rate limit") || text.includes("status 429")) return "rate_limit";
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

/**
 * Direct client-side Gemini API fallback for crop diagnosis when edge function is unreachable or not configured.
 */
export async function analyzeCropClientSide(
  imagesBase64: string[],
  description: string,
  language: string,
  farmContext?: Record<string, unknown>,
): Promise<Record<string, unknown> | null> {
  const apiKey = (import.meta.env.VITE_GEMINI_API_KEY || import.meta.env.GEMINI_API_KEY || "") as string;
  if (!apiKey || apiKey.trim().length < 10 || apiKey.includes("your_gemini_key")) return null;

  try {
    const prompt = `You are an expert plant pathologist analyzing ${imagesBase64.length} crop images.
Farmer description: "${description || "None"}"
Selected language: "${language}"
Farm Context: ${JSON.stringify(farmContext || {})}

Analyze the crop image and output STRICT JSON only (no markdown, no backticks, no prose):
{
  "crop": "Crop name or null",
  "plant_part": "Leaf/Stem/Fruit/Whole plant",
  "health_status": "possible disease | possible pest | possible deficiency | possible water stress | possible environmental stress | healthy | unclear",
  "possible_issue": "Short description of diagnosis",
  "confidence": 85,
  "symptoms": ["Symptom 1", "Symptom 2"],
  "possible_causes": ["Cause 1"],
  "immediate_actions": ["Action 1", "Action 2"],
  "prevention": ["Prevention 1"],
  "questions": ["Follow up question"],
  "recommendations": ["Recommendation"],
  "urgency": "low",
  "needs_clearer_image": false,
  "next_steps_for_farmer": ["Step 1"],
  "expert_confirm": "When to consult extension officer"
}
Respond entirely in ${language}.`;

    const parts: Array<{ text?: string; inlineData?: { mimeType: string; data: string } }> = [
      { text: prompt },
    ];

    for (const b64 of imagesBase64) {
      const match = b64.match(/^data:([^;,]+);base64,(.+)$/s);
      if (match) {
        parts.push({ inlineData: { mimeType: match[1], data: match[2] } });
      } else {
        parts.push({ inlineData: { mimeType: "image/jpeg", data: b64 } });
      }
    }

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts }],
          generationConfig: { temperature: 0.2, maxOutputTokens: 1536 },
        }),
      },
    );

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      if (errText.includes("API_KEY_INVALID") || errText.includes("API key not valid")) {
        console.warn("Client-side Gemini API key is invalid:", apiKey);
      }
      return null;
    }

    const data = await res.json();
    const candidate = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!candidate) return null;

    const trimmed = candidate.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
    return JSON.parse(trimmed) as Record<string, unknown>;
  } catch {
    return null;
  }
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