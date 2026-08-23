import { describe, it, expect } from "vitest";
import {
  normalizeNameForPexels,
  fetchPexelsImageForName,
  fetchPexelsPhoto,
  getPexelsPhotoForCrop,
  getPexelsPhotoForProduct,
  PEXELS_CURATED_PHOTOS,
  PEXELS_PHOTO_LIBRARY,
  AGRI_IMAGE_QUERIES,
  getStableIndex,
} from "./pexels-api";

describe("Pexels Agricultural Photography Engine", () => {
  it("normalizes Hindi and transliterated crop names cleanly", () => {
    expect(normalizeNameForPexels("गेहूं (Sharbati 50kg)")).toBe("wheat");
    expect(normalizeNameForPexels("टमाटर देसी 25kg")).toBe("tomato");
    expect(normalizeNameForPexels("Desi Tamatar")).toBe("tomato");
    expect(normalizeNameForPexels("Aloo Potato 50kg")).toBe("potato");
    expect(normalizeNameForPexels("Kapas Cotton")).toBe("cotton");
    expect(normalizeNameForPexels("धान (Basmati)")).toBe("rice");
    expect(normalizeNameForPexels("सोयाबीन")).toBe("soybean");
  });

  it("normalizes product names and strips pack sizes", () => {
    expect(normalizeNameForPexels("Urea Fertilizer 45kg bag")).toContain("fertilizer");
    expect(normalizeNameForPexels("Manual Knapsack Sprayer 16L")).toContain("sprayer");
    expect(normalizeNameForPexels("Wheat Seeds 10kg")).toContain("seeds");
  });

  it("contains valid search queries for all core agricultural categories", () => {
    const requiredCategories = [
      "farmer",
      "tractor",
      "harvester",
      "crops",
      "wheat",
      "rice",
      "tomato",
      "soybean",
      "vegetables",
      "agristore",
      "seeds",
      "fertilizer",
      "equipment",
      "mandi",
    ];

    for (const cat of requiredCategories) {
      expect(AGRI_IMAGE_QUERIES[cat]).toBeDefined();
      expect(AGRI_IMAGE_QUERIES[cat].length).toBeGreaterThan(0);
      expect(AGRI_IMAGE_QUERIES[cat][0]).toContain(" ");
    }
  });

  it("resolves distinct, real Pexels photos for specific categories", async () => {
    const categories: Array<keyof typeof PEXELS_PHOTO_LIBRARY> = [
      "tractor",
      "harvester",
      "farmer",
      "wheat",
      "tomato",
      "soybean",
      "agristore",
      "mandi",
    ];

    const resolvedUrls = new Set<string>();

    for (const cat of categories) {
      const res = await fetchPexelsPhoto(cat, cat as any);
      expect(res).toBeDefined();
      expect(res?.url).toContain("images.pexels.com");
      expect(res?.photographer).toBeTruthy();
      expect(res?.alt).toBeTruthy();
      resolvedUrls.add(res!.url);
    }

    // Must NOT use one image everywhere (should have distinct images for distinct categories)
    expect(resolvedUrls.size).toBe(categories.length);
  });

  it("guarantees stable index hashing for render persistence", () => {
    const idx1 = getStableIndex("tractor-card-1", 5);
    const idx2 = getStableIndex("tractor-card-1", 5);
    expect(idx1).toBe(idx2);

    const idxA = getStableIndex("wheat-batch", 3);
    const idxB = getStableIndex("wheat-batch", 3);
    expect(idxA).toBe(idxB);
  });

  it("resolves crop and product aliases accurately", async () => {
    const wheatImg = await getPexelsPhotoForCrop("Wheat");
    expect(wheatImg).toContain("pexels.com");

    const tomatoImg = await getPexelsPhotoForCrop("टमाटर");
    expect(tomatoImg).toContain("pexels.com");

    const tractorImg = await fetchPexelsImageForName("Mahindra 575 DI", "tractor");
    expect(tractorImg).toContain("pexels.com");

    const ureaImg = await getPexelsPhotoForProduct("Urea 45kg");
    expect(ureaImg).toContain("pexels.com");
  });

  it("guarantees curated Pexels CDN image map contains verified assets", () => {
    expect(PEXELS_CURATED_PHOTOS.wheat).toContain("images.pexels.com");
    expect(PEXELS_CURATED_PHOTOS.rice).toContain("images.pexels.com");
    expect(PEXELS_CURATED_PHOTOS.cotton).toContain("images.pexels.com");
    expect(PEXELS_CURATED_PHOTOS.tomato).toContain("images.pexels.com");
    expect(PEXELS_CURATED_PHOTOS.fertilizer).toContain("images.pexels.com");
    expect(PEXELS_CURATED_PHOTOS.tractor).toContain("images.pexels.com");
    expect(PEXELS_CURATED_PHOTOS.harvester).toContain("images.pexels.com");
    expect(PEXELS_CURATED_PHOTOS.farmer).toContain("images.pexels.com");
    expect(PEXELS_CURATED_PHOTOS.mandi).toContain("images.pexels.com");
  });
});
