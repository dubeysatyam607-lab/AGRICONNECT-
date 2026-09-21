import { describe, it, expect } from "vitest";
import {
  getAllIndianStatesAndUTs,
  getDistrictsForState,
  getMandisForDistrict,
  getCommoditiesForSelection,
  filterIndiaMandiDataset,
  toCanonicalId,
} from "./india-mandi-service";
import type { MandiPrice } from "./mandi-api";

const mockDataset: MandiPrice[] = [
  {
    id: "jaipur-wheat",
    crop: "Wheat",
    cropHi: "गेहूं",
    category: "Cereal",
    price: 2450,
    minPrice: 2350,
    maxPrice: 2500,
    market: "Jaipur (Grain)",
    district: "Jaipur",
    state: "Rajasthan",
    variety: "Dara",
    unit: "₹/Quintal",
    status: "up",
    change: "+5%",
    arrivalDate: "21 Sep 2026",
    lastUpdatedText: "21 Sep 2026",
  },
  {
    id: "jodhpur-mustard",
    crop: "Mustard",
    cropHi: "सरसों",
    category: "Oilseed",
    price: 5600,
    minPrice: 5400,
    maxPrice: 5800,
    market: "Jodhpur Mandi",
    district: "Jodhpur",
    state: "Rajasthan",
    variety: "Mustard Bold",
    unit: "₹/Quintal",
    status: "stable",
    change: "0%",
    arrivalDate: "21 Sep 2026",
    lastUpdatedText: "21 Sep 2026",
  },
  {
    id: "agra-potato",
    crop: "Potato",
    cropHi: "आलू",
    category: "Vegetables",
    price: 1800,
    minPrice: 1700,
    maxPrice: 1950,
    market: "Agra APMC",
    district: "Agra",
    state: "Uttar Pradesh",
    variety: "Desi",
    unit: "₹/Quintal",
    status: "down",
    change: "-2%",
    arrivalDate: "21 Sep 2026",
    lastUpdatedText: "21 Sep 2026",
  },
];

describe("India Mandi Location System", () => {
  it("returns all 36 Indian States and Union Territories", () => {
    const states = getAllIndianStatesAndUTs();
    expect(states.length).toBeGreaterThanOrEqual(36);
    expect(states).toContain("Rajasthan");
    expect(states).toContain("Uttar Pradesh");
    expect(states).toContain("Maharashtra");
    expect(states).toContain("Delhi (NCT)");
  });

  it("converts names to canonical IDs", () => {
    expect(toCanonicalId("Uttar Pradesh")).toBe("uttar-pradesh");
    expect(toCanonicalId("Jaipur (Grain)")).toBe("jaipur-grain");
  });

  it("cascades districts for a given state", () => {
    const rjDistricts = getDistrictsForState("Rajasthan");
    expect(rjDistricts).toContain("Jaipur");
    expect(rjDistricts).toContain("Jodhpur");
    expect(rjDistricts).toContain("Kota");

    const upDistricts = getDistrictsForState("Uttar Pradesh");
    expect(upDistricts).toContain("Agra");
    expect(upDistricts).toContain("Lucknow");
  });

  it("cascades mandis for a selected district", () => {
    const jaipurMandis = getMandisForDistrict("Rajasthan", "Jaipur", mockDataset);
    expect(jaipurMandis).toEqual(["Jaipur (Grain)"]);

    const agraMandis = getMandisForDistrict("Uttar Pradesh", "Agra", mockDataset);
    expect(agraMandis).toEqual(["Agra APMC"]);
  });

  it("cascades commodities for selected State -> District -> Mandi", () => {
    const commodities = getCommoditiesForSelection("Rajasthan", "Jaipur", "Jaipur (Grain)", mockDataset);
    expect(commodities).toEqual(["Wheat"]);
  });

  it("filters dataset comprehensively across State, District, Mandi, and Search", () => {
    const rjFiltered = filterIndiaMandiDataset(mockDataset, {
      state: "Rajasthan",
      district: "",
      mandi: "",
      commodity: "",
      search: "",
    });
    expect(rjFiltered.length).toBe(2);

    const jaipurFiltered = filterIndiaMandiDataset(mockDataset, {
      state: "Rajasthan",
      district: "Jaipur",
      mandi: "",
      commodity: "",
      search: "",
    });
    expect(jaipurFiltered.length).toBe(1);
    expect(jaipurFiltered[0].crop).toBe("Wheat");

    const searchFiltered = filterIndiaMandiDataset(mockDataset, {
      state: "",
      district: "",
      mandi: "",
      commodity: "",
      search: "आलू",
    });
    expect(searchFiltered.length).toBe(1);
    expect(searchFiltered[0].crop).toBe("Potato");
  });
});
