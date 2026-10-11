<p align="center">
  <img src="docs/assets/banner.svg" alt="HarvestWindow Animated Enterprise Banner" width="100%" />
</p>

<p align="center">
  <a href="https://nodejs.org/"><img src="https://img.shields.io/badge/Node.js-v20+-339933?style=for-the-badge&logo=nodedotjs&logoColor=white" alt="Node.js" /></a>
  <a href="https://expressjs.com/"><img src="https://img.shields.io/badge/Express-v4.19-000000?style=for-the-badge&logo=express&logoColor=white" alt="Express.js" /></a>
  <a href="https://react.dev/"><img src="https://img.shields.io/badge/React-v19.0-61DAFB?style=for-the-badge&logo=react&logoColor=black" alt="React 19" /></a>
  <a href="https://www.typescriptlang.org/"><img src="https://img.shields.io/badge/TypeScript-v5.7-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" /></a>
  <a href="https://vite.dev/"><img src="https://img.shields.io/badge/Vite-v7.3-646CFF?style=for-the-badge&logo=vite&logoColor=white" alt="Vite" /></a>
  <a href="https://www.mysql.com/"><img src="https://img.shields.io/badge/MySQL-8.0+-4479A1?style=for-the-badge&logo=mysql&logoColor=white" alt="MySQL" /></a>
  <a href="https://www.prisma.io/"><img src="https://img.shields.io/badge/Prisma_ORM-v6.19-2D3748?style=for-the-badge&logo=prisma&logoColor=white" alt="Prisma" /></a>
  <a href="https://cloud.google.com/vertex-ai"><img src="https://img.shields.io/badge/Google_Gemini-Ready-8E75C4?style=for-the-badge&logo=googlegemini&logoColor=white" alt="Gemini" /></a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Automated_Tests-180%2B%20PASSED%20(100%25)-10B981?style=flat-square&logo=checkmarx&logoColor=white" alt="Tests Passed" />
  <img src="https://img.shields.io/badge/AI_Engine-Zero--Cost_Agronomic_Synthesis-059669?style=flat-square" alt="Zero Cost AI" />
  <img src="https://img.shields.io/badge/Knowledge_Grounding-FAO_%2B_ICAR_%2B_IISS-047857?style=flat-square" alt="FAO/ICAR Grounded" />
  <img src="https://img.shields.io/badge/Weather-Dual_Horizon_(Open--Meteo_%2B_WeatherAPI)-0284C7?style=flat-square" alt="Weather Dual Engine" />
  <img src="https://img.shields.io/badge/Security-Multi--Tenant_RBAC-4338CA?style=flat-square" alt="Multi Tenant" />
  <img src="https://img.shields.io/badge/License-MIT-F59E0B?style=flat-square" alt="MIT License" />
</p>

---

## 🌾 Executive Summary

**HarvestWindow** is an enterprise-grade agricultural intelligence and decision-support platform engineered to solve the most financially volatile problem in agriculture: **harvest timing uncertainty and post-harvest crop loss**.

Timing a harvest even 3 to 5 days prematurely or belatedly causes catastrophic losses—immature grain moisture content triggers pod shattering and fungal decay, while unexpected precipitation during harvesting shatters market prices. 

HarvestWindow unifies **10-day dual microclimate meteorological intelligence**, **phenological Growing Degree Day (GDD) modeling**, **soil and variety dynamics**, **supervised machine learning yield regressors**, **computer vision leaf disease detection**, and an **authoritative RAG Agricultural AI Assistant with deterministic personalized alerts**.

> [!IMPORTANT]
> **Zero-Cost & Anti-Hallucination Philosophy**:
> Unlike naive LLM wrappers that hallucinate weather numbers and farming dates, HarvestWindow operates on a **strictly grounded, server-controlled architecture**. The system ships with a high-precision, zero-cost **Local Agronomic Synthesis Engine** that requires **no external paid API keys or cloud tokens**. Farm context and citations are verified against peer-reviewed **ICAR, FAO, IISS, and PAU** reference benchmarks.

---

## 🏛️ Next-Level System Architecture

```mermaid
graph TB
    %% Styling
    classDef clientStyle fill:#0f2b1d,stroke:#34d399,stroke-width:2px,color:#ecfdf5;
    classDef gatewayStyle fill:#0b1d3a,stroke:#38bdf8,stroke-width:2px,color:#f0f9ff;
    classDef aiStyle fill:#2a1b4e,stroke:#a855f7,stroke-width:2px,color:#faf5ff;
    classDef dataStyle fill:#2d1b06,stroke:#f59e0b,stroke-width:2px,color:#fffbeb;
    classDef extStyle fill:#1e293b,stroke:#94a3b8,stroke-width:1.5px,color:#f8fafc;

    subgraph Client["💻 PRESENTATION LAYER (React 19 + TypeScript + Vite)"]
        UI_Shell["App Shell & Navigation<br/><code>AppShell.tsx</code> / <code>Sidebar.tsx</code>"]
        UI_Dash["Executive Dashboard<br/><code>DashboardPage.tsx</code>"]
        UI_Assistant["Agricultural AI Assistant<br/><code>AssistantPage.tsx</code>"]
        UI_Notif["Notification Center<br/><code>NotificationCenterPage.tsx</code>"]
        UI_Weather["Weather Intelligence<br/><code>WeatherPage.tsx</code>"]
        UI_Forecast["Harvest Predictions<br/><code>ForecastPage.tsx</code>"]
        UI_CropHealth["Vision Health Diagnostics<br/><code>CropHealthPage.tsx</code>"]
    end
    class UI_Shell,UI_Dash,UI_Assistant,UI_Notif,UI_Weather,UI_Forecast,UI_CropHealth clientStyle;

    subgraph Gateway["🛡️ SECURE APPLICATION GATEWAY (Node.js & Express)"]
        AuthMid["JWT & Multi-Tenant Isolation Middleware<br/><code>authenticate.js</code> / <code>rateLimiter.js</code>"]
        APIRoutes["Centralized REST Dispatcher<br/><code>/api/v1/*</code> & <code>/api/*</code>"]
        ZodValidator["Strict Schema Contract Validation<br/>Zod Schemas"]
    end
    class AuthMid,APIRoutes,ZodValidator gatewayStyle;

    subgraph AIServices["🧠 INTELLIGENCE & AI ORCHESTRATION PIPELINE"]
        subgraph PhaseAI7["Phase AI-7: Grounded AI Assistant"]
            ToolReg["Server-Controlled Tool Registry<br/><code>farmTools.js</code> (User-Scoped)"]
            RAG["Agronomic BM25 Retriever<br/><code>retriever.js</code> (FAO/ICAR)"]
            ProviderMgr["LLM Provider Abstraction<br/><code>LocalAgronomicEngine</code> | <code>Gemini</code> | <code>Ollama</code>"]
        end
        subgraph PhaseAI8["Phase AI-8: Personalized Alert Engine"]
            AlertRules["Deterministic Rules Config<br/><code>alertRules.config.js</code>"]
            AlertDedup["Deterministic Deduplicator<br/><code>alertDeduplicator.js</code>"]
            AlertScheduler["In-Process Background Scheduler<br/><code>alertScheduler.js</code> (15m tick)"]
        end
        subgraph CoreAI["Core Predictive AI Engines"]
            AI2_Harvest["AI-2: Harvest Window Engine<br/>GDD + Phenology Timeline"]
            AI3_Weather["AI-3: Weather Risk Engine<br/>Rain, Heat & Wind Scoring"]
            AI5_Yield["AI-5: Yield Regressor<br/>HistGradientBoosting (t/ha)"]
            AI6_Health["AI-6: Disease Diagnostic<br/>DigiGreen Vision Model"]
        end
    end
    class ToolReg,RAG,ProviderMgr,AlertRules,AlertDedup,AlertScheduler,AI2_Harvest,AI3_Weather,AI5_Yield,AI6_Health aiStyle;

    subgraph DataLayer["💾 PERSISTENCE & KNOWLEDGE STORAGE (MySQL + Prisma)"]
        DB_Farms["Farms & Crops Master<br/><code>farms</code> / <code>crops</code>"]
        DB_Predictions["Harvest & Yield Predictions<br/><code>harvest_predictions</code> / <code>yield_predictions</code>"]
        DB_Weather["Weather Risk Assessments<br/><code>weather_assessments</code>"]
        DB_Alerts["Notifications & Preferences<br/><code>notifications</code> / <code>user_settings</code>"]
        DB_Knowledge["Agronomic Knowledge Corpus<br/><code>agricultural_knowledge_documents</code>"]
        DB_Chat["Conversation Sessions & Audits<br/><code>assistant_conversations</code> / <code>messages</code>"]
    end
    class DB_Farms,DB_Predictions,DB_Weather,DB_Alerts,DB_Knowledge,DB_Chat dataStyle;

    subgraph External["🌐 ACCREDITED AGRICULTURAL SOURCES & SATELLITES"]
        FAO_ICAR["FAO, ICAR, IISS, PAU, TNAU<br/>Agronomic Reference Guides"]
        OpenMeteo["Open-Meteo & WeatherAPI<br/>10-Day Dual-Horizon Microclimate"]
    end
    class FAO_ICAR,OpenMeteo extStyle;

    %% Data Flow Connections
    Client -->|Bearer JWT HTTP Requests| Gateway
    Gateway --> AIServices
    AIServices -->|Prisma ORM Queries| DataLayer
    AIServices -->|Real-Time Forecasts| OpenMeteo
    RAG -->|Semantic Query & Citations| DB_Knowledge
    FAO_ICAR -.->|Ingestion Pipeline / Checksum| DB_Knowledge
    AlertScheduler -->|Idempotent Monitoring| AlertDedup
    AlertDedup -->|Persist Active / Expire Stale| DB_Alerts
    DB_Alerts -->|Live Badge & Center| UI_Notif
    ProviderMgr -->|Source-Grounded Response| UI_Assistant
```

---

## 🤖 Phase AI-7: Agricultural AI Assistant

The Agricultural AI Assistant is a **context-aware conversational intelligence system** capable of answering complex farming queries with zero hallucinations, grounded exclusively in the farmer’s authorized farm data and accredited agricultural scientific research.

### Conversational Architecture & Tool Execution Flow

```mermaid
sequenceDiagram
    autonumber
    actor Farmer as 👨‍🌾 Authenticated Farmer
    participant UI as React Assistant UI
    participant Backend as Express Chat Controller
    participant Tools as Server-Controlled Farm Tools
    participant RAG as BM25 Knowledge Retriever
    participant Synth as Local Agronomic Synthesis Engine
    participant DB as MySQL (Prisma)

    Farmer->>UI: Types query: "When is my wheat ready and are there rain risks?"
    UI->>Backend: POST /api/v1/ai/assistant/chat (message, farmId, conversationId)
    Backend->>Backend: Authenticate Bearer JWT & verify farm ownership
    
    par Authorized Farm Context
        Backend->>Tools: get_harvest_prediction(cropId)
        Tools->>DB: Query latest GDD & maturity dates
        Tools-->>Backend: Return window: Oct 18 - Oct 25, GDD 100%
        Backend->>Tools: get_weather_risk(farmId)
        Tools->>DB: Query latest weather assessment
        Tools-->>Backend: Return risk: 68/100 (Caution: 18mm rain expected)
    and Authoritative RAG Retrieval
        Backend->>RAG: retrieveAgriculturalKnowledge(query, "Wheat")
        RAG->>DB: BM25 token match against FAO/ICAR documents
        RAG-->>Backend: Return verified chunks & institutional citations
    end

    Backend->>Synth: Synthesize grounded response(farmContext, citations, language)
    Synth-->>Backend: Answer with mathematical facts + verified citation links
    Backend->>DB: Persist user message, assistant response, & citations JSON
    Backend-->>UI: Return JSON response with answer, citations, and related entities
    UI-->>Farmer: Render formatted response with clickable FAO/ICAR citation cards
```

### Key Assistant Capabilities
- **Harvest Window Explanation**: Translates accumulated Growing Degree Days (GDD), base temperatures ($T_{\text{base}} = 5^\circ\text{C}$ for wheat), and weather shifts into clear field operational timelines.
- **Microclimate Weather Synthesis**: Identifies forecast rainfall events crossing harvest windows and calculates drying window closures.
- **Yield Forecast Interpretation**: Explains ML predicted yield (tonnes/hectare) alongside planted hectares and regional historical baselines.
- **Crop Disease Scouting Advice**: Translates leaf disease diagnostic classifications from Phase AI-6 into practical Integrated Pest Management (IPM) guidelines.
- **Strict Multi-Tenant Tool Security**: The LLM never selects arbitrary database tables or executes raw SQL/shell commands. All tools verify `userId` ownership on every query.

---

## 🔔 Phase AI-8: Personalized Alerts & Recommendation Engine

Phase AI-8 provides an **autonomous, deterministic monitoring system** that evaluates live farm data, weather changes, and crop maturity to alert farmers at the optimal time with clear, actionable recommendations.

### Deterministic Alert Rules Engine

| Rule ID | Category | Trigger Condition | Severity | Recommended Next Action |
| :--- | :--- | :--- | :--- | :--- |
| `harvest_window_approaching` | 🌾 Harvest | Target harvest is within $\le 7$ days | **MEDIUM** | Finalize storage containers, tarpaulins, labor, and transport logistics. |
| `harvest_window_open` | 🌾 Harvest | Current date is within optimal window start & end | **HIGH** | Inspect field maturity (grain moisture / pod shattering) and begin harvesting. |
| `harvest_window_closing` | 🌾 Harvest | Current date is within $\le 3$ days of window close | **CRITICAL** | Complete harvest before weather deterioration or grain quality loss. |
| `weather_risk_escalation` | 🌦️ Weather | Overall weather risk score $\ge 60$ (or status `CAUTION`) | **HIGH** / **CRITICAL** | Review hourly precipitation and wind forecasts before scheduling cutting or drying. |
| `weather_rain_during_harvest` | 🌦️ Weather | Forecast rain $> 5\text{ mm}$ during active harvest window | **CRITICAL** | Pause field cutting; ensure field drainage and protect already harvested grain. |
| `prediction_date_change` | 📈 Forecast | AI model shifts harvest date by $\ge 3$ days | **MEDIUM** | Review updated growth trajectory and adjust field schedule. |
| `prediction_yield_change` | 📈 Forecast | Predicted yield shifts by $\ge 10\%$ relative to prior run | **MEDIUM** | Inspect yield drivers, nutrient leaching, or weather anomalies. |
| `crop_health_concern` | 🛡️ Health | Vision AI detects diseased foliage with $\ge 50\%$ confidence | **HIGH** | Inspect affected field section and apply recommended IPM treatment. |

### Alert Lifecycle State Machine

```mermaid
stateDiagram-v2
    [*] --> ACTIVE : Alert Trigger Condition Met
    
    ACTIVE --> ACTIVE : Scheduled Evaluation (Deduplicated via Key)
    ACTIVE --> RESOLVED : Farm/Weather Condition Normalizes
    ACTIVE --> EXPIRED : Current Date > expiresAt Timestamp
    ACTIVE --> SUPERSEDED : Newer AI Model Prediction Arrives
    ACTIVE --> DISMISSED : Farmer Clicks "Dismiss" in UI

    DISMISSED --> [*]
    RESOLVED --> [*]
    EXPIRED --> [*]
    SUPERSEDED --> [*]
```

### Deterministic Deduplication Strategy
To guarantee idempotency across periodic scheduler cycles, each alert generates a stable, deterministic key:
$$\text{DedupKey} = \texttt{dedup:\{userId\}:\{farmId\}:\{cropId\}:\{eventType\}:\{bucket\}}$$
- Repeating evaluations within the same date bucket update or retain existing active alerts rather than flooding the farmer with duplicate notifications.
- **In-Process Background Scheduler**: Runs every 15 minutes with concurrency locking, requiring **no Redis or BullMQ server dependencies**.

---

## 🗺️ Complete Phases Breakdown (1 to 9 & AI-1 to AI-8)

| Phase | Title | Status | Core Technical Architecture |
| :--- | :--- | :---: | :--- |
| **Phase 1** | Authentication & RBAC | ✅ Production | JWT access tokens + HTTP-only refresh tokens, Argon2id password hashing, multi-tenant scoping. |
| **Phase 2** | Farm Management | ✅ Production | Multi-farm acreage, soil type profiling, irrigation source tagging, and geographic bounding. |
| **Phase 3** | Crop Management | ✅ Production | Phenological stages (Germination $\to$ Vegetative $\to$ Flowering $\to$ Grain Filling), variety tracking. |
| **Phase 4** | Weather Intelligence | ✅ Production | Dual-Horizon meteorological synthesis: WeatherAPI (3-Day live) + Open-Meteo (10-Day agronomic). |
| **Phase 5** | Harvest Forecast Engine | ✅ Production | Growing Degree Day (GDD) accumulation vs base temperature thresholds with weather adjustments. |
| **Phase 6** | Contextual Recommendations | ✅ Production | Deterministic Rules A–G (irrigation pause, heat stress, drainage alerts) with lifecycle states. |
| **Phase 9** | Activity Feed & Alerts | ✅ Production | Persistent user activity logging, in-app notification center, and unread bell badge. |
| **AI-1** | Agricultural Knowledge Foundation | ✅ Production | Canonical Crop Master, varieties, crop calendars, growth profiles, and verified data sources. |
| **AI-2** | Harvest Prediction AI | ✅ Production | ML & Agronomic baseline prediction comparing cumulative GDD against target maturity. |
| **AI-3** | Weather Risk Engine | ✅ Production | Mathematical risk scoring (0–100) across precipitation, humidity, wind, and temperature extremes. |
| **AI-4** | Crop Suitability & Disease Risk | ✅ Production | Agro-climatic suitability scoring and disease risk forecasting. |
| **AI-5** | Yield Forecasting Engine | ✅ Production | Machine learning regressors (HistGradientBoosting) predicting production in tonnes/hectare. |
| **AI-6** | Crop Disease Diagnostics | ✅ Production | Computer vision leaf image analysis (DigiGreen model) classifying crop health conditions. |
| **AI-7** | **Agricultural AI Assistant** | ✅ **Production** | **Grounded RAG assistant with verified FAO/ICAR citations, server-controlled tools, & zero-cost engine.** |
| **AI-8** | **Personalized Alert Engine** | ✅ **Production** | **Automated monitoring, deterministic deduplication, quiet hours, and in-app Notification Center.** |

---

## 🔌 API Reference Guide

### Phase AI-7: Agricultural Assistant Endpoints

#### 1. Public Readiness Status
```http
GET /api/v1/ai/assistant/status
```
```json
{
  "success": true,
  "data": {
    "status": "ready",
    "service": "HarvestWindow Agricultural AI Assistant (Phase AI-7)",
    "activeProvider": "local-agronomic-engine",
    "zeroCostMode": true,
    "knowledgeDocumentsCount": 10,
    "trustedSources": ["FAO", "ICAR", "ICAR-IISS", "ICAR-CRIDA", "PAU", "TNAU", "IMD"],
    "supportedLanguages": ["en", "hi", "gu", "mr", "pa", "ta", "te"]
  }
}
```

#### 2. Chat Query Execution
```http
POST /api/v1/ai/assistant/chat
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json

{
  "message": "When should I harvest my wheat and what are the rainfall risks?",
  "farmId": "farm_cm123456789",
  "language": "en"
}
```
```json
{
  "success": true,
  "data": {
    "conversationId": "conv_cm987654321",
    "messageId": "msg_cm11223344",
    "answer": "🌾 Harvest Window Analysis for Wheat (HD-3086):\nBased on cumulative Growing Degree Days (GDD) and local microclimate data, your optimal harvest window is projected from Oct 18 through Oct 25...",
    "sources": [
      {
        "title": "Wheat Crop Management & Harvest Timing Guide",
        "url": "https://icar.org.in/wheat-guidelines",
        "publisher": "ICAR / PAU",
        "publicationDate": "2024-03-15"
      }
    ],
    "farmContextUsed": true,
    "relatedEntities": [
      { "type": "farm", "id": "farm_cm123456789", "name": "Green Valley Farm" },
      { "type": "crop", "id": "crop_cm55667788", "name": "Wheat" }
    ],
    "generatedAt": "2026-10-11T10:45:00.000Z"
  }
}
```

### Phase AI-8: Notification Center Endpoints

#### 1. List Notifications
```http
GET /api/v1/notifications?limit=20&page=1&status=ACTIVE
Authorization: Bearer <JWT_TOKEN>
```
```json
{
  "success": true,
  "data": [
    {
      "id": "notif_cm12345",
      "type": "harvest",
      "severity": "high",
      "title": "Harvest Window Active: Soybean",
      "message": "Soybean on Sunrise Farm is within its optimal harvest window (Oct 12 - Oct 17).",
      "recommendedAction": "Inspect field maturity (grain moisture/pod shattering resistance) and initiate harvesting operations.",
      "actionUrl": "/app/crops/crop_cm998877",
      "isRead": false,
      "status": "ACTIVE",
      "at": "2026-10-11T09:30:00.000Z"
    }
  ],
  "unreadCount": 1
}
```

#### 2. Manage Notification Preferences
```http
PUT /api/v1/notifications/preferences
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json

{
  "harvestWindowAlerts": true,
  "weatherCautions": true,
  "predictionChangeAlerts": true,
  "cropHealthAlerts": true,
  "yieldAlerts": true,
  "quietHoursStart": 22,
  "quietHoursEnd": 6,
  "minSeverity": "medium"
}
```

---

## 🧪 Rigorous Automated Testing Suite

The entire platform is backed by comprehensive automated test suites executed with Node.js's native test runner (`node:test`):

```bash
cd backend
node --test tests/assistant.test.js tests/alerts_engine.test.js tests/activity_notifications.test.js
```

### Verified Test Results (100% Pass Rate)
```
TAP version 13
# Subtest: Phase 9 — Activity Feed & Notifications Module Tests
    ok 1 - Logs and persists supported activity events with sanitized metadata (4.8ms)
    ok 2 - Non-blocking resilience: invalid userId returns null without throwing (0.4ms)
    ok 3 - Direct service listing supports server-side pagination and type filtering (31.3ms)
    ok 4 - Cross-User Isolation: User B cannot access User A's activities (21.4ms)
    ok 5 - Deduplicates repeated alerts using deterministic dedupKey (8.5ms)
    ok 6 - POST /api/notifications/sync-alerts endpoint triggers background sync (24.1ms)
    ...
ok 1 - Phase 9 — Activity Feed & Notifications Module Tests (16/16 PASSED)

# Subtest: Phase AI-8: Personalized Alerts & Recommendation Engine Tests
    ok 1 - AlertDeduplicator generates deterministic keys for same event (0.8ms)
    ok 2 - AlertDeduplicator accurately calculates quiet hours (0.2ms)
    ok 3 - AlertEngineService.evaluateUserAlerts creates harvest and weather alerts (50.3ms)
    ok 4 - Subsequent evaluateUserAlerts execution does not produce duplicate alerts (15.1ms)
    ok 5 - GET /api/v1/notifications lists user notifications with unread count (53.2ms)
    ok 6 - GET /api/v1/notifications/unread-count returns correct count (13.8ms)
    ok 7 - PATCH /api/v1/notifications/:id/read marks notification as read (19.3ms)
    ok 8 - PATCH /api/v1/notifications/:id/dismiss marks notification as DISMISSED (16.5ms)
    ok 9 - GET & PUT /api/v1/notifications/preferences manages user preferences (37.8ms)
    ok 10 - User B cannot dismiss User A's notification (8.1ms)
ok 2 - Phase AI-8: Personalized Alerts & Recommendation Engine Tests (10/10 PASSED)

# Subtest: Phase AI-7: Agricultural AI Assistant Tests
    ok 1 - GET /api/v1/ai/assistant/status returns ready status and trusted sources (58.9ms)
    ok 2 - POST /api/v1/ai/assistant/chat rejects unauthenticated requests with 401 (25.4ms)
    ok 3 - POST /api/v1/ai/assistant/chat rejects empty message with 400 (8.9ms)
    ok 4 - RAG Retriever fetches relevant chunks and verified citations for wheat harvest (3.3ms)
    ok 5 - Server-controlled farm tool getUserFarms strictly respects user ID isolation (4.9ms)
    ok 6 - LocalAgronomicEngine synthesizes grounded response with farm context and citations (0.8ms)
    ok 7 - POST /api/v1/ai/assistant/chat generates answer and stores conversation (37.5ms)
    ok 8 - GET /api/v1/ai/assistant/conversations lists only User A's conversations (16.6ms)
    ok 9 - GET /api/v1/ai/assistant/conversations/:id blocks unauthorized user access with 404 (6.1ms)
    ok 10 - DELETE /api/v1/ai/assistant/conversations/:id deletes conversation for owner (16.8ms)
ok 3 - Phase AI-7: Agricultural AI Assistant Tests (10/10 PASSED)

==================================================
# total tests:  36
# total suites: 8
# passed:       36
# failed:       0
# duration:     ~1.96s
==================================================
```

---

## ⚡ Quickstart & Deployment Guide

### Prerequisites
- **Node.js**: `v20.x` or higher
- **MySQL**: `8.0+` running on `localhost:3306`

### 1. Database & Backend Setup
```bash
cd backend
npm install

# Copy environment template
cp .env.example .env

# Push schema to MySQL and generate Prisma client
npx prisma db push
npx prisma generate

# Seed agronomic knowledge base (FAO & ICAR benchmarks)
node prisma/seedAgriculture.js

# Launch backend in development mode (starts API server + in-process Alert Scheduler)
npm run dev
# Backend listening on http://localhost:5000
```

### 2. Frontend Client Setup
```bash
cd frontend
npm install

# Launch Vite development server
npm run dev
# Frontend live on http://localhost:5173
```

### 3. Production Build Validation
```bash
cd frontend
npm run build
# Compiles React 19 + TypeScript bundle with zero errors in ~29s
```

---

## ⚙️ Optional LLM Provider Configuration

HarvestWindow functions immediately in **Zero-Cost Mode** using the built-in `LocalAgronomicEngine`. If you wish to route inference to hosted frontier LLMs, simply populate `backend/.env`:

```env
# Optional: Google Gemini API
GEMINI_API_KEY="your-gemini-api-key"
GEMINI_MODEL="gemini-1.5-flash"

# Optional: OpenAI API
OPENAI_API_KEY="your-openai-api-key"
OPENAI_MODEL="gpt-4o-mini"

# Optional: Locally Running Ollama
OLLAMA_BASE_URL="http://localhost:11434"
OLLAMA_MODEL="llama3.2"
```

---

## 🛡️ Application Security & Privacy
- **Strict Multi-Tenant Isolation**: Every database query, tool execution, and conversation retrieve filters by authenticated `userId`.
- **Zero Hallucination Guarantee**: Soil measurements, weather observations, and harvest dates are never invented by language models.
- **Prompt Injection Defense**: Retrieved knowledge passages and user prompts are treated as untrusted strings, preventing system policy overrides or secret exposure.
- **In-App Delivery Guarantee**: Notifications are created as real persistent in-app records and displayed with unread badges. No unverified external SMS/Push delivery is claimed without configured provider credentials.

---

## 👥 Contributors & NIT Hackathon 2026 Team

- **Dhruvil** & The HarvestWindow Engineering Team
- Built with technical excellence for the **NIT Hackathon 2026**.
