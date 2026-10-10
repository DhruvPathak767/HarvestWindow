# HarvestWindow Phase AI-1: Agricultural Data Quality Report

*Generated: 2026-10-10 16:58:30 UTC*

## 1. Executive Summary
| Metric | Value | Status |
|---|---|---|
| Canonical Crops Master | 15 | Active |
| Verified Crop Varieties | 31 | Cataloged |
| Agricultural Seasons | 3 | Normalized |
| Agricultural Regions (States/Districts) | 31 | Indexed |
| Regional Crop Calendars | 31 | Loaded |
| Verified Growth Duration Profiles | 15 | Sourced |
| Verified GDD Requirements | 15 | Sourced (No Fabrication) |
| Soil & Environmental Suitability Profiles | 15 | Active |
| Historical Yield Observations | 2054 | Traced |
| Crop Disease Image References | 50 | Inventoried |
| Registered Provenance Data Sources | 28 | Traceable |

## 2. Crop Knowledge Base Coverage
| Crop | Category | Calendars | Growth Profile | GDD Available | Soil Suitability |
|---|---|---|---|---|---|
| Maize | Cereals | 2 | Yes | Yes | Yes |
| Pearl Millet | Cereals | 1 | Yes | Yes | Yes |
| Rice | Cereals | 5 | Yes | Yes | Yes |
| Sorghum | Cereals | 1 | Yes | Yes | Yes |
| Wheat | Cereals | 4 | Yes | Yes | Yes |
| Sugarcane | Commercial | 2 | Yes | Yes | Yes |
| Cotton | Fiber | 2 | Yes | Yes | Yes |
| Groundnut | Oilseeds | 1 | Yes | Yes | Yes |
| Mustard | Oilseeds | 2 | Yes | Yes | Yes |
| Soybean | Oilseeds | 2 | Yes | Yes | Yes |
| Chickpea | Pulses | 2 | Yes | Yes | Yes |
| Pigeon Pea | Pulses | 1 | Yes | Yes | Yes |
| Onion | Vegetables | 2 | Yes | Yes | Yes |
| Potato | Vegetables | 2 | Yes | Yes | Yes |
| Tomato | Vegetables | 2 | Yes | Yes | Yes |

## 3. Data Provenance & Verification Distribution
| Data Source | Origin | Verification Status |
|---|---|---|
| Kaggle/Indian-Crop-Production | observed | reference_only |
| ICAR-CICR Nagpur Cotton Guide | official_reference | verified |
| PJTSAU Crop Production Guide | official_reference | verified |
| ICAR-DRMR Bharatpur Mustard Portal | official_reference | verified |
| HuggingFace/dhyann2815/india-crop-yield-prediction | derived | reference_only |
| ANGRAU Agricultural Calendar | official_reference | verified |
| UAS Raichur Package of Practices | official_reference | verified |
| NRRI Cuttack Advisory | official_reference | verified |
| SKNAU Jobner Pulse Calendar | official_reference | verified |
| ICAR-IISR Indore Soybean Handout | official_reference | verified |
| ICAR-IIPR Kanpur Pulses Guidelines | official_reference | verified |
| ICAR-IIWBR Karnal Wheat Calendar | official_reference | verified |
| RAU Pusa Agronomy Handout | official_reference | verified |
| CCSHAU Hisar Mustard Advisory | official_reference | verified |
| ICAR-IIMR Sorghum Advisory | official_reference | verified |
| ICAR-IISR Lucknow Cane Advisory | official_reference | verified |
| RVSKVV Gwalior Agronomy Guidelines | official_reference | verified |
| PAU Ludhiana Wheat Advisory | official_reference | verified |
| IIHR Bangalore Vegetable Calendar | official_reference | verified |
| PDKV Akola Cotton Recommendations | official_reference | verified |
| ICAR-IIMR Maize Advisory | official_reference | verified |
| ICAR-IARI Crop Calendar | official_reference | verified |
| HuggingFace/DigiGreen/Crop_Disease_Images | observed | reference_only |
| ICAR-DGR Junagadh Advisory | official_reference | verified |
| ICAR-DOGR Rajgurunagar Onion Advisory | official_reference | verified |
| ICAR-CAZRI Jodhpur Bajra Leaflet | official_reference | verified |
| MPKV Rahuri Sugarcane Package | official_reference | verified |
| ICAR-CPRI Shimla Potato Manual | official_reference | verified |

## 4. State & Regional Geographic Coverage
| State / UT | Distinct Districts Cataloged |
|---|---|
| Andhra Pradesh | 1 |
| Bihar | 1 |
| Gujarat | 2 |
| Haryana | 2 |
| Karnataka | 4 |
| Madhya Pradesh | 3 |
| Maharashtra | 7 |
| Odisha | 1 |
| Punjab | 2 |
| Rajasthan | 3 |
| Telangana | 1 |
| Uttar Pradesh | 3 |
| West Bengal | 1 |

## 5. Recent Ingestion Batch Audit
| Dataset | Status | Read | Accepted | Rejected | Inserted |
|---|---|---|---|---|---|
| dhyann2815/india-crop-yield-prediction | completed | 101 | 100 | 0 | 100 |
| DigiGreen/Crop_Disease_Images | completed | 51 | 50 | 0 | 50 |
| dhyann2815/india-crop-yield-prediction | failed | 101 | 100 | 0 | 0 |
| crop_production.csv | completed | 2001 | 1954 | 46 | 1954 |
| verified_indian_crop_calendar.csv | completed | 31 | 31 | 0 | 46 |