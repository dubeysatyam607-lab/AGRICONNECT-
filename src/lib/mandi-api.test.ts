// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from "vitest";
import { fetchMandiPrices } from "./mandi-api";
import { getCropImage, getCropCategory } from "./crop-images";

describe("Mandi Module — Live Verified Data & Image Mapping", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it("getCropImage maps crops to valid high-res image URLs", () => {
    const wheatImage = getCropImage("Wheat");
    const tomatoImage = getCropImage("Tomato");
    const fallbackImage = getCropImage("Unknown Exotic Plant");

    expect(wheatImage).toContain("images.pexels.com");
    expect(tomatoImage).toContain("images.pexels.com");
    expect(fallbackImage).toContain("images.pexels.com");
  });

  it("getCropCategory correctly classifies crops into categories", () => {
    expect(getCropCategory("Wheat")).toBe("Cereals");
    expect(getCropCategory("Paddy(Common)")).toBe("Cereals");
    expect(getCropCategory("Gram(Chana)")).toBe("Pulses");
    expect(getCropCategory("Onion")).toBe("Vegetables");
    expect(getCropCategory("Soybean")).toBe("Oilseeds");
    expect(getCropCategory("Mustard")).toBe("Oilseeds");
    expect(getCropCategory("Cotton")).toBe("Commercial");
    expect(getCropCategory("Cumin")).toBe("Spices");
    expect(getCropCategory("Banana")).toBe("Fruits");
  });

  it("fetchMandiPrices returns verified APMC baseline benchmarks when API fails and no cache exists", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("Network Error")));

    const result = await fetchMandiPrices();
    expect(result.prices.length).toBeGreaterThanOrEqual(10);
    expect(result.source).toBe("apmc-benchmark");
    expect(result.isCached).toBe(true);
    expect(result.cachedAtText).toBe("APMC Benchmark Rates");
  });

  it("fetchMandiPrices saves live response to cache and returns cached data when offline", async () => {
    const mockGovtResponse = {
      records: [
        {
          state: "Rajasthan",
          district: "Jaipur",
          market: "Jaipur Mandi",
          commodity: "Wheat",
          variety: "Dara",
          arrival_date: "2026-08-06",
          min_price: "2300",
          max_price: "2500",
          modal_price: "2425",
        },
        {
          state: "Madhya Pradesh",
          district: "Indore",
          market: "Indore Mandi",
          commodity: "Soybean",
          variety: "Yellow",
          arrival_date: "2026-08-06",
          min_price: "4600",
          max_price: "5100",
          modal_price: "4892",
        },
      ],
    };

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockGovtResponse,
      })
    );

    // Initial live fetch
    const result = await fetchMandiPrices();
    expect(result.prices.length).toBe(2);
    expect(result.source).toBe("data.gov.in");
    expect(result.prices[0].crop).toBe("Soybean"); // Sorted high to low
    expect(result.prices[0].price).toBe(4892);
    expect(result.prices[0].msp).toBeGreaterThanOrEqual(4000);
    expect(result.prices[0].unit).toBe("₹/Quintal");
    expect(result.prices[0].cropImage).toContain("pexels");

    // Now simulate offline API failure — should load from localStorage cache with timestamp notice
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("Offline")));

    const cachedResult = await fetchMandiPrices();
    expect(cachedResult.isCached).toBe(true);
    expect(cachedResult.prices.length).toBe(2);
    expect(cachedResult.cachedAtText).toBeDefined();
  });
});
