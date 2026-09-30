/**
 * Cloudinary Media Storage & Transformation Service
 * Cloud Name: from VITE_CLOUDINARY_CLOUD_NAME (set in .env + Vercel)
 *
 * Uploads go straight to Cloudinary's unsigned upload endpoint using the
 * `agriconnect_preset` upload preset, so the browser never touches the API
 * secret. Deletions are delegated to the /api/cloudinary/delete serverless
 * function, which signs the destroy request server-side.
 */

export const CLOUDINARY_CONFIG = {
  // Cloud name is public (it is part of every delivery URL), so it is baked as
  // a build fallback — Cloudinary uploads work even before the env var is set.
  cloudName: (import.meta.env.VITE_CLOUDINARY_CLOUD_NAME as string | undefined) || "twev85cy",
  apiKey: (import.meta.env.VITE_CLOUDINARY_API_KEY as string | undefined) || "153752454716339",
  uploadPreset: "agriconnect_preset",
};

const uploadEndpoint = (cloudName: string) =>
  `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`;

export interface CloudinaryUploadResult {
  secureUrl: string;
  publicId: string;
}

/**
 * Extracts the public_id from a delivered Cloudinary URL, undoing the
 * auto-inserted version segment:
 * https://res.cloudinary.com/{cloud}/image/upload/v123456789/{folder}/{file}
 */
export function publicIdFromUrl(url: string): string | null {
  if (!url || typeof url !== "string") return null;
  const split = url.split("/image/upload");
  if (split.length !== 2) return null;
  const segments = split[1].split("/").filter(Boolean);
  if (segments.length && segments[0].startsWith("v") && /^\d+$/.test(segments[0].slice(1))) {
    segments.shift();
  }
  return segments.length ? segments.join("/") : null;
}

/**
 * Uploads a validated image file to Cloudinary via the unsigned upload preset.
 * `folder` becomes the top-level folder (e.g. "cattle-images"). Returns the
 * secure delivery URL and the public_id for later deletion.
 */
export async function uploadToCloudinary(file: File, folder = ""): Promise<CloudinaryUploadResult> {
  const cloudName = CLOUDINARY_CONFIG.cloudName;
  if (!cloudName) {
    throw new Error("Cloudinary is not configured (VITE_CLOUDINARY_CLOUD_NAME missing).");
  }
  if (!CLOUDINARY_CONFIG.uploadPreset) {
    throw new Error("Cloudinary upload preset is not configured.");
  }

  const form = new FormData();
  form.append("file", file);
  form.append("upload_preset", CLOUDINARY_CONFIG.uploadPreset);
  if (folder.trim()) {
    form.append("folder", folder.trim());
  }

  const res = await fetch(uploadEndpoint(cloudName), { method: "POST", body: form });
  if (!res.ok) {
    let detail = `HTTP ${res.status}`;
    try {
      const body = await res.json();
      detail = body?.error?.message || body?.error?.message?.message || detail;
    } catch { /* keep default */ }
    throw new Error(`Cloudinary upload failed: ${detail}`);
  }

  const data = await res.json();
  const secureUrl = typeof data?.secure_url === "string" ? data.secure_url : "";
  if (!secureUrl) {
    throw new Error("Cloudinary upload returned no secure_url.");
  }
  const publicId =
    typeof data?.public_id === "string" ? data.public_id : publicIdFromUrl(secureUrl) || "";
  return { secureUrl, publicId };
}

/**
 * Deletes an image via the serverless function that signs the request with
 * the Cloudinary API secret (never exposed to the browser).
 */
export async function deleteFromCloudinary(publicId: string): Promise<void> {
  if (!publicId) throw new Error("Missing Cloudinary public_id to delete.");
  const res = await fetch("/api/cloudinary/delete", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ publicId }),
  });
  let message = `HTTP ${res.status}`;
  try {
    const body = await res.json();
    message = body?.error || message;
  } catch { /* ignore */ }
  if (!res.ok) throw new Error(message);
}

/**
 * Transforms any image URL into a Cloudinary auto-optimized, WebP/AVIF scaled image
 */
export function getOptimizedCloudinaryUrl(
  publicIdOrUrl: string,
  options: { width?: number; height?: number; crop?: string; quality?: string } = {}
): string {
  if (!publicIdOrUrl) return "";

  // If already a full URL, wrap via Cloudinary fetch URL or return original
  if (publicIdOrUrl.startsWith("http://") || publicIdOrUrl.startsWith("https://")) {
    const { width = 800, quality = "auto" } = options;
    return `https://res.cloudinary.com/${CLOUDINARY_CONFIG.cloudName}/image/fetch/w_${width},f_auto,q_${quality}/${encodeURIComponent(publicIdOrUrl)}`;
  }

  const { width = 800, crop = "scale", quality = "auto" } = options;
  return `https://res.cloudinary.com/${CLOUDINARY_CONFIG.cloudName}/image/upload/w_${width},c_${crop},f_auto,q_${quality}/${publicIdOrUrl}`;
}