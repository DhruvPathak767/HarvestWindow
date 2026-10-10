# HarvestWindow Phase AI-2: Dataset Audit & Suitability Report
**Audit Date:** 2026-10-10T22:32:43.506428

## Executive Summary
- **Supervised Harvest-Date Labels Available:** `NO (FALSE)`
- **Recommended Prediction Engine:** **Hybrid Agronomic Baseline + Growing Degree-Days (GDD) + Near-term Weather Adjustments (ICAR/SAU benchmarks)**
- **Supervised ML Status:** Deferred from production inference to avoid deceptive models. Training & evaluation pipeline implemented for future verified field observations.

---

## 1. Kaggle Dataset: `crop_production.csv`
- **File Size:** 14.61 MB
- **Total Records:** 246,091 rows
- **Columns:** `State_Name, District_Name, Crop_Year, Season, Crop, Area, Production`
- **Geographic Coverage:** 33 States/UTs, across India
- **Crop Coverage:** 124 distinct crops (Apple, Arcanut (Processed), Arecanut, Arhar/Tur, Ash Gourd, Atcanut (Raw), Bajra, Banana...)
- **Seasons:** `Autumn, Kharif, Rabi, Summer, Whole Year, Winter`
- **Year Range:** 1997 - 2015
- **Sowing Dates Present:** ❌ None
- **Harvest Dates Present:** ❌ None
- **Crop Duration Present:** ❌ None
- **Provenance:** Directorate of Economics and Statistics, Ministry of Agriculture & Farmers Welfare, Government of India.
- **Suitability Assessment:** **Unsuitable for supervised harvest date prediction.**
- **Reasoning:** The dataset records macro-level annual crop area (hectares) and total production (metric tonnes) by season and district. It does NOT record micro-level field sowing dates, flowering dates, harvest dates, or days-to-maturity. Constructing a supervised ML target for harvest window from this dataset would require manufacturing synthetic dates, which is methodologically invalid and scientifically misleading.
- **Recommended Usage:** Auxiliary regional agricultural context: identifying predominant regional crops, crop seasons (Kharif, Rabi, Zaid, Whole Year), and district-level historical crop prevalence.

---

## 2. Hugging Face Dataset: `dhyann2815/india-crop-yield-prediction`
- **Primary Purpose:** Crop yield prediction (metric tonnes per hectare) based on soil, district, and weather proxies.
- **Features:** `State, Crop, Crop_Year, Season, Area, Production, Yield, Annual_Rainfall, Fertilizer, Pesticide`
- **Date Granularity:** Annual / Seasonal aggregate
- **Suitability Assessment:** **Unsuitable for harvest timing labels.**
- **Reasoning:** The dataset focuses on agricultural yield and input factors. While valuable for yield and production forecasting, it lacks daily phenological progression timestamps. Yield cannot be treated as a proxy for days remaining until maturity.
- **Recommended Usage:** Supporting regional yield context and seasonal validation; excluded from supervised harvest date model training.

---

## 3. Hugging Face Dataset: `DigiGreen/Crop_Disease_Images`
- **Modality:** Computer vision images with pathology labels.
- **Suitability Assessment:** Unsuitable for harvest timing. Large downloads bypassed to conserve storage and bandwidth.
- **Recommended Usage:** Preserved for future crop health, foliar inspection, and pest/pathology diagnostic modules.

---

## 4. Missing Fields Required for Supervised Training
To train a scientifically valid machine-learning model that predicts `days_to_harvest = actual_harvest_date - observation_date`, the following real-world field observations are required:
1. `field_sowing_date`: Exact date when seeds were sown or seedlings transplanted.
2. `actual_harvest_date`: Exact date when harvest began or crop reached harvest readiness.
3. `variety_name`: Specific crop cultivar (e.g., PBW-343, HD-2967, PR-126).
4. `farm_coordinates`: Latitude and longitude for daily microclimate integration.
5. `daily_observed_weather`: Daily minimum and maximum temperatures, rainfall, and solar radiation from sowing to harvest.

---

## 5. Architectural Decision
In strict adherence to the project guidelines:
1. **No fake or synthetic harvest dates will be fabricated.**
2. **The HarvestWindow prediction engine will use Layer A (Agronomic Baseline) and Layer B (Growing Degree-Day Accumulation) coupled with Layer C (Weather-Aware estimation).**
3. **The engine will honestly disclose the prediction methodology (`agronomic_baseline` / `agronomic_gdd_weather`), data quality metrics, and missing assumptions on every API response and UI component.**
