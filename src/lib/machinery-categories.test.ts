import { describe, expect, it } from "vitest";
import {
  MACHINERY_CATEGORIES,
  MACHINERY_CATEGORY_LABELS,
  MACHINERY_FILTER_CATEGORIES,
  MACHINERY_GROUPS,
  findMachineryGroup,
  getMachineryCategoriesByGroup,
} from "./machinery-categories";

describe("machinery-categories", () => {
  it("covers the full agricultural equipment catalogue", () => {
    expect(MACHINERY_CATEGORIES.length).toBeGreaterThanOrEqual(34);
    for (const expected of [
      "Harvester", "Reaper", "Thresher", "Rotavator", "Cultivator",
      "Seed Drill", "Planter", "Sprayer", "Weeder", "Water Pump",
      "Chaff Cutter", "Grain Dryer",
    ]) {
      expect(MACHINERY_CATEGORY_LABELS).toContain(expected);
    }
  });

  it("uniquely labels every category", () => {
    expect(new Set(MACHINERY_CATEGORY_LABELS).size).toBe(MACHINERY_CATEGORY_LABELS.length);
  });

  it("keeps group references consistent", () => {
    for (const c of MACHINERY_CATEGORIES) {
      expect(MACHINERY_GROUPS).toContain(c.group);
    }
    expect(findMachineryGroup("Tractor")).toBe("Tractor & Power");
    expect(findMachineryGroup("Combine Harvester")).toBe("Harvesting");
    expect(findMachineryGroup("Unknown Machine")).toBeUndefined();
  });

  it("renders extensible filter groups", () => {
    expect(MACHINERY_FILTER_CATEGORIES[0]).toBe("All");
    expect(getMachineryCategoriesByGroup("Irrigation")).toContain("Diesel Pump");
  });
});