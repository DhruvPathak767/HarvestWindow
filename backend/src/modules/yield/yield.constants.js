/**
 * Yield Forecasting & Production Estimation Engine Constants (Phase AI-5).
 */

export const PREDICTION_STAGES = {
  BEFORE_SOWING: "BEFORE_SOWING",
  VEGETATIVE: "VEGETATIVE",
  MID_SEASON: "MID_SEASON",
  NEAR_HARVEST: "NEAR_HARVEST",
  POST_HARVEST: "POST_HARVEST",
};

export const CONFIDENCE_LEVELS = {
  HIGH: "HIGH",
  MODERATE: "MODERATE",
  LOW: "LOW",
};

export const AREA_UNITS = {
  HECTARE: "HECTARE",
  HA: "HECTARE",
  ACRE: "ACRE",
  ACRES: "ACRE",
  SQ_METER: "SQ_METER",
  SQUARE_METRE: "SQ_METER",
  SQUARE_METRES: "SQ_METER",
  BIGHA: "BIGHA",
  GUNTHA: "GUNTHA",
};

// Conversion factors to canonical Hectares
export const AREA_TO_HECTARES = {
  HECTARE: 1.0,
  HA: 1.0,
  ACRE: 0.404686,
  ACRES: 0.404686,
  SQ_METER: 0.0001,
  SQUARE_METRE: 0.0001,
  SQUARE_METRES: 0.0001,
  BIGHA: 0.16187,
  GUNTHA: 0.010117,
};

// Quantity to Tonnes conversion factors for actual harvested production
export const QUANTITY_TO_TONNES = {
  TONNE: 1.0,
  TONNES: 1.0,
  METRIC_TONNE: 1.0,
  MT: 1.0,
  QUINTAL: 0.1,    // 1 Quintal = 100 kg = 0.1 metric tonne
  QUINTALS: 0.1,
  KG: 0.001,
  KILOGRAM: 0.001,
};

// ICAR & National Directorate of Economics and Statistics Benchmark Yields (t/ha)
export const AGRONOMIC_YIELD_BENCHMARKS = {
  Wheat: { min: 1.5, median: 3.4, max: 6.5, category: "Cereal" },
  Rice: { min: 1.5, median: 2.8, max: 5.5, category: "Cereal" },
  Paddy: { min: 1.5, median: 2.8, max: 5.5, category: "Cereal" },
  Maize: { min: 1.8, median: 3.2, max: 6.8, category: "Cereal" },
  Barley: { min: 1.2, median: 2.6, max: 4.5, category: "Cereal" },
  Bajra: { min: 0.8, median: 1.4, max: 2.8, category: "Millet" },
  Jowar: { min: 0.7, median: 1.1, max: 2.4, category: "Millet" },
  Gram: { min: 0.7, median: 1.1, max: 2.2, category: "Pulse" },
  Chickpea: { min: 0.7, median: 1.1, max: 2.2, category: "Pulse" },
  "Arhar/Tur": { min: 0.6, median: 0.95, max: 2.0, category: "Pulse" },
  "Pigeon Pea": { min: 0.6, median: 0.95, max: 2.0, category: "Pulse" },
  "Moong(Green Gram)": { min: 0.4, median: 0.65, max: 1.4, category: "Pulse" },
  Urad: { min: 0.4, median: 0.65, max: 1.4, category: "Pulse" },
  "Rapeseed &Mustard": { min: 0.8, median: 1.5, max: 2.6, category: "Oilseed" },
  Mustard: { min: 0.8, median: 1.5, max: 2.6, category: "Oilseed" },
  Groundnut: { min: 1.0, median: 1.8, max: 3.5, category: "Oilseed" },
  Soybean: { min: 0.9, median: 1.4, max: 2.8, category: "Oilseed" },
  Sunflower: { min: 0.6, median: 1.0, max: 2.0, category: "Oilseed" },
  Sesamum: { min: 0.3, median: 0.45, max: 1.0, category: "Oilseed" },
  "Cotton(lint)": { min: 0.3, median: 0.55, max: 1.5, category: "Fiber" },
  Cotton: { min: 0.3, median: 0.55, max: 1.5, category: "Fiber" },
  Jute: { min: 1.8, median: 2.6, max: 4.0, category: "Fiber" },
  Sugarcane: { min: 50.0, median: 72.0, max: 115.0, category: "Commercial" },
  Potato: { min: 14.0, median: 22.5, max: 35.0, category: "Tuber" },
  Onion: { min: 10.0, median: 17.0, max: 28.0, category: "Vegetable" },
  Tomato: { min: 15.0, median: 24.0, max: 40.0, category: "Vegetable" },
  Tapioca: { min: 18.0, median: 30.0, max: 45.0, category: "Tuber" },
  Banana: { min: 25.0, median: 42.0, max: 65.0, category: "Fruit" },
};

export const DEFAULT_YIELD_BENCHMARK = {
  min: 0.8,
  median: 2.2,
  max: 5.0,
  category: "Generic",
};
