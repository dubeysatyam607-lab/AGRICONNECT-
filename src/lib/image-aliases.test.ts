import { describe, it, expect } from "vitest";
import { getIoTImage, getTractorImage, getMandiImage, getRelevantImage } from "./imageService";

describe("imageService iot/tractor/mandi aliases", () => {
  it("getIoTImage returns a real (pexels) photograph", () => {
    const url = getIoTImage();
    expect(url).toMatch(/^https:\/\/images\.pexels\.com\//);
    expect(url.length).toBeGreaterThan(20);
  });

  it("getIoTImage stays stable across calls (no random selection)", () => {
    expect(getIoTImage({ name: "farm sensors" })).toBe(getIoTImage({ name: "farm sensors" }));
  });

  it("getTractorImage returns a real machinery photograph", () => {
    const url = getTractorImage("Mahindra Tractor");
    expect(url).toMatch(/^https:\/\/images\.pexels\.com\//);
  });

  it("getMandiImage resolves a verified crop photo or the safe default", () => {
    const url = getMandiImage("wheat");
    expect(url).toMatch(/^https:\/\/images\.pexels\.com\//);
  });

  it("mandi/tractor entry points are aliases that never return empty", () => {
    expect(typeof getMandiImage()).toBe("string");
    expect(getMandiImage().length).toBeGreaterThan(0);
    expect(typeof getTractorImage()).toBe("string");
    expect(getTractorImage().length).toBeGreaterThan(0);
  });

  it("rejects mascot/emoji style inputs gracefully in favour of the default", () => {
    const url = getRelevantImage({ entityType: "crop", name: "💧" });
    expect(url).toMatch(/^https:\/\//);
  });
});