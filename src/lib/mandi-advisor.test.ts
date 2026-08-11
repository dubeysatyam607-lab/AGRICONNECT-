import { describe, it, expect } from "vitest";
import { generateSellingAdvice } from "./mandi-advisor";
import type { MandiPrice } from "./mandi-api";

describe("Mandi AI Selling Advisor Engine", () => {
  const baseItem: MandiPrice = {
    id: "wheat::jaipur::jaipur::rajasthan",
    crop: "Wheat",
    cropHi: "गेहूं",
    cropImage: "https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b",
    category: "Cereals",
    price: 2550,
    market: "Jaipur Mandi",
    district: "Jaipur",
    state: "Rajasthan",
    minPrice: 2400,
    maxPrice: 2600,
    msp: 2425,
    unit: "₹/Quintal",
    status: "up",
    change: "+3.2%",
    arrivalDate: "2026-08-06",
    lastUpdatedText: "2026-08-06",
  };

  it("recommends SELL_NOW when price is significantly above MSP", () => {
    const advice = generateSellingAdvice(baseItem);
    expect(advice.action).toBe("SELL_NOW");
    expect(advice.badgeColor).toBe("emerald");
    expect(advice.badgeLabelHi).toContain("आज बेचें");
    expect(advice.confidence).toBeGreaterThanOrEqual(85);
    expect(advice.reasonHi).toContain("गेहूं का भाव");
    expect(advice.reasonHi).toContain("MSP");
  });

  it("recommends HOLD_LONG_TERM when price is depressed below MSP", () => {
    const depressedItem: MandiPrice = {
      ...baseItem,
      price: 2200,
      minPrice: 2100,
      maxPrice: 2300,
      msp: 2425,
      change: "-2.5%",
    };
    const advice = generateSellingAdvice(depressedItem);
    expect(advice.action).toBe("HOLD_LONG_TERM");
    expect(advice.badgeColor).toBe("rose");
    expect(advice.badgeLabelHi).toContain("रोकें");
    expect(advice.reasonHi).toContain("कम");
  });

  it("calculates expected price range and extra profit on 50 quintals", () => {
    const advice = generateSellingAdvice(baseItem);
    expect(advice.minExpectedPrice).toBeGreaterThan(0);
    expect(advice.maxExpectedPrice).toBeGreaterThan(advice.minExpectedPrice);
    expect(advice.extraProfit50Qtl).toBeGreaterThan(0);
  });
});
