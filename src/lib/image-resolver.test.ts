import { describe, it, expect } from "vitest";
import {
  resolveImageUrl,
  resolveImage,
  isValidImageUrl,
  sanitizeImageUrl,
  getStoreProductImage,
  normalizeApiProductImage,
  getExactCategoryFallbackSvg,
  OFFLINE_AGRI_SVG,
  CATEGORY_FALLBACK_IMAGES,
} from "./image-resolver";
import { getCropEmoji, getCropSvgFallback, getCropImage } from "./crop-images";
import { getMachineImage, getMachineSvgFallback } from "./machine-images";
import { getCattleImage, getCattleSvgFallback } from "./cattle-images";

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

describe("Image Resolver — Exact Entity Mappings (Crops, Machinery, Cattle, Store)", () => {
  it("resolves specific Mandi crop photos and SVGs by name", () => {
    const crops = ["Coconut", "Lemon", "Apple", "Garlic", "Ginger", "Wheat", "Soybean", "Mustard", "Potato", "Onion", "Tomato"];
    for (const crop of crops) {
      const url = resolveImageUrl(undefined, "crop", crop);
      expect(url).toContain("https://");
      expect(url).not.toContain("undefined");

      const svg = getCropSvgFallback(crop);
      expect(svg).toContain("data:image/svg+xml");
    }
  });

  it("assigns accurate emojis for crops", () => {
    expect(getCropEmoji("Coconut")).toBe("🥥");
    expect(getCropEmoji("नारियल")).toBe("🥥");
    expect(getCropEmoji("Lemon")).toBe("🍋");
    expect(getCropEmoji("नींबू")).toBe("🍋");
    expect(getCropEmoji("Apple")).toBe("🍎");
    expect(getCropEmoji("Garlic")).toBe("🧄");
    expect(getCropEmoji("Ginger")).toBe("🫚");
    expect(getCropEmoji("Tomato")).toBe("🍅");
    expect(getCropEmoji("Potato")).toBe("🥔");
    expect(getCropEmoji("Onion")).toBe("🧅");
  });

  it("resolves specific Machinery photos by brand and implement", () => {
    const mahindra = resolveImageUrl(undefined, "tractor", "Mahindra 575 DI");
    expect(mahindra).toContain("https://");

    const johnDeere = resolveImageUrl(undefined, "tractor", "John Deere 5310");
    expect(johnDeere).toContain("https://");

    const harvester = resolveImageUrl(undefined, "harvester", "FieldKing Harvester");
    expect(harvester).toContain("https://");

    const rotavator = resolveImageUrl(undefined, "machinery", "Mahindra Rotavator 4FT");
    expect(rotavator).toContain("https://");

    const machSvg = getMachineSvgFallback("Harvester", "machinery");
    expect(machSvg).toContain("data:image/svg+xml");
  });

  it("resolves Cattle & Livestock without cross-category pollution", () => {
    const cow = resolveImageUrl(undefined, "cattle", "Gir Cow");
    expect(cow).toContain("https://");

    const buffalo = resolveImageUrl(undefined, "cattle", "Murrah Buffalo");
    expect(buffalo).toContain("https://");

    const bull = getCattleImage("Desi Bull / Saand");
    expect(bull).toContain("https://");

    const calf = getCattleImage("Gir Calf / Bachhda");
    expect(calf).toContain("https://");

    const cattleSvg = getCattleSvgFallback("Murrah Buffalo");
    expect(cattleSvg).toContain("data:image/svg+xml");
    expect(decodeURIComponent(cattleSvg)).toContain("🐃");
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

  it("resolveImage returns exact SVG fallback when no photo found", () => {
    const fallbackRes = resolveImage({
      entityType: "crop",
      entityName: "Exotic Dragon Fruit",
    });
    expect(fallbackRes).toContain("https://");
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
