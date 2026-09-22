export interface MachineryCategory {
  id: string;
  label: string;
  group: string;
}

export const MACHINERY_GROUPS = [
  "Tractor & Power",
  "Tillage",
  "Sowing & Planting",
  "Crop Care",
  "Harvesting",
  "Post-Harvest",
  "Irrigation",
] as const;

export const MACHINERY_CATEGORIES: MachineryCategory[] = [
  { id: "Mini Tractor", label: "Mini Tractor", group: "Tractor & Power" },
  { id: "Power Tiller", label: "Power Tiller", group: "Tractor & Power" },
  { id: "Tractor", label: "Tractor", group: "Tractor & Power" },
  { id: "Cultivator", label: "Cultivator", group: "Tillage" },
  { id: "Rotavator", label: "Rotavator", group: "Tillage" },
  { id: "Disc Harrow", label: "Disc Harrow", group: "Tillage" },
  { id: "Plough", label: "Plough", group: "Tillage" },
  { id: "Ridger", label: "Ridger", group: "Tillage" },
  { id: "Leveler", label: "Leveler", group: "Tillage" },
  { id: "Seed Drill", label: "Seed Drill", group: "Sowing & Planting" },
  { id: "Seed Cum Fertilizer Drill", label: "Seed Cum Fertilizer Drill", group: "Sowing & Planting" },
  { id: "Planter", label: "Planter", group: "Sowing & Planting" },
  { id: "Transplanter", label: "Transplanter", group: "Sowing & Planting" },
  { id: "Sprayer", label: "Sprayer", group: "Crop Care" },
  { id: "Power Sprayer", label: "Power Sprayer", group: "Crop Care" },
  { id: "Boom Sprayer", label: "Boom Sprayer", group: "Crop Care" },
  { id: "Weeder", label: "Weeder", group: "Crop Care" },
  { id: "Combine Harvester", label: "Combine Harvester", group: "Harvesting" },
  { id: "Harvester", label: "Harvester", group: "Harvesting" },
  { id: "Reaper", label: "Reaper", group: "Harvesting" },
  { id: "Reaper Binder", label: "Reaper Binder", group: "Harvesting" },
  { id: "Thresher", label: "Thresher", group: "Harvesting" },
  { id: "Maize Sheller", label: "Maize Sheller", group: "Harvesting" },
  { id: "Groundnut Digger", label: "Groundnut Digger", group: "Harvesting" },
  { id: "Potato Digger", label: "Potato Digger", group: "Harvesting" },
  { id: "Grain Cleaner", label: "Grain Cleaner", group: "Post-Harvest" },
  { id: "Grain Dryer", label: "Grain Dryer", group: "Post-Harvest" },
  { id: "Chaff Cutter", label: "Chaff Cutter", group: "Post-Harvest" },
  { id: "Feed Mixer", label: "Feed Mixer", group: "Post-Harvest" },
  { id: "Mini Processing Machines", label: "Mini Processing Machines", group: "Post-Harvest" },
  { id: "Water Pump", label: "Water Pump", group: "Irrigation" },
  { id: "Diesel Pump", label: "Diesel Pump", group: "Irrigation" },
  { id: "Electric Pump", label: "Electric Pump", group: "Irrigation" },
  { id: "Agricultural Pipe Equipment", label: "Agricultural Pipe Equipment", group: "Irrigation" },
];

export const MACHINERY_CATEGORY_LABELS = MACHINERY_CATEGORIES.map((c) => c.id);

export const MACHINERY_FILTER_CATEGORIES = [
  "All",
  "Tractor & Power",
  "Tillage",
  "Sowing & Planting",
  "Crop Care",
  "Harvesting",
  "Post-Harvest",
  "Irrigation",
  "Other Farm Equipment",
];

export const getMachineryCategoriesByGroup = (group: string): string[] =>
  MACHINERY_CATEGORIES.filter((c) => c.group === group).map((c) => c.id);

export const findMachineryGroup = (category: string): string | undefined =>
  MACHINERY_CATEGORIES.find((c) => c.id === category)?.group;