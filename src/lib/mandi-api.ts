import { invokeEdgeWithTimeout } from "@/lib/invoke-edge";
import { getCropImage, getCropCategory } from "./crop-images";
import { generateSellingAdvice, type SellingAdvice } from "./mandi-advisor";

const CACHE_KEY = "mandi_prices_live_cache_v3";

const DEBUG = import.meta.env.DEV;
const log = (...args: unknown[]) => { if (DEBUG) console.log(...args); };
const warn = (...args: unknown[]) => { if (DEBUG) console.warn(...args); };

export interface MandiPrice {
  id: string;
  crop: string;
  cropHi?: string;
  cropImage: string;
  category: string;
  price: number; // Modal price
  market: string;
  district: string;
  state: string;
  variety?: string;
  minPrice: number;
  maxPrice: number;
  msp?: number;
  unit: string;
  status: "up" | "down" | "stable";
  change: string;
  arrivalDate: string;
  lastUpdatedText: string;
  arrivalQuantity?: number; // In Quintals (only when published by AGMARKNET)
  yesterdayPrice?: number;
  operatingStatus?: "OPEN" | "CLOSED";
  sellingAdvice?: SellingAdvice;
}

export interface MandiResult {
  prices: MandiPrice[];
  source: "edge" | "cache";
  lastUpdated: string;
  isCached?: boolean;
  cachedAtText?: string;
  isError?: boolean;
  errorMessage?: string;
}

export const HINDI_CROP_NAMES: Record<string, string> = {
  Wheat: "गेहूं",
  "Rice (Basmati)": "चावल (बासमती)",
  Rice: "चावल",
  "Paddy(Common)": "धान (सामान्य)",
  Paddy: "धान",
  Maize: "मक्का",
  Soybean: "सोयाबीन",
  Cotton: "कपास",
  Mustard: "सरसों",
  "Gram(Chana)": "चना",
  Gram: "चना",
  Chana: "चना",
  Groundnut: "मूंगफली",
  Onion: "प्याज",
  Potato: "आलू",
  Tomato: "टमाटर",
  Garlic: "लहसुन",
  "Masoor Dal": "मसूर दाल",
  Masoor: "मसूर",
  Sugarcane: "गन्ना",
  Cumin: "जीरा",
  Turmeric: "हल्दी",
  "Red Chilli": "लाल मिर्च",
  Chilli: "मिर्च",
  Coriander: "धनिया",
  Banana: "केला",
  Mango: "आम",
  Cabbage: "पत्ता गोभी",
  Cauliflower: "फूलगोभी",
  "Green Peas": "मटर",
  Carrot: "गाजर",
  Brinjal: "बैंगन",
  "Okra (Bhindi)": "भिंडी",
  Bhindi: "भिंडी",
  Ginger: "अदरक",
  Barley: "जौ",
  Jowar: "ज्वार",
  Bajra: "बाजरा",
  Moong: "मूंग",
  Urad: "उड़द",
  Tur: "अरहर/तुअर",
  Arhar: "अरहर",
  Apple: "सेब",
  Pomegranate: "अनार",
  Papaya: "पपीता",
  Guava: "अमरूद",
  Orange: "संतरा",
  Grapes: "अंगूर",
  Watermelon: "तरबूज",
  Coconut: "नारियल",
  Cardamom: "इलायची",
  Jute: "जूट",
  Tobacco: "तंबाकू",
  Tea: "चाय",
  Coffee: "कॉफ़ी",
};

export const HINGLISH_CROP_NAMES: Record<string, string> = {
  Wheat: "Gehun",
  "Rice (Basmati)": "Basmati Chawal",
  Rice: "Chawal",
  "Paddy(Common)": "Dhan",
  Paddy: "Dhan",
  Maize: "Makka",
  Soybean: "Soyabean",
  Cotton: "Kapas",
  Mustard: "Sarson",
  "Gram(Chana)": "Chana",
  Gram: "Chana",
  Chana: "Chana",
  Groundnut: "Mungfali",
  Onion: "Pyaz",
  Potato: "Aloo",
  Tomato: "Tamatar",
  Garlic: "Lahsun",
  "Masoor Dal": "Masoor Dal",
  Masoor: "Masoor",
  Sugarcane: "Ganna",
  Cumin: "Jeera",
  Turmeric: "Haldi",
  "Red Chilli": "Lal Mirch",
  Chilli: "Mirch",
  Coriander: "Dhaniya",
  Banana: "Kela",
  Mango: "Aam",
  Cabbage: "Patta Gobhi",
  Cauliflower: "Phool Gobhi",
  "Green Peas": "Matar",
  Carrot: "Gajar",
  Brinjal: "Baingan",
  "Okra (Bhindi)": "Bhindi",
  Bhindi: "Bhindi",
  Ginger: "Adrak",
  Barley: "Jau",
  Jowar: "Jowar",
  Bajra: "Bajra",
  Moong: "Moong",
  Urad: "Urad",
  Tur: "Tuvar",
  Arhar: "Arhar",
  Apple: "Seb",
  Pomegranate: "Anaar",
  Papaya: "Papita",
  Guava: "Amrood",
  Orange: "Santra",
  Grapes: "Angoor",
  Watermelon: "Tarbooj",
  Coconut: "Nariyal",
};

/**
 * Official MSP (Minimum Support Price) benchmark values (2025–2026 season).
 * Published by the Government of India. Used only for advice thresholds.
 */
export const MSP_DATA: Record<string, number> = {
  Wheat: 2275,
  "Rice (Basmati)": 2300,
  Rice: 2183,
  "Paddy(Common)": 2183,
  Paddy: 2183,
  Maize: 2090,
  Soybean: 4600,
  Cotton: 6620,
  Mustard: 5650,
  "Gram(Chana)": 5440,
  Gram: 5440,
  Chana: 5440,
  Groundnut: 6377,
  "Masoor Dal": 6425,
  Masoor: 6425,
  Moong: 8558,
  Urad: 6950,
  Tur: 7000,
  Arhar: 7000,
  Barley: 1850,
  Jowar: 3180,
  Bajra: 2500,
  Sugarcane: 340,
};

export function getCropMSP(cropName?: string): number | undefined {
  if (!cropName) return undefined;
  const name = cropName.trim();
  if (MSP_DATA[name]) return MSP_DATA[name];

  const lower = name.toLowerCase();
  for (const [k, v] of Object.entries(MSP_DATA)) {
    if (lower.includes(k.toLowerCase())) return v;
  }
  return undefined;
}

export function normalizeCropKey(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .trim();
}

/**
 * Deduplicates records while preserving varieties (e.g. Red Onion vs White Onion).
 */
function dedupeByRecord(prices: MandiPrice[]): MandiPrice[] {
  const seen = new Map<string, MandiPrice>();
  for (const p of prices) {
    const existing = seen.get(p.id);
    if (!existing || p.price > existing.price) seen.set(p.id, p);
  }
  return Array.from(seen.values());
}

/**
 * Maps a record returned by the mandi-prices edge function (which only emits
 * real AGMARKNET fields) to a MandiPrice. Prices that were not published are
 * mapped to 0 so the UI can show "Not available" instead of an invented number.
 */
function parseEdgeRecord(record: Record<string, unknown>): MandiPrice {
  const crop = String(record.crop ?? record.commodity ?? "").trim();
  const toNum = (v: unknown): number => {
    const n = parseFloat(String(v ?? "").replace(/,/g, ""));
    return Number.isFinite(n) ? n : 0;
  };
  const modalPrice = toNum(record.price ?? record.modalPrice ?? record.modal_price);
  const minPrice = toNum(record.minPrice ?? record.min_price);
  const maxPrice = toNum(record.maxPrice ?? record.max_price);

  const market = String(record.market ?? "").trim();
  const district = String(record.district ?? market ?? "").trim() || "Not specified";
  const state = String(record.state ?? "").trim();
  const variety = String(record.variety ?? "").trim();
  const arrivalDate = String(record.arrivalDate ?? record.arrival_date ?? "").trim();

  // status/change reflect the modal price's position against the real
  // published min/max range for the day — NOT a day-over-day comparison.
  let status: "up" | "down" | "stable" = "stable";
  let change = "0%";
  const range = maxPrice - minPrice;
  if (modalPrice > 0 && range > 0) {
    const position = (modalPrice - minPrice) / range;
    if (position >= 0.7) {
      status = "up";
      change = `+${(((modalPrice - minPrice) / range) * 100).toFixed(0)}%`;
    } else if (position <= 0.3) {
      status = "down";
      change = `-${(((maxPrice - modalPrice) / range) * 100).toFixed(0)}%`;
    }
  }

  const uniqueId = `${crop}::${variety}::${market}::${district}::${state}::${arrivalDate}`.toLowerCase();

  const baseItem: MandiPrice = {
    id: uniqueId,
    crop,
    cropHi: HINDI_CROP_NAMES[crop] || crop,
    cropImage: getCropImage(crop),
    category: getCropCategory(crop),
    price: Math.round(modalPrice),
    market,
    district,
    state,
    variety: variety || undefined,
    minPrice: Math.round(minPrice),
    maxPrice: Math.round(maxPrice),
    msp: getCropMSP(crop),
    unit: "₹/Quintal",
    status,
    change,
    arrivalDate: arrivalDate || "Not available",
    lastUpdatedText: arrivalDate || "Not available",
  };

  if (record.arrivalQuantity !== undefined && Number(record.arrivalQuantity) > 0) {
    baseItem.arrivalQuantity = Math.round(Number(record.arrivalQuantity));
  }
  if (record.operatingStatus === "OPEN" || record.operatingStatus === "CLOSED") {
    baseItem.operatingStatus = record.operatingStatus;
  }

  baseItem.sellingAdvice = generateSellingAdvice(baseItem);
  return baseItem;
}

/**
 * Fetch Mandi prices from Supabase Edge Function gateway (server-side AGMARKNET).
 */
async function fetchFromEdge(
  searchQuery?: string,
  stateFilter?: string,
  districtFilter?: string,
  marketFilter?: string
): Promise<MandiPrice[]> {
  log(`[Mandi Edge Request] query: '${searchQuery || ""}' state: '${stateFilter || ""}' district: '${districtFilter || ""}' market: '${marketFilter || ""}'`);
  try {
    const { data: result, error } = await invokeEdgeWithTimeout("mandi-prices", {
      searchQuery: searchQuery || "",
      state: stateFilter || "",
      district: districtFilter || "",
      market: marketFilter || "",
    });

    if (error) throw error;

    const rawPrices = (result?.prices || []) as Record<string, unknown>[];
    const prices = rawPrices
      .map(parseEdgeRecord)
      .filter((p) => p.crop && p.price > 0);

    const uniquePrices = dedupeByRecord(prices);
    if (uniquePrices.length > 0) {
      uniquePrices.sort((a, b) => b.price - a.price);
      return uniquePrices;
    }
    throw new Error("No published prices returned from edge function");
  } catch (err) {
    console.error("[Mandi Edge Error]:", err);
    throw err;
  }
}

/**
 * Save real mandi prices to localStorage for offline access.
 */
function saveCache(cache: { prices: MandiPrice[]; timestamp: string }): void {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch (e) {
    warn("Failed to write mandi cache to localStorage", e);
  }
}

/**
 * Read cached real mandi prices from localStorage.
 */
function readCache(): { prices: MandiPrice[]; timestamp: string } | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed?.prices)) return null;
    return { prices: parsed.prices, timestamp: parsed.timestamp ?? new Date().toISOString() };
  } catch {
    return null;
  }
}

/**
 * Stores the most recently fetched real dataset so getMandiPriceQuote can
 * answer from genuinely fetched AGMARKNET prices only.
 */
let latestRealPrices: MandiPrice[] = [];

export function setLatestRealPrices(prices: MandiPrice[]): void {
  latestRealPrices = prices;
}

export function getLatestRealPrices(): MandiPrice[] {
  return latestRealPrices;
}

/**
 * Searches and filters a mandi dataset comprehensively.
 * Supports partial names ('gar' -> Garlic), case-insensitivity, Hindi translations, and location names.
 */
export function searchMandiDataset(prices: MandiPrice[], query?: string): MandiPrice[] {
  if (!query || !query.trim()) return prices;
  const q = query.trim().toLowerCase();

  return prices.filter((p) => {
    const matchCrop = p.crop.toLowerCase().includes(q);
    const matchCropHi = p.cropHi ? p.cropHi.toLowerCase().includes(q) : false;
    const matchVariety = p.variety ? p.variety.toLowerCase().includes(q) : false;
    const matchMarket = p.market.toLowerCase().includes(q);
    const matchDistrict = p.district.toLowerCase().includes(q);
    const matchState = p.state.toLowerCase().includes(q);
    const matchCategory = p.category.toLowerCase().includes(q);

    return (
      matchCrop ||
      matchCropHi ||
      matchVariety ||
      matchMarket ||
      matchDistrict ||
      matchState ||
      matchCategory
    );
  });
}

/**
 * Primary function to fetch verified live Mandi prices across India.
 * Never generates fake/dummy prices. If the live edge fails, returns cached
 * response (if any) or a clean honest error state.
 */
export async function fetchMandiPrices(
  searchQuery?: string,
  stateFilter?: string,
  districtFilter?: string,
  marketFilter?: string
): Promise<MandiResult> {
  const nowStr = new Date().toISOString();

  try {
    const livePrices = await fetchFromEdge(searchQuery, stateFilter, districtFilter, marketFilter);
    if (livePrices.length > 0) {
      setLatestRealPrices(livePrices);
      saveCache({ prices: livePrices, timestamp: nowStr });
      log(`[Mandi UI Render] Serving ${livePrices.length} verified live prices from AGMARKNET via edge`);
      return {
        prices: livePrices,
        source: "edge",
        lastUpdated: nowStr,
        isCached: false,
      };
    }
  } catch (err) {
    warn("[Mandi Edge Function Failed] Checking cached live data...", err);
  }

  const cache = readCache();
  if (cache && cache.prices && cache.prices.length > 0) {
    let filtered = cache.prices;
    if (stateFilter && stateFilter.trim()) {
      filtered = filtered.filter((p) => p.state.toLowerCase() === stateFilter.trim().toLowerCase());
    }
    if (districtFilter && districtFilter.trim()) {
      filtered = filtered.filter((p) => p.district.toLowerCase() === districtFilter.trim().toLowerCase());
    }
    if (marketFilter && marketFilter.trim()) {
      filtered = filtered.filter((p) => p.market.toLowerCase() === marketFilter.trim().toLowerCase());
    }
    if (searchQuery && searchQuery.trim()) {
      filtered = searchMandiDataset(filtered, searchQuery);
    }

    const cachedDate = new Date(cache.timestamp);
    const cachedAtText = cachedDate.toLocaleString("en-IN", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });

    log(`[Mandi UI Render] Serving ${filtered.length} cached live prices synced at ${cachedAtText}`);
    return {
      prices: filtered,
      source: "cache",
      lastUpdated: cache.timestamp,
      isCached: true,
      cachedAtText,
    };
  }

  log("[Mandi UI Render] No live data and no cache available — returning honest error state");
  return {
    prices: [],
    source: "cache",
    lastUpdated: nowStr,
    isError: true,
    errorMessage: "Mandi prices are currently unavailable. Please check your connection and try again.",
  };
}

export interface MandiQuoteRequest {
  crop: string;
  mandi?: string | null;
  state?: string | null;
  district?: string | null;
}

export interface MandiQuoteResponse {
  found: boolean;
  needsMandiClarification?: boolean;
  availableMarkets?: string[];
  matchedPrice?: MandiPrice;
  cropName: string;
  cropHi: string;
  marketName: string;
  stateName: string;
  minPrice: number;
  maxPrice: number;
  modalPrice: number;
  msp?: number;
  arrivalDate: string;
  arrivalQuantity?: number;
  messageHi: string;
  messageHinglish: string;
  messageEn: string;
}

/**
 * Structured Mandi Price Retriever for Kisan AI and Local Advisor.
 * Only ever quotes real AGMARKNET prices from the latest fetched dataset or the
 * cached real dataset. Never invents or hallucinates prices.
 */
export function getMandiPriceQuote(req: MandiQuoteRequest, dataset?: MandiPrice[]): MandiQuoteResponse {
  const allPrices = dataset ?? (latestRealPrices.length ? latestRealPrices : readCache()?.prices ?? []);
  const rawCrop = (req.crop || "").trim();
  const rawMandi = (req.mandi || "").trim().toLowerCase();

  const matchingCrops = allPrices.filter((p) => {
    const normReq = normalizeCropKey(rawCrop);
    const normP = normalizeCropKey(p.crop);
    return (
      normReq === normP ||
      p.crop.toLowerCase().includes(rawCrop.toLowerCase()) ||
      rawCrop.toLowerCase().includes(p.crop.toLowerCase()) ||
      (p.cropHi && (p.cropHi.includes(rawCrop) || rawCrop.includes(p.cropHi)))
    );
  });

  if (matchingCrops.length === 0) {
    const cropDisplay = rawCrop.charAt(0).toUpperCase() + rawCrop.slice(1);
    return {
      found: false,
      cropName: cropDisplay,
      cropHi: HINDI_CROP_NAMES[cropDisplay] || cropDisplay,
      marketName: "",
      stateName: "",
      minPrice: 0,
      maxPrice: 0,
      modalPrice: 0,
      arrivalDate: "Not available",
      messageHi: `अभी ${cropDisplay} का लाइव मंडी भाव उपलब्ध नहीं है। कृपया Mandi Bhav टैब देखें।`,
      messageHinglish: `Abhi ${cropDisplay} ka live mandi bhav available nahi hai. Kripya Mandi Bhav tab check karein.`,
      messageEn: `Live mandi rate for ${cropDisplay} is currently unavailable in the database. Please check the Mandi Bhav tab.`,
    };
  }

  if (!rawMandi) {
    const availableMarkets = Array.from(new Set(matchingCrops.map((m) => m.market.replace(/ APMC| Mandi| Market/gi, ""))));
    const firstMatch = matchingCrops[0];
    const cropHi = firstMatch.cropHi || firstMatch.crop;
    const cropEn = firstMatch.crop;
    const cropHinglish = HINGLISH_CROP_NAMES[cropEn] || cropEn;

    return {
      found: true,
      needsMandiClarification: true,
      availableMarkets,
      matchedPrice: firstMatch,
      cropName: cropEn,
      cropHi,
      marketName: firstMatch.market,
      stateName: firstMatch.state,
      minPrice: firstMatch.minPrice,
      maxPrice: firstMatch.maxPrice,
      modalPrice: firstMatch.price,
      msp: firstMatch.msp,
      arrivalDate: firstMatch.arrivalDate,
      arrivalQuantity: firstMatch.arrivalQuantity,
      messageHi: `किस मंडी का **${cropHi} (${cropEn})** का भाव चाहिए? (जैसे: ${availableMarkets.join(", ")})`,
      messageHinglish: `Kaunsi mandi ka **${cropHinglish} (${cropEn})** ka bhav chahiye? (Jaise: ${availableMarkets.join(", ")})`,
      messageEn: `Which mandi's rate do you need for **${cropEn}**? (Options: ${availableMarkets.join(", ")})`,
    };
  }

  let selected = matchingCrops.find((m) => {
    const mkt = m.market.toLowerCase();
    const dst = m.district.toLowerCase();
    const st = m.state.toLowerCase();
    return (
      mkt.includes(rawMandi) ||
      rawMandi.includes(mkt) ||
      dst.includes(rawMandi) ||
      rawMandi.includes(dst) ||
      st.includes(rawMandi)
    );
  });

  if (!selected) {
    selected = matchingCrops[0];
  }

  const cropHi = selected.cropHi || selected.crop;
  const cropEn = selected.crop;
  const cropHinglish = HINGLISH_CROP_NAMES[cropEn] || cropEn;
  const mktName = selected.market;
  const stateName = selected.state;

  const arrivalLine = selected.arrivalDate && selected.arrivalDate !== "Not available"
    ? `\n\n(${selected.arrivalQuantity ? `Arrivals: ${selected.arrivalQuantity} Quintals, ` : ""}Live AGMARKNET rate dated ${selected.arrivalDate})`
    : "";

  return {
    found: true,
    matchedPrice: selected,
    cropName: cropEn,
    cropHi,
    marketName: mktName,
    stateName,
    minPrice: selected.minPrice,
    maxPrice: selected.maxPrice,
    modalPrice: selected.price,
    msp: selected.msp,
    arrivalDate: selected.arrivalDate,
    arrivalQuantity: selected.arrivalQuantity,
    messageHi: `📍 **${cropHi} (${cropEn})** — ${mktName} (${stateName})\n\n• न्यूनतम भाव: **₹${selected.minPrice.toLocaleString("en-IN")}/क्विंटल**\n• अधिकतम भाव: **₹${selected.maxPrice.toLocaleString("en-IN")}/क्विंटल**\n• मॉडल (औसत) भाव: **₹${selected.price.toLocaleString("en-IN")}/क्विंटल**${selected.msp ? `\n• सरकारी MSP: **₹${selected.msp.toLocaleString("en-IN")}/क्विंटल**` : ""}${arrivalLine}`,
    messageHinglish: `📍 **${cropHinglish} (${cropEn})** — ${mktName} (${stateName})\n\n• Minimum: **₹${selected.minPrice.toLocaleString("en-IN")}/quintal**\n• Maximum: **₹${selected.maxPrice.toLocaleString("en-IN")}/quintal**\n• Modal (Avg) Bhav: **₹${selected.price.toLocaleString("en-IN")}/quintal**${selected.msp ? `\n• Govt MSP: **₹${selected.msp.toLocaleString("en-IN")}/quintal**` : ""}${arrivalLine}`,
    messageEn: `📍 **${cropEn}** — ${mktName} (${stateName})\n\n• Minimum Price: **₹${selected.minPrice.toLocaleString("en-IN")}/quintal**\n• Maximum Price: **₹${selected.maxPrice.toLocaleString("en-IN")}/quintal**\n• Modal (Average) Price: **₹${selected.price.toLocaleString("en-IN")}/quintal**${selected.msp ? `\n• Govt MSP: **₹${selected.msp.toLocaleString("en-IN")}/quintal**` : ""}${arrivalLine}`,
  };
}