import { INDIAN_STATES_AND_DISTRICTS } from "@/features/location/indianStatesData";
import { type MandiPrice, normalizeCommodity } from "./mandi-api";

export interface CanonicalLocation {
  id: string;
  name: string;
}

export interface MandiFilterState {
  state: string;
  district: string;
  mandi: string;
  commodity: string;
  search: string;
}

/**
  Converts any location or crop name to a canonical lowercase URL-friendly ID.
  Example: "Uttar Pradesh" -> "uttar-pradesh"
 */
export function toCanonicalId(name: string): string {
  if (!name) return "";
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
  Returns the canonical list of all 36 Indian States and Union Territories.
 */
export function getAllIndianStatesAndUTs(): string[] {
  return Object.keys(INDIAN_STATES_AND_DISTRICTS).sort((a, b) => a.localeCompare(b));
}

/**
  Returns the canonical list of Districts for a given State/UT.
  Combines official government census data with dynamic districts present in live datasets.
 */
export function getDistrictsForState(stateName: string, liveDataset: MandiPrice[] = []): string[] {
  if (!stateName || stateName.trim() === "") {
    return [];
  }

  const normalizedState = stateName.trim().toLowerCase();
  
  // 1. Find matching state in canonical dictionary (case-insensitive & alias-tolerant)
  const canonicalStateKey = Object.keys(INDIAN_STATES_AND_DISTRICTS).find(
    (s) =>
      s.toLowerCase() === normalizedState ||
      s.toLowerCase().replace(/[^a-z0-9]/g, "") === normalizedState.replace(/[^a-z0-9]/g, "") ||
      (normalizedState.length >= 4 && (s.toLowerCase().includes(normalizedState) || normalizedState.includes(s.toLowerCase())))
  );

  const officialDistricts = canonicalStateKey
    ? INDIAN_STATES_AND_DISTRICTS[canonicalStateKey]
    : [];

  // 2. Extract dynamic districts from live dataset for this state
  const liveDistricts = liveDataset
    .filter(
      (p) =>
        p.state &&
        (p.state.toLowerCase() === normalizedState ||
          p.state.toLowerCase().includes(normalizedState) ||
          normalizedState.includes(p.state.toLowerCase())) &&
        p.district
    )
    .map((p) => p.district.trim());

  // 3. Deduplicate and sort
  const combined = Array.from(new Set([...officialDistricts, ...liveDistricts]))
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b));

  return combined;
}

/**
  Returns the list of Mandis / Markets available for a selected State & District.
 */
export function getMandisForDistrict(
  stateName: string,
  districtName: string,
  dataset: MandiPrice[]
): string[] {
  if (!dataset || dataset.length === 0) return [];

  let filtered = dataset;

  if (stateName && stateName.trim() !== "") {
    const s = stateName.trim().toLowerCase();
    filtered = filtered.filter((p) => p.state && p.state.toLowerCase() === s);
  }

  if (districtName && districtName.trim() !== "") {
    const d = districtName.trim().toLowerCase();
    filtered = filtered.filter((p) => p.district && p.district.toLowerCase() === d);
  }

  const markets = Array.from(
    new Set(filtered.map((p) => p.market).filter((m) => m && m.trim() !== ""))
  ).sort((a, b) => a.localeCompare(b));

  return markets;
}

/**
  Returns the list of Commodities available for a selected State, District & Mandi.
 */
export function getCommoditiesForSelection(
  stateName: string,
  districtName: string,
  mandiName: string,
  dataset: MandiPrice[]
): string[] {
  if (!dataset || dataset.length === 0) return [];

  let filtered = dataset;

  if (stateName && stateName.trim() !== "") {
    const s = stateName.trim().toLowerCase();
    filtered = filtered.filter((p) => p.state && p.state.toLowerCase() === s);
  }

  if (districtName && districtName.trim() !== "") {
    const d = districtName.trim().toLowerCase();
    filtered = filtered.filter((p) => p.district && p.district.toLowerCase() === d);
  }

  if (mandiName && mandiName.trim() !== "") {
    const m = mandiName.trim().toLowerCase();
    filtered = filtered.filter((p) => p.market && p.market.toLowerCase() === m);
  }

  const commodities = Array.from(
    new Set(filtered.map((p) => p.crop || normalizeCommodity(p.originalCommodity || "")).filter(Boolean))
  ).sort((a, b) => a.localeCompare(b));

  return commodities;
}

/**
  Filter, search, deduplicate, and sort mandi price records based on cascading filters.
 */
export function filterIndiaMandiDataset(
  dataset: MandiPrice[],
  filters: MandiFilterState
): MandiPrice[] {
  if (!dataset || dataset.length === 0) return [];

  const { state, district, mandi, commodity, search } = filters;
  const stateNorm = state ? state.trim().toLowerCase() : "";
  const distNorm = district ? district.trim().toLowerCase() : "";
  const mandiNorm = mandi ? mandi.trim().toLowerCase() : "";
  const commodityNorm = commodity ? commodity.trim().toLowerCase() : "";
  const searchNorm = search ? search.trim().toLowerCase() : "";

  return dataset.filter((item) => {
    // 1. Cascading State Filter
    if (stateNorm && item.state.toLowerCase() !== stateNorm) {
      return false;
    }

    // 2. Cascading District Filter
    if (distNorm && item.district.toLowerCase() !== distNorm) {
      return false;
    }

    // 3. Cascading Mandi Filter
    if (mandiNorm && item.market.toLowerCase() !== mandiNorm) {
      return false;
    }

    // 4. Commodity Filter
    if (commodityNorm) {
      const cropNorm = item.crop.toLowerCase();
      const origNorm = (item.originalCommodity || "").toLowerCase();
      const normNorm = (item.normalizedCommodity || "").toLowerCase();
      if (cropNorm !== commodityNorm && origNorm !== commodityNorm && normNorm !== commodityNorm) {
        return false;
      }
    }

    // 5. Search Query Matching (State, District, Mandi, Crop, Variety, Category)
    if (searchNorm) {
      const matchState = item.state.toLowerCase().includes(searchNorm);
      const matchDistrict = item.district.toLowerCase().includes(searchNorm);
      const matchMarket = item.market.toLowerCase().includes(searchNorm);
      const matchCrop = item.crop.toLowerCase().includes(searchNorm);
      const matchCropHi = item.cropHi ? item.cropHi.toLowerCase().includes(searchNorm) : false;
      const matchVariety = item.variety ? item.variety.toLowerCase().includes(searchNorm) : false;
      const matchCategory = item.category ? item.category.toLowerCase().includes(searchNorm) : false;

      if (
        !matchState &&
        !matchDistrict &&
        !matchMarket &&
        !matchCrop &&
        !matchCropHi &&
        !matchVariety &&
        !matchCategory
      ) {
        return false;
      }
    }

    return true;
  });
}
