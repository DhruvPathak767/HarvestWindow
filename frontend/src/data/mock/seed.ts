import type {
  ActivityEvent,
  AppSettings,
  Crop,
  Farm,
  Recommendation,
  UserProfile,
  WeatherCondition,
} from "@/types";
import { addDays, toISODate } from "@/utils/date";

const TODAY = new Date();

/** ISO date `n` days before today — keeps every demo date internally consistent. */
export const daysAgo = (n: number) => toISODate(addDays(TODAY, -n));
export const daysAhead = (n: number) => toISODate(addDays(TODAY, n));
/** ISO timestamp `n` hours before now. */
const hoursAgo = (n: number) => new Date(Date.now() - n * 3_600_000).toISOString();

export const DEMO_USER: UserProfile = {
  fullName: "Ananya Deshpande",
  email: "ananya@harvestwindow.demo",
  role: "Farm manager",
  organisation: "Greenridge Producer Group",
};

export const DEMO_CREDENTIALS = {
  email: "ananya@harvestwindow.demo",
  password: "harvest-demo",
};

export const SEED_FARMS: Farm[] = [
  {
    id: "farm-greenridge",
    name: "Greenridge Farm",
    state: "Karnataka",
    district: "Hassan",
    latitude: 13.0068,
    longitude: 76.1001,
    area: 12.5,
    areaUnit: "hectare",
    notes:
      "Irrigated bore-well blocks with two rainfed fields on the eastern boundary.",
    createdAt: daysAgo(214),
  },
  {
    id: "farm-meher",
    name: "Meher Fields",
    state: "Punjab",
    district: "Ludhiana",
    latitude: 30.9009,
    longitude: 75.8573,
    area: 16,
    areaUnit: "acre",
    notes: "Family holding, canal irrigation plus tube-well backup.",
    createdAt: daysAgo(188),
  },
  {
    id: "farm-kaveri",
    name: "Kaveri Belt Collective",
    state: "Tamil Nadu",
    district: "Thanjavur",
    latitude: 10.787,
    longitude: 79.1381,
    area: 21,
    areaUnit: "hectare",
    notes: "Seven member farms coordinated through the delta collective.",
    createdAt: daysAgo(96),
  },
];

export const SEED_CROPS: Crop[] = [
  {
    id: "crop-paddy-jyothi",
    farmId: "farm-greenridge",
    name: "Rice (Paddy)",
    variety: "Jyothi",
    plantingDate: daysAgo(132),
    growthStage: "Grain filling",
    fieldArea: 4.2,
    expectedYield: "6.2 t/ha",
    irrigation: "irrigated",
    notes: "Transplanted after pre-monsoon showers; drained 12 days ago.",
    createdAt: hoursAgo(216),
  },
  {
    id: "crop-tomato-arka",
    farmId: "farm-greenridge",
    name: "Tomato",
    variety: "Arka Rakshak",
    plantingDate: daysAgo(70),
    growthStage: "Fruit development",
    fieldArea: 1.1,
    expectedYield: "38 t/ha",
    irrigation: "irrigated",
    notes: "Staked, drip irrigated. First flush colouring unevenly.",
    createdAt: hoursAgo(150),
  },
  {
    id: "crop-groundnut-tmv",
    farmId: "farm-greenridge",
    name: "Groundnut",
    variety: "TMV-2",
    plantingDate: daysAgo(38),
    growthStage: "Flowering",
    fieldArea: 2,
    expectedYield: "2.1 t/ha",
    irrigation: "rainfed",
    createdAt: hoursAgo(88),
  },
  {
    id: "crop-wheat-hd3086",
    farmId: "farm-meher",
    name: "Wheat",
    variety: "HD-3086",
    plantingDate: daysAgo(141),
    growthStage: "Grain filling",
    fieldArea: 9.4,
    expectedYield: "5.4 t/ha",
    irrigation: "irrigated",
    notes: "Combine booking confirmed with the village contractor.",
    createdAt: hoursAgo(240),
  },
  {
    id: "crop-maize-dkc",
    farmId: "farm-meher",
    name: "Maize",
    variety: "DKC-9144",
    plantingDate: daysAgo(52),
    growthStage: "Vegetative growth",
    fieldArea: 6.6,
    expectedYield: "7.8 t/ha",
    irrigation: "irrigated",
    createdAt: hoursAgo(120),
  },
  {
    id: "crop-cotton-bunny",
    farmId: "farm-kaveri",
    name: "Cotton",
    variety: "Bunny",
    plantingDate: daysAgo(152),
    growthStage: "Boll development",
    fieldArea: 6.5,
    expectedYield: "2.4 t/ha lint",
    irrigation: "rainfed",
    createdAt: hoursAgo(300),
  },
  {
    id: "crop-paddy-samba",
    farmId: "farm-kaveri",
    name: "Rice (Paddy)",
    variety: "Samba ADT-43",
    plantingDate: daysAgo(178),
    growthStage: "Maturity",
    fieldArea: 8,
    expectedYield: "5.8 t/ha",
    irrigation: "irrigated",
    notes: "Harvest completed on the lower block; upper block still standing.",
    createdAt: hoursAgo(360),
  },
  {
    id: "crop-sugarcane-co0238",
    farmId: "farm-kaveri",
    name: "Sugarcane",
    variety: "Co 0238",
    plantingDate: daysAgo(205),
    growthStage: "Grand growth",
    fieldArea: 6.5,
    expectedYield: "86 t/ha",
    irrigation: "irrigated",
    createdAt: hoursAgo(420),
  },
];

export interface WeatherPatternDay {
  minTempC: number;
  maxTempC: number;
  rainfallMm: number;
  humidity: number;
  condition: WeatherCondition;
}

export interface WeatherPattern {
  farmId: string;
  locationLabel: string;
  current: {
    temperatureC: number;
    feelsLikeC: number;
    humidity: number;
    windKph: number;
    rainfallMm: number;
    condition: WeatherCondition;
    observedHoursAgo: number;
  };
  summary: string;
  daily: WeatherPatternDay[];
  cautions: {
    id: string;
    level: "advisory" | "watch" | "caution";
    title: string;
    detail: string;
    dayOffsets: [number, number];
  }[];
}

export const WEATHER_PATTERNS: WeatherPattern[] = [
  {
    farmId: "farm-greenridge",
    locationLabel: "Hassan, Karnataka",
    current: {
      temperatureC: 29,
      feelsLikeC: 31,
      humidity: 68,
      windKph: 11,
      rainfallMm: 0,
      condition: "partly-cloudy",
      observedHoursAgo: 3,
    },
    summary:
      "Warm with building cloud. Two rain spells later in the week, the heavier one falling inside the tomato picking window.",
    daily: [
      { minTempC: 21, maxTempC: 31, rainfallMm: 0, humidity: 64, condition: "partly-cloudy" },
      { minTempC: 22, maxTempC: 32, rainfallMm: 0, humidity: 61, condition: "clear" },
      { minTempC: 22, maxTempC: 30, rainfallMm: 4, humidity: 74, condition: "rain" },
      { minTempC: 21, maxTempC: 28, rainfallMm: 18, humidity: 84, condition: "rain" },
      { minTempC: 21, maxTempC: 27, rainfallMm: 26, humidity: 88, condition: "storm" },
      { minTempC: 20, maxTempC: 28, rainfallMm: 9, humidity: 82, condition: "rain" },
      { minTempC: 20, maxTempC: 30, rainfallMm: 1, humidity: 72, condition: "partly-cloudy" },
      { minTempC: 21, maxTempC: 31, rainfallMm: 0, humidity: 66, condition: "clear" },
      { minTempC: 21, maxTempC: 32, rainfallMm: 0, humidity: 63, condition: "clear" },
      { minTempC: 22, maxTempC: 31, rainfallMm: 3, humidity: 70, condition: "partly-cloudy" },
    ],
    cautions: [
      {
        id: "caution-rain-tomato",
        level: "caution",
        title: "Rain spell inside an open picking window",
        detail:
          "Roughly 44 mm is indicated across the next three days. Wet fruit and soft field access can delay picking and raise spoilage risk.",
        dayOffsets: [2, 5],
      },
      {
        id: "caution-paddy-drain",
        level: "advisory",
        title: "Keep paddy drainage lines clear",
        detail:
          "Standing water after the rain spell will slow grain dry-down for the Jyothi block.",
        dayOffsets: [3, 7],
      },
    ],
  },
  {
    farmId: "farm-meher",
    locationLabel: "Ludhiana, Punjab",
    current: {
      temperatureC: 33,
      feelsLikeC: 34,
      humidity: 34,
      windKph: 14,
      rainfallMm: 0,
      condition: "clear",
      observedHoursAgo: 2,
    },
    summary:
      "Dry, warm and mostly clear through the period — conditions that suit grain dry-down and combine work.",
    daily: [
      { minTempC: 19, maxTempC: 34, rainfallMm: 0, humidity: 32, condition: "clear" },
      { minTempC: 20, maxTempC: 35, rainfallMm: 0, humidity: 30, condition: "clear" },
      { minTempC: 21, maxTempC: 36, rainfallMm: 0, humidity: 28, condition: "clear" },
      { minTempC: 22, maxTempC: 36, rainfallMm: 0, humidity: 29, condition: "partly-cloudy" },
      { minTempC: 22, maxTempC: 35, rainfallMm: 0, humidity: 33, condition: "partly-cloudy" },
      { minTempC: 21, maxTempC: 33, rainfallMm: 1, humidity: 41, condition: "partly-cloudy" },
      { minTempC: 20, maxTempC: 32, rainfallMm: 0, humidity: 38, condition: "clear" },
      { minTempC: 19, maxTempC: 33, rainfallMm: 0, humidity: 36, condition: "clear" },
      { minTempC: 20, maxTempC: 34, rainfallMm: 0, humidity: 34, condition: "clear" },
      { minTempC: 21, maxTempC: 35, rainfallMm: 0, humidity: 31, condition: "clear" },
    ],
    cautions: [
      {
        id: "caution-heat-wheat",
        level: "watch",
        title: "Warm spell may advance the wheat window",
        detail:
          "Four consecutive days above 35 °C can speed grain dry-down. Re-check the block two days before the booked combine slot.",
        dayOffsets: [1, 4],
      },
      {
        id: "caution-wind-maize",
        level: "advisory",
        title: "Afternoon gusts on young maize",
        detail:
          "Winds near 14 km/h in the afternoons — check irrigation channels on the lighter soils.",
        dayOffsets: [0, 6],
      },
    ],
  },
  {
    farmId: "farm-kaveri",
    locationLabel: "Thanjavur, Tamil Nadu",
    current: {
      temperatureC: 32,
      feelsLikeC: 36,
      humidity: 76,
      windKph: 9,
      rainfallMm: 2,
      condition: "overcast",
      observedHoursAgo: 4,
    },
    summary:
      "Humid delta weather with scattered showers. Short dry breaks are the workable slots for cotton picking.",
    daily: [
      { minTempC: 26, maxTempC: 33, rainfallMm: 6, humidity: 78, condition: "rain" },
      { minTempC: 26, maxTempC: 34, rainfallMm: 2, humidity: 75, condition: "overcast" },
      { minTempC: 26, maxTempC: 34, rainfallMm: 0, humidity: 72, condition: "partly-cloudy" },
      { minTempC: 25, maxTempC: 33, rainfallMm: 12, humidity: 83, condition: "rain" },
      { minTempC: 25, maxTempC: 32, rainfallMm: 21, humidity: 87, condition: "storm" },
      { minTempC: 25, maxTempC: 32, rainfallMm: 8, humidity: 84, condition: "rain" },
      { minTempC: 25, maxTempC: 33, rainfallMm: 1, humidity: 76, condition: "overcast" },
      { minTempC: 26, maxTempC: 34, rainfallMm: 0, humidity: 71, condition: "partly-cloudy" },
      { minTempC: 26, maxTempC: 35, rainfallMm: 0, humidity: 68, condition: "clear" },
      { minTempC: 26, maxTempC: 34, rainfallMm: 4, humidity: 74, condition: "partly-cloudy" },
    ],
    cautions: [
      {
        id: "caution-cotton-stain",
        level: "caution",
        title: "Showers during boll burst risk lint staining",
        detail:
          "Rain on open bolls reduces grade. Prioritise picking on the two dry days indicated mid-period.",
        dayOffsets: [3, 5],
      },
      {
        id: "caution-cane-water",
        level: "advisory",
        title: "Reduce cane irrigation during wet days",
        detail:
          "About 33 mm of indicated rain covers part of the cane water requirement this week.",
        dayOffsets: [0, 6],
      },
    ],
  },
];

export const SEED_RECOMMENDATIONS: Recommendation[] = [
  {
    id: "rec-tomato-rain",
    cropId: "crop-tomato-arka",
    farmId: "farm-greenridge",
    title: "Review the rain spell before scheduling the next tomato pick",
    reason:
      "The demo weather dataset indicates ~44 mm over three days close to the opening of the picking window.",
    priority: "high",
    suggestedAction:
      "Walk the block tomorrow, note colouring fruit, and hold the picking date until the dry slot after the rain.",
    status: "open",
    createdAt: hoursAgo(5),
    relevantDate: daysAhead(3),
    category: "weather",
  },
  {
    id: "rec-paddy-moisture",
    cropId: "crop-paddy-jyothi",
    farmId: "farm-greenridge",
    title: "Check grain moisture on the Jyothi block",
    reason:
      "The crop sits inside its estimated harvest window and was drained 12 days ago; moisture decides whether to cut now or wait.",
    priority: "high",
    suggestedAction:
      "Sample three points across the block, record moisture, and compare against your buyer's acceptance range.",
    status: "open",
    createdAt: hoursAgo(9),
    relevantDate: daysAhead(1),
    category: "timing",
  },
  {
    id: "rec-wheat-combine",
    cropId: "crop-wheat-hd3086",
    farmId: "farm-meher",
    title: "Confirm the combine slot for the warm days ahead",
    reason:
      "Four days above 35 °C can bring the wheat window forward. The contractor slot is currently held for later.",
    priority: "medium",
    suggestedAction:
      "Call the contractor and offer an earlier date; keep the drying yard clear for the first load.",
    status: "open",
    createdAt: hoursAgo(26),
    relevantDate: daysAhead(2),
    category: "logistics",
  },
  {
    id: "rec-cotton-dryday",
    cropId: "crop-cotton-bunny",
    farmId: "farm-kaveri",
    title: "Plan cotton picking around the two dry days",
    reason:
      "Rain on open bolls lowers lint grade. The dataset shows short dry breaks between showers.",
    priority: "high",
    suggestedAction:
      "Roster pickers for the dry days and store the previous pick under cover until it moves.",
    status: "open",
    createdAt: hoursAgo(30),
    relevantDate: daysAhead(2),
    category: "weather",
  },
  {
    id: "rec-groundnut-pegging",
    cropId: "crop-groundnut-tmv",
    farmId: "farm-greenridge",
    title: "Record flowering and pegging dates for the groundnut block",
    reason:
      "The forecast for this block uses only the planting date. Adding stage observations tightens the estimated window.",
    priority: "low",
    suggestedAction:
      "Note the first pegging date and any patchy emergence in the crop record this week.",
    status: "open",
    createdAt: hoursAgo(52),
    category: "monitoring",
  },
  {
    id: "rec-maize-nutrient",
    cropId: "crop-maize-dkc",
    farmId: "farm-meher",
    title: "Note the current growth stage for the maize block",
    reason:
      "Maize is in vegetative growth and the window is still weeks away; a stage note keeps later estimates stable.",
    priority: "low",
    suggestedAction:
      "Log plant height and leaf stage at the next field visit.",
    status: "open",
    createdAt: hoursAgo(74),
    category: "monitoring",
  },
  {
    id: "rec-samba-review",
    cropId: "crop-paddy-samba",
    farmId: "farm-kaveri",
    title: "Close out the Samba ADT-43 record after harvest",
    reason:
      "The estimated window has passed and the lower block is harvested. The record still shows as active.",
    priority: "medium",
    suggestedAction:
      "Mark the crop as harvested, or archive the record so the overview reflects the current season.",
    status: "open",
    createdAt: hoursAgo(96),
    category: "monitoring",
  },
];

export const SEED_ACTIVITY: ActivityEvent[] = [
  {
    id: "act-1",
    type: "recommendation-generated",
    message: "Weather caution raised for Tomato · Arka Rakshak",
    at: hoursAgo(5),
    farmId: "farm-greenridge",
    cropId: "crop-tomato-arka",
  },
  {
    id: "act-2",
    type: "window-changed",
    message: "Harvest window for Wheat · HD-3086 moved 2 days earlier",
    at: hoursAgo(11),
    farmId: "farm-meher",
    cropId: "crop-wheat-hd3086",
  },
  {
    id: "act-3",
    type: "forecast-refreshed",
    message: "All forecasts refreshed across 3 farms",
    at: hoursAgo(14),
  },
  {
    id: "act-4",
    type: "crop-added",
    message: "Groundnut · TMV-2 added to Greenridge Farm",
    at: hoursAgo(88),
    farmId: "farm-greenridge",
    cropId: "crop-groundnut-tmv",
  },
  {
    id: "act-5",
    type: "recommendation-generated",
    message: "Combine slot recommendation created for Meher Fields",
    at: hoursAgo(26),
    farmId: "farm-meher",
    cropId: "crop-wheat-hd3086",
  },
  {
    id: "act-6",
    type: "farm-added",
    message: "Kaveri Belt Collective added as a member farm",
    at: hoursAgo(96),
    farmId: "farm-kaveri",
  },
];

export const DEFAULT_SETTINGS: AppSettings = {
  areaUnit: "hectare",
  defaultFarmId: null,
  language: "en",
  temperatureUnit: "c",
  compactDensity: false,
  notifications: {
    harvestWindowAlerts: true,
    weatherCautions: true,
    weeklySummary: false,
  },
};
