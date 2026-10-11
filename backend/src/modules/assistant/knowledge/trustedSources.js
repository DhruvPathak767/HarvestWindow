/**
 * Phase AI-7: Trusted Agricultural Source Registry
 * Curated registry of authoritative, accredited agricultural research bodies,
 * universities, and extension systems.
 */

export const TRUSTED_AGRICULTURAL_SOURCES = [
  {
    id: "fao",
    name: "Food and Agriculture Organization (FAO)",
    organizationType: "Intergovernmental / UN",
    url: "https://www.fao.org",
    coverage: "Global and South Asian Agro-Ecological Zones, crop calendars, FAO GAEZ v4",
    topics: ["crop_calendars", "harvest_timing", "climate_suitability", "post_harvest", "soil_management"],
    verificationStatus: "verified",
  },
  {
    id: "icar",
    name: "Indian Council of Agricultural Research (ICAR)",
    organizationType: "National Apex Agricultural Body (India)",
    url: "https://icar.org.in",
    coverage: "All-India crop management, package of practices, agronomy, crop protection",
    topics: ["package_of_practices", "harvest_timing", "yield_standards", "pest_disease", "irrigation"],
    verificationStatus: "verified",
  },
  {
    id: "iiss",
    name: "ICAR - Indian Institute of Soil Science (IISS)",
    organizationType: "Specialized ICAR Institute (Bhopal)",
    url: "https://iiss.icar.gov.in",
    coverage: "Soil health, soil testing, fertilizer recommendations, micronutrients, soil carbon",
    topics: ["soil_health", "nutrient_management", "fertilizer_application", "soil_ph", "organic_matter"],
    verificationStatus: "verified",
  },
  {
    id: "crida",
    name: "ICAR - Central Research Institute for Dryland Agriculture (CRIDA)",
    organizationType: "Specialized ICAR Institute (Hyderabad)",
    url: "http://www.crida.in",
    coverage: "Rainfed farming, drought contingency, weather-resilient agronomy",
    topics: ["weather_impacts", "drought_management", "rainfall_variability", "contingency_planning"],
    verificationStatus: "verified",
  },
  {
    id: "pau",
    name: "Punjab Agricultural University (PAU)",
    organizationType: "State Agricultural University (Ludhiana)",
    url: "https://pau.edu",
    coverage: "North-Western Indo-Gangetic Plains, wheat, paddy, mustard, cotton agronomy",
    topics: ["wheat_management", "rice_agronomy", "harvest_moisture", "rotational_cropping"],
    verificationStatus: "verified",
  },
  {
    id: "tnau",
    name: "Tamil Nadu Agricultural University (TNAU) Agritech Portal",
    organizationType: "State Agricultural University (Coimbatore)",
    url: "https://agritech.tnau.ac.in",
    coverage: "South Indian cropping systems, horticulture, integrated pest management, disease diagnostics",
    topics: ["pest_disease_control", "horticulture", "irrigation_scheduling", "crop_protection"],
    verificationStatus: "verified",
  },
  {
    id: "imd",
    name: "India Meteorological Department (IMD) - Agromet Advisory Services",
    organizationType: "National Meteorological Department (India)",
    url: "https://mausam.imd.gov.in",
    coverage: "District-level agrometeorological advisories, weather risk mitigation, monsoon forecasts",
    topics: ["weather_impacts", "frost_warning", "unseasonal_rain", "harvest_weather_guidance"],
    verificationStatus: "verified",
  },
];

export function getTrustedSourceById(id) {
  return TRUSTED_AGRICULTURAL_SOURCES.find((s) => s.id === id) || null;
}
