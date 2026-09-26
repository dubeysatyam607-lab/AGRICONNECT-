// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  fetchMandiPrices,
  getMandiPriceQuote,
  setLatestRealPrices,
  normalizeCommodity,
  cleanCropName,
  isValidMandiRecord,
  getCommodityPriority,
  selectHomeMandiPreview,
} from "./mandi-api";
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

  it("getCropImage maps crops to valid high-res image URLs only when semantically matched", () => {
    const wheatImage = getCropImage("Wheat");
    const tomatoImage = getCropImage("Tomato");
    const unmatchedImage = getCropImage("Unknown Exotic Plant");

    expect(wheatImage).toMatch(/images\.(unsplash|pexels)\.com/);
    expect(tomatoImage).toMatch(/images\.(unsplash|pexels)\.com/);
    expect(unmatchedImage).toBeUndefined();
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
        cropImage: "https://images.pexels.com/photos/11034660/pexels-photo-11034660.jpeg?auto=compress&cs=tinysrgb&h=650&w=940",
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

  it("quotes never duplicate the crop name when Hindi name is unavailable", () => {
    const realPrices: Parameters<typeof getMandiPriceQuote>[1] = [
      {
        id: "blackgram::khanna::ludhiana::punjab",
        crop: "Black Gram(Urd Beans)(Whole)",
        cropHi: "उड़द",
        cropImage: undefined,
        category: "Pulses",
        price: 7600,
        market: "Khanna Mandi",
        district: "Ludhiana",
        state: "Punjab",
        minPrice: 7400,
        maxPrice: 7850,
        unit: "₹/Quintal",
        status: "stable",
        change: "0%",
        arrivalDate: "2026-09-05",
        lastUpdatedText: "2026-09-05",
      },
    ];

    const quote = getMandiPriceQuote({ crop: "Black Gram", mandi: "Khanna" }, realPrices);
    expect(quote.found).toBe(true);
    expect(quote.cropName).toBe("Black Gram");
    expect(quote.cropHi).toBe("उड़द");
    // No "Black Gram (Black Gram)" duplication in any language variant.
    expect(quote.messageEn).not.toContain("Black Gram (Black Gram)");
    expect(quote.messageHi).not.toContain("Black Gram (Black Gram)");
    expect(quote.messageHinglish).not.toContain("Black Gram (Black Gram)");
    expect(quote.messageHi).toContain("उड़द (Black Gram)");
    expect(quote.messageEn).toContain("Black Gram");
  });

  it("duplicate-free quote when the record has no Hindi/regional name at all", () => {
    const realPrices: Parameters<typeof getMandiPriceQuote>[1] = [
      {
        id: "odd-crop::test::test::mh",
        crop: "Some Mono Crop",
        category: "Cereals",
        price: 1234,
        market: "Test Mandi",
        district: "Test",
        state: "Maharashtra",
        minPrice: 1200,
        maxPrice: 1300,
        unit: "₹/Quintal",
        status: "up",
        change: "+10%",
        arrivalDate: "2026-09-05",
        lastUpdatedText: "2026-09-05",
      },
    ];

    const quote = getMandiPriceQuote({ crop: "Some Mono Crop" }, realPrices);
    expect(quote.found).toBe(true);
    expect(quote.cropHi).toBeUndefined();
    expect(quote.messageHi).not.toContain("undefined");
    expect(quote.messageHi).not.toContain("Some Mono Crop (Some Mono Crop)");
    expect(quote.messageHinglish).not.toContain("Some Mono Crop (Some Mono Crop)");
  });

  it("normalizeCommodity fixes AGMARKNET double-name and parenthetical qualifiers", () => {
    expect(normalizeCommodity("Black Gram(Urd Beans)(Whole)")).toBe("Black Gram");
    expect(normalizeCommodity("Black Gram(Urd Beans)(Whole)Black Gram")).toBe("Black Gram");
    expect(normalizeCommodity("Cumin Seed(Jeera)Seed")).toBe("Cumin Seed");
    expect(normalizeCommodity("Cumin Seed(Jeera)")).toBe("Cumin Seed");
    expect(normalizeCommodity("Rice(IR-64)")).toBe("Rice");
    expect(normalizeCommodity("Wheat")).toBe("Wheat");
    expect(normalizeCommodity("  Paddy  (Common)  ")).toBe("Paddy");
    expect(normalizeCommodity("")).toBe("");
    // CleanCropName keeps the internal duplicate; normalizeCommodity removes it.
    expect(cleanCropName("Black Gram(Urd Beans)(Whole)Black Gram")).toBe("Black Gram Black Gram");
  });

  it("maps db-served records with servedFrom/meta and normalized commodity names", async () => {
    mockedInvoke.mockResolvedValue({
      data: {
        servedFrom: "database",
        syncedAt: "2026-09-13T12:00:00.000Z",
        total: 1,
        availableStates: ["Rajasthan", "Uttar Pradesh"],
        availableDistricts: ["Jaipur", "Lucknow"],
        availableMarkets: ["Jaipur Mandi", "Lucknow Mandi"],
        availableCommodities: ["Black Gram"],
        prices: [
          {
            state: "Uttar Pradesh",
            district: "Lucknow",
            market: "Lucknow Mandi",
            commodity: "Black Gram(Urd Beans)(Whole)",
            variety: "FAQ",
            arrivalDate: "2026-09-13",
            minPrice: 7400,
            maxPrice: 7900,
            price: 7680,
          },
        ],
      },
      error: null,
      timedOut: false,
    });

    const result = await fetchMandiPrices(undefined, "Uttar Pradesh");
    expect(result.source).toBe("db");
    expect(result.servedFrom).toBe("database");
    expect(result.syncedAtText).toBeDefined();
    expect(result.availableStates).toContain("Uttar Pradesh");
    expect(result.availableDistricts).toContain("Lucknow");
    expect(result.prices.length).toBe(1);
    expect(result.prices[0].crop).toBe("Black Gram");
    expect(result.prices[0].cropHi).toBe("उड़द");
    expect(result.prices[0].originalCommodity).toContain("Black Gram(Urd Beans)(Whole)");
    // No duplicated name anywhere.
    expect(result.prices[0].crop).not.toContain("Black Gram Black Gram");
  });

  it("unknown crops map to the Other category (never deleted, never miscategorised)", () => {
    expect(getCropCategory("Wheat")).toBe("Cereals");
    expect(getCropCategory("Some Exotic Crop")).toBe("Other");
  });

  it("isValidMandiRecord rejects corrupted or invalid price records (Part 5 & 6)", () => {
    const validRecord = {
      id: "wheat::jaipur",
      crop: "Wheat",
      market: "Jaipur Mandi",
      district: "Jaipur",
      state: "Rajasthan",
      price: 2400,
      minPrice: 2200,
      maxPrice: 2600,
      unit: "₹/Quintal",
      status: "stable" as const,
      change: "",
      category: "Cereals",
      arrivalDate: "2026-09-26",
      lastUpdatedText: "2026-09-26",
    };

    expect(isValidMandiRecord(validRecord)).toBe(true);

    // Reject minPrice > modalPrice
    expect(isValidMandiRecord({ ...validRecord, minPrice: 2800 })).toBe(false);

    // Reject modalPrice > maxPrice
    expect(isValidMandiRecord({ ...validRecord, maxPrice: 2200 })).toBe(false);

    // Reject <= 0 modal price
    expect(isValidMandiRecord({ ...validRecord, price: 0 })).toBe(false);
    expect(isValidMandiRecord({ ...validRecord, price: -500 })).toBe(false);

    // Reject empty crop or empty market
    expect(isValidMandiRecord({ ...validRecord, crop: "" })).toBe(false);
    expect(isValidMandiRecord({ ...validRecord, market: "  " })).toBe(false);
  });

  it("selectHomeMandiPreview prioritizes staple farmer crops and picks distinct commodities (Part 7 & 8)", () => {
    const rawItems = [
      {
        id: "tube-flower::1",
        crop: "Tube Flower",
        market: "Bangalore",
        district: "Bangalore",
        state: "Karnataka",
        price: 90000,
        minPrice: 85000,
        maxPrice: 95000,
        unit: "₹/Quintal",
        status: "stable" as const,
        change: "",
        category: "Other",
        arrivalDate: "2026-09-26",
        lastUpdatedText: "2026-09-26",
      },
      {
        id: "wheat::1",
        crop: "Wheat",
        market: "Indore",
        district: "Indore",
        state: "Madhya Pradesh",
        price: 2450,
        minPrice: 2300,
        maxPrice: 2600,
        unit: "₹/Quintal",
        status: "stable" as const,
        change: "",
        category: "Cereals",
        arrivalDate: "2026-09-26",
        lastUpdatedText: "2026-09-26",
      },
      {
        id: "tomato::1",
        crop: "Tomato",
        market: "Nashik",
        district: "Nashik",
        state: "Maharashtra",
        price: 1800,
        minPrice: 1500,
        maxPrice: 2100,
        unit: "₹/Quintal",
        status: "stable" as const,
        change: "",
        category: "Vegetables",
        arrivalDate: "2026-09-26",
        lastUpdatedText: "2026-09-26",
      },
    ];

    const preview = selectHomeMandiPreview(rawItems, 6);
    expect(preview.length).toBe(3);
    // Major staple farmer crops (Wheat, Tomato) must be prioritized over Tube Flower (₹90,000)
    expect(preview[0].crop).toBe("Tomato"); // Alphabetical among score 100
    expect(preview[1].crop).toBe("Wheat");
    expect(preview[2].crop).toBe("Tube Flower");
  });
});