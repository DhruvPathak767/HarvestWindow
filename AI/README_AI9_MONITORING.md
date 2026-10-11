# HarvestWindow — Phase AI-9: Prediction Monitoring and Continuous Improvement

This document details the architecture, error metrics, drift detection mechanisms, MLflow experiment tracking, candidate retraining gates, database schema, scheduled jobs, and operational commands implemented for **Phase AI-9**.

---

## 1. Core Architecture & Workflow

Phase AI-9 establishes a closed-loop machine-learning operations (MLOps) system for harvest window predictions:

```
[Production Model 2.0.0]
        │
        ▼ (Inference: mostLikelyHarvestDate, Window Start/End)
[HarvestPrediction Table]
        │
        ▼ (Farmer records actual harvest outcome + Consent)
[HarvestOutcome Table] (PENDING_VERIFICATION / VERIFIED / CORRECTED)
        │
        ▼ (Calendar-date comparison: errorDays = Actual - Predicted)
[PredictionEvaluation Table]
        │
        ├─────────────────────────────────────────────────┐
        ▼                                                 ▼
[Aggregated Accuracy & Subgroup Reports]      [Drift Surveillance (PSI & Rolling Error)]
        │                                                 │
        └─────────────────┬───────────────────────────────┘
                          ▼
            [Retraining Eligibility Policy]
      (Consent >= 15, Quality Gates, Agricultural Diversity)
                          │
                          ▼ (Train Residual Regressor on Consented Data)
            [MLflow Experiment Tracking & Run Artifacts]
                          │
                          ▼ (Holdout Comparison vs Incumbent)
            [Quality Gates: MAE Improvement & Stability]
                          │
                          ▼ (Admin / Controlled Promotion)
          [ModelVersionRegistry: Atomic Activation]
```

---

## 2. Prediction History & Actual Harvest Date Semantics

### 2.1 Calendar Date Normalization
Date calculations adhere strictly to local calendar date arithmetic. All ISO timestamps are parsed and converted to midnight UTC calendar dates before calculating day differences, eliminating one-day errors caused by timezone offsets.

### 2.2 Error Metric Formulas
For each evaluated prediction-outcome pair:
- **Signed Error in Days**:
  $$\text{errorDays} = \text{actualHarvestDate} - \text{predictedHarvestDate}$$
  - $\text{errorDays} > 0$: Actual harvest occurred **later** than predicted.
  - $\text{errorDays} < 0$: Actual harvest occurred **earlier** than predicted.
  - $\text{errorDays} = 0$: **Exact match**.
- **Absolute Error**:
  $$\text{absoluteErrorDays} = |\text{errorDays}|$$
- **Mean Absolute Error (MAE)**:
  $$\text{MAE} = \frac{1}{N} \sum_{i=1}^N |\text{errorDays}_i|$$
- **Mean Signed Error (Bias)**:
  $$\text{Bias} = \frac{1}{N} \sum_{i=1}^N \text{errorDays}_i$$
- **Root Mean Squared Error (RMSE)**:
  $$\text{RMSE} = \sqrt{\frac{1}{N} \sum_{i=1}^N (\text{errorDays}_i)^2}$$
- **Exact Date Accuracy**:
  $$\text{Exact\%} = \frac{\text{Count}(\text{errorDays} = 0)}{N} \times 100$$
- **Within-Tolerance Accuracy**:
  - Within $\pm 3$ days: $\frac{\text{Count}(|\text{errorDays}| \le 3)}{N} \times 100$
  - Within $\pm 7$ days: $\frac{\text{Count}(|\text{errorDays}| \le 7)}{N} \times 100$
- **Harvest Window Coverage**:
  $$\text{Coverage\%} = \frac{\text{Count}(\text{windowStart} \le \text{actualDate} \le \text{windowEnd})}{N_{\text{window}}} \times 100$$
- **Window Distance**:
  - If actual date is within $[\text{start}, \text{end}]$, $\text{distance} = 0$.
  - If earlier than window start, $\text{distance} = \text{start} - \text{actual}$.
  - If later than window end, $\text{distance} = \text{actual} - \text{end}$.

---

## 3. Verification & Consent Workflow

### 3.1 Verification Status Lifecycle
- `PENDING_VERIFICATION`: Default state for farmer-recorded outcomes.
- `VERIFIED`: Confirmed by agricultural expert or administrative inspection.
- `CORRECTED`: Farmer or administrator modified a previously submitted date, with previous snapshot preserved in `previousOutcomeJson` and `correctionCount` incremented.
- `REJECTED`: Invalid, biologically implausible, or duplicate entry.

### 3.2 Granular Farmer Consent
Permissions are split into distinct, explicit options:
1. **Platform Accuracy Benchmark Consent** (`consentEvaluation`):
   - Defaults to `true`.
   - Allows using anonymized date comparison in aggregate system accuracy reports.
2. **AI Retraining Consent** (`consentTraining`):
   - Strictly defaults to `false`.
   - Explicit farmer opt-in required.
   - Any secondary model retraining dataset **strictly filters** on `consentTraining === true`.
   - No personally identifiable information (PII) or farm coordinates are ever logged or exported into training datasets.

---

## 4. Covariate Drift & Performance Surveillance

### 4.1 Population Stability Index (PSI)
Evaluates covariate distribution shift between historical reference predictions and current operational telemetry:
$$\text{PSI} = \sum_{i=1}^K (Q_i - P_i) \times \ln\left(\frac{Q_i}{P_i}\right)$$
- $\text{PSI} < 0.10$: `NORMAL` (Distribution is stable).
- $0.10 \le \text{PSI} < 0.25$: `WATCH` (Mild shift, continued monitoring).
- $\text{PSI} \ge 0.25$: `WARNING` (Significant shift requiring investigation).

### 4.2 Statistical Tests & Missingness
- **Kolmogorov–Smirnov 2-sample test** (`scipy.stats.ks_2samp`) on numerical features (sowing day-of-year, GDD requirements, weather adjustment days).
- **Categorical PSI** on crop distribution and geographic regions.
- **Missingness Rate Tracking**: Alerts if feature null-rate delta exceeds 15%.

### 4.3 Severity Classification Rule
- Input drift alone never triggers `CRITICAL` status.
- `CRITICAL` requires verified, sustained prediction error degradation (e.g. rolling MAE spike $\ge 1.75\times$ with $\ge 5$ verified samples).
- If reference samples $< 10$ or current samples $< 5$, the system returns `INSUFFICIENT_DATA`.

---

## 5. MLflow Tracking & Candidate Retraining Workflow

### 5.1 Local Persistent Tracking
- **Tracking URI**: Local SQLite database at `sqlite:///AI/mlflow.db`.
- **Artifacts Location**: `AI/mlruns/`.
- No external paid services required.

### 5.2 Retraining Eligibility Gates
A candidate model training run may proceed only when:
1. Consented verified outcomes count $\ge 15$ (`consentTraining == true`).
2. Dataset fingerprint (SHA256 hash) has changed since last training run.
3. Agricultural diversity contains at least 2 distinct crops or regions.
4. Triggers are satisfied: performance degradation detected or periodic scheduled cycle elapsed.

### 5.3 Candidate Promotion Gates
A candidate model is promoted only when:
1. **MAE Improvement Gate**: Candidate MAE improves over incumbent by $\ge 5\%$, or is non-inferior within 0.2 days.
2. **RMSE Stability Gate**: Candidate RMSE is not worse than incumbent by $> 5\%$.
3. **Subgroup Non-Degradation Gate**: Candidate MAE on any major crop cannot degrade by $> 2.0$ days relative to incumbent.
4. **Holdout Sample Gate**: Minimum 5 holdout test observations.

---

## 6. Database Schema Models (MySQL / Prisma)

1. `HarvestOutcome` (`harvest_outcomes`):
   - Stores actual harvest date, window, verification status, granular consent toggles, and correction audit trail.
2. `PredictionEvaluation` (`prediction_evaluations`):
   - Stores errorDays, absoluteErrorDays, exact match, tolerance (±3d, ±7d), window coverage, and revision counter.
3. `ModelEvaluationReport` (`model_evaluation_reports`):
   - Persists historical aggregate accuracy reports and subgroup JSON summaries.
4. `DriftAssessment` (`drift_assessments`):
   - Logs PSI scores, KS statistics, severity levels, and operational recommendations.
5. `ModelVersionRegistry` (`model_version_registry`):
   - Tracks model version lifecycle, active deployment pointer, validation metrics, and promotion status.
6. `MonitoringJobRun` (`monitoring_job_runs`):
   - Audit log of scheduled and administrative jobs.

---

## 7. Operational Commands

### 7.1 Running Python Unit & MLOps Tests
```powershell
python -m pytest AI/tests/test_monitoring.py -v
```

### 7.2 Running Backend Integration Tests
```powershell
node --test backend/tests/monitoring.test.js
```

### 7.3 Building Frontend Bundle
```powershell
cd frontend
npm run build
```

### 7.4 Triggering Batch Evaluation Manually
```powershell
curl -X POST http://localhost:5000/api/admin/ai/monitoring/evaluate \
  -H "Authorization: Bearer <ADMIN_JWT_TOKEN>"
```

### 7.5 Checking Retraining Eligibility
```powershell
curl -X POST http://localhost:5000/api/admin/ai/monitoring/retrain-check \
  -H "Authorization: Bearer <ADMIN_JWT_TOKEN>"
```

### 7.6 Promoting Validated Candidate Model
```powershell
curl -X POST http://localhost:5000/api/admin/ai/monitoring/promote \
  -H "Authorization: Bearer <ADMIN_JWT_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"modelVersion": "2.1.0-candidate-202610111500"}'
```
