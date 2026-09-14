import { describe, it, expect } from "vitest";
import { getCropImage } from "./crop-images";
import { normalizeCropName, getVerifiedCropImage, cleanCropName } from "./cropImageService";

const UNAVAILABLE = undefined;

describe("cropImageService — Mandi crop photo correctness (fail-closed)", () => {
  it("normalizes Hindi, regional and AGMARKNET names to canonical crops", () => {
    expect(normalizeCropName("Jeera").canonical).toBe("cumin");
    expect(normalizeCropName("लहसुन").canonical).toBe("garlic");
    expect(normalizeCropName("सरसों").canonical).toBe("mustard");
    expect(normalizeCropName("Black Gram(Urd Beans)(Whole)").canonical).toBe("black gram");
    expect(normalizeCropName("Urad").canonical).toBe("black gram");
    expect(normalizeCropName("उड़द").canonical).toBe("black gram");
    expect(normalizeCropName("Green Gram(Whole)").canonical).toBe("green gram");
    expect(normalizeCropName("Moong").canonical).toBe("green gram");
    expect(normalizeCropName("Arhar").canonical).toBe("pigeon pea");
    expect(normalizeCropName("Toor").canonical).toBe("pigeon pea");
    expect(normalizeCropName("Pigeon Pea(Tur)").canonical).toBe("pigeon pea");
    expect(normalizeCropName("अरहर").canonical).toBe("pigeon pea");
  });

  it("cleans AGMARKNET parenthetical suffixes", () => {
    expect(cleanCropName("Black Gram(Urd Beans)(Whole)")).toBe("Black Gram");
    expect(cleanCropName("Rice (Basmati)")).toBe("Rice");
  });

  it("NEVER returns a wrong-crop photo for black gram / urad (previously chickpea/moong)", () => {
    expect(getCropImage("Black Gram")).toBeUndefined();
    expect(getCropImage("Black Gram(Urd Beans)(Whole)")).toBeUndefined();
    expect(getCropImage("Urad")).toBeUndefined();
    expect(getCropImage("Urd")).toBeUndefined();
    expect(getCropImage("उड़द")).toBeUndefined();
    expect(getVerifiedCropImage("Black Gram(Urd Beans)(Whole)")).toBeUndefined();
    expect(getVerifiedCropImage("Urad")).toBeUndefined();
  });

  it("NEVER returns a wrong-crop photo for pigeon pea / arhar / toor (previously mixed grains)", () => {
    expect(getCropImage("Arhar")).toBeUndefined();
    expect(getCropImage("Toor")).toBeUndefined();
    expect(getCropImage("Tur")).toBeUndefined();
    expect(getCropImage("Pigeon Pea(Tur)")).toBeUndefined();
    expect(getCropImage("अरहर")).toBeUndefined();
  });

  it("resolves green gram / moong to the verified mung bean photo (distinct from gram)", () => {
    const moongUrl = "18358654";
    expect(getCropImage("Green Gram")).toContain(moongUrl);
    expect(getCropImage("Green Gram(Whole)")).toContain(moongUrl);
    expect(getCropImage("Moong")).toContain(moongUrl);
    expect(getCropImage("मूंग")).toContain(moongUrl);
  });

  it("resolves Turmeric to turmeric (never the old moong match from substring 'tur')", () => {
    const turmeric = getCropImage("Turmeric");
    expect(turmeric).toContain("7988018");
    expect(turmeric).not.toContain("18358654");
    expect(getCropImage("हल्दी")).toContain("7988018");
  });

  it("distinguishes jowar (sorghum) from bajra (pearl millet)", () => {
    const jowar = getCropImage("Jowar");
    const bajra = getCropImage("Bajra");
    expect(jowar).toContain("5500154");
    expect(bajra).toContain("16977456");
    expect(jowar).not.toBe(bajra);
    expect(getCropImage("Sorghum")).toContain("5500154");
  });

  it("resolves the verified 18-core commodities each to its own verified photo", () => {
    const verified: Record<string, string> = {
      Wheat: "11034660",
      Rice: "36346840",
      Paddy: "20212135",
      "Paddy(Common)": "20212135",
      Maize: "23669939",
      Soybean: "36063252",
      Mustard: "18346906",
      Groundnut: "33501329",
      Potato: "144248",
      Onion: "4307386",
      Tomato: "37085352",
      "Red Chilli": "19689774",
      Garlic: "5129630",
      Cumin: "10487762",
      Cotton: "5640079",
      "Gram(Chana)": "34945158",
      Jowar: "5500154",
      Bajra: "16977456",
    };
    for (const [crop, photoId] of Object.entries(verified)) {
      const url = getCropImage(crop);
      expect(url, `expected ${crop} to resolve`).toBeDefined();
      expect(url, `${crop} must be the verified photo #${photoId}`).toContain(photoId);
    }
  });

  it("resolves distinct commodity names to distinct verified photos (no shared generic)", () => {
    const urls = [
      getCropImage("Wheat"),
      getCropImage("Rice"),
      getCropImage("Maize"),
      getCropImage("Soybean"),
      getCropImage("Tomato"),
      getCropImage("Onion"),
      getCropImage("Garlic"),
      getCropImage("Mustard"),
    ];
    expect(new Set(urls).size).toBe(urls.length);
  });

  it("never returns a generic category photo for unknown crops", () => {
    expect(getCropImage("Unknown Exotic Plant")).toBeUndefined();
    expect(getCropImage("Random Vegetable Box")).toBeUndefined();
  });
});