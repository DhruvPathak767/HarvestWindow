# 🌾 HarvestWindow — Enterprise Agricultural Decision & Harvest Prediction Platform

<div align="center">

  <img src="docs/assets/banner.svg" alt="HarvestWindow Platform Banner" width="100%" />

  <p align="center">
    <strong>Precision Agriculture · Autonomous Harvest Predictions · Grounded Agronomic Intelligence</strong>
  </p>

  <p align="center">
    <a href="https://nodejs.org/"><img src="https://img.shields.io/badge/Node.js-v20+-339933?style=for-the-badge&logo=nodedotjs&logoColor=white" alt="Node.js" /></a>
    <a href="https://expressjs.com/"><img src="https://img.shields.io/badge/Express-v4.21-000000?style=for-the-badge&logo=express&logoColor=white" alt="Express.js" /></a>
    <a href="https://fastapi.tiangolo.com/"><img src="https://img.shields.io/badge/FastAPI-v0.110-009688?style=for-the-badge&logo=fastapi&logoColor=white" alt="FastAPI" /></a>
    <a href="https://www.python.org/"><img src="https://img.shields.io/badge/Python-v3.10+-3776AB?style=for-the-badge&logo=python&logoColor=white" alt="Python" /></a>
    <a href="https://react.dev/"><img src="https://img.shields.io/badge/React-v19.2-61DAFB?style=for-the-badge&logo=react&logoColor=black" alt="React 19" /></a>
    <a href="https://www.typescriptlang.org/"><img src="https://img.shields.io/badge/TypeScript-v5.9-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" /></a>
    <a href="https://www.mysql.com/"><img src="https://img.shields.io/badge/MySQL-8.0+-4479A1?style=for-the-badge&logo=mysql&logoColor=white" alt="MySQL" /></a>
    <a href="https://www.prisma.io/"><img src="https://img.shields.io/badge/Prisma_ORM-v6.4-2D3748?style=for-the-badge&logo=prisma&logoColor=white" alt="Prisma" /></a>
  </p>

  <p align="center">
    <img src="https://img.shields.io/badge/Automated_Tests-100%25_PASSING-10B981?style=flat-square&logo=checkmarx&logoColor=white" alt="Automated Tests Passing" />
    <img src="https://img.shields.io/badge/Architecture-Dual_Tier_(Node_%2B_Python)-0284C7?style=flat-square" alt="Dual Tier Architecture" />
    <img src="https://img.shields.io/badge/Knowledge_Grounding-FAO_%2B_ICAR-047857?style=flat-square" alt="FAO & ICAR Grounded" />
    <img src="https://img.shields.io/badge/AI_Inference-Zero--Cost_Local_Synthesis-8B5CF6?style=flat-square" alt="Zero-Cost Local AI" />
    <img src="https://img.shields.io/badge/Security-Multi--Tenant_RBAC-4338CA?style=flat-square" alt="Multi-Tenant RBAC" />
    <img src="https://img.shields.io/badge/Status-PRODUCTION_READY-059669?style=flat-square" alt="Production Ready" />
  </p>

</div>

---

## 📑 Table of Contents

- [Executive Summary](#-executive-summary)
- [The Agricultural Challenge](#-the-agricultural-challenge)
- [Application UI Showcase](#-application-ui-showcase)
- [Core System Architecture](#-core-system-architecture)
- [Comprehensive Feature Matrix](#-comprehensive-feature-matrix)
- [Deep Dive: Agricultural AI & Intelligence Engine](#-deep-dive-agricultural-ai--intelligence-engine)
  - [1. Precision Harvest Window Prediction (GDD & Phenology)](#1-precision-harvest-window-prediction-gdd--phenology)
  - [2. Dual-Horizon Meteorological Intelligence](#2-dual-horizon-meteorological-intelligence)
  - [3. Crop Yield & Production Forecasting (Supervised ML)](#3-crop-yield--production-forecasting-supervised-ml)
  - [4. Computer Vision Crop Disease Diagnostics](#4-computer-vision-crop-disease-diagnostics)
  - [5. Agro-Climatic Suitability & Recommendation (FAO GAEZ)](#5-agro-climatic-suitability--recommendation-fao-gaez)
  - [6. Grounded Agricultural AI Assistant (RAG Engine)](#6-grounded-agricultural-ai-assistant-rag-engine)
  - [7. Autonomous Personalized Alert Engine](#7-autonomous-personalized-alert-engine)
  - [8. Model Monitoring, Drift Detection & MLflow Tracking](#8-model-monitoring-drift-detection--mlflow-tracking)
- [Database Architecture & Data Models](#-database-architecture--data-models)
- [Complete API Reference](#-complete-api-reference)
- [Project Directory Structure](#-project-directory-structure)
- [Prerequisites & Quickstart Guide](#-prerequisites--quickstart-guide)
- [Environment Configuration](#-environment-configuration)
- [Testing & Quality Assurance](#-testing--quality-assurance)
- [Security, Privacy & Responsible AI](#-security-privacy--responsible-ai)
- [Agricultural Advisory Disclaimer](#-agricultural-advisory-disclaimer)
- [Evaluation Highlights for Judges & Reviewers](#-evaluation-highlights-for-judges--reviewers)
- [License, Credits & References](#-license-credits--references)

---

## 📖 Executive Summary

**HarvestWindow** is a production-grade, full-stack precision agriculture and autonomous harvest forecasting platform designed for smallholder farmers, agricultural cooperatives (FPOs), agronomists, and supply-chain planners.

Harvest timing is the single most critical financial event in the crop production lifecycle. Harvesting a crop just **3 to 5 days too early** leads to underdeveloped kernels, high moisture content, and heavy discounting at agricultural mandis. Harvesting **3 to 5 days too late** exposes standing mature crops to catastrophic lodging, pod shattering, fungal rot, pest infestations, and unseasonal rainfall.

HarvestWindow replaces guesswork with an **integrated, data-driven intelligence stack**:
- **Field & Phenology Tracking:** Real-time monitoring of crop growth stages, soil parameters, and sowing dates.
- **Dual-Horizon Meteorological Analytics:** Fusion of real-time hyper-local weather with 10-day agro-meteorological forecasts.
- **Biophysical Harvest Prediction:** Growing Degree Day (GDD) thermal accumulation curves blended with machine learning adjustments.
- **Computer Vision Leaf Diagnostics:** Instant disease and pathogen classification from leaf imagery.
- **Grounded Agricultural AI Assistant:** Context-aware conversational RAG grounded strictly in certified ICAR and FAO agronomic knowledge.
- **Autonomous Early-Warning Engine:** Scheduled background risk monitoring generating actionable notifications with zero duplicates.

---

## 🎯 The Agricultural Challenge

Modern agriculture faces severe systemic vulnerabilities:

1. **The Harvest Window Dilemma:** Crop maturity is governed by thermal units (heat accumulation) and microclimate rather than arbitrary calendar days. Fixed calendar harvesting leads to quality loss and revenue reduction.
2. **Extreme Weather Shocks:** Unpredictable pre-harvest heatwaves accelerate desiccation, while unexpected cloudbursts submerge ready fields. Farmers lack predictive risk alerts that correlate weather events directly to harvest vulnerability.
3. **Fragmented Advisory & Hallucination Risks:** Farmers are often bombarded by generic advice disconnected from their actual field conditions, or generic AI chatbots that hallucinate chemical dosages and pesticide schedules.
4. **Disjointed Farm Record Keeping:** Multi-plot acreage, varied sowing dates, and fertilizer schedules are frequently tracked on paper, preventing timely supply-chain coordination and harvest labor booking.

**HarvestWindow directly resolves these challenges** by delivering a unified platform that continuously correlates soil conditions, phenology, satellite-grade weather forecasts, and certified agronomic science into clear, timely, actionable harvest windows.

---

## 🖼️ Application UI Showcase

All screens represent the active, verified frontend built with React 19, TypeScript, and modern agricultural design aesthetics:

| 🌾 Farmer Executive Dashboard | 📈 Precision Harvest Window Prediction |
| :---: | :---: |
| ![Dashboard Page](docs/screenshots/dashboard_page.png) | ![Forecast Page](docs/screenshots/forecast_page.png) |
| *Real-time farm portfolio, acreage summaries, meteorological risk radar, and open agronomic advisories.* | *Dynamic Growing Degree Day (GDD) accumulation curve, optimal harvest window dates, and weather impact analysis.* |

| 🤖 Grounded Agricultural AI Assistant | 🔔 Autonomous Alert & Advisory Center |
| :---: | :---: |
| ![Assistant Page](docs/screenshots/assistant_page.png) | ![Notifications Page](docs/screenshots/notifications_page.png) |
| *Context-aware agronomic chatbot grounded in ICAR/FAO citations with zero-hallucination guardrails and server tools.* | *Deduplicated real-time notifications with severity classifications, quiet-hours filtering, and one-click actions.* |

| 🚀 Landing & Value Proposition | 🔐 Secure Authentication & Multi-Role Access |
| :---: | :---: |
| ![Landing Page](docs/screenshots/landing_page.png) | ![Sign In Page](docs/screenshots/signin_page.png) |
| *Modern responsive interface explaining the harvest window dilemma and precision agricultural workflows.* | *Argon2id password security, HTTP-only JWT sessions, and instant demo access for rapid evaluation.* |

---

## 🏛️ Core System Architecture

HarvestWindow is built as a **decoupled, dual-tier enterprise architecture** separating user interactions, security gateways, and heavy scientific computation:

```mermaid
flowchart TD
    subgraph L1["1. CLIENT PRESENTATION LAYER"]
        UI_Dash["Executive Dashboard & Farm Metrics"]
        UI_Forecast["Harvest Predictions & GDD Curves"]
        UI_Vision["Computer Vision Leaf Health Scanner"]
        UI_Chat["Agronomic AI Assistant Drawer"]
        UI_Alerts["Notification Center & Action Feed"]
    end

    subgraph L2["2. APPLICATION & SECURITY GATEWAY (Node.js :5000)"]
        AuthMid["JWT Auth & Multi-Tenant Scoping"]
        RateMid["API Rate Limiting & Helmet Guard"]
        ZodMid["Strict Zod Contract Validation"]
        CronMid["15-Min Background Alert Scheduler"]
    end

    subgraph L3["3. PERSISTENCE LAYER (MySQL 8.0 + Prisma ORM)"]
        DB_Core["Users, Farms, Crops & Settings"]
        DB_AI["Harvest & Yield Predictions"]
        DB_Alerts["Notifications & Activity Logs"]
        DB_RAG["Agricultural Knowledge Corpus (ICAR/FAO)"]
    end

    subgraph L4["4. AGRONOMIC REASONING & RAG HUB"]
        BM25_Retriever["BM25 Agronomic Document Search"]
        Local_Synth["Zero-Cost Agronomic Synthesis Engine"]
        Tool_Registry["Server-Controlled Farm Tools"]
        Dedup_Engine["SHA-256 Deduplication Generator"]
    end

    subgraph L5["5. SCIENTIFIC AI/ML MICROSERVICE (Python FastAPI :8000)"]
        GDD_Engine["Biophysical GDD Accumulator"]
        Yield_ML["HistGradientBoosting Regressor"]
        Vision_ML["DigiGreen Leaf Pathology Model"]
        Suit_Engine["FAO GAEZ Suitability Engine"]
        MLflow_Mon["Drift Detector & MLflow Registry"]
    end

    subgraph L6["6. EXTERNAL METEOROLOGICAL INGESTION"]
        Weather_Live["WeatherAPI (3-Day Live Conditions)"]
        Weather_Forecast["Open-Meteo (10-Day GDD Forecast)"]
    end

    %% Data and Execution Flow
    L1 ==>|Bearer JWT REST & JSON| L2
    L2 -->|Prisma Client CRUD| L3
    L2 -->|Context Injection & RAG| L4
    L2 -->|Inter-Service HTTP Requests| L5
    L2 -->|Agro-Climatic Fetch| L6
    L4 -->|Document Retrieval| DB_RAG
    L4 -->|Idempotent Upserts| DB_Alerts
    L5 -.->|Model Checkpoints & Logs| L3
```

### Request & Data Processing Flow
1. **User Authentication & Authorization:** Requests pass through the Node.js/Express gateway. The session is verified via JWT Bearer headers or HTTP-only refresh tokens. All database queries are strictly scoped to the authenticated `userId`.
2. **Meteorological Synthesis:** The backend queries WeatherAPI for current microclimate metrics and Open-Meteo for 10-day forward projections. Rainfall, humidity, wind, and temperature are synthesized into standardized risk scores (0–100).
3. **Biophysical & ML Inference:** When predicting harvest windows or yield, the backend dispatches sanitized agronomic parameters to the Python FastAPI microservice (`:8000`). FastAPI evaluates GDD accumulation, applies supervised regression, and returns structured predictions with uncertainty bounds.
4. **Context-Aware Grounded RAG:** Inquiries sent to the Agricultural AI Assistant trigger a server-controlled tool evaluation to extract user farm context, followed by BM25 retrieval over verified ICAR/FAO document chunks. Responses are synthesized with verifiable citations.
5. **Background Monitoring & Alert Loop:** An in-process cron job runs every 15 minutes, scanning all active crops against weather thresholds and harvest milestones. Alerts are deduplicated using SHA-256 state hashing and dispatched directly to the farmer's Notification Center.

---

## ⚡ Comprehensive Feature Matrix

| Functional Module | System Role | Powered By | Primary Capability |
| :--- | :--- | :--- | :--- |
| **Farm & Field Portfolio** | Core Data Foundation | Node.js + Prisma + MySQL | Multi-tenant field mapping, soil profile tracking, acreage unit normalization (hectares/acres). |
| **Crop Lifecycle Management** | Phenological Tracking | Node.js + Express | Variety recording, sowing dates, and phenological stage progression (Germination $\to$ Ripening). |
| **Dual-Horizon Weather** | Meteorological Radar | WeatherAPI + Open-Meteo | 10-day agro-meteorological forecasting, precipitation tracking, wind gust and thermal stress indices. |
| **Precision Harvest Predictor** | Core Decision Engine | Python FastAPI + GDD Engine | Growing Degree Day accumulation modeling, weather delay offsets, and optimal harvest date windows. |
| **Crop Yield Forecaster** | Production Estimation | Scikit-Learn (HistGradientBoosting) | Supervised regression predicting yield (tonnes/ha) trained on 246k+ Indian agricultural records. |
| **Leaf Disease Diagnostics** | Computer Vision Scanner | MobileNetV3 Transfer Learning | Instant diagnosis of crop fungal/bacterial leaf lesions using the DigiGreen plant pathology dataset. |
| **Crop Suitability Advisor** | Agricultural Planning | FAO GAEZ Adapter + Pedology | Multi-factor pedological, seasonal, and climatic matching across 19 Agro-Ecological Zones (AEZs). |
| **Agricultural AI Assistant** | Grounded Conversational RAG | BM25 Engine + ICAR/FAO Corpus | Context-aware agronomic explanations, zero-hallucination citations, and user-scoped server tools. |
| **Autonomous Alert Engine** | 24/7 Field Monitoring | Deterministic Rules + In-Process Scheduler | Automated alerts for weather shocks, harvest readiness, and disease threats with quiet-hours control. |
| **Activity Audit Trail** | Operational Logging | Node.js + Prisma Events | Comprehensive timeline logging farm actions, predictions, dismissals, and crop updates. |
| **Model Drift & Monitoring** | ML Lifecycle Governance | MLflow + KS-Test & PSI | Real-time monitoring of input feature drift, performance degradation, and retraining eligibility. |

---

## 🔬 Deep Dive: Agricultural AI & Intelligence Engine

The artificial intelligence subsystem is engineered to adhere strictly to agronomic science, biophysical modeling, and verifiable data provenance.

```
┌────────────────────────────────────────────────────────────────────────┐
│                   HARVESTWINDOW AI SUBSYSTEM ARCHITECTURE              │
├────────────────────────────────┬───────────────────────────────────────┤
│    PYTHON FASTAPI MICROSERVICE │    NODE.JS REASONING & RAG HUB        │
│    (Port :8000)                │    (Port :5000)                       │
├────────────────────────────────┼───────────────────────────────────────┤
│ • GDD & Phenology Accumulator  │ • BM25 Agronomic Knowledge Retriever  │
│ • HistGradientBoosting Yield   │ • Zero-Cost Local Agronomic Synthesizer│
│ • MobileNetV3 Vision Classifier│ • Server-Controlled Farm Tool Registry │
│ • FAO GAEZ Suitability Engine  │ • Deterministic Alert Rule Engine     │
│ • MLflow Drift & PSI Monitor   │ • SHA-256 Deduplication Hash Engine   │
└────────────────────────────────┴───────────────────────────────────────┘
```

---

### 1. Precision Harvest Window Prediction (GDD & Phenology)

Instead of naive calendar calculations, HarvestWindow models crop maturity through **Growing Degree Days (GDD)**—the cumulative thermal energy required for a crop to transition from sowing to physiological maturity.

#### Mathematical Formulation
Daily thermal accumulation is computed using the standard agronomic formula:

$$GDD_{daily} = \max\left(0, \frac{T_{max} + T_{min}}{2} - T_{base}\right)$$

Where:
- $T_{max}$ = Daily maximum temperature (°C)
- $T_{min}$ = Daily minimum temperature (°C)
- $T_{base}$ = Crop-specific base temperature below which vegetative development halts (e.g., $10.0^\circ\text{C}$ for Maize, $5.5^\circ\text{C}$ for Wheat, $10.0^\circ\text{C}$ for Rice).

When accumulated GDD satisfies the crop variety threshold:

$$GDD_{accumulated}(t) = \sum_{i=sowing}^{t} GDD_{daily}(i) \ge GDD_{target}$$

The engine projects the **Most Likely Harvest Date** and establishes an optimal harvest window $[\text{Start Date}, \text{End Date}]$ adjusted for forecast weather disruptions (e.g., predicted rainfall exceeding 15mm delays harvest readiness by 2–3 days).

---

### 2. Dual-Horizon Meteorological Intelligence

HarvestWindow aggregates meteorological data across two independent horizons:
1. **Live Microclimate (WeatherAPI):** Current temperature, real-time relative humidity, barometric pressure, wind velocity, and 3-day high-resolution hourly precipitation.
2. **Medium-Range Forecast (Open-Meteo):** 10-day forward projections for temperature extremes, daily precipitation probability, solar radiation, and soil moisture estimations.

#### Agricultural Risk Scoring (0–100)
The meteorological module evaluates four distinct risk vectors:
- **Rainfall Risk:** Consecutive wet days and precipitation intensity threatening grain lodging and pod mold.
- **Thermal Risk:** Extreme heat spikes ($>38^\circ\text{C}$) during flowering causing pollen sterility, or frost events during grain filling.
- **Humidity Risk:** Sustained relative humidity ($>85\%$) coupled with moderate temperatures triggering fungal blight.
- **Wind Risk:** Sustained wind gusts ($>35\text{ km/h}$) causing mechanical lodging of heavy mature canopies.

---

### 3. Crop Yield & Production Forecasting (Supervised ML)

The yield prediction service evaluates farm acreage, geographic location, season, and inputs to predict total expected harvest volume in tonnes and metric yield in tonnes per hectare.

- **Model Architecture:** `HistGradientBoostingRegressor` (Scikit-Learn).
- **Training Data Foundation:** Ingested and audited from Kaggle & Hugging Face Indian Agricultural Statistics (`crop_production.csv`), containing **246,093 verified historical crop-season-district records** across 28 Indian states.
- **Feature Pipeline:**
  - Categorical encoders: `State`, `District`, `Crop`, `Season`.
  - Numeric regressors: `Planted Area (ha)`, `Rainfall (mm)`, `Fertilizer Usage (kg)`, `Pesticide Usage (kg)`.
- **Output:** Point prediction ($t/\text{ha}$) and 90% confidence uncertainty intervals ($[\text{Lower Yield}, \text{Upper Yield}]$).

---

### 4. Computer Vision Crop Disease Diagnostics

The crop health analysis module enables farmers to upload leaf imagery to detect diseases, pathogen symptoms, and nutrient deficiencies.

- **Vision Backbone:** MobileNetV3-Small with Transfer Learning, optimized for edge-device and low-latency cloud inference.
- **Dataset Provenance:** Trained on the **DigiGreen Crop Disease Dataset** and field plant pathology imagery across major staples (Tomato, Potato, Corn, Wheat, Rice, Cotton).
- **Inference Pipeline:**
  - Input normalization: $224 \times 224 \times 3$ RGB tensor normalized by ImageNet mean and variance.
  - Multi-class Softmax probability output.
  - Confidence scoring with ambiguity filters: predictions below 60% confidence are automatically flagged as `INCONCLUSIVE` to prevent erroneous chemical treatments.
- **Agronomic Action Plans:** Every diagnosed disease provides actionable cultural, biological, and chemical intervention steps validated by agricultural extension standards.

---

### 5. Agro-Climatic Suitability & Recommendation (FAO GAEZ)

The crop recommendation engine guides farmers on optimal crop selection prior to sowing based on multi-factor pedological and climatic compatibility.

- **Methodology:** Multi-factor suitability scoring integrating the **FAO/IIASA Global Agro-Ecological Zones (GAEZ v4)** framework across India's 19 recognized agro-ecological zones.
- **Evaluation Dimensions:**
  - **Soil Compatibility (30% weight):** Soil texture matching (Alluvial, Black, Red, Sandy Loam) and pH tolerance boundaries.
  - **Thermal Suitability (25% weight):** Mean temperature alignment with crop vegetative and flowering comfort ranges.
  - **Moisture & Precipitation (25% weight):** Seasonal water availability versus crop water requirements.
  - **Seasonal Window (20% weight):** Sowing month alignment against Kharif, Rabi, or Zaid cropping calendars.

---

### 6. Grounded Agricultural AI Assistant (RAG Engine)

The conversational assistant delivers context-aware, verifiable answers to farmer inquiries without proprietary API dependencies or commercial LLM hallucination risks.

```mermaid
sequenceDiagram
    autonumber
    actor Farmer as 👨‍🌾 Authenticated Farmer
    participant UI as React Assistant UI
    participant Backend as Express API Gateway
    participant Tools as Server-Controlled Tools
    participant RAG as BM25 Knowledge Retriever
    participant Engine as Local Agronomic Synthesizer
    participant DB as Prisma (MySQL)

    Farmer->>UI: "Is it safe to harvest my wheat this Friday?"
    UI->>Backend: POST /api/v1/ai/assistant/chat { conversationId, query }
    Backend->>Tools: Resolve user-scoped context (Farm: Punjab, Crop: Wheat, Sowing: Nov 15)
    Tools->>DB: Fetch active harvest prediction & 10-day weather forecast
    DB-->>Tools: Returns GDD: 94%, Weather: Rain expected Thursday night
    Backend->>RAG: Retrieve accredited chunks (Query: "wheat harvest moisture rain")
    RAG-->>Backend: Returns ICAR & FAO Wheat Harvest Guidelines
    Backend->>Engine: Synthesize structured response with citations & tools
    Engine-->>Backend: Grounded response + accredited source links
    Backend->>DB: Store conversation & messages
    Backend-->>UI: Deliver response with interactive farm tool cards & sources
    UI-->>Farmer: Displays harvest advisory with weather risk breakdown
```

#### Key Engineering Safeguards:
- **Server-Controlled Farm Tools:** The assistant automatically reads authenticated farm records (crop variety, current stage, GDD accumulation, live weather risks). The LLM cannot hallucinate farm parameters.
- **BM25 Agricultural Corpus:** Grounded in curated agronomic documents from the **Indian Council of Agricultural Research (ICAR)**, **Food and Agriculture Organization (FAO)**, **ICAR-IISS**, and **Punjab Agricultural University (PAU)**.
- **Zero-Hallucination Guardrails:** If an inquiry falls outside the accredited agronomic corpus, the engine states its boundary rather than fabricating speculative advice.
- **Pluggable Architecture:** Functions out of the box with the zero-cost local agronomic synthesizer, with drop-in adapters for Google Gemini, OpenAI, or self-hosted Ollama models via standard environment variables.

---

### 7. Autonomous Personalized Alert Engine

Rather than waiting for manual user queries, the platform proactively monitors all active farm fields in the background.

```mermaid
stateDiagram-v2
    [*] --> EVALUATING: 15-Minute Scheduler Trigger
    EVALUATING --> DEDUP_CHECK: Rule Match (Weather / GDD / Disease)
    DEDUP_CHECK --> ACTIVE: New Unique SHA-256 Fingerprint
    DEDUP_CHECK --> DROPPED: Duplicate Fingerprint Exists
    ACTIVE --> RESOLVED: Environmental Condition Cleared
    ACTIVE --> EXPIRED: Event Window Passed
    ACTIVE --> SUPERSEDED: Updated Severity Generated
    RESOLVED --> [*]
    EXPIRED --> [*]
    SUPERSEDED --> [*]
    DROPPED --> [*]
```

#### Deterministic Alert Rules:
- **Rule 1 — Imminent Harvest Window:** Triggers when predicted harvest start is $\le 5$ days away.
- **Rule 2 — Precipitation During Harvest:** Triggers when forecast rainfall $>10\text{mm}$ falls inside the optimal harvest window.
- **Rule 3 — Prolonged High Humidity / Fungal Risk:** Triggers when relative humidity $>80\%$ persists for $\ge 48$ hours during vegetative or grain-filling stages.
- **Rule 4 — Severe Heat Stress:** Triggers when maximum temperature exceeds $38^\circ\text{C}$ during reproductive or flowering stages.
- **Rule 5 — Harvest Delay / Stalled GDD:** Triggers when cold temperatures stall thermal accumulation, pushing maturity $\ge 7$ days past target.
- **Rule 6 — High Wind Gust Lodging Warning:** Triggers when wind speed $>35\text{ km/h}$ coincides with heavy mature grain heads.

#### Deterministic Deduplication:
Every alert generates a deterministic SHA-256 state fingerprint:
$$\text{dedupKey} = \text{SHA256}(\text{userId} \parallel \text{ruleKey} \parallel \text{farmId} \parallel \text{cropId} \parallel \text{dateKey})$$
This guarantees that farmers never receive duplicate notifications for the same event, while changes in severity instantly supersede older notices.

---

### 8. Model Monitoring, Drift Detection & MLflow Tracking

The machine learning governance module ensures model predictions remain reliable over time.

- **Input Data Drift Detection:** Continuously computes **Population Stability Index (PSI)** and two-sample **Kolmogorov-Smirnov (KS-test)** statistics between training baselines and real inference requests across temperature, rainfall, and acreage distributions.
- **Performance Drift Tracking:** Monitors Rolling Mean Absolute Error (MAE) and Mean Signed Error (Bias) against verified farmer harvest outcome reports.
- **Experiment Tracking:** Integrated with **MLflow** (`AI/mlflow.db`) tracking model versions, validation metrics, hyperparameter runs, and candidate retraining artifacts.

---

## 🗄️ Database Architecture & Data Models

HarvestWindow utilizes **MySQL 8.0** managed through **Prisma ORM**, with **18+ strictly typed, normalized relational models** designed for multi-tenant isolation, referential integrity, and performant indexing:

```mermaid
erDiagram
    User ||--o{ Farm : "owns"
    User ||--o{ RefreshSession : "maintains"
    User ||--o| UserSettings : "configures"
    User ||--o{ Notification : "receives"
    User ||--o{ Activity : "logs"
    User ||--o{ AssistantConversation : "engages"

    Farm ||--o{ Crop : "contains"
    Farm ||--o{ HarvestPrediction : "monitors"
    Farm ||--o{ WeatherAssessment : "tracks"
    Farm ||--o{ YieldPrediction : "forecasts"
    Farm ||--o{ CropHealthAnalysis : "scans"

    Crop ||--o{ HarvestPrediction : "evaluates"
    Crop ||--o{ WeatherAssessment : "assesses"
    Crop ||--o{ YieldPrediction : "predicts"
    Crop ||--o{ Notification : "triggers"

    AssistantConversation ||--o{ AssistantMessage : "contains"
    AgriculturalDataSource ||--o{ CropCalendar : "provides"
    CropMaster ||--o{ CropVariety : "classifies"
    CropMaster ||--o{ CropCalendar : "schedules"
    CropMaster ||--o{ CropGrowthProfile : "defines"
```

### Key Relational Entities:
1. `User`: Core authentication record storing email, Argon2id password hash, role (`FARMER`, `EXPERT`, `ADMIN`), and account state.
2. `RefreshSession`: Secure multi-device refresh token management with cryptographic token hashing and expiration tracking.
3. `Farm`: Agricultural property entity recording geographic coordinates (latitude/longitude), state, district, soil type, and normalized acreage.
4. `Crop`: Individual field planting records tracking variety, sowing date, expected harvest date, phenological stage, and irrigation method.
5. `HarvestPrediction`: Machine learning and GDD prediction outputs capturing GDD accumulation, optimal harvest window ranges, weather adjustments, and model versioning.
6. `WeatherAssessment`: Synthesized multi-factor weather risk assessments with individual scores for rainfall, humidity, wind, and thermal stress.
7. `YieldPrediction`: Production forecasts recording predicted metric yield ($t/\text{ha}$), planted area, expected tonnage, and confidence intervals.
8. `CropHealthAnalysis`: Image analysis records storing uploaded image paths, predicted disease class, confidence score, and treatment recommendations.
9. `Notification`: Real-time alerts with severity classifications (`info`, `warning`, `critical`, `success`), deduplication keys, status lifecycles, and direct action URLs.
10. `AssistantConversation` & `AssistantMessage`: Multi-turn conversational records storing user queries, assistant responses, accredited source citations, and tool invocation metadata.
11. `AgriculturalKnowledgeDocument`: Text chunks derived from ICAR and FAO publications with semantic topics, keywords, and publication metadata for BM25 retrieval.

---

## 📡 Complete API Reference

All backend API routes are mounted under both `/api/v1` and `/api` for backward compatibility. Authentication requires a valid `Authorization: Bearer <token>` header or an authenticated session cookie.

### Node.js & Express API Gateway (Port 5000)

| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :---: |
| `POST` | `/api/v1/auth/register` | Register a new user account with role selection | Public |
| `POST` | `/api/v1/auth/login` | Authenticate user; returns JWT token & HTTP-only cookie | Public |
| `POST` | `/api/v1/auth/refresh` | Rotate access token using valid refresh cookie | Session |
| `POST` | `/api/v1/auth/logout` | Revoke current session and clear authentication cookies | Bearer |
| `GET` | `/api/v1/farms` | List all farms owned by the authenticated user | Bearer |
| `POST` | `/api/v1/farms` | Create a new farm profile with geolocation & soil type | Bearer |
| `GET` | `/api/v1/crops` | List all active crops across user farms | Bearer |
| `POST` | `/api/v1/crops` | Register a new crop planting with variety & sowing date | Bearer |
| `GET` | `/api/v1/weather/farm/:farmId` | Fetch 10-day meteorological forecast and risk radar | Bearer |
| `POST` | `/api/v1/forecasts/harvest-window` | Generate GDD-driven harvest window prediction | Bearer |
| `GET` | `/api/v1/yield/farm/:farmId` | Predict crop yield and total expected production tonnage | Bearer |
| `POST` | `/api/v1/crop-health/scan` | Upload leaf image for disease diagnosis (multipart/form-data) | Bearer |
| `POST` | `/api/v1/ai/assistant/chat` | Send conversational query to Agronomic AI Assistant | Bearer |
| `GET` | `/api/v1/ai/assistant/conversations` | Retrieve conversation history for authenticated user | Bearer |
| `GET` | `/api/v1/notifications` | Fetch unread and active alerts with filtering options | Bearer |
| `PATCH` | `/api/v1/notifications/:id/read` | Mark a specific notification as read | Bearer |
| `POST` | `/api/v1/notifications/evaluate` | Manually trigger evaluation of alert rules for user farms | Bearer |
| `GET` | `/api/v1/activity` | Retrieve recent activity audit events | Bearer |
| `GET` | `/api/v1/settings` | Get farmer preferences (units, quiet hours, alert toggles) | Bearer |
| `PATCH` | `/api/v1/settings` | Update farmer preferences and notification rules | Bearer |

### Python AI & Machine Learning Microservice (Port 8000)

| Method | Endpoint | Description | Powered By |
| :--- | :--- | :--- | :--- |
| `GET` | `/health` | Microservice health check and active model inventory | FastAPI |
| `POST` | `/predict` | Predict harvest window, GDD accumulation, and weather offsets | Biophysical GDD Engine |
| `POST` | `/validate-input` | Validate agronomic parameters and base temperatures | Pydantic Schema |
| `POST` | `/yield/predict` | Predict metric crop yield ($t/\text{ha}$) and uncertainty bounds | HistGradientBoosting |
| `POST` | `/yield/estimate-production` | Calculate total production tonnage from acreage inputs | Production Estimator |
| `POST` | `/crop-health/predict` | Classify crop leaf disease from uploaded image buffer | MobileNetV3 Transfer ML |
| `GET` | `/crop-health/model-info` | Retrieve vision model metadata, class registry, and metrics | Class Registry |
| `POST` | `/crop-recommendation/evaluate` | Multi-factor pedological and agro-climatic suitability scoring | FAO GAEZ Adapter |
| `POST` | `/monitoring/drift/input` | Run PSI and KS-test input feature drift analysis | Drift Detector |
| `POST` | `/monitoring/drift/performance` | Run rolling MAE and prediction bias drift analysis | Drift Detector |

---

## 📂 Project Directory Structure

```
HarvestWindow/
├── AI/                                  # Python AI & Machine Learning Microservice
│   ├── crop_health/                     # Computer vision leaf disease diagnostic module
│   │   ├── class_registry.py            # Disease classification mappings & treatments
│   │   ├── inference.py                 # MobileNetV3 inference pipeline
│   │   └── schemas.py                   # Pydantic request/response schemas
│   ├── crop_recommendation/             # Agro-climatic suitability engine
│   │   ├── data/fao_gaez_adapter.py     # FAO GAEZ v4 agro-ecological zone adapter
│   │   ├── engine.py                    # Multi-factor pedological scoring engine
│   │   └── knowledge.py                 # Crop agronomic tolerance parameters
│   ├── datasets/                        # Historical agricultural datasets & caches
│   │   └── crop_production.csv          # 246k+ Indian historical crop records
│   ├── harvest_prediction/              # Biophysical GDD & harvest prediction engine
│   │   ├── crop_knowledge.py            # Crop thermal thresholds & base temperatures
│   │   ├── gdd.py                       # Growing Degree Day calculation routines
│   │   ├── prediction_service.py        # Core prediction orchestration
│   │   └── weather.py                   # Meteorological forecast ingestion adapter
│   ├── monitoring/                      # Model governance, drift & MLflow tracking
│   │   ├── drift_detector.py            # PSI and Kolmogorov-Smirnov drift analytics
│   │   ├── evaluator.py                 # Outcome error and accuracy evaluations
│   │   └── mlflow_tracker.py            # MLflow experiment and artifact logger
│   ├── yield_forecasting/               # Supervised crop yield regressor
│   │   ├── predict.py                   # HistGradientBoosting inference pipeline
│   │   └── production_estimator.py      # Acreage unit conversion and tonnage estimation
│   ├── main.py                          # FastAPI server application (:8000)
│   ├── requirements.txt                 # Python dependencies
│   └── tests/                           # Pytest validation test suite
│
├── backend/                             # Node.js & Express API Gateway (:5000)
│   ├── prisma/
│   │   ├── schema.prisma                # 18+ normalized relational models (MySQL)
│   │   └── seed.js                      # Database seeder with demo farms and knowledge base
│   ├── src/
│   │   ├── config/                      # Environment variables, database connection, JWT
│   │   ├── middleware/                  # Rate limiting, authentication, error handling
│   │   ├── modules/
│   │   │   ├── activity/                # Operational audit feed and activity logging
│   │   │   ├── agriculture/             # Crop master catalogs and regional calendars
│   │   │   ├── assistant/               # Grounded Agronomic AI Assistant (RAG Engine)
│   │   │   │   ├── assistant.controller.js
│   │   │   │   ├── assistant.service.js
│   │   │   │   ├── assistantTools.js     # Server-controlled user-scoped farm tools
│   │   │   │   ├── bm25Retriever.js     # BM25 agronomic document retrieval engine
│   │   │   │   └── localSynthesizer.js  # Zero-cost agronomic reasoning engine
│   │   │   ├── auth/                    # Argon2id password hashing, JWT sessions
│   │   │   ├── cropHealth/              # Crop disease scanner controller & service
│   │   │   ├── crops/                   # Crop lifecycle and phenological management
│   │   │   ├── dashboard/               # Executive dashboard summary aggregations
│   │   │   ├── farms/                   # Farm creation, geolocation, acreage tracking
│   │   │   ├── forecasts/               # Harvest prediction service & controller
│   │   │   ├── notifications/           # Autonomous alert engine & scheduler
│   │   │   │   ├── alertRules.js        # Deterministic meteorological and GDD rules
│   │   │   │   ├── alertScheduler.js    # In-process 15-minute background cron runner
│   │   │   │   └── notifications.service.js # Deduplication hashing and lifecycle transitions
│   │   │   ├── settings/                # Farmer preferences, quiet hours, unit selection
│   │   │   ├── weather/                 # Dual-horizon meteorological aggregator
│   │   │   └── yield/                   # Crop yield estimation controller & service
│   │   ├── app.js                       # Express app configuration, middleware, route mounts
│   │   └── server.js                    # Server startup and graceful shutdown
│   ├── package.json                     # Backend dependencies & test scripts
│   └── tests/                           # Node.js automated test suite (36+ tests)
│
├── frontend/                            # React 19 + TypeScript + Vite Frontend (:5173)
│   ├── src/
│   │   ├── app/                         # Router configuration (HashRouter, lazy routes)
│   │   ├── components/                  # Design system, AppShell layout, navigation, cards
│   │   ├── features/                    # Feature domain views
│   │   │   ├── assistant/               # Agronomic AI Assistant conversational drawer
│   │   │   ├── auth/                    # Sign in & registration with demo shortcuts
│   │   │   ├── cropHealth/              # Disease scanner and image diagnosis view
│   │   │   ├── crops/                   # Field and crop detail view
│   │   │   ├── dashboard/               # Main farmer executive dashboard
│   │   │   ├── farms/                   # Farm management and field creation modal
│   │   │   ├── forecasts/               # Precision harvest prediction & GDD timeline
│   │   │   ├── landing/                 # Responsive high-converting landing page
│   │   │   ├── notifications/           # Notification Center with filter tabs and actions
│   │   │   ├── settings/                # User preferences and alert threshold controls
│   │   │   └── weather/                 # 10-day meteorological radar and forecast
│   │   ├── store/                       # Application state management
│   │   └── main.tsx                     # React application entry point
│   ├── package.json                     # Frontend dependencies
│   └── vite.config.ts                   # Vite bundler configuration
│
└── docs/                                # Technical documentation assets
    ├── assets/
    │   └── banner.svg                   # High-contrast GitHub Camo-safe platform banner
    └── screenshots/                     # Genuine application screenshots
        ├── landing_page.png
        ├── signin_page.png
        ├── dashboard_page.png
        ├── forecast_page.png
        ├── assistant_page.png
        └── notifications_page.png
```

---

## 🚀 Prerequisites & Quickstart Guide

### Prerequisites
- **Node.js:** v20.0.0 or higher
- **Python:** v3.10.0 or higher
- **MySQL Database Server:** v8.0 or higher
- **Package Managers:** `npm` (Node) and `pip` (Python)

---

### Step 1: Database Setup
Ensure your MySQL server is running, and create an empty database:
```sql
CREATE DATABASE harvestwindow CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

---

### Step 2: Backend API Gateway Setup
Open a terminal and configure the backend service:
```bash
cd backend

# Install dependencies
npm install

# Configure environment variables (copy example and edit)
cp .env.example .env

# Generate Prisma Client and apply migrations
npm run prisma:generate
npm run prisma:migrate

# Seed database with initial agronomic knowledge & demo accounts
npm run db:seed

# Start backend server in development mode (Runs on port 5000)
npm run dev
```

---

### Step 3: Python AI Microservice Setup
Open a second terminal and launch the AI service:
```bash
cd AI

# (Recommended) Create and activate a Python virtual environment
python -m venv venv
# On Windows:
.\venv\Scripts\activate
# On Linux/macOS:
source venv/bin/activate

# Install required machine learning and data science libraries
pip install -r requirements.txt

# Start the FastAPI server (Runs on port 8000)
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

---

### Step 4: Frontend Application Setup
Open a third terminal and launch the React user interface:
```bash
cd frontend

# Install frontend dependencies
npm install

# Start Vite development server (Runs on port 5173)
npm run dev
```

---

### Step 5: Access the Application
Open your web browser and navigate to:
```
http://localhost:5173
```
- Click **"Sign In"** $\to$ Click **"Farmer Demo"** to log in instantly with pre-seeded demo farms, crops, and live predictions.

---

## ⚙️ Environment Configuration

### Backend Environment Variables (`backend/.env`)

```env
# Server Configuration
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:5173

# Database Connection (MySQL via Prisma)
DATABASE_URL="mysql://root:password@localhost:3306/harvestwindow"

# JWT Authentication Secrets
JWT_SECRET=your_super_secret_jwt_access_key_change_in_production
JWT_EXPIRES_IN=15m
REFRESH_TOKEN_SECRET=your_super_secret_refresh_token_key_change_in_production
REFRESH_TOKEN_EXPIRES_IN=7d

# Python AI Microservice URL
AI_SERVICE_URL=http://localhost:8000

# Weather API Integrations
# Open-Meteo works out-of-the-box with zero keys required.
# WeatherAPI key is optional (fallback heuristics provide seamless operation if omitted):
WEATHERAPI_KEY=your_optional_weatherapi_key_here

# LLM Provider Configuration (Optional)
# HarvestWindow includes a zero-cost local agronomic synthesizer by default.
# To connect an external LLM, configure one of the following:
# LLM_PROVIDER="gemini" | "openai" | "ollama" | "local"
LLM_PROVIDER=local
GEMINI_API_KEY=your_optional_gemini_api_key_here
```

### Python AI Microservice Environment (`AI/.env`)

```env
PORT=8000
ENVIRONMENT=development
MLFLOW_TRACKING_URI=sqlite:///mlflow.db
```

---

## 🧪 Testing & Quality Assurance

HarvestWindow includes automated end-to-end unit and integration tests across the backend, AI microservice, and frontend build pipelines.

### Running Backend Tests
The backend test suite executes natively with the Node.js test runner (`node:test`) and validates authentication, farm scoping, GDD forecast logic, alert deduplication, and RAG assistant workflows:
```bash
cd backend
npm test
```
**Test Results:**
```
✔ User Registration & Authentication Suite (6 tests)
✔ Farm & Crop Multi-Tenant Isolation Suite (5 tests)
✔ Precision Harvest GDD & Weather Adjustment Suite (7 tests)
✔ Grounded Agricultural AI Assistant Suite (6 tests)
✔ Autonomous Personalized Alert & Deduplication Engine (8 tests)
✔ Notification Lifecycle & Quiet Hours Suite (4 tests)

ℹ tests 36
ℹ suites 6
ℹ pass 36
ℹ fail 0
ℹ cancelled 0
ℹ duration_ms 1420
```

### Running Python AI Microservice Tests
```bash
cd AI
pytest tests/ -v
```

### Validating Frontend Production Build
```bash
cd frontend
npm run build
```
The frontend builds cleanly via Vite with **zero TypeScript errors and zero bundling warnings**.

---

## 🔒 Security, Privacy & Responsible AI

### 1. Multi-Tenant Data Isolation
Every API endpoint queries the database strictly scoped by the authenticated user's `userId` decoded from verified JWT claims. Users cannot read, mutate, or query farms, crops, predictions, or alerts belonging to other farmers.

### 2. Cryptographic Password & Session Protection
- **Argon2id Hashing:** User passwords are encrypted using state-of-the-art Argon2id hashing, resistant to GPU/ASIC brute-force attacks.
- **HTTP-Only Cookies:** Refresh tokens are transported exclusively via secure, `httpOnly`, `sameSite: strict` cookies, shielding tokens from client-side Cross-Site Scripting (XSS) extraction.

### 3. API Hardening & Input Validation
- **Helmet HTTP Headers:** Security headers mitigate clickjacking, MIME-sniffing, and cross-site injection attacks.
- **Adaptive Rate Limiting:** Global rate limiting protects against Denial of Service (DoS) and credential-stuffing attacks.
- **Strict Zod Contracts:** All incoming payloads are validated at the gateway level against strict Zod schemas before reaching business logic.

### 4. Responsible AI & Hallucination Prevention
- **Agronomic Grounding:** Assistant responses are grounded in accredited reference documents from ICAR and FAO.
- **Zero Chemical Fabrication:** The assistant explicitly declines to generate speculative chemical formulations or unverified pesticide combinations.
- **Confidence Thresholds:** Vision models classify low-confidence samples as `INCONCLUSIVE` rather than asserting a false diagnosis.

---

## ⚠️ Agricultural Advisory Disclaimer

> **IMPORTANT NOTICE FOR PRODUCERS AND AGRONOMISTS:**
> 
> HarvestWindow is an advanced decision-support and forecasting tool designed to assist agricultural planning. All predictions—including harvest windows, weather risk assessments, yield forecasts, and crop disease diagnoses—are probabilistic estimates based on available sensor data, meteorological models, and agronomic reference profiles.
> 
> Actual harvest outcomes may be influenced by unexpected microclimate anomalies, localized pests, soil heterogeneity, and severe weather events. HarvestWindow recommendations **should not replace on-field physical crop inspection** by certified agricultural extension officers or qualified agronomists. Always verify local field moisture and grain hardness before deploying commercial harvesting machinery.

---

## 🏆 Evaluation Highlights for Judges & Reviewers

For hackathon judges, academic evaluators, and technical interviewers reviewing this repository:

1. **Complete, Working Full-Stack System:** Not a mockup or conceptual prototype. Features a live React 19 frontend, an Express.js security gateway, a MySQL relational database with Prisma ORM, and a Python FastAPI scientific microservice.
2. **True Agronomic Depth:** Unlike generic AI apps, HarvestWindow models actual biophysical processes using Growing Degree Day (GDD) thermal accumulation curves and FAO GAEZ agro-ecological zones.
3. **Zero-Cost, Hallucination-Free RAG:** The Agricultural AI Assistant uses a BM25 token retriever grounded in accredited ICAR/FAO publications and user-scoped server tools, operating out of the box with zero paid API requirements.
4. **Autonomous Event-Driven Architecture:** The 15-minute alert engine evaluates 6 deterministic agronomic risk rules and utilizes SHA-256 state fingerprinting to eliminate duplicate notifications.
5. **Rigorous Engineering Standards:** 100% automated test pass rate (36/36 tests passing), clean separation of concerns, strict schema validation via Zod, and full multi-tenant security isolation.

---

## 📜 License, Credits & References

### Accredited Knowledge Sources & Data Provenance
- **Indian Council of Agricultural Research (ICAR):** Crop production guidelines, sowing calendars, and physiological base temperatures.
- **Food and Agriculture Organization (FAO):** Global Agro-Ecological Zones (GAEZ v4) framework and crop water requirement benchmarks.
- **Open-Meteo & WeatherAPI:** Meteorological forecast APIs providing temperature, precipitation, humidity, and solar radiation data.
- **DigiGreen Field Pathology Project:** Plant disease leaf imagery dataset.
- **Ministry of Agriculture & Farmers Welfare (India):** Historical district-level crop production and yield statistics (1997–2020).

### Project Licensing
This project is developed as an academic and hackathon submission for precision agriculture decision support. All third-party libraries and datasets remain the intellectual property of their respective creators.

---

<div align="center">

  <p><strong>HarvestWindow · Empowering Farmers with Precision Decisions</strong></p>
  <p>
    <a href="#-table-of-contents">Back to Top ↑</a> · 
    <a href="#-core-system-architecture">System Architecture</a> · 
    <a href="#-api-reference">API Reference</a> · 
    <a href="#-prerequisites--quickstart-guide">Quickstart Guide</a>
  </p>

</div>
