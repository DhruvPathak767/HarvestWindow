import type { CropCatalogEntry } from "@/types";

/** Pexels delivers the same image at any crop size — keeps payloads small. */
const px = (id: number, w: number, h: number) =>
  `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&fit=crop&w=${w}&h=${h}`;

/** Photography used across the marketing site and product surfaces. */
export const IMAGES = {
  heroField: px(6489275, 1000, 1250),
  heroWide: px(19429360, 1600, 900),
  problemEarly: px(10244422, 900, 640),
  problemLate: px(12873375, 900, 640),
  problemData: px(39895167, 900, 640),
  howItWorks: px(2389122, 1200, 800),
  authSplit: "/images/3d/portal.jpg",
  authSplitAlt: "/images/3d/island.jpg",
  finalCta: "/images/3d/portal.jpg",
  showcaseField: px(12529226, 1200, 700),
  cropDetail: px(8289984, 1200, 700),
} as const;

export const CROP_IMAGES: Record<string, string> = {
  "Wheat": px(6489275, 800, 600),
  "Rice (Paddy)": px(8289984, 800, 600),
  "Maize": px(5029646, 800, 600),
  "Cotton": px(40103320, 800, 600),
  "Tomato": px(32934453, 800, 600),
  "Bajra (Pearl Millet)": px(12904852, 800, 600),
};

/**
 * Agronomic reference ranges used by the demo forecast engine.
 * Durations are typical sowing → harvest-window-open ranges for Indian growing
 * conditions and are treated as reference data, not live model output.
 */
export const CROP_CATALOG: CropCatalogEntry[] = [
  {
    name: "Wheat",
    family: "cereal",
    stageTemplateName: "wheat",
    durationRange: [135, 158],
    seasons: ["Rabi"],
    searchTerms: ["gehu", "hd-3086", "hd-2967", "lokvan", "cereal"],
    note: "Harvest window usually opens as grain hardens and moisture drops.",
    image: CROP_IMAGES["Wheat"],
  },
  {
    name: "Rice (Paddy)",
    family: "cereal",
    stageTemplateName: "cerealGrain",
    durationRange: [120, 150],
    seasons: ["Kharif", "Rabi", "Summer"],
    searchTerms: ["paddy", "dhan", "jyothi", "samba", "adt-43", "cereal"],
    note: "Grain filling and moisture content drive the opening of the window.",
    image: CROP_IMAGES["Rice (Paddy)"],
  },
  {
    name: "Maize",
    family: "cereal",
    stageTemplateName: "cerealGrain",
    durationRange: [95, 125],
    seasons: ["Kharif", "Rabi"],
    searchTerms: ["corn", "makka", "dkc", "cereal"],
    note: "Dent stage to husk dry-down marks the estimated window.",
    image: CROP_IMAGES["Maize"],
  },
  {
    name: "Cotton",
    family: "fibre",
    stageTemplateName: "fibre",
    durationRange: [165, 200],
    seasons: ["Kharif"],
    searchTerms: ["kapas", "bunny", "boll", "fibre"],
    note: "Boll burst is staggered, so the window is wider than for cereals.",
    image: CROP_IMAGES["Cotton"],
  },
  {
    name: "Tomato",
    family: "vegetable",
    stageTemplateName: "fruitingVegetable",
    durationRange: [75, 100],
    seasons: ["Kharif", "Rabi", "Summer"],
    searchTerms: ["tamatar", "arka rakshak", "vegetable", "horticulture"],
    note: "Picking windows repeat; the estimate covers the first main flush.",
    image: CROP_IMAGES["Tomato"],
  },
  {
    name: "Groundnut",
    family: "oilseed",
    stageTemplateName: "pod",
    durationRange: [105, 130],
    seasons: ["Kharif", "Summer"],
    searchTerms: ["peanut", "mungfali", "tmv-2", "oilseed", "pod"],
    note: "Pod fill and shell colour change indicate the window is near.",
  },
  {
    name: "Soybean",
    family: "pulse",
    stageTemplateName: "pod",
    durationRange: [95, 118],
    seasons: ["Kharif"],
    searchTerms: ["soya", "bean", "pulse"],
    note: "Leaf drop and pod rattle are the usual field indicators.",
  },
  {
    name: "Chickpea",
    family: "pulse",
    stageTemplateName: "pod",
    durationRange: [100, 122],
    seasons: ["Rabi"],
    searchTerms: ["chana", "gram", "bengal gram", "pulse"],
    note: "Pod maturity and plant senescence open the harvest window.",
  },
  {
    name: "Mustard",
    family: "oilseed",
    stageTemplateName: "cerealGrain",
    durationRange: [110, 135],
    seasons: ["Rabi"],
    searchTerms: ["sarson", "rai", "oilseed"],
    note: "Siliqua colour change drives timing; shattering risk rises late.",
  },
  {
    name: "Potato",
    family: "vegetable",
    stageTemplateName: "fruitingVegetable",
    durationRange: [85, 110],
    seasons: ["Rabi", "Winter"],
    searchTerms: ["aloo", "tuber", "vegetable"],
    note: "Haulm senescence and skin set indicate lifting readiness.",
  },
  {
    name: "Onion",
    family: "vegetable",
    stageTemplateName: "fruitingVegetable",
    durationRange: [100, 130],
    seasons: ["Kharif", "Rabi"],
    searchTerms: ["pyaz", "kanda", "vegetable"],
    note: "Neck fall and outer skin cure precede the harvest window.",
  },
  {
    name: "Turmeric",
    family: "plantation",
    stageTemplateName: "cane",
    durationRange: [210, 250],
    seasons: ["Kharif"],
    searchTerms: ["haldi", "rhizome", "spice"],
    note: "Leaf yellowing and rhizome maturity define the long window.",
  },
  {
    name: "Bajra (Pearl Millet)",
    family: "cereal",
    stageTemplateName: "cerealGrain",
    durationRange: [80, 105],
    seasons: ["Kharif"],
    searchTerms: ["pearl millet", "bajri", "cereal"],
    note: "Short-duration cereal; grain hardening opens the window quickly.",
    image: CROP_IMAGES["Bajra (Pearl Millet)"],
  },
  {
    name: "Sugarcane",
    family: "plantation",
    stageTemplateName: "cane",
    durationRange: [330, 370],
    seasons: ["Annual"],
    searchTerms: ["ganna", "cane", "co 0238", "plantation"],
    note: "Sucrose accumulation determines the milling window.",
  },
];

export function findCatalogEntry(cropName: string): CropCatalogEntry | undefined {
  return CROP_CATALOG.find((c) => c.name.toLowerCase() === cropName.toLowerCase());
}

export function searchCatalog(query: string): CropCatalogEntry[] {
  const q = query.trim().toLowerCase();
  if (!q) return CROP_CATALOG;
  return CROP_CATALOG.filter((entry) =>
    [entry.name, ...entry.searchTerms, entry.family]
      .join(" ")
      .toLowerCase()
      .includes(q)
  );
}

export const INDIAN_STATES = [
  "Andhra Pradesh",
  "Assam",
  "Bihar",
  "Chhattisgarh",
  "Gujarat",
  "Haryana",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Madhya Pradesh",
  "Maharashtra",
  "Odisha",
  "Punjab",
  "Rajasthan",
  "Tamil Nadu",
  "Telangana",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
];
