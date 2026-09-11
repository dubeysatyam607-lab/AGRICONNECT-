// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from "vitest";
import { fetchMandiPrices, getMandiPriceQuote, setLatestRealPrices } from "./mandi-api";
import { getCropImage, getCropCategory } from "./crop-images";

vi.mock("@/lib/invoke-edge", () => ({
  invokeEdgeWithTimeout: vi.fn(),
}));

import { invokeEdgeWithTimeout } from "@/lib/invoke-edge";

const mockedInvoke = vi.mocked(invokeEdgeWithTimeout);

describe("Mandi Module — Live Verified Data & Image Mapping", () => {
  beforeEach(() => {
    localStorage.clear();
    setLatestRealPrices([]);
    vi.restoreAllMocks();
    mockedInvoke.mockReset();
  });

  it("getCropImage maps crops to valid high-res image URLs", () => {
    const wheatImage = getCropImage("Wheat");
    const tomatoImage = getCropImage("Tomato");
    const fallbackImage = getCropImage("Unknown Exotic Plant");

    expect(wheatImage).toMatch(/images\.(unsplash|pexels)\.com/);
    expect(tomatoImage).toMatch(/images\.(unsplash|pexels)\.com/);
    expect(fallbackImage).toMatch(/images\.(unsplash|pexels)\.com/);
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

  it("returns an honest error state when the edge fails and no cache exists (never fabricates)", async () => {
    mockedInvoke.mockResolvedValue({
      data: null,
      error: "Network Error",
      timedOut: false,
    });

    const result = await fetchMandiPrices();
    expect(result.isError).toBe(true);
    expect(result.prices).toEqual([]);
    expect(result.errorMessage).toBeDefined();
    expect(result.source).not.toBe("apmc-benchmark");
  });

  it("maps real AGMARKNET records from the edge and falls back to cache when offline", async () => {
    mockedInvoke.mockResolvedValue({
      data: {
        prices: [
          {
            state: "Rajasthan",
            district: "Jaipur",
            market: "Jaipur Mandi",
            commodity: "Wheat",
            variety: "Dara",
            arrivalDate: "2026-08-06",
            minPrice: 2300,
            maxPrice: 2500,
            price: 2425,
          },
          {
            state: "Madhya Pradesh",
            district: "Indore",
            market: "Indore Mandi",
            commodity: "Soybean",
            variety: "Yellow",
            arrivalDate: "2026-08-06",
            minPrice: 4600,
            maxPrice: 5100,
            price: 4892,
          },
        ],
      },
      error: null,
      timedOut: false,
    });

    const result = await fetchMandiPrices();
    expect(result.prices.length).toBe(2);
    expect(result.source).toBe("edge");
    expect(result.prices[0].crop).toBe("Soybean"); // Sorted high to low
    expect(result.prices[0].price).toBe(4892);
    expect(result.prices[0].msp).toBeGreaterThanOrEqual(4000);
    expect(result.prices[0].unit).toBe("₹/Quintal");
    expect(result.prices[0].cropImage).toMatch(/images\.(unsplash|pexels)\.com/);
    // Real AGMARKNET data never fabricates arrivals or operating status
    expect(result.prices[0].arrivalQuantity).toBeUndefined();
    expect(result.prices[0].operatingStatus).toBeUndefined();

    // Offline -> loads real cache with timestamp notice
    mockedInvoke.mockRejectedValue(new Error("Offline"));
    const cachedResult = await fetchMandiPrices();
    expect(cachedResult.isCached).toBe(true);
    expect(cachedResult.prices.length).toBe(2);
    expect(cachedResult.cachedAtText).toBeDefined();
  });

  it("unpublished prices fall back to 0 (Not available) instead of invented values", async () => {
    mockedInvoke.mockResolvedValue({
      data: {
        prices: [
          {
            state: "Rajasthan",
            district: "Jaipur",
            market: "Jaipur Mandi",
            commodity: "Wheat",
            arrivalDate: "2026-08-06",
            minPrice: 0,
            maxPrice: 0,
            price: 0,
          },
        ],
      },
      error: null,
      timedOut: false,
    });

    const result = await fetchMandiPrices();
    expect(result.prices).toEqual([]); // unpublished records are dropped from live view
  });

  it("getMandiPriceQuote never fabricates a quote when no real dataset exists", () => {
    const quote = getMandiPriceQuote({ crop: "Wheat" }, []);
    expect(quote.found).toBe(false);
    expect(quote.messageEn).toContain("unavailable");
    expect(quote.modalPrice).toBe(0);
  });

  it("quotes from a real dataset without inventing prices", () => {
    const realPrices: Parameters<typeof getMandiPriceQuote>[1] = [
      {
        id: "wheat::jaipu ramji::jaipur::rajasthan",
        crop: "Wheat",
        cropHi: "गेहूं",
        cropImage: "https://images.pexels.com/photos/7891849/pexels-photo-7891849.jpeg?auto=compress&cs=tinysrgb&h=650&w=940",
        category: "Cereals",
        price: 2425,
        market: "Jaipur Mandi",
        district: "Jaipur",
        state: "Rajasthan",
        minPrice: 2300,
        maxPrice: 2500,
        msp: 2275,
        unit: "₹/Quintal",
        status: "stable",
        change: "0%",
        arrivalDate: "2026-08-06",
        lastUpdatedText: "2026-08-06",
      },
    ];

    const quote = getMandiPriceQuote({ crop: "Wheat", mandi: "Jaipur" }, realPrices);
    expect(quote.found).toBe(true);
    expect(quote.modalPrice).toBe(2425);
    expect(quote.minPrice).toBe(2300);
    expect(quote.maxPrice).toBe(2500);
    expect(quote.messageEn).toContain("AGMARKNET");
  });
});