import { describe, it, expect } from "vitest";
import {
  normalizeNameForPexels,
  fetchPexelsImageForName,
  getPexelsPhotoForCrop,
  getPexelsPhotoForProduct,
  PEXELS_CURATED_PHOTOS,
} from "./pexels-api";

describe("Pexels API — Agricultural Image Resolution by Name", () => {
  it("normalizes Hindi and transliterated crop names cleanly", () => {
    expect(normalizeNameForPexels("गेहूं (Sharbati 50kg)")).toBe("wheat");
    expect(normalizeNameForPexels("टमाटर देसी 25kg")).toBe("tomato");
    expect(normalizeNameForPexels("Desi Tamatar")).toBe("tomato");
    expect(normalizeNameForPexels("Aloo Potato 50kg")).toBe("potato");
    expect(normalizeNameForPexels("Kapas Cotton")).toBe("cotton");
  });

  it("normalizes product names and strips pack sizes", () => {
    expect(normalizeNameForPexels("Neem Oil 1500 PPM 1L")).toContain("neem");
    expect(normalizeNameForPexels("Urea Fertilizer 45kg bag")).toContain("urea");
    expect(normalizeNameForPexels("Manual Knapsack Sprayer 16L")).toContain("manual knapsack sprayer");
  });

  it("resolves Pexels photo for crops when given only crop name", async () => {
    const wheatImg = await getPexelsPhotoForCrop("Wheat");
    expect(wheatImg).toBeDefined();
    expect(wheatImg).toContain("pexels.com");

    const tomatoImg = await getPexelsPhotoForCrop("टमाटर");
    expect(tomatoImg).toBeDefined();
    expect(tomatoImg).toContain("pexels.com");

    const cottonImg = await getPexelsPhotoForCrop("Kapas");
    expect(cottonImg).toBeDefined();
    expect(cottonImg).toContain("pexels.com");
  });

  it("resolves Pexels photo for products when given only product name", async () => {
    const ureaImg = await getPexelsPhotoForProduct("Urea 45kg");
    expect(ureaImg).toBeDefined();
    expect(ureaImg).toContain("pexels.com");

    const tractorImg = await fetchPexelsImageForName("Mahindra 575 DI", "tractor");
    expect(tractorImg).toBeDefined();
    expect(tractorImg).toContain("pexels.com");
  });

  it("guarantees curated Pexels CDN image map contains verified assets", () => {
    expect(PEXELS_CURATED_PHOTOS.wheat).toContain("images.pexels.com");
    expect(PEXELS_CURATED_PHOTOS.rice).toContain("images.pexels.com");
    expect(PEXELS_CURATED_PHOTOS.cotton).toContain("images.pexels.com");
    expect(PEXELS_CURATED_PHOTOS.tomato).toContain("images.pexels.com");
    expect(PEXELS_CURATED_PHOTOS.fertilizer).toContain("images.pexels.com");
  });
});
