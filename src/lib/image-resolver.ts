/**
 * Unified Image Resolution System for AgriConnect
 * Production-ready handler for Mandi crops, Agri Store products, Machinery, and Schemes.
 */

import { getCropImage, getCropBackupImage, CATEGORY_CROP_IMAGES } from "./crop-images";

// In-memory cache for resolved URLs
const RESOLVE_CACHE = new Map<string, string>();

/**
 * High-quality, CDN-hosted agricultural product images for Indian Agri Store items.
 */
export const STORE_PRODUCT_IMAGES: Record<string, string> = {
  // Fertilizers
  "urea": "https://images.unsplash.com/photo-1628352081506-83c43123ed6d?auto=format&fit=crop&q=80&w=600",
  "dap": "https://images.unsplash.com/photo-1597657133350-14b85b99ef95?auto=format&fit=crop&q=80&w=600",
  "npk": "https://images.unsplash.com/photo-1585336261026-775c74256856?auto=format&fit=crop&q=80&w=600",
  "compost": "https://images.unsplash.com/photo-1606865923806-e24e9d4a0da3?auto=format&fit=crop&q=80&w=600",
  "potash": "https://images.unsplash.com/photo-1628352081506-83c43123ed6d?auto=format&fit=crop&q=80&w=600",
  "mop": "https://images.unsplash.com/photo-1628352081506-83c43123ed6d?auto=format&fit=crop&q=80&w=600",
  "vermicompost": "https://images.unsplash.com/photo-1606865923806-e24e9d4a0da3?auto=format&fit=crop&q=80&w=600",
  "micronutrient": "https://images.unsplash.com/photo-1585336261026-775c74256856?auto=format&fit=crop&q=80&w=600",
  "zinc": "https://images.unsplash.com/photo-1585336261026-775c74256856?auto=format&fit=crop&q=80&w=600",
  "sulfur": "https://images.unsplash.com/photo-1585336261026-775c74256856?auto=format&fit=crop&q=80&w=600",

  // Seeds
  "wheat seed": "https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?auto=format&fit=crop&q=80&w=600",
  "cotton seed": "https://images.unsplash.com/photo-1605000797498-6f2145b1b9c3?auto=format&fit=crop&q=80&w=600",
  "tomato seed": "https://images.unsplash.com/photo-1592841200221-a6898f307baa?auto=format&fit=crop&q=80&w=600",
  "maize seed": "https://images.unsplash.com/photo-1551754655-cd27e38d2076?auto=format&fit=crop&q=80&w=600",
  "paddy seed": "https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&q=80&w=600",
  "vegetable seed": "https://images.unsplash.com/photo-1592417817098-8f3d6eb18865?auto=format&fit=crop&q=80&w=600",
  "mustard seed": "https://images.unsplash.com/photo-1508747703725-719777637510?auto=format&fit=crop&q=80&w=600",
  "soybean seed": "https://images.unsplash.com/photo-1599599810769-bcde5a160d32?auto=format&fit=crop&q=80&w=600",
  "onion seed": "https://images.unsplash.com/photo-1618512496248-a07fe83aa8cb?auto=format&fit=crop&q=80&w=600",
  "chilli seed": "https://images.unsplash.com/photo-1588252303782-cb80119abd6d?auto=format&fit=crop&q=80&w=600",

  // Pesticides & Bio-Control
  "imidacloprid": "https://images.unsplash.com/photo-1607623814075-e51df1bdc82f?auto=format&fit=crop&q=80&w=600",
  "chlorpyrifos": "https://images.unsplash.com/photo-1607623814075-e51df1bdc82f?auto=format&fit=crop&q=80&w=600",
  "mancozeb": "https://images.unsplash.com/photo-1585336261026-775c74256856?auto=format&fit=crop&q=80&w=600",
  "glyphosate": "https://images.unsplash.com/photo-1607623814075-e51df1bdc82f?auto=format&fit=crop&q=80&w=600",
  "neem oil": "https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?auto=format&fit=crop&q=80&w=600",
  "bio pesticide": "https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?auto=format&fit=crop&q=80&w=600",
  "fungicide": "https://images.unsplash.com/photo-1585336261026-775c74256856?auto=format&fit=crop&q=80&w=600",
  "insecticide": "https://images.unsplash.com/photo-1607623814075-e51df1bdc82f?auto=format&fit=crop&q=80&w=600",

  // Tools & Irrigation
  "sprayer": "https://images.unsplash.com/photo-1607623814075-e51df1bdc82f?auto=format&fit=crop&q=80&w=600",
  "drip irrigation": "https://images.unsplash.com/photo-1625246333195-78d9c38ad449?auto=format&fit=crop&q=80&w=600",
  "rotavator": "https://images.unsplash.com/photo-1589923188900-85dae523342b?auto=format&fit=crop&q=80&w=600",
  "pruning": "https://images.unsplash.com/photo-1589923188900-85dae523342b?auto=format&fit=crop&q=80&w=600",
  "spreader": "https://images.unsplash.com/photo-1589923188900-85dae523342b?auto=format&fit=crop&q=80&w=600",
  "motor": "https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&q=80&w=600",
  "pipe": "https://images.unsplash.com/photo-1625246333195-78d9c38ad449?auto=format&fit=crop&q=80&w=600",

  // Machinery & Equipment
  "pump": "https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&q=80&w=600",
  "tiller": "https://images.unsplash.com/photo-1589923188900-85dae523342b?auto=format&fit=crop&q=80&w=600",
  "drill": "https://images.unsplash.com/photo-1589923188900-85dae523342b?auto=format&fit=crop&q=80&w=600",
  "chaff": "https://images.unsplash.com/photo-1589923188900-85dae523342b?auto=format&fit=crop&q=80&w=600",
  "solar": "https://images.unsplash.com/photo-1509391365360-2e959784a276?auto=format&fit=crop&q=80&w=600",
  "trolley": "https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?auto=format&fit=crop&q=80&w=600",
  "transplanter": "https://images.unsplash.com/photo-1536657464919-892534f60d6e?auto=format&fit=crop&q=80&w=600",
  "drone": "https://images.unsplash.com/photo-1508614589041-895b88991e3e?auto=format&fit=crop&q=80&w=600",
  "harvester": "https://images.unsplash.com/photo-1500937386664-56d1dfef3854?auto=format&fit=crop&q=80&w=600",
  "tractor": "https://images.unsplash.com/photo-1589923188900-85dae523342b?auto=format&fit=crop&q=80&w=600",
};

/**
 * Secondary real photo backups for store products
 */
export const STORE_PRODUCT_BACKUP_IMAGES: Record<string, string> = {
  fertilizer: "https://images.unsplash.com/photo-1585336261026-775c74256856?auto=format&fit=crop&q=80&w=600",
  seed: "https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?auto=format&fit=crop&q=80&w=600",
  pesticide: "https://images.unsplash.com/photo-1607623814075-e51df1bdc82f?auto=format&fit=crop&q=80&w=600",
  tool: "https://images.unsplash.com/photo-1625246333195-78d9c38ad449?auto=format&fit=crop&q=80&w=600",
  machinery: "https://images.unsplash.com/photo-1589923188900-85dae523342b?auto=format&fit=crop&q=80&w=600",
  default: "https://images.unsplash.com/photo-1500937386664-56d1dfef3854?auto=format&fit=crop&q=80&w=600",
};

/**
 * Category-level default real photo fallbacks
 */
export const CATEGORY_FALLBACK_IMAGES: Record<string, string> = {
  seeds: "https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?auto=format&fit=crop&q=80&w=600",
  fertilizers: "https://images.unsplash.com/photo-1628352081506-83c43123ed6d?auto=format&fit=crop&q=80&w=600",
  pesticides: "https://images.unsplash.com/photo-1607623814075-e51df1bdc82f?auto=format&fit=crop&q=80&w=600",
  tools: "https://images.unsplash.com/photo-1625246333195-78d9c38ad449?auto=format&fit=crop&q=80&w=600",
  machinery: "https://images.unsplash.com/photo-1589923188900-85dae523342b?auto=format&fit=crop&q=80&w=600",
  irrigation: "https://images.unsplash.com/photo-1625246333195-78d9c38ad449?auto=format&fit=crop&q=80&w=600",
  default: "https://images.unsplash.com/photo-1500937386664-56d1dfef3854?auto=format&fit=crop&q=80&w=600",
};

/**
 * Guaranteed offline SVG agricultural placeholder for offline environments.
 */
export const OFFLINE_AGRI_SVG =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300" width="100%" height="100%">
  <defs>
    <linearGradient id="agri_grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#022c22" />
      <stop offset="50%" stop-color="#064e3b" />
      <stop offset="100%" stop-color="#065f46" />
    </linearGradient>
  </defs>
  <rect width="400" height="300" fill="url(#agri_grad)" />
  <circle cx="200" cy="120" r="44" fill="#10b981" opacity="0.25" />
  <text x="200" y="135" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="36" text-anchor="middle">🌾</text>
  <text x="200" y="210" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="16" font-weight="700" fill="#f0fdf4" text-anchor="middle" letter-spacing="1">AGRICONNECT</text>
  <text x="200" y="235" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="12" font-weight="500" fill="#a7f3d0" text-anchor="middle">Smart Farm Marketplace</text>
</svg>
`);

/**
 * Validates whether an image URL is a safe, loadable string.
 */
export function isValidImageUrl(url: unknown): url is string {
  if (typeof url !== "string") return false;
  const trimmed = url.trim();
  if (!trimmed) return false;
  if (
    trimmed === "undefined" ||
    trimmed === "null" ||
    trimmed === "[object Object]" ||
    trimmed === "NaN" ||
    trimmed.startsWith("javascript:")
  ) {
    return false;
  }
  return true;
}

/**
 * Sanitizes and upgrades URLs (e.g. http -> https, relative paths).
 */
export function sanitizeImageUrl(url: string): string {
  const trimmed = url.trim();
  if (trimmed.startsWith("data:image/")) return trimmed;
  if (trimmed.startsWith("//")) return `https:${trimmed}`;
  if (trimmed.startsWith("http://")) return trimmed.replace(/^http:\/\//i, "https://");
  if (trimmed.startsWith("/") || trimmed.startsWith("./")) return trimmed;
  if (!trimmed.startsWith("http://") && !trimmed.startsWith("https://") && !trimmed.startsWith("/")) {
    if (trimmed.includes(".") && !trimmed.includes(" ")) {
      return `https://${trimmed}`;
    }
  }
  return trimmed;
}

/**
 * Match an Agri Store product by its name or category to a curated photo.
 */
export function getStoreProductImage(productName?: string, category?: string): string {
  if (!productName && !category) return CATEGORY_FALLBACK_IMAGES.default;

  const lowerName = (productName || "").toLowerCase();
  const lowerCat = (category || "").toLowerCase();

  // Try direct keyword matching on product name
  for (const [key, url] of Object.entries(STORE_PRODUCT_IMAGES)) {
    if (lowerName.includes(key)) {
      return url;
    }
  }

  // Token matching on product name
  const tokens = lowerName.split(/[^a-z0-9\u0900-\u097F]+/).filter(Boolean);
  for (const token of tokens) {
    if (token.length >= 3 && STORE_PRODUCT_IMAGES[token]) {
      return STORE_PRODUCT_IMAGES[token];
    }
  }

  // Category fallback
  if (lowerCat && CATEGORY_FALLBACK_IMAGES[lowerCat]) {
    return CATEGORY_FALLBACK_IMAGES[lowerCat];
  }

  return CATEGORY_FALLBACK_IMAGES.default;
}

/**
 * Secondary backup photo for store products.
 */
export function getStoreProductBackupImage(productName?: string, category?: string): string {
  const lowerName = (productName || "").toLowerCase();
  const lowerCat = (category || "").toLowerCase();

  if (lowerName.includes("fertilizer") || lowerName.includes("urea") || lowerName.includes("dap") || lowerName.includes("npk") || lowerName.includes("potash") || lowerCat.includes("fertilizer")) {
    return STORE_PRODUCT_BACKUP_IMAGES.fertilizer;
  }
  if (lowerName.includes("seed") || lowerCat.includes("seed")) {
    return STORE_PRODUCT_BACKUP_IMAGES.seed;
  }
  if (lowerName.includes("pesticide") || lowerName.includes("fungicide") || lowerName.includes("insecticide") || lowerCat.includes("pesticide")) {
    return STORE_PRODUCT_BACKUP_IMAGES.pesticide;
  }
  if (lowerName.includes("spray") || lowerName.includes("tool") || lowerName.includes("drip") || lowerCat.includes("tool")) {
    return STORE_PRODUCT_BACKUP_IMAGES.tool;
  }
  if (lowerName.includes("pump") || lowerName.includes("tiller") || lowerName.includes("tractor") || lowerCat.includes("machinery")) {
    return STORE_PRODUCT_BACKUP_IMAGES.machinery;
  }

  return STORE_PRODUCT_BACKUP_IMAGES.default;
}

/**
 * Get real photograph fallbacks in prioritized sequence.
 */
export function getRealFallbackImage(
  type: "crop" | "product" | "category" | "tractor" | "scheme" | "general" = "general",
  contextName?: string,
  category?: string
): string {
  if (type === "crop") {
    return getCropBackupImage(contextName || "crop");
  }
  if (type === "product") {
    return getStoreProductBackupImage(contextName, category);
  }
  if (type === "category") {
    const cat = (category || contextName || "").toLowerCase();
    return CATEGORY_FALLBACK_IMAGES[cat] || CATEGORY_FALLBACK_IMAGES.default;
  }
  return CATEGORY_FALLBACK_IMAGES.default;
}

/**
 * Master image resolver for AgriConnect.
 * Guarantees a safe, valid, high-resolution agricultural image for any UI component.
 */
export function resolveImageUrl(
  imageSource?: unknown,
  type: "crop" | "product" | "category" | "tractor" | "scheme" | "general" = "general",
  contextName?: string
): string {
  const cacheKey = `${type}:${contextName || ""}:${String(imageSource || "")}`;
  if (RESOLVE_CACHE.has(cacheKey)) {
    return RESOLVE_CACHE.get(cacheKey)!;
  }

  let finalUrl = "";

  // 1. If a valid direct image URL is provided, sanitize and check
  if (isValidImageUrl(imageSource)) {
    finalUrl = sanitizeImageUrl(imageSource);
  } else if (typeof imageSource === "object" && imageSource !== null) {
    // Handle objects with image / imageUrl / url properties
    const obj = imageSource as Record<string, unknown>;
    const extracted =
      obj.imageUrl || obj.image_url || obj.url || obj.src || obj.photo || obj.photo_url || obj.cropImage;
    if (isValidImageUrl(extracted)) {
      finalUrl = sanitizeImageUrl(extracted);
    }
  }

  // 2. If no valid direct URL, resolve by context and type
  if (!finalUrl) {
    if (type === "crop") {
      finalUrl = getCropImage(contextName || "crop");
    } else if (type === "product") {
      finalUrl = getStoreProductImage(contextName);
    } else if (type === "category") {
      const cat = (contextName || "").toLowerCase();
      finalUrl = CATEGORY_FALLBACK_IMAGES[cat] || CATEGORY_FALLBACK_IMAGES.default;
    } else {
      finalUrl = CATEGORY_FALLBACK_IMAGES.default;
    }
  }

  RESOLVE_CACHE.set(cacheKey, finalUrl);
  return finalUrl;
}

/**
 * Normalizes backend product object from any API/DB permutation into uniform UI product format.
 */
export function normalizeApiProductImage(raw: Record<string, unknown>, category?: string): string {
  const possibleFields = [
    raw.imageUrl,
    raw.image_url,
    raw.image,
    raw.thumbnail,
    raw.thumbnail_url,
    raw.images,
    raw.product_image,
    raw.photo,
    raw.photo_url,
  ];

  for (const field of possibleFields) {
    if (Array.isArray(field) && field.length > 0 && isValidImageUrl(field[0])) {
      return sanitizeImageUrl(field[0]);
    }
    if (isValidImageUrl(field)) {
      return sanitizeImageUrl(field);
    }
  }

  // Fallback to name/category matching
  const name = String(raw.name || raw.title || "");
  const cat = String(raw.category || category || "");
  return getStoreProductImage(name, cat);
}
