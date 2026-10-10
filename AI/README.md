# HarvestWindow Phase AI-2: Harvest Window Prediction Engine

Welcome to the **HarvestWindow Phase AI-2 Prediction Engine** documentation. This service provides agricultural intelligence for Indian farmers, predicting optimal crop harvest windows using a multi-layer hybrid architecture grounded in verified agronomic benchmarks, Growing Degree-Day (GDD) accumulation, and local microclimate weather adjustments.

---

## 1. Architecture & Module Responsibilities

The prediction engine is structured in modular, defensible layers:

```
HarvestWindow Application
 ├── Layer A: Agronomic Baseline Engine (ICAR & State Agricultural University benchmarks)
 ├── Layer B: Growing Degree-Day (GDD) Accumulation & Phenology Engine
 ├── Layer C: Microclimate Weather-Aware Adjustments (Open-Meteo Historical & Forecast)
 └── Layer D: Supervised ML Regression Pipeline (GroupKFold Cross-Validation, Scikit-Learn)
```

### Module Responsibilities:
- **`AI/harvest_prediction/agronomic_baseline.py` (Layer A)**: Computes earliest, most likely, and latest harvest dates directly from verified duration benchmarks without statistical extrapolation. Handles calendar bounds and leap years.
- **`AI/harvest_prediction/crop_knowledge.py`**: Validated ICAR/SAU agricultural duration database covering Wheat, Rice/Paddy, Cotton, Sugarcane, Mustard, Chickpea, Maize, Groundnut, Soybean, Onion, Potato, Tomato, etc. Adapts Phase AI-1 external payloads.
- **`AI/harvest_prediction/gdd.py` (Layer B)**: Calculates daily thermal heat units with McMaster/Baskerville-Emin truncation ($T_{base}$ and optional $T_{upper}$). Accumulates thermal time across daily series and projects maturity date against required maturity GDD targets.
- **`AI/harvest_prediction/weather.py` (Layer C)**: Integrates Open-Meteo Historical Archive and 16-day Weather Forecast APIs with local bounded in-memory caching and resilient network timeout handling. Evaluates rainfall harvest delays (+2 to +4 days) and extreme heat acceleration (-1 to -2 days).
- **`AI/harvest_prediction/features.py` (Layer D)**: Leakage-free feature engineering extracting numerical and categorical vectors for training and inference pipelines.
- **`AI/harvest_prediction/prediction_service.py`**: Coordinates Layers A, B, and C into a unified response adhering to the standardized prediction contract.
- **`AI/training/train_harvest_model.py`**: Validates dataset provenance, checks for supervised harvest date labels, executes GroupKFold cross-validation, and serializes trained models and metadata.
- **`AI/training/evaluate_harvest_model.py`**: Evaluates model performance (MAE, RMSE) across individual crops and directly benchmarks against agronomic baselines.
- **`AI/main.py`**: FastAPI application exposing `/health`, `/predict`, `/validate-input`, `/model-metadata`, and `/data-readiness`.

---

## 2. Dataset Audit Findings & Honest ML Policy

We conducted a comprehensive audit of all repository datasets via `AI/audit_datasets.py`:

| Dataset Source | Records / Shape | Columns | Sowing Dates? | Harvest Dates? | Label Availability |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `crop_production.csv` | 246,093 rows | `State_Name, District_Name, Crop_Year, Season, Crop, Area, Production` | **Absent** | **Absent** | **No supervised target** |
| `dhyann2815/india-crop-yield-prediction` | Yield analysis | Yield, Annual Production, Area | **Absent** | **Absent** | **No harvest dates** |
| `DigiGreen/Crop_Disease_Images` | Image dataset | Disease classification images | N/A | N/A | Image classification only |

### The Honest ML Mandate:
Neither the Kaggle dataset nor the Hugging Face yield dataset records actual crop sowing dates, actual harvest dates, or days-to-harvest observation pairs.
- **What we do NOT do**: We do NOT fabricate synthetic harvest labels and present them as real-world ML predictions.
- **What we DO**:
  1. Production online inference reliably uses **Layer A (Agronomic Baseline) + Layer B (GDD Accumulation) + Layer C (Weather Adjustments)**.
  2. Layer D supervised ML pipeline is completely implemented and tested with GroupKFold cross-validation and evaluation scripts (`train_harvest_model.py --allow-synthetic-benchmark`).
  3. The engine transparently reports its exact method (`agronomic_gdd_weather` or `agronomic_baseline`), allowing farmers and agronomists to trust the system.

---

## 3. Required Python Dependencies

Dependencies are specified in `AI/requirements.txt`:
```
fastapi>=0.110.0
uvicorn>=0.28.0
pydantic>=2.0.0
requests>=2.31.0
numpy>=1.24.0
pandas>=2.0.0
scikit-learn>=1.4.0
joblib>=1.3.0
pytest>=8.0.0
httpx>=0.27.0
```

Install via pip:
```bash
pip install -r AI/requirements.txt
```

---

## 4. How to Start the Python AI Service

Start the FastAPI application on port 8000:
```bash
python -m uvicorn main:app --app-dir AI --host 127.0.0.1 --port 8000
```

Verify service health:
```bash
curl http://127.0.0.1:8000/health
```

Expected response:
```json
{
  "status": "healthy",
  "version": "2.0.0",
  "service": "harvest_prediction_ai",
  "timestamp": "2026-10-10T17:12:19.873640+00:00"
}
```

---

## 5. Model Training & Evaluation Commands

### Check Dataset & Provenance Policy:
```bash
python AI/training/train_harvest_model.py
```
*Outputs audit finding that supervised harvest labels are absent, documents required fields, and sets production metadata to `pending_labeled_data`.*

### Verify Supervised ML Pipeline with Benchmark Data:
```bash
python AI/training/train_harvest_model.py --allow-synthetic-benchmark
```
*Executes 5-fold GroupKFold cross-validation, reports MAE and RMSE in days, and saves artifacts to `AI/harvest_prediction/artifacts/`.*

### Evaluate Model Performance Across Crops:
```bash
python AI/training/evaluate_harvest_model.py
```
*Generates crop-by-crop MAE comparison report and saves `AI/harvest_prediction/artifacts/evaluation_report.json`.*

---

## 6. Running Tests

Run the complete Python test suite:
```bash
python -m pytest AI/tests/ -v
```
All 19 test cases cover Layer A, Layer B, Layer C, and FastAPI endpoints.

Run the Express Node.js backend tests:
```bash
cd backend
npm test
```
All 172 tests across 35 test suites pass.

---

## 7. Express Integration & Environment Variables

### Environment Variables (`backend/.env`):
```env
PORT=5000
DATABASE_URL="mysql://root:password@localhost:3306/harvestwindow"
HARVEST_AI_SERVICE_URL="http://127.0.0.1:8000"
```

### Express Endpoints:
- `POST /api/harvest-predictions`:
  - Validates authentication & farm ownership.
  - Calls Python service at `HARVEST_AI_SERVICE_URL/predict`.
  - Persists prediction in MySQL table `harvest_predictions`.
  - Emits `forecast-refreshed` activity log.
  - Fallback: Gracefully switches to Node internal prediction engine if Python service times out.
- `GET /api/harvest-predictions/history/:cropId`:
  - Returns historical prediction audit trail for a crop block.
- `POST /api/forecasts/predict`:
  - Direct alias for `/api/harvest-predictions`.

---

## 8. Prediction Response Contract

Sample response:
```json
{
  "status": "success",
  "prediction": {
    "crop_name": "Wheat",
    "variety": "HD-2967",
    "sowing_date": "2024-11-15",
    "estimated_harvest_start": "2025-04-02",
    "most_likely_harvest_date": "2025-04-07",
    "estimated_harvest_end": "2025-04-19",
    "days_until_harvest": 113,
    "is_past_due": false,
    "prediction_method": "agronomic_gdd_weather",
    "model_version": "2.0.0-agronomic-gdd-weather",
    "uncertainty": {
      "type": "duration_range",
      "lower_date": "2025-04-02",
      "upper_date": "2025-04-19",
      "range_days": 17
    },
    "data_quality": {
      "crop_profile_available": true,
      "sowing_date_available": true,
      "weather_data_available": true,
      "verified_gdd_available": true,
      "historical_observations_count": 150,
      "forecast_days_included": 16,
      "missing_weather_days": 0
    },
    "gdd_metrics": {
      "base_temperature_c": 4.5,
      "upper_threshold_c": 35.0,
      "accumulated_gdd": 1420.5,
      "required_maturity_gdd": 1950.0,
      "progress_percentage": 72.8,
      "gdd_maturity_estimated_date": "2025-04-07"
    },
    "weather_adjustment_days": 0,
    "explanation": [
      {
        "factor": "crop_duration_baseline",
        "impact": "baseline",
        "description": "Calculated using ICAR/SAU verified crop duration range (138-155 days, typical 145 days) from sowing date (2024-11-15)."
      },
      {
        "factor": "thermal_degree_days",
        "impact": "neutral",
        "description": "Accumulated heat units (1420.5 GDD) align directly with expected historical maturity pacing."
      }
    ],
    "assumptions_and_limitations": [
      "Expected duration: 145 days (range 138-155 days) for Wheat.",
      "Field management assumes standard agronomic practices without catastrophic pest outbreak or severe drought.",
      "Agronomic data source: ICAR-IARI / Punjab Agricultural University (PAU) NWPZ package."
    ],
    "calculated_at": "2026-10-10T17:12:26.123456+00:00"
  }
}
```

---

## 9. How Future Labeled Observations Can Be Added

When real dated sowing and harvest observations are logged by farmers or research stations, they can be inserted into the training pipeline:
1. Export pairs containing: `crop_name`, `variety`, `sowing_date`, `actual_harvest_date`, `farm_coordinates`, `observed_growth_stages`.
2. Place records into `AI/datasets/verified_harvest_observations.csv`.
3. Run `python AI/training/train_harvest_model.py`.
4. The pipeline will automatically detect the presence of actual harvest dates, train the Random Forest / Gradient Boosting regressor, validate generalization on unseen farm groups with `GroupKFold`, and save the production artifact `AI/harvest_prediction/artifacts/harvest_rf_model.joblib`.
