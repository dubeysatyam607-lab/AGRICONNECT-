import { describe, it, expect } from "vitest";
import {
  resolveImageUrl,
  isValidImageUrl,
  sanitizeImageUrl,
  getStoreProductImage,
  normalizeApiProductImage,
  OFFLINE_AGRI_SVG,
  CATEGORY_FALLBACK_IMAGES,
} from "./image-resolver";

describe("Image Resolver — URL Validation & Sanitization", () => {
  it("validates correct HTTPS URLs", () => {
    expect(isValidImageUrl("https://images.unsplash.com/photo-12345")).toBe(true);
    expect(isValidImageUrl("https://storage.googleapis.com/agri/photo.jpg")).toBe(true);
  });

  it("rejects invalid/malformed/stringified garbage URLs", () => {
    expect(isValidImageUrl("undefined")).toBe(false);
    expect(isValidImageUrl("null")).toBe(false);
    expect(isValidImageUrl("[object Object]")).toBe(false);
    expect(isValidImageUrl("")).toBe(false);
    expect(isValidImageUrl("   ")).toBe(false);
    expect(isValidImageUrl(null)).toBe(false);
    expect(isValidImageUrl(undefined)).toBe(false);
    expect(isValidImageUrl(123)).toBe(false);
  });

  it("upgrades HTTP to HTTPS and preserves relative and data paths", () => {
    expect(sanitizeImageUrl("http://images.unsplash.com/test.jpg")).toBe(
      "https://images.unsplash.com/test.jpg"
    );
    expect(sanitizeImageUrl("//cdn.example.com/img.png")).toBe(
      "https://cdn.example.com/img.png"
    );
    expect(sanitizeImageUrl("/assets/logo.png")).toBe("/assets/logo.png");
    expect(sanitizeImageUrl(OFFLINE_AGRI_SVG)).toContain("data:image/svg+xml");
  });
});

describe("Image Resolver — Context-Aware Fallbacks", () => {
  it("resolves specific Mandi crop photos by name", () => {
    const tomatoImg = resolveImageUrl(undefined, "crop", "Tomato");
    expect(tomatoImg).toContain("https://");
    expect(tomatoImg).not.toContain("undefined");

    const gehuImg = resolveImageUrl(undefined, "crop", "गेहूं");
    expect(gehuImg).toContain("https://");
  });

  it("resolves specific Agri Store product photos by name", () => {
    const ureaImg = resolveImageUrl(undefined, "product", "Urea Fertilizer 45kg");
    expect(ureaImg).toContain("https://");

    const sprayerImg = resolveImageUrl(undefined, "product", "Manual Pesticide Sprayer 16L");
    expect(sprayerImg).toContain("https://");
  });

  it("resolves category fallback images", () => {
    const seedsCat = resolveImageUrl(undefined, "category", "seeds");
    expect(seedsCat).toBe(CATEGORY_FALLBACK_IMAGES.seeds);

    const fertCat = resolveImageUrl(undefined, "category", "fertilizers");
    expect(fertCat).toBe(CATEGORY_FALLBACK_IMAGES.fertilizers);
  });

  it("never returns raw undefined or null strings when given invalid input", () => {
    const res1 = resolveImageUrl("undefined", "product", "DAP Fertilizer");
    expect(res1).not.toBe("undefined");
    expect(res1).toContain("https://");

    const res2 = resolveImageUrl(null, "crop", "Soybean");
    expect(res2).not.toBeNull();
    expect(res2).toContain("https://");
  });
});

describe("Image Resolver — API Product Normalizer", () => {
  it("extracts and normalizes image_url from database record", () => {
    const dbRecord = {
      id: "123",
      name: "DAP 50kg",
      image_url: "https://my-bucket.supabase.co/storage/v1/object/public/products/dap.png",
    };
    expect(normalizeApiProductImage(dbRecord, "fertilizers")).toBe(
      "https://my-bucket.supabase.co/storage/v1/object/public/products/dap.png"
    );
  });

  it("falls back to product name mapping if API image field is null or missing", () => {
    const emptyRecord = {
      id: "456",
      name: "Hybrid Cotton Seeds (Bt)",
      image_url: null,
    };
    const img = normalizeApiProductImage(emptyRecord, "seeds");
    expect(img).toContain("https://");
  });
});
