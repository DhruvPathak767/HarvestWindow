# HarvestWindow — Phase AI-1: Agricultural Data Foundation & Knowledge Base

HarvestWindow is an agricultural intelligence platform built to help Indian farmers optimize crop management, monitor micro-climates, and accurately estimate harvest readiness windows.

**Phase AI-1** establishes the **Agricultural Data Foundation, Crop Knowledge Base, and Dataset Integration**. It provides a verified, normalized, and traceable agronomic layer in MySQL via Prisma ORM, backed by an idempotent Python data pipeline and high-performance Express REST APIs.

---

## 1. Directory Structure

```text
HarvestWindow/AI/
├── datasets/                                 # Raw dataset assets (preserved and immutable)
│   ├── crop_production.csv                   # Historical Kaggle Indian Crop Production CSV (246,093 rows)
│   ├── load_crop_deases_images_dataset.py    # Hugging Face crop disease loader script
│   └── load_indian_crop_yeild_prediction_dataset.py # Hugging Face yield dataset loader script
├── ingestion/                                # Reusable Python normalization & ETL modules
│   ├── crop_calendar_import.py               # Ingestion & idempotent upsert for verified crop calendars
│   ├── huggingface_disease_data.py           # Streaming cataloger for DigiGreen/Crop_Disease_Images
│   ├── huggingface_yield_data.py             # ETL pipeline for dhyann2815/india-crop-yield-prediction
│   ├── kaggle_crop_data.py                   # Chunked ETL pipeline for crop_production.csv
│   ├── normalize.py                          # Canonical crop, state, district & season standardizer
│   ├── provenance.py                         # Import batch auditor and data source tracking
│   └── validate.py                           # Agronomic range validators (GDD, pH, duration, temp)
├── reports/                                  # Generated data quality audits
│   ├── data_quality_report.json              # Machine-readable data health summary
│   └── data_quality_report.md                # Human-readable data quality report
├── schemas/                                  # Data templates and verified reference data
│   ├── crop_calendar_template.csv            # Blank CSV template with field definitions
│   └── verified_indian_crop_calendar.csv     # 31 verified ICAR crop calendars with GDD & climate metrics
├── scripts/                                  # Standalone CLI utilities
│   ├── generate_data_quality_report.py       # Quality auditor & markdown/JSON report generator
│   ├── import_agricultural_data.py           # Unified multi-source importer CLI
│   └── inspect_datasets.py                   # Non-destructive dataset inspector CLI
├── tests/                                    # Automated Python test suite (pytest)
│   ├── test_csv_ingestion.py                 # Fixture ingestion & dry-run test
│   ├── test_normalization.py                 # String cleaning & canonical mapping tests
│   └── test_validation.py                    # Agronomic bounds & GDD validation tests
├── requirements.txt                          # Python dependencies
└── README.md                                 # Technical documentation (this file)
```

---

## 2. Dataset Assets & Provenance

### 2.1 Kaggle Indian Crop Production Dataset
- **Local Path**: `AI/datasets/crop_production.csv`
- **Volume**: 246,093 rows, 7 columns (`State_Name`, `District_Name`, `Crop_Year`, `Season`, `Crop`, `Area`, `Production`).
- **Original Source**: Directorate of Economics and Statistics, Ministry of Agriculture and Farmers Welfare (India Open Government Data / Kaggle).
- **Provenance Category**: `OBSERVED` historical district-level agricultural statistics.
- **Cleaning & Ingestion**:
  - Filtered implausible production outliers and non-numeric entries.
  - Normalized state and district names to official ISO-3166-2:IN administrative entities.
  - Ingested safely into `crop_yield_observations` without overwriting farm records.

### 2.2 Hugging Face Indian Crop Yield Prediction Dataset
- **Hugging Face Hub ID**: [`dhyann2815/india-crop-yield-prediction`](https://huggingface.co/datasets/dhyann2815/india-crop-yield-prediction)
- **Features**: `Crop`, `Crop_Year`, `Season`, `State`, `Area`, `Production`, `Annual_Rainfall`, `Fertilizer`, `Pesticide`, `Yield`.
- **Provenance Category**: `DERIVED` / `OBSERVED` with synthetic or interpolated regression features.
- **Data Quality Policy**: Because fertilizer and pesticide quantities in this dataset represent modeled or extrapolated aggregate observations rather than verified agronomic baselines, they are marked with `isSynthetic = true` and `verificationStatus = UNVERIFIED`. They are stored in `crop_yield_observations` and **never** treated as authoritative agronomic standards.

### 2.3 Hugging Face Crop Disease Images Dataset
- **Hugging Face Hub ID**: [`DigiGreen/Crop_Disease_Images`](https://huggingface.co/datasets/DigiGreen/Crop_Disease_Images)
- **Features**: `image` (PIL Image binary), `label` (class index).
- **Processing Rule**: Image binaries are **not** downloaded or forced into MySQL relational tables. The dataset is accessed in streaming mode (`streaming=True`) to catalog image counts, labels, split names, and disease classes into `crop_disease_metadata`.

### 2.4 Verified Indian Crop Calendar Reference
- **Local Path**: `AI/schemas/verified_indian_crop_calendar.csv`
- **Source**: Indian Council of Agricultural Research (ICAR) — *Handbook of Agriculture*, State Agricultural Universities (PAU, TNAU, GBPUAT), and Ministry of Agriculture sowing guides.
- **Coverage**: 31 verified regional crop records across 10 major crops (Wheat, Rice, Maize, Chickpea, Mustard, Cotton, Potato, Onion, Soybean, Sugarcane) spanning Punjab, Haryana, Uttar Pradesh, Madhya Pradesh, Maharashtra, Tamil Nadu, and West Bengal.
- **Provenance Category**: `OFFICIAL_REFERENCE` (`VERIFIED`). Includes verified thermal base temperatures, GDD accumulation requirements, and optimal pH ranges.

---

## 3. Installation & Python Setup

### 3.1 Prerequisites
- Python 3.10+ (tested on Python 3.14.6)
- MySQL Server 8.0+ running with the `harvestwindow` database created.
- Node.js 18+ for Prisma and backend API services.

### 3.2 Install Python Dependencies
```bash
# Navigate to the project root
cd d:\projects\HarvestWindow

# Install AI dependencies
pip install -r AI/requirements.txt
```

Key libraries installed:
- `pandas`, `numpy`, `pyarrow` — Data parsing, chunked array processing, and tabular serialization.
- `sqlalchemy`, `pymysql` — Database connection pooling and transaction execution.
- `datasets`, `huggingface-hub` — Hugging Face Hub dataset loading with streaming support.
- `pytest` — Automated Python unit and integration testing.

---

## 4. Database Configuration & Permissions

The pipeline connects to MySQL using standard environment variables or the Node.js `.env` configuration:

```env
# Database connection string
DATABASE_URL="mysql://root:password@localhost:3306/harvestwindow"

# Optional explicit parameters
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=password
DB_NAME=harvestwindow
```

### Table Security & Isolation Policy
Python ingestion scripts only read and write to agricultural knowledge base tables:
- `agri_data_sources`
- `agri_import_batches`
- `agri_crops`
- `agri_varieties`
- `agri_seasons`
- `agri_regions`
- `agri_crop_calendars`
- `agri_crop_growth_profiles`
- `agri_crop_suitability_profiles`
- `crop_yield_observations`
- `crop_disease_metadata`

> [!IMPORTANT]
> The Python pipeline **never** writes to `users`, `farms`, `crops`, `harvest_forecasts`, or `recommendations`. Farmer holdings and private records are strictly isolated from dataset ingestion.

---

## 5. Execution Guide & CLI Commands

### 5.1 Dataset Inspection
Inspect local and remote datasets non-destructively:
```bash
# Inspect all datasets
python AI/scripts/inspect_datasets.py

# Inspect Kaggle CSV only
python AI/scripts/inspect_datasets.py --kaggle

# Inspect Hugging Face yield dataset (stream 20 sample rows)
python AI/scripts/inspect_datasets.py --hf-yield --limit 20

# Inspect Hugging Face disease dataset schema and classes
python AI/scripts/inspect_datasets.py --hf-disease --limit 50
```

### 5.2 Dry-Run Mode (No Database Changes)
Simulate data ingestion and validate all agronomic constraints without writing to MySQL:
```bash
python AI/scripts/import_agricultural_data.py --source calendar --dry-run
```

### 5.3 Ingest Verified Agricultural Knowledge
Upsert verified ICAR crop calendars, growth profiles, varieties, and GDD metrics into MySQL:
```bash
python AI/scripts/import_agricultural_data.py --source calendar --input AI/schemas/verified_indian_crop_calendar.csv
```

### 5.4 Ingest Kaggle Historical Yield Observations
```bash
# Ingest with a sample limit
python AI/scripts/import_agricultural_data.py --source kaggle --limit 5000

# Full ingestion (chunked processing)
python AI/scripts/import_agricultural_data.py --source kaggle
```

### 5.5 Ingest Hugging Face Datasets
```bash
# Yield observations
python AI/scripts/import_agricultural_data.py --source hf-yield --limit 1000

# Disease image catalog metadata (streaming)
python AI/scripts/import_agricultural_data.py --source hf-disease --limit 500
```

### 5.6 Ingest All Sources in Sequence
```bash
python AI/scripts/import_agricultural_data.py --source all --limit 2000
```

### 5.7 Generate Data Quality & Provenance Reports
Generates both `AI/reports/data_quality_report.md` and `AI/reports/data_quality_report.json`:
```bash
python AI/scripts/generate_data_quality_report.py
```

---

## 6. Adding a New Verified Crop Calendar

To import a new verified crop calendar (e.g. from a State Agricultural University or ICAR bulletin):
1. Open `AI/schemas/crop_calendar_template.csv`.
2. Populate the required columns following the documented format:

| Column | Type | Example | Description |
|---|---|---|---|
| `canonical_crop_name` | String | `Wheat` | Standardized canonical crop name |
| `scientific_name` | String | `Triticum aestivum` | Botanical binomial nomenclature |
| `crop_category` | String | `Cereal` | Cereal, Pulse, Oilseed, Commercial, Vegetable, etc. |
| `variety_name` | String | `HD-3086` | Optional cultivar/variety |
| `country` | String | `India` | ISO country name |
| `state` | String | `Punjab` | Official Indian State |
| `district` | String | `Ludhiana` | Optional District name |
| `season_name` | String | `Rabi` | Kharif, Rabi, Zaid, Summer, Whole Year |
| `sowing_start_month` | Integer | `10` | 1 (Jan) to 12 (Dec) |
| `sowing_start_day` | Integer | `15` | Day of month (1–31) |
| `sowing_end_month` | Integer | `11` | 1 (Jan) to 12 (Dec) |
| `sowing_end_day` | Integer | `30` | Day of month (1–31) |
| `harvest_start_month` | Integer | `3` | 1 (Jan) to 12 (Dec) |
| `harvest_start_day` | Integer | `20` | Day of month (1–31) |
| `harvest_end_month` | Integer | `4` | 1 (Jan) to 12 (Dec) |
| `harvest_end_day` | Integer | `25` | Day of month (1–31) |
| `min_duration_days` | Integer | `135` | Minimum biological maturity in days |
| `typical_duration_days`| Integer | `145` | Standard field duration in days |
| `max_duration_days` | Integer | `155` | Maximum field duration in days |
| `gdd_requirement_min` | Integer | `1650` | Verified GDD requirement min (°C-days) |
| `gdd_requirement_max` | Integer | `1850` | Verified GDD requirement max (°C-days) |
| `gdd_base_temp_c` | Float | `10.0` | Base temperature below which GDD = 0 |
| `gdd_upper_threshold_c`| Float | `35.0` | Upper thermal ceiling for development |
| `gdd_method` | String | `Standard daily mean: ((Tmax+Tmin)/2) - Tbase` | Calculation method |
| `soil_types` | String | `Well-drained loam, clay loam` | Suitable soil textures |
| `soil_ph_min` | Float | `6.0` | Soil pH lower bound |
| `soil_ph_max` | Float | `7.5` | Soil pH upper bound |
| `water_requirement_mm`| Float | `500.0` | Total seasonal water need (mm) |
| `source_name` | String | `ICAR Handbook of Agriculture` | Publishing body or reference |
| `source_url` | String | `https://icar.org.in` | Official reference link |
| `data_origin` | String | `OFFICIAL_REFERENCE` | `OFFICIAL_REFERENCE`, `OBSERVED`, `DERIVED` |
| `verification_status` | String | `VERIFIED` | `VERIFIED` or `UNVERIFIED` |
| `notes` | String | `Timely sown irrigated conditions` | Agronomic notes |

3. Execute the import command:
```bash
python AI/scripts/import_agricultural_data.py --source calendar --input path/to/your_file.csv
```

---

## 7. Testing Guide

### 7.1 Python Automated Tests
Run unit tests for normalization, agronomic validation, and CSV fixture ingestion:
```bash
python -m pytest AI/tests/
```
Output:
```text
AI/tests/test_csv_ingestion.py .                                         [  9%]
AI/tests/test_normalization.py .....                                     [ 54%]
AI/tests/test_validation.py .....                                        [100%]
======================== 11 passed in 0.54s ========================
```

### 7.2 Backend Integration Tests
Execute the Express backend test suite:
```bash
cd d:\projects\HarvestWindow\backend
npm test
```
Result: **174 passing tests across 35 suites**, including 10 dedicated agricultural knowledge base REST API tests (`backend/tests/agriculture.test.js`).

### 7.3 Frontend Build Verification
Verify type checking and single-bundle compilation:
```bash
cd d:\projects\HarvestWindow\frontend
npm run build
```
Result: Production bundle built with zero TypeScript or Rollup errors.

---

## 8. Data Quality, Verification & Honest Agronomic Handling

### 8.1 No Data Fabrication Policy
Per the architectural guidelines of HarvestWindow, **we never fabricate agricultural values to make datasets look complete**.
- Where GDD values are not published by ICAR or university trials, `gddRequirementMin`, `gddRequirementTypical`, and `gddRequirementMax` are left as `null`.
- In the user interface, crops without verified GDD thresholds display an explicit notice:
  > *"GDD Requirement: Not verified for this variety or district yet. Standard duration model used."*
- Thermal-time accumulation during Phase AI-2 will only activate when verified baseline parameters (`Tbase`, `Tupper`, `GDD_min`) exist.

### 8.2 Provenance Categories
Every record in the knowledge base is tagged with its provenance origin:
1. `OFFICIAL_REFERENCE`: Published by ICAR, State Agricultural Universities, or government sowing calendars (`VERIFIED`).
2. `OBSERVED`: Empirical district-level yield and production reports from state agriculture departments.
3. `DERIVED`: Agronomic metrics computed from empirical historical records with documented formulas.
4. `SYNTHETIC`: Modeled, interpolated, or machine-generated values from ML datasets (explicitly tagged and quarantined from official calendars).
5. `UNKNOWN`: Unverified provenance; excluded from authoritative recommendations.

---

## 9. Readiness for Phase AI-2: Harvest Window Prediction Engine

The completion of Phase AI-1 satisfies all prerequisites for **Phase AI-2: Harvest Window Prediction Engine**:
1. **Verified Sowing & Harvest Calendars**: Multi-window regional calendars are established for key agricultural states.
2. **Thermal-Time Benchmarks**: Base temperatures (`Tbase`), ceilings (`Tupper`), and GDD thresholds are structured in `agri_crop_growth_profiles`.
3. **Database Normalization**: All agricultural entities are linked to foreign keys with indexed lookups on crop, region, and season.
4. **API Foundation**: REST endpoints (`/api/v1/agriculture/*`) provide fast, paginated, and filtered access to agronomic parameters for both the prediction engine and the frontend UI.

---

## 10. Phase AI-5: Yield Forecasting and Production Estimation Engine

Phase AI-5 provides crop yield forecasting per unit area (`tonnes/hectare`) and total expected farm production estimation (`metric tonnes`), integrating agricultural ML models, historical baselines, uncertainty quantification, Node.js REST APIs, and responsive frontend UI components.

### 10.1 Prediction Objectives & Unit Discipline
1. **Yield per unit area**: Canonical internal unit is Metric Tonnes per Hectare (`t/ha`). All models predict directly in `t/ha`.
2. **Total farm production estimation**:
   $$\text{expectedProductionTonnes} = \text{predictedYieldTonnesPerHectare} \times \text{plantedAreaHectares}$$
   - Planted area is normalized to hectares using `convertToHectares` supporting `HECTARE`, `ACRE` (1 ha $\approx$ 2.47105 acres), `SQUARE_METRE` (10,000 sq m = 1 ha), and `BIGHA` (0.2508 ha regional default).
3. **Uncertainty Quantification**: Calibrated 80% empirical residual interval ($P_{10} = -0.8156$, $P_{90} = +0.7953$ t/ha) derived from held-out validation predictions, clamped non-negatively:
   $$\text{lowerProductionTonnes} = \max(0.01, \text{lowerYield}) \times \text{areaHectares}$$
   $$\text{upperProductionTonnes} = \text{upperYield} \times \text{areaHectares}$$
4. **Separation of Values**: The system strictly isolates:
   - Predicted yield per hectare (`t/ha`)
   - Estimated total production (`tonnes`)
   - Historical baseline prior (`t/ha`)
   - Actual harvested production recorded by farmers (`tonnes` or other units)

### 10.2 Dataset Discovery & Audit
- **Dataset**: `dhyann2815/india-crop-yield-prediction` (`AI/datasets/india_crop_yield.csv`)
- **Rows**: 17,400 raw $\rightarrow$ 16,873 cleaned (96.97% retained).
- **Features**: `Crop`, `Crop_Year`, `Season`, `State`, `Area`, `Production`, `Annual_Rainfall`, `Fertilizer`, `Pesticide`, `Yield`.
- **Data Quality Audit**:
  - Identified unit anomaly: Coconut was recorded in count of nuts (up to 21,105 nuts/ha) rather than metric tonnes. Excluded Coconut from weight-based regression to prevent severe target distortion.
  - Cleaned yield distribution: Min = 0.0507 t/ha, Max = 197.0074 t/ha, Mean = 5.0957 t/ha, Median = 1.0928 t/ha across 59 crops, 31 states, and 6 seasons.
  - Audit saved to `AI/reports/yield_dataset_audit.json`.

### 10.3 Machine Learning Pipeline & Performance
- **Baseline**: Hierarchical Historical Median Baseline (`Crop + State + Season` $\rightarrow$ `Crop + State` $\rightarrow$ `Crop` $\rightarrow$ ICAR official reference benchmark).
- **ML Model**: `HistGradientBoostingRegressor` with `ColumnTransformer` (OneHotEncoder for categoricals, StandardScaler for numerics, and `baseline_prior` feature engineering).
- **Hyperparameters**: `max_iter=300`, `learning_rate=0.08`, `max_depth=8`, `l2_regularization=0.1`.
- **Split**: 80/20 train/test split (13,498 train samples, 3,375 test samples) stratified by major crops.
- **Evaluation Results**:
  | Metric | Hierarchical Median Baseline | HistGradientBoostingRegressor ML Model | Outcome |
  |---|---|---|---|
  | **MAE** | 1.0933 t/ha | **1.0715 t/ha** | **Beats baseline (2.0% MAE improvement)** |
  | **RMSE** | 3.8273 t/ha | **3.4837 t/ha** | Improved by 9.0% |
  | **$R^2$** | 0.9264 | **0.9390** | Explains 93.9% of yield variance |
- **Artifacts**: Stored in `AI/yield_forecasting/artifacts/` (`yield_model.joblib`, `yield_baseline.joblib`, `yield_preprocessor.joblib`, `yield_model_metadata.json`).

### 10.4 Node.js Backend & Prisma Integration
- **Prisma Models**:
  - `YieldPrediction`: Stores prediction snapshots with yield (`t/ha`), planted area, estimated production (`tonnes`), uncertainty bounds, prediction stage, confidence, model version, and data quality warnings.
  - `ActualProduction`: Stores recorded actual harvest outputs separately without overwriting prediction records.
- **REST Endpoints**:
  - `POST /api/crops/:cropId/yield-prediction`: Predict yield and total production for crop.
  - `POST /api/crops/:cropId/production-estimate`: Transparent custom area production calculation.
  - `GET /api/crops/:cropId/yield-prediction`: Fetch latest cached prediction with staleness indicator.
  - `POST /api/crops/:cropId/yield-prediction/refresh`: Force refresh prediction with latest field features.
  - `POST /api/crops/:cropId/actual-production`: Record farmer-reported actual harvest output.
  - `GET /api/farms/:farmId/production-estimates`: Farm-wide rollup of crop predictions, coverage, and total mass summary.
- **Security**: Strict farm and crop ownership verification via JWT authentication; users cannot access other users' predictions or farms.

### 10.5 Frontend Components
- `YieldPredictionCard`: Complete visual card on crop details page showing yield, total production, confidence pill, prediction stage, uncertainty range, feature warnings, and refresh action.
- `FarmProductionWidget`: Dashboard summary displaying eligible crops, predicted coverage, crop-wise breakdown bars, and total farm production mass.
- `RecordActualProductionModal`: Clean dialog allowing farmers to input verified harvest quantity, harvest date, and notes.
- `useYieldPrediction`: Typed React hook handling prediction fetch, refresh, and actual production mutation.

### 10.6 Run and Test Commands
```bash
# 1. Dataset Audit
python -m AI.yield_forecasting.data_validation

# 2. Model Training & Evaluation
python -m AI.yield_forecasting.train

# 3. AI Pytest Suite (44 tests)
python -m pytest AI/tests/

# 4. Node.js Backend Test Suite (222 tests across 44 suites)
cd backend && npm test

# 5. Frontend Production Bundle Build
cd frontend && npm run build
```

