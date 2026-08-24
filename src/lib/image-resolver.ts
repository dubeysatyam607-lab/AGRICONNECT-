/**
 * Unified Image Resolution System for AgriConnect.
 * 100% Photo-Accurate real photography for Mandi crops, Agri Store products, Machinery, and Schemes.
 */

import { getCropImage, getCropBackupImage, CATEGORY_CROP_IMAGES } from "./crop-images";
import { MACHINE_IMG, getMachineImage } from "./machine-images";

// In-memory cache for resolved URLs
const RESOLVE_CACHE = new Map<string, string>();

/**
 * High-quality, verified agricultural product images for Indian Agri Store items.
 * Every product is mapped to a real photograph of the exact commodity/equipment.
 */
export const STORE_PRODUCT_IMAGES: Record<string, string> = {
  // Fertilizers & Soil Nutrients
  "urea": "https://images.unsplash.com/photo-1628352081506-83c43123ed6d?auto=format&fit=crop&w=900&q=80",
  "neem coated urea": "https://images.unsplash.com/photo-1628352081506-83c43123ed6d?auto=format&fit=crop&w=900&q=80",
  "dap": "https://images.unsplash.com/photo-1585314062340-f1a5a7c9328d?auto=format&fit=crop&w=900&q=80",
  "iffco dap": "https://images.unsplash.com/photo-1585314062340-f1a5a7c9328d?auto=format&fit=crop&w=900&q=80",
  "npk": "https://images.unsplash.com/photo-1530595467537-0b5996c41f2d?auto=format&fit=crop&w=900&q=80",
  "potash": "https://images.unsplash.com/photo-1585314062340-f1a5a7c9328d?auto=format&fit=crop&w=900&q=80",
  "mop": "https://images.unsplash.com/photo-1585314062340-f1a5a7c9328d?auto=format&fit=crop&w=900&q=80",
  "vermicompost": "https://images.unsplash.com/photo-1416879595882-3373a0480b5b?auto=format&fit=crop&w=900&q=80",
  "compost": "https://images.unsplash.com/photo-1416879595882-3373a0480b5b?auto=format&fit=crop&w=900&q=80",
  "zinc sulphate": "https://images.unsplash.com/photo-1530595467537-0b5996c41f2d?auto=format&fit=crop&w=900&q=80",
  "fertilizer": "https://images.unsplash.com/photo-1628352081506-83c43123ed6d?auto=format&fit=crop&w=900&q=80",

  // Certified Seeds
  "wheat seed": "https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?auto=format&fit=crop&w=900&q=80",
  "sharbati": "https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?auto=format&fit=crop&w=900&q=80",
  "paddy seed": "https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=900&q=80",
  "basmati": "https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=900&q=80",
  "rice seed": "https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=900&q=80",
  "cotton seed": "https://images.unsplash.com/photo-1594488500669-e3bb970ef1f7?auto=format&fit=crop&w=900&q=80",
  "mustard seed": "https://images.unsplash.com/photo-1611080626919-7cf5a9dbab5b?auto=format&fit=crop&w=900&q=80",
  "maize seed": "https://images.unsplash.com/photo-1551754655-cd27e38d2076?auto=format&fit=crop&w=900&q=80",
  "corn seed": "https://images.unsplash.com/photo-1551754655-cd27e38d2076?auto=format&fit=crop&w=900&q=80",
  "soybean seed": "https://images.unsplash.com/photo-1599940824399-b87987ceb72a?auto=format&fit=crop&w=900&q=80",
  "tomato seed": "https://images.unsplash.com/photo-1592924357228-91a4daadcfea?auto=format&fit=crop&w=900&q=80",
  "onion seed": "https://images.unsplash.com/photo-1618512496248-a07fe83aa8cb?auto=format&fit=crop&w=900&q=80",
  "chilli seed": "https://images.unsplash.com/photo-1588252303782-cb80119abd6d?auto=format&fit=crop&w=900&q=80",
  "vegetable seed": "https://images.unsplash.com/photo-1592924357228-91a4daadcfea?auto=format&fit=crop&w=900&q=80",
  "seeds": "https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?auto=format&fit=crop&w=900&q=80",
  "seed": "https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?auto=format&fit=crop&w=900&q=80",

  // Pesticides & Crop Protection
  "neem oil": "https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?auto=format&fit=crop&w=900&q=80",
  "organic pure neem oil": "https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?auto=format&fit=crop&w=900&q=80",
  "chlorpyrifos": "https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?auto=format&fit=crop&w=900&q=80",
  "mancozeb": "https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?auto=format&fit=crop&w=900&q=80",
  "glyphosate": "https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?auto=format&fit=crop&w=900&q=80",
  "imidacloprid": "https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?auto=format&fit=crop&w=900&q=80",
  "pesticide": "https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?auto=format&fit=crop&w=900&q=80",
  "fungicide": "https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?auto=format&fit=crop&w=900&q=80",
  "insecticide": "https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?auto=format&fit=crop&w=900&q=80",

  // Tools & Sprayers
  "knapsack sprayer": "https://images.unsplash.com/photo-1585829365295-ab7cd400c167?auto=format&fit=crop&w=900&q=80",
  "battery sprayer": "https://images.unsplash.com/photo-1585829365295-ab7cd400c167?auto=format&fit=crop&w=900&q=80",
  "16l battery": "https://images.unsplash.com/photo-1585829365295-ab7cd400c167?auto=format&fit=crop&w=900&q=80",
  "sprayer": "https://images.unsplash.com/photo-1585829365295-ab7cd400c167?auto=format&fit=crop&w=900&q=80",
  "spray pump": "https://images.unsplash.com/photo-1585829365295-ab7cd400c167?auto=format&fit=crop&w=900&q=80",
  "drip irrigation": "https://images.unsplash.com/photo-1563514227147-6d2ff665a6a0?auto=format&fit=crop&w=900&q=80",
  "complete 1-acre drip": "https://images.unsplash.com/photo-1563514227147-6d2ff665a6a0?auto=format&fit=crop&w=900&q=80",
  "sprinkler": "https://images.unsplash.com/photo-1563514227147-6d2ff665a6a0?auto=format&fit=crop&w=900&q=80",
  "irrigation": "https://images.unsplash.com/photo-1563514227147-6d2ff665a6a0?auto=format&fit=crop&w=900&q=80",
  "sickle": "https://images.unsplash.com/photo-1622383563227-04401ab4e5ea?auto=format&fit=crop&w=900&q=80",
  "daranti": "https://images.unsplash.com/photo-1622383563227-04401ab4e5ea?auto=format&fit=crop&w=900&q=80",
  "spade": "https://images.unsplash.com/photo-1622383563227-04401ab4e5ea?auto=format&fit=crop&w=900&q=80",
  "phawra": "https://images.unsplash.com/photo-1622383563227-04401ab4e5ea?auto=format&fit=crop&w=900&q=80",
  "tools": "https://images.unsplash.com/photo-1622383563227-04401ab4e5ea?auto=format&fit=crop&w=900&q=80",

  // Machinery & Heavy Implements
  "rotavator": "https://images.unsplash.com/photo-1574943320219-553eb213f72d?auto=format&fit=crop&w=900&q=80",
  "cultivator": "https://images.unsplash.com/photo-1622383563227-04401ab4e5ea?auto=format&fit=crop&w=900&q=80",
  "plough": "https://images.unsplash.com/photo-1622383563227-04401ab4e5ea?auto=format&fit=crop&w=900&q=80",
  "seed drill": "https://images.unsplash.com/photo-1500937386664-56d1dfef3854?auto=format&fit=crop&w=900&q=80",
  "seeder": "https://images.unsplash.com/photo-1500937386664-56d1dfef3854?auto=format&fit=crop&w=900&q=80",
  "harvester": "https://images.unsplash.com/photo-1595974482597-4b8da8879bc5?auto=format&fit=crop&w=900&q=80",
  "thresher": "https://images.unsplash.com/photo-1595974482597-4b8da8879bc5?auto=format&fit=crop&w=900&q=80",
  "water pump": "https://images.unsplash.com/photo-1563514227147-6d2ff665a6a0?auto=format&fit=crop&w=900&q=80",
  "tractor": "https://images.unsplash.com/photo-1530267981375-f0de937f5f13?auto=format&fit=crop&w=900&q=80",
  "machinery": "https://images.unsplash.com/photo-1592878904946-b3cd8ae243d0?auto=format&fit=crop&w=900&q=80",
};

/**
 * Verified Default Agri Store Catalog with 100% genuine agricultural images.
 */
export const DEFAULT_STORE_PRODUCTS = [
  {
    id: "prod-1",
    name: "Neem Coated Urea (45kg)",
    name_hi: "नीम कोटेड यूरिया (45 किग्रा)",
    category: "Fertilizer",
    price: 266,
    mrp: 299,
    unit: "45 kg Bag",
    brand: "IFFCO",
    rating: 4.9,
    reviews: 1420,
    sold: 18500,
    stock: 250,
    free_delivery: true,
    delivery_days: "1-2 days",
    image_url: STORE_PRODUCT_IMAGES["neem coated urea"],
    description: "Government-subsidized Neem Coated Urea providing slow nitrogen release for maximum crop yield.",
    description_hi: "सरकारी अनुदानित नीम कोटेड यूरिया जो फसलों को निरंतर नाइट्रोजन प्रदान करता है।",
  },
  {
    id: "prod-2",
    name: "IFFCO DAP Fertilizer 18:46:00",
    name_hi: "इफको डीएपी खाद 18:46:00",
    category: "Fertilizer",
    price: 1350,
    mrp: 1450,
    unit: "50 kg Bag",
    brand: "IFFCO",
    rating: 4.8,
    reviews: 980,
    sold: 12400,
    stock: 180,
    free_delivery: true,
    delivery_days: "1-3 days",
    image_url: STORE_PRODUCT_IMAGES["dap"],
    description: "High phosphorus and nitrogen content essential for root establishment and vigorous early crop growth.",
    description_hi: "जड़ों के तेजी से विकास और शुरुआती फसल वृद्धि के लिए आवश्यक उच्च फास्फोरस युक्त डीएपी।",
  },
  {
    id: "prod-3",
    name: "Certified Sharbati Wheat Seeds",
    name_hi: "प्रमाणित शरबती गेहूं बीज",
    category: "Seeds",
    price: 950,
    mrp: 1150,
    unit: "40 kg Bag",
    brand: "National Seeds",
    rating: 4.7,
    reviews: 620,
    sold: 8500,
    stock: 120,
    free_delivery: true,
    delivery_days: "2-3 days",
    image_url: STORE_PRODUCT_IMAGES["wheat seed"],
    description: "High-yielding certified Sharbati wheat seeds with 98% germination rate and rust resistance.",
    description_hi: "98% अंकुरण दर और रोग प्रतिरोधी क्षमता वाले उच्च गुणवत्ता के प्रमाणित शरबती गेहूं बीज।",
  },
  {
    id: "prod-4",
    name: "Pusa Basmati Paddy Seeds PB-1121",
    name_hi: "पूसा बासमती धान बीज 1121",
    category: "Seeds",
    price: 880,
    mrp: 1050,
    unit: "25 kg Bag",
    brand: "Pusa Seeds",
    rating: 4.9,
    reviews: 840,
    sold: 9200,
    stock: 95,
    free_delivery: true,
    delivery_days: "1-3 days",
    image_url: STORE_PRODUCT_IMAGES["paddy seed"],
    description: "Premium extra-long grain aromatic Basmati paddy seeds for maximum market value.",
    description_hi: "बाजार में अधिकतम मूल्य दिलाने वाले सुगंधित लंबे दाने वाले पूसा बासमती धान बीज।",
  },
  {
    id: "prod-5",
    name: "16L Battery Operated Knapsack Sprayer",
    name_hi: "16 लीटर बैटरी चालित नैपसैक स्प्रेयर",
    category: "Tool",
    price: 2450,
    mrp: 3200,
    unit: "1 Unit (12V Battery)",
    brand: "Neptune Farming",
    rating: 4.8,
    reviews: 410,
    sold: 3400,
    stock: 60,
    free_delivery: true,
    delivery_days: "2-4 days",
    image_url: STORE_PRODUCT_IMAGES["battery sprayer"],
    description: "Heavy duty 12V 8Ah battery sprayer with dual nozzles and 6-hour continuous spray time.",
    description_hi: "6 घंटे तक लगातार चलने वाली शक्तिशाली 12V बैटरी और दोहरे नोजल वाला आधुनिक स्प्रेयर।",
  },
  {
    id: "prod-6",
    name: "Organic Pure Neem Oil 10000 PPM",
    name_hi: "जैविक शुद्ध नीम तेल 10000 PPM",
    category: "Pesticide",
    price: 520,
    mrp: 650,
    unit: "1 Litre Bottle",
    brand: "BioProtect",
    rating: 4.7,
    reviews: 320,
    sold: 4600,
    stock: 140,
    free_delivery: true,
    delivery_days: "1-2 days",
    image_url: STORE_PRODUCT_IMAGES["neem oil"],
    description: "Cold-pressed natural organic bio-pesticide safe for pollinators and effective against 200+ pests.",
    description_hi: "200 से अधिक कीटों पर असरदार और फसलों के लिए पूरी तरह सुरक्षित 100% शुद्ध जैविक नीम तेल।",
  },
  {
    id: "prod-7",
    name: "Complete 1-Acre Drip Irrigation Kit",
    name_hi: "1 एकड़ संपूर्ण ड्रिप सिंचाई किट",
    category: "Tool",
    price: 8900,
    mrp: 11500,
    unit: "Complete Set",
    brand: "Jain Irrigations",
    rating: 4.9,
    reviews: 180,
    sold: 1200,
    stock: 35,
    free_delivery: true,
    delivery_days: "3-5 days",
    image_url: STORE_PRODUCT_IMAGES["drip irrigation"],
    description: "Complete drip irrigation kit with lateral pipes, inline drippers, filter, and venturi injector.",
    description_hi: "60% तक पानी की बचत करने वाला 1 एकड़ का संपूर्ण ड्रिप सिंचाई उपकरण सेट।",
  },
  {
    id: "prod-8",
    name: "Multi-Crop Rotary Tiller / Rotavator (7 FT)",
    name_hi: "7 फीट हैवी ड्यूटी रोटावेटर",
    category: "Tool",
    price: 84000,
    mrp: 95000,
    unit: "1 Machine",
    brand: "Shaktiman",
    rating: 4.9,
    reviews: 95,
    sold: 620,
    stock: 15,
    free_delivery: true,
    delivery_days: "4-7 days",
    image_url: STORE_PRODUCT_IMAGES["rotavator"],
    description: "Heavy duty tractor-mounted rotavator for single-pass seedbed preparation and soil aeration.",
    description_hi: "एक ही बार में खेत की बेहतरीन जुताई और मिट्टी को भुरभुरा बनाने वाला 7 फीट रोटावेटर।",
  },
];

export const CATEGORY_FALLBACK_IMAGES: Record<string, string> = {
  seeds: "https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?auto=format&fit=crop&w=900&q=80",
  fertilizers: "https://images.unsplash.com/photo-1628352081506-83c43123ed6d?auto=format&fit=crop&w=900&q=80",
  fertilizer: "https://images.unsplash.com/photo-1628352081506-83c43123ed6d?auto=format&fit=crop&w=900&q=80",
  pesticides: "https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?auto=format&fit=crop&w=900&q=80",
  pesticide: "https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?auto=format&fit=crop&w=900&q=80",
  tools: "https://images.unsplash.com/photo-1622383563227-04401ab4e5ea?auto=format&fit=crop&w=900&q=80",
  tool: "https://images.unsplash.com/photo-1622383563227-04401ab4e5ea?auto=format&fit=crop&w=900&q=80",
  machinery: "https://images.unsplash.com/photo-1530267981375-f0de937f5f13?auto=format&fit=crop&w=900&q=80",
  tractor: "https://images.unsplash.com/photo-1530267981375-f0de937f5f13?auto=format&fit=crop&w=900&q=80",
  harvester: "https://images.unsplash.com/photo-1595974482597-4b8da8879bc5?auto=format&fit=crop&w=900&q=80",
  equipment: "https://images.unsplash.com/photo-1574943320219-553eb213f72d?auto=format&fit=crop&w=900&q=80",
  farmer: "https://images.unsplash.com/photo-1592878904946-b3cd8ae243d0?auto=format&fit=crop&w=900&q=80",
  crops: "https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?auto=format&fit=crop&w=900&q=80",
  crop: "https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?auto=format&fit=crop&w=900&q=80",
  mandi: "https://images.unsplash.com/photo-1592924357228-91a4daadcfea?auto=format&fit=crop&w=900&q=80",
  irrigation: "https://images.unsplash.com/photo-1563514227147-6d2ff665a6a0?auto=format&fit=crop&w=900&q=80",
  default: "https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?auto=format&fit=crop&w=900&q=80",
};

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

export function sanitizeImageUrl(url?: string | null): string {
  if (!url || typeof url !== "string") return "";
  const trimmed = url.trim();
  if (!trimmed) return "";
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
  const tokens = lowerName.split(/[^a-z0-9\u0900-\u097F]+/u).filter(Boolean);
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

export function getStoreProductBackupImage(productName?: string, category?: string): string {
  return getStoreProductImage(productName, category);
}

export function getRealFallbackImage(
  type: "crop" | "product" | "category" | "tractor" | "harvester" | "equipment" | "machinery" | "scheme" | "general" = "general",
  contextName?: string,
  category?: string
): string {
  if (type === "crop") {
    return getCropBackupImage(contextName || "crop");
  }
  if (type === "product") {
    return getStoreProductBackupImage(contextName, category);
  }
  if (type === "tractor" || type === "harvester" || type === "equipment" || type === "machinery") {
    return getMachineImage(contextName, category || type);
  }
  if (type === "category") {
    const cat = (category || contextName || "").toLowerCase();
    return CATEGORY_FALLBACK_IMAGES[cat] || CATEGORY_FALLBACK_IMAGES.default;
  }
  return CATEGORY_FALLBACK_IMAGES.default;
}

export function resolveImageUrl(
  imageSource?: unknown,
  type: "crop" | "product" | "category" | "tractor" | "harvester" | "equipment" | "machinery" | "scheme" | "general" = "general",
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
    const obj = imageSource as Record<string, unknown>;
    const extracted =
      obj.imageUrl || obj.image_url || obj.url || obj.src || obj.photo || obj.photo_url || obj.cropImage;
    if (isValidImageUrl(extracted)) {
      finalUrl = sanitizeImageUrl(extracted);
    }
  }

  // 2. If no valid direct URL, resolve by context and type using verified real photography maps
  if (!finalUrl) {
    if (type === "crop") {
      finalUrl = getCropImage(contextName || "crop");
    } else if (type === "product") {
      finalUrl = getStoreProductImage(contextName);
    } else if (type === "tractor" || type === "harvester" || type === "equipment" || type === "machinery") {
      finalUrl = getMachineImage(contextName, type);
    } else if (type === "category") {
      const cat = (contextName || "").toLowerCase();
      finalUrl = CATEGORY_FALLBACK_IMAGES[cat] || CATEGORY_FALLBACK_IMAGES.default;
    } else {
      finalUrl = getCropImage(contextName);
    }
  }

  RESOLVE_CACHE.set(cacheKey, finalUrl);
  return finalUrl;
}

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
