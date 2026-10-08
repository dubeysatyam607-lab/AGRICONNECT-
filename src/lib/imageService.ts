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
  "cumin": ["cumin seeds", "jeera", "jeera seeds", "cumin seed", "जीरा", "જીરું", "ਜੀਰਾ", "சீரகம்", "జీలకర్ర", "జీలకర్ర", "ಜೀರಿಗೆ", "জিরা", "ଜିରା"],
  "coriander": ["coriander seeds", "dhaniya seeds", "dhania seed", "corriander seed", "धनिया", "ધાણા", "ਧਨੀਆ", "கொத்தமல்லி", "ధనియాలు", "కొత్తిమీర", "ಕೊತ್ತಂಬರಿ", "ধনে", "ଧନିଆ"],
  "black gram": ["black gram", "urad dal", "urad beans", "urd bean", "urad", "urd", "उड़द", "उरद", "અડદ", "ਅੜਦ", "உளுந்து", "మినుములు", "మినుము", "ಉದ್ದಿನ ಬೇಳೆ", "কলাই", "মাষকলাই", "ବିରି"],
  "green gram": ["green gram", "moong dal", "mung beans", "moong", "mung", "मूंग", "ਮੂੰਗ", "મગ", "பாசிப்பயறு", "பாசிப்பயரு", "పెసర్లు", "పెసర", "ಹೆಸರು ಬೇಳೆ", "মুগ", "ମୁଗ"],
  "pigeon pea": ["pigeon pea", "toor dal", "arhar dal", "tur dal", "arhar", "toor", "tur", "अरहर", "तुअर", "તૂવેર", "துவரை", "కందులు", "కంది", "ತೊಗರಿ ಬೇಳೆ", "অড়হর", "ହରଡ଼"],
  "peas": ["green peas", "matar", "pea", "मटर", "વટાણા", "ਮਟਰ", "பட்டாணி", "బటాణీలు", "బటాణీ", "பட்டாணி", "பட்டாணி", "பட்டாணி", "ಬಟಾಣಿ", "মটরশুঁটি", "ମଟର"],
  "garlic": ["garlic bulbs", "lahsun", "lasun", "लहसुन", "લસણ", "ਲਸਣ", "பூண்டு", "వెల్లుల్లి", "ಬೆಳ್ಳுಳ್ಳಿ", "রসুন", "ରସୁଣ"],
  "ginger": ["fresh ginger", "adrak", "अदरक", "આદુ", "ਅਦਰਕ", "இஞ்சி", "అల్లం", "ಶುಂಠಿ", "আদা", "ଅଦା"],
  "turmeric": ["turmeric roots", "haldi", "हल्दी", "હળદર", "ਹਲਦੀ", "மஞ்சள்", "పసుపు", "అరసన", "ಅರಿಶಿನ", "হলুদ", "ହଳଦୀ"],
  "chilli": ["red chilli peppers", "mirch", "mirchi", "मिर्च", "મરચું", "ਮਿਰਚ", "மிளகாய்", "మిరపకాయ", "మిర్చి", "మెణసినకాయి", "মরিচ", "ଲଙ୍କା"],
  "potato": ["fresh potatoes", "aloo", "alu", "आलू", "બટાટા", "ਆਲੂ", "உருளைக்கிழங்கு", "బంగాళాదుంప", "ఆలు", "ಆಲೂಗಡ್ಡೆ", "আলু", "ଆଳୁ"],
  "onion": ["red onions", "pyaj", "pyaaz", "kanda", "प्याज", "કાંદા", "ડુંગળી", "ਪਿਆਜ਼", "வெங்காயம்", "ఉల్లిపాయ", "ఉల్లి", "ಈರುಳ್ಳಿ", "পিঁয়াজ", "ପିଆଜ"],
  "tomato": ["fresh red tomatoes", "tamatar", "टमाटर", "ટમેટા", "ਟਮਾਟਰ", "தக்காளி", "టమాటో", "టమాటా", "ಟೊಮೆಟೊ", "টোমেটো", "ଟମାଟୋ"],
  "wheat": ["wheat grains", "gehu", "gehun", "गेहूं", "गेहू", "ઘઉં", "ਕਣਕ", "கோதுமை", "గోధుమలు", "గోధుమ", "ಗೋಧಿ", "গম", "ଗହମ"],
  "rice": ["white rice grains", "paddy", "chawal", "dhan", "चावल", "धान", "ચોખા", "ડાંગર", "ਚੌਲ", "அரிசி", "వరి", "బియ్యం", "అన్నం", "ಅಕ್ಕಿ", "চাল", "ଧାନ"],
  "soybean": ["soybean seeds", "soya", "soyabean", "सोयाबीन", "સોયાબીન", "ਸੋยาਬੀਨ", "சோயாபீன்ஸ்", "సోయాబీన్", "ಸೋಯಾಬೀನ್", "সোয়াবিন", "ସୋୟାବିନ୍"],
  "cotton": ["cotton crop", "kapas", "कपास", "કપાસ", "ਕਪਾਹ", "பருத்தி", "పత్తి", "హత్తి", "ಹತ್ತি", "তুলা", "କପା"],
  "mustard": ["mustard seeds", "sarson", "sarso", "rai", "सरसों", "राई", "રાઈ", "ਸਰ੍ਹੋਂ", "கடுகு", "ఆవాలు", "సాంబారు", "ಸಾಸಿವೆ", "সরিষা", "ସୋରିଷ"],
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

const IOT_DEFAULT_IMAGE =
  "https://images.pexels.com/photos/129731/pexels-photo-129731.jpeg?auto=compress&cs=tinysrgb&dpr=1&fit=crop&h=627&w=940";

/**
 * Real agricultural photograph for IoT / smart-farming surfaces
 * (sensor dashboards, hardware empty states, setup guides).
 */
export function getIoTImage(options?: { name?: string }): string {
  const name = (options?.name || "").toLowerCase();
  if (name.includes("sensor") || name.includes("irrigation")) {
    return getCropImage("wheat") || IOT_DEFAULT_IMAGE;
  }
  if (name.includes("tractor") || name.includes("machine")) {
    return getMachineImage(name, "tractor");
  }
  return IOT_DEFAULT_IMAGE;
}

/** Real tractor photograph (alias of the machinery registry). */
export function getTractorImage(name?: string): string {
  return getMachineImage(name || "tractor", "tractor");
}

/** Real mandi / market photograph (alias of the crop registry + verified default). */
export function getMandiImage(name?: string): string {
  const resolved = getCropImage(name);
  return resolved || CATEGORY_CROP_IMAGES.default;
}

export default getRelevantImage;
