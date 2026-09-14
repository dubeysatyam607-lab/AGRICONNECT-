/**
 * Centralized Agricultural Image Service for AgriConnect.
 * Unified Image Resolution Engine powering Mandi crops, Agri Store products,
 * Machinery, Livestock, Soil Testing, Schemes, and Marketplace listings.
 */

import { getCropImage, getCropCategory, CATEGORY_CROP_IMAGES } from "./crop-images";
import { getMachineImage, MACHINE_IMG } from "./machine-images";
import { getCattleImage, CATTLE_IMAGE_MAP } from "./cattle-images";
import { STORE_PRODUCT_IMAGES, CATEGORY_FALLBACK_IMAGES, OFFLINE_AGRI_SVG, isValidImageUrl, sanitizeImageUrl } from "./image-resolver";

export type EntityType =
  | "crop"
  | "mandi"
  | "vegetable"
  | "fruit"
  | "pulse"
  | "spice"
  | "oilseed"
  | "commercial_crop"
  | "product"
  | "fertilizer"
  | "seed"
  | "pesticide"
  | "machinery"
  | "tractor"
  | "harvester"
  | "rotavator"
  | "seeder"
  | "cultivator"
  | "sprayer"
  | "cattle"
  | "cow"
  | "buffalo"
  | "goat"
  | "labour"
  | "soil_testing"
  | "government_scheme"
  | "weather"
  | "marketplace"
  | "farmer"
  | "general";

export interface RelevantImageOptions {
  entityType?: EntityType;
  name?: string;
  category?: string;
  aliases?: string[];
  language?: string;
  location?: string;
  src?: unknown;
  fallbackUrl?: string;
}

const ALIAS_DICTIONARY: Record<string, string[]> = {
  "cumin": ["cumin seeds", "jeera", "jeera seeds", "cumin seed"],
  "coriander": ["coriander seeds", "dhaniya seeds", "dhania seed", "corriander seed"],
  "black gram": ["black gram", "urad dal", "urad beans", "urd bean"],
  "green gram": ["green gram", "moong dal", "mung beans", "moong"],
  "pigeon pea": ["pigeon pea", "toor dal", "arhar dal", "tur dal"],
  "peas": ["green peas", "matar", "pea"],
  "garlic": ["garlic bulbs", "lahsun", "lasun"],
  "ginger": ["fresh ginger", "adrak"],
  "turmeric": ["turmeric roots", "haldi"],
  "chilli": ["red chilli peppers", "mirch", "mirchi"],
  "potato": ["fresh potatoes", "aloo", "alu"],
  "onion": ["red onions", "pyaj", "pyaaz", "kanda"],
  "tomato": ["fresh red tomatoes", "tamatar"],
  "wheat": ["wheat grains", "gehu", "gehun"],
  "rice": ["white rice grains", "paddy", "chawal", "dhan"],
  "soybean": ["soybean seeds", "soya"],
  "cotton": ["cotton crop", "kapas"],
  "mustard": ["mustard seeds", "sarson", "sarso", "rai"],
};

/**
 * Normalizes input name and returns canonical search query.
 */
export function normalizeEntityName(name?: string): string {
  if (!name) return "";
  const clean = name
    .toLowerCase()
    .replace(/\([^)]*\)/g, " ")
    .replace(/[^\p{L}\p{M}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();

  // Alias dictionary lookup
  for (const [canonical, aliases] of Object.entries(ALIAS_DICTIONARY)) {
    if (clean === canonical || aliases.some((a) => clean.includes(a))) {
      return canonical;
    }
  }

  return clean;
}

/**
 * Synchronously resolves a verified, high-resolution real photograph for any agricultural entity.
 * Priority:
 * 1. Direct valid user/seller uploaded URL
 * 2. Exact crop / machinery / product / cattle photograph from master registry
 * 3. Exact Category photograph fallback
 * 4. General real agriculture photography fallback
 */
export function getRelevantImage(options: RelevantImageOptions): string {
  const { entityType = "general", name = "", category = "", src, fallbackUrl } = options;

  // 1. Direct user/seller uploaded valid URL
  if (isValidImageUrl(src)) {
    return sanitizeImageUrl(src as string);
  }
  if (typeof src === "object" && src !== null) {
    const obj = src as Record<string, unknown>;
    const extracted = obj.imageUrl || obj.image_url || obj.url || obj.src || obj.photo || obj.photo_url;
    if (isValidImageUrl(extracted)) {
      return sanitizeImageUrl(extracted as string);
    }
  }

  const normalized = normalizeEntityName(name || category);

  // 2. Type-specific photographic resolution
  if (
    entityType === "crop" ||
    entityType === "mandi" ||
    entityType === "vegetable" ||
    entityType === "fruit" ||
    entityType === "pulse" ||
    entityType === "spice" ||
    entityType === "oilseed" ||
    entityType === "commercial_crop"
  ) {
    const cropImg = getCropImage(normalized || name || category);
    if (cropImg) return cropImg;
  }

  if (
    entityType === "machinery" ||
    entityType === "tractor" ||
    entityType === "harvester" ||
    entityType === "rotavator" ||
    entityType === "seeder" ||
    entityType === "cultivator" ||
    entityType === "sprayer"
  ) {
    return getMachineImage(normalized || name, entityType);
  }

  if (entityType === "cattle" || entityType === "cow" || entityType === "buffalo" || entityType === "goat") {
    return getCattleImage(normalized || name || entityType);
  }

  if (entityType === "product" || entityType === "fertilizer" || entityType === "seed" || entityType === "pesticide") {
    const prodKey = normalized || name.toLowerCase();
    if (STORE_PRODUCT_IMAGES[prodKey]) return STORE_PRODUCT_IMAGES[prodKey];
    for (const [k, url] of Object.entries(STORE_PRODUCT_IMAGES)) {
      if (prodKey.includes(k)) return url;
    }
    const catKey = (category || entityType).toLowerCase();
    if (CATEGORY_FALLBACK_IMAGES[catKey]) return CATEGORY_FALLBACK_IMAGES[catKey];
  }

  if (entityType === "soil_testing") {
    return "https://images.pexels.com/photos/8851253/pexels-photo-8851253.jpeg?auto=compress&cs=tinysrgb&dpr=1&fit=crop&h=627&w=940";
  }

  if (entityType === "government_scheme") {
    return "https://images.pexels.com/photos/36678256/pexels-photo-36678256.jpeg?auto=compress&cs=tinysrgb&dpr=1&fit=crop&h=627&w=940";
  }

  if (entityType === "farmer" || entityType === "labour") {
    return "https://images.pexels.com/photos/36678256/pexels-photo-36678256.jpeg?auto=compress&cs=tinysrgb&dpr=1&fit=crop&h=627&w=940";
  }

  // 3. Category Fallback
  const cat = (category || name || "").toLowerCase();
  if (CATEGORY_FALLBACK_IMAGES[cat]) return CATEGORY_FALLBACK_IMAGES[cat];

  // 4. Custom fallback or default high-resolution photography
  return fallbackUrl || CATEGORY_CROP_IMAGES.default;
}

export default getRelevantImage;
