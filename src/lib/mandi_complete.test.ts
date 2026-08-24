import { describe, it, expect } from "vitest";
import {
  searchMandiDataset,
  getBaselineMandiPrices,
  fetchMandiPrices,
  type MandiPrice,
} from "./mandi-api";
import { getCropImage, getCropCategory } from "./crop-images";

describe("Mandi Complete Crop Coverage & Search", () => {
  const samplePrices: MandiPrice[] = [
    {
      id: "wheat::shivpuri::shivpuri::madhya pradesh::2026-08-23",
      crop: "Wheat",
      cropHi: "गेहूं",
      cropImage: getCropImage("Wheat"),
      category: "Cereals",
      price: 2450,
      market: "Shivpuri Mandi",
      district: "Shivpuri",
      state: "Madhya Pradesh",
      minPrice: 2350,
      maxPrice: 2550,
      unit: "₹/Quintal",
      status: "stable",
      change: "+0.5%",
      arrivalDate: "2026-08-23",
      lastUpdatedText: "2026-08-23",
    },
    {
      id: "garlic::mandsaur::mandsaur::madhya pradesh::2026-08-23",
      crop: "Garlic",
      cropHi: "लहसुन",
      cropImage: getCropImage("Garlic"),
      category: "Spices",
      price: 11500,
      market: "Mandsaur Mandi",
      district: "Mandsaur",
      state: "Madhya Pradesh",
      minPrice: 10000,
      maxPrice: 13000,
      unit: "₹/Quintal",
      status: "up",
      change: "+3.2%",
      arrivalDate: "2026-08-23",
      lastUpdatedText: "2026-08-23",
    },
    {
      id: "tomato::kolar::kolar::karnataka::2026-08-23",
      crop: "Tomato",
      cropHi: "टमाटर",
      cropImage: getCropImage("Tomato"),
      category: "Vegetables",
      price: 2200,
      market: "Kolar APMC",
      district: "Kolar",
      state: "Karnataka",
      minPrice: 1800,
      maxPrice: 2600,
      unit: "₹/Quintal",
      status: "down",
      change: "-2.1%",
      arrivalDate: "2026-08-23",
      lastUpdatedText: "2026-08-23",
    },
    {
      id: "onion::lasalgaon::nashik::maharashtra::2026-08-23",
      crop: "Onion",
      cropHi: "प्याज",
      cropImage: getCropImage("Onion"),
      category: "Vegetables",
      variety: "Red Onion",
      price: 2100,
      market: "Lasalgaon APMC",
      district: "Nashik",
      state: "Maharashtra",
      minPrice: 1800,
      maxPrice: 2400,
      unit: "₹/Quintal",
      status: "stable",
      change: "+0.0%",
      arrivalDate: "2026-08-23",
      lastUpdatedText: "2026-08-23",
    },
  ];

  it("searches partial terms case-insensitively ('gar' -> Garlic)", () => {
    const results = searchMandiDataset(samplePrices, "gar");
    expect(results.length).toBe(1);
    expect(results[0].crop).toBe("Garlic");
  });

  it("searches partial terms case-insensitively ('tom' -> Tomato)", () => {
    const results = searchMandiDataset(samplePrices, "TOM");
    expect(results.length).toBe(1);
    expect(results[0].crop).toBe("Tomato");
  });

  it("searches Hindi crop names ('गेहूं' -> Wheat, 'लहसुन' -> Garlic)", () => {
    const wheatRes = searchMandiDataset(samplePrices, "गेहूं");
    expect(wheatRes.length).toBe(1);
    expect(wheatRes[0].crop).toBe("Wheat");

    const garlicRes = searchMandiDataset(samplePrices, "लहसुन");
    expect(garlicRes.length).toBe(1);
    expect(garlicRes[0].crop).toBe("Garlic");
  });

  it("searches by variety cleanly ('Red Onion' -> Onion)", () => {
    const redOnionRes = searchMandiDataset(samplePrices, "Red Onion");
    expect(redOnionRes.length).toBe(1);
    expect(redOnionRes[0].crop).toBe("Onion");
  });

  it("handles empty search and whitespace gracefully", () => {
    const all = searchMandiDataset(samplePrices, "   ");
    expect(all.length).toBe(samplePrices.length);
  });

  it("returns baseline APMC benchmarks when offline or API reconnects", () => {
    const baseline = getBaselineMandiPrices();
    expect(baseline.length).toBeGreaterThan(20);
    expect(baseline.every((b) => b.price > 0)).toBe(true);
  });

  it("maps categories accurately across agricultural produce", () => {
    expect(getCropCategory("Wheat")).toBe("Cereals");
    expect(getCropCategory("Tomato")).toBe("Vegetables");
    expect(getCropCategory("Mustard")).toBe("Oilseeds");
    expect(getCropCategory("Turmeric")).toBe("Spices");
    expect(getCropCategory("Apple")).toBe("Fruits");
  });
});
