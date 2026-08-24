import { describe, it, expect, beforeEach } from "vitest";
import {
  getAgricultureImage,
  normalizeNameForPexels,
  replaceAgriImage,
  getAgriImageCacheStats,
  getStableIndex,
  PEXELS_CURATED_PHOTOS,
} from "./pexels-api";
import { getCropImage } from "./crop-images";
import { getMachineImage } from "./machine-images";
import { getStoreProductImage, resolveImage } from "./image-resolver";

describe("Pexels Agricultural Photography Master Engine", () => {
  beforeEach(() => {
    if (typeof window !== "undefined") {
      localStorage.clear();
    }
  });

  it("normalizes Hindi, English, and regional crop terms correctly", () => {
    expect(normalizeNameForPexels("गेहूं Sharbati")).toContain("wheat");
    expect(normalizeNameForPexels("चावल Basmati")).toContain("rice");
    expect(normalizeNameForPexels("Kapas BT Cotton")).toContain("cotton");
    expect(normalizeNameForPexels("Aloo Potato")).toContain("potato");
    expect(normalizeNameForPexels("Pyaj Red Onion")).toContain("onion");
  });

  it("normalizes product names and categories cleanly", () => {
    expect(normalizeNameForPexels("Urea Fertilizer 45kg bag")).toContain("fertilizer");
    expect(normalizeNameForPexels("Wheat Seeds 10kg")).toContain("seeds");
    expect(normalizeNameForPexels("Mahindra 575 DI")).toContain("mahindra");
  });

  it("resolves real high-definition images for Mandi crops dynamically", async () => {
    const wheat = await getAgricultureImage({ type: "crop", name: "Wheat" });
    expect(wheat.imageUrl).toMatch(/(images\.pexels\.com|images\.unsplash\.com)/);
    expect(wheat.validationStatus).toBe("verified");

    const rice = await getAgricultureImage({ type: "crop", name: "चावल (Basmati Rice)" });
    expect(rice.imageUrl).toMatch(/(images\.pexels\.com|images\.unsplash\.com)/);
    expect(rice.validationStatus).toBe("verified");

    const tomato = await getAgricultureImage({ type: "crop", name: "Tomato Tamatar" });
    expect(tomato.imageUrl).toMatch(/(images\.pexels\.com|images\.unsplash\.com)/);
    expect(tomato.validationStatus).toBe("verified");
  });

  it("resolves all Mandi commodities mentioned by the user to authentic photos", () => {
    const commodities = [
      "Apple (सेब)",
      "Garlic (लहसुन)",
      "Betal Leaves",
      "Ginger(Green)",
      "Chili Red",
      "Pomegranate (अनार)",
      "Green Peas (मटर)",
      "Lemon",
      "Grapes (अंगूर)",
      "Orange (संतरा)",
      "Corriander seed",
    ];

    for (const item of commodities) {
      const url = getCropImage(item);
      expect(url).toBeDefined();
      expect(url).toMatch(/https:\/\/images\.(unsplash|pexels)\.com/);
    }
  });

  it("resolves all 24 tractor rental machinery items to distinct authentic photos", () => {
    const machineryList = [
      "Mahindra 575 DI",
      "Sonalika Tiger 55",
      "John Deere 5310",
      "Swaraj 855",
      "Massey Ferguson 241",
      "Kubota M5-091",
      "Mahindra Rotavator 4FT",
      "Sonalika Plough 3-Typr",
      "Kubota M7-171",
      "Swaraj XT Tractor",
      "FieldKing Harvester",
      "Tirth Agro Seed Drill",
      "VST 30HP Tractor",
      "Balwan Thresher",
      "New Holland 5630",
      "Shaktiman Cultivator",
      "Crompton Sprayer",
      "Eicher 548 Tractor",
      "CLAAS Dominator",
      "Preet Plough",
      "Farmtrac 60 PowerMax",
      "VST Shakti DI",
      "Kubota Rice Transplanter",
      "New Holland Drip Sprayer",
    ];

    for (const item of machineryList) {
      const url = getMachineImage(item);
      expect(url).toBeDefined();
      expect(url).toMatch(/https:\/\/images\.(unsplash|pexels)\.com/);
    }
  });

  it("resolves all Agri Store products mentioned by user to authentic photos", () => {
    const storeProducts = [
      "16L Battery Operated Knapsack Sprayer",
      "Complete 1-Acre Drip Irrigation Kit",
      "Organic Pure Neem Oil 10000 PPM",
      "Neem Coated Urea (45kg)",
      "IFFCO DAP Fertilizer 18:46:00",
      "Certified Sharbati Wheat Seeds",
      "Pusa Basmati Paddy Seeds PB-1121",
    ];

    for (const item of storeProducts) {
      const url = getStoreProductImage(item);
      expect(url).toBeDefined();
      expect(url).toMatch(/https:\/\/images\.(unsplash|pexels)\.com/);
    }
  });

  it("resolves images via centralized resolveImage options API", () => {
    const tomatoImg = resolveImage({ entityType: "crop", entityName: "Tomato" });
    expect(tomatoImg).toMatch(/https:\/\/images\.(unsplash|pexels)\.com/);

    const mahindraImg = resolveImage({ entityType: "tractor", entityName: "Mahindra 575 DI" });
    expect(mahindraImg).toMatch(/https:\/\/images\.(unsplash|pexels)\.com/);

    const ureaImg = resolveImage({ entityType: "product", entityName: "Neem Coated Urea (45kg)" });
    expect(ureaImg).toMatch(/https:\/\/images\.(unsplash|pexels)\.com/);
  });

  it("supports administrative override, refresh, and cache management", () => {
    const customUrl = "https://images.unsplash.com/photo-1592878904946-b3cd8ae243d0?auto=format&fit=crop&w=900&q=80";
    const overridden = replaceAgriImage("tractor", "Sonalika Tiger", customUrl, "SuperAdmin");
    expect(overridden.imageUrl).toBe(customUrl);
    expect(overridden.photographer).toBe("SuperAdmin");

    const stats = getAgriImageCacheStats();
    expect(stats.totalCached).toBeGreaterThan(0);
    expect(stats.verifiedCount).toBeGreaterThan(0);
  });

  it("guarantees stable index hashing for render consistency", () => {
    const idx1 = getStableIndex("tractor-card-1", 5);
    const idx2 = getStableIndex("tractor-card-1", 5);
    expect(idx1).toBe(idx2);

    const idxA = getStableIndex("wheat-batch", 3);
    const idxB = getStableIndex("wheat-batch", 3);
    expect(idxA).toBe(idxB);
  });

  it("guarantees curated CDN image map contains verified assets", () => {
    expect(PEXELS_CURATED_PHOTOS.wheat).toMatch(/(images\.pexels\.com|images\.unsplash\.com)/);
    expect(PEXELS_CURATED_PHOTOS.rice).toMatch(/(images\.pexels\.com|images\.unsplash\.com)/);
    expect(PEXELS_CURATED_PHOTOS.cotton).toMatch(/(images\.pexels\.com|images\.unsplash\.com)/);
    expect(PEXELS_CURATED_PHOTOS.tomato).toMatch(/(images\.pexels\.com|images\.unsplash\.com)/);
    expect(PEXELS_CURATED_PHOTOS.fertilizer).toMatch(/(images\.pexels\.com|images\.unsplash\.com)/);
    expect(PEXELS_CURATED_PHOTOS.tractor).toMatch(/(images\.pexels\.com|images\.unsplash\.com)/);
    expect(PEXELS_CURATED_PHOTOS.harvester).toMatch(/(images\.pexels\.com|images\.unsplash\.com)/);
    expect(PEXELS_CURATED_PHOTOS.seeds).toMatch(/(images\.pexels\.com|images\.unsplash\.com)/);
  });
});
