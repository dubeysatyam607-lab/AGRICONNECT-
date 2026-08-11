/**
 * Cloudinary Media Storage & Transformation Service
 * Cloud Name: twev85cy
 */

export const CLOUDINARY_CONFIG = {
  cloudName: (import.meta.env.VITE_CLOUDINARY_CLOUD_NAME as string | undefined) ?? "",
  apiKey: (import.meta.env.VITE_CLOUDINARY_API_KEY as string | undefined) ?? "",
  uploadPreset: "agriconnect_preset"
};

/**
 * Transforms any image URL into a Cloudinary auto-optimized, WebP/AVIF scaled image
 */
export function getOptimizedCloudinaryUrl(
  publicIdOrUrl: string,
  options: { width?: number; height?: number; crop?: string; quality?: string } = {}
): string {
  if (!publicIdOrUrl) return '';

  // If already a full URL, wrap via Cloudinary fetch URL or return original
  if (publicIdOrUrl.startsWith('http://') || publicIdOrUrl.startsWith('https://')) {
    const { width = 800, quality = 'auto' } = options;
    return `https://res.cloudinary.com/${CLOUDINARY_CONFIG.cloudName}/image/fetch/w_${width},f_auto,q_${quality}/${encodeURIComponent(publicIdOrUrl)}`;
  }

  const { width = 800, crop = 'scale', quality = 'auto' } = options;
  return `https://res.cloudinary.com/${CLOUDINARY_CONFIG.cloudName}/image/upload/w_${width},c_${crop},f_auto,q_${quality}/${publicIdOrUrl}`;
}
