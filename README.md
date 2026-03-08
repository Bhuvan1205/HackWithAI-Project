# ClaimHawk
A full-stack fraud detection platform for India's **Pradhan Mantri Jan Arogya Yojana (PM-JAY)** health insurance programme. The system ingests hospital insurance claims, engineers 12 domain-specific features, scores each claim through a hybrid **rule-based + Isolation Forest anomaly detection** pipeline, and surfaces results through an intelligence dashboard. It detects three categories of healthcare fraud — **Phantom Billing, Upcoding, and Repeat Abuse** — providing composite risk scoring, automated enforcement states, and LLM-generated investigation reports.
---
## Problem Statement
Healthcare fraud in government insurance programmes drains public funds and undermines patient care. Under PM-JAY (Ayushman Bharat), which covers over 50 crore beneficiaries, fraudulent claims take several forms:
- **Phantom Billing:** Hospitals submit claims for procedures never performed, often with zero-day inpatient stays.
- **Upcoding:** Facilities inflate claim amounts beyond the authorised package rate, systematically billing near or above the ceiling.
- **Repeat Abuse:** The same patient-procedure combination is re-admitted within clinically unjustifiable windows, fabricating re-admissions for revenue.
Manual auditing cannot scale to the volume of claims processed daily. Without an automated detection system, fraudulent claims pass undetected, resulting in significant financial losses, misallocation of healthcare resources, and erosion of trust in government health programmes.
---
## Project Overview
ClaimHawk operates as an end-to-end pipeline:
1. **Data Ingestion:** Claims are submitted via a REST API or seeded from a synthetic claims generator. Each claim includes hospital ID, patient ID, procedure code, package rate, claim amount, admission/discharge dates, and inpatient status.
2. **Preprocessing & Feature Engineering:** Raw claims are processed through a 12-feature engineering pipeline (8 continuous + 4 binary). Features include epsilon-stabilised z-scores for claim amounts and hospital volumes, temporal features like days-since-last-claim and 30-day claim frequency, and binary flags for zero-day stays, repeat procedures, high-cost procedures, and multi-hospital visits.
3. **Model Scoring:** An Isolation Forest model (trained with `n_estimators=200`, `contamination=0.18`) scores each claim's anomaly level. The raw score is normalised using fixed A_min/A_max values computed during training to prevent score drift.
4. **Rule Engine:** Five deterministic rules evaluate each claim for known fraud patterns, producing a normalised rule score (R_norm). Rules are configurable via the database — thresholds and enabled states can be modified at runtime.
5. **Composite Risk Scoring:** The final risk score is computed as `0.70 × R_norm + 0.30 × A_norm`, producing a composite index on a 0–100 scale. Claims are classified into four threat levels (LOW, MEDIUM, HIGH, CRITICAL) with corresponding enforcement states (CLEAR, MONITOR, ESCALATED, HARD_STOP).
6. **Intelligence Layer:** A composite intelligence layer assembles signal vectors, knowledge signals, confidence scores, and fraud pattern classifications. Strict integrity assertions validate computational consistency before persistence.
7. **Report Generation:** An LLM-powered investigation report generator (OpenAI GPT-4o-mini) produces audit-grade, structured reports from persisted fraud analysis data without recomputing any ML values.
8. **Frontend Dashboard:** A Next.js dashboard provides real-time KPIs, risk distribution charts, claim scoring wizard, dataset explorer, hospital profiling, and system configuration panels.
---
## Key Features
- **Hybrid Fraud Scoring Pipeline:** Combines five deterministic rules (70% weight) with Isolation Forest anomaly detection (30% weight) into a single composite risk score.
- **12-Feature Engineering Pipeline:** Computes 8 continuous and 4 binary features including epsilon-stabilised z-scores, temporal claim patterns, hospital volume deviation, and repeat claim analysis.
- **Three Fraud Category Detection:** Identifies Phantom Billing (zero-day inpatient stays), Upcoding (cost inflation beyond package rates), and Repeat Abuse (unjustifiable re-admissions) with pattern classification.
- **Composite Intelligence Layer:** Produces a composite index (0–100), four-tier threat levels, model confidence scores, signal vectors with anomaly intensity bands, and a knowledge signal graph with per-rule metadata.
- **Enforcement State Machine:** Automatically assigns enforcement actions — CLEAR, MONITOR, ESCALATED, or HARD_STOP — based on threat level and confidence.
- **LLM-Powered Investigation Reports:** Generates formal, audit-grade investigation reports using GPT-4o-mini with an 11-section mandatory structure, strict prompt engineering to prevent hallucination, and RBAC-gated access.
- **Configurable Rule Engine:** Rule thresholds and enabled states are stored in the database and can be modified at runtime through the Settings UI without redeployment.
- **Dynamic Threat Level Bands:** System-wide threat classification thresholds (LOW_MAX, MEDIUM_MAX, HIGH_MAX) are configurable through the System Settings API.
- **Hospital-Level Analytics:** Per-hospital fraud profiling including threat distribution, fraud pattern breakdown, upcoding frequency, composite score averages, and hospital risk ratings.
- **Hospital Loss Exposure:** Risk-weighted financial loss calculation per hospital with time-range filtering (7 days, 30 days, all time), computed server-side via optimised SQL JOIN queries.
- **User Fraud Profiling:** Behavioral fraud profiling per user based on their claim submission history, including risk classification labels (LOW_RISK_USER, MONITORED_USER, REPEAT_HIGH_RISK_USER).
- **Authentication & RBAC:** JWT-based authentication with local email/password and Google OAuth support. Role-based access control (AUDITOR, ADMIN) protects sensitive operations.
- **Batch Benchmarking:** Internal endpoint to benchmark scoring throughput with configurable batch sizes (up to 1000 synthetic claims).
- **CSV Export:** Server-side export of all claims with fraud analysis data in CSV format.
- **Interactive Dashboard:** Real-time intelligence command center with KPI cards, risk distribution charts, fraud radar visualisations, claim volume tracking, and animated signal monitors.
---
## System Architecture
The system follows a three-tier architecture:
```
┌──────────────────────────────────────────────────────────────────────┐
│                        FRONTEND (Next.js 16)                         │
│  Dashboard │ Score Claim │ Alerts │ Dataset │ Hospital │ Settings    │
└──────────────────────────────┬───────────────────────────────────────┘
                               │ REST API (HTTP)
┌──────────────────────────────▼───────────────────────────────────────┐
│                      BACKEND (FastAPI 0.115)                         │
│                                                                      │
│  ┌─────────────┐  ┌──────────────────┐  ┌─────────────────────────┐ │
│  │   Routers   │  │    Services      │  │     ML Engine           │ │
│  │             │  │                  │  │                         │ │
│  │ • fraud     │  │ • fraud_service  │  │ • feature_engineering   │ │
│  │ • auth      │  │ • report_service │  │ • risk_engine           │ │
│  │ • analytics │  │ • analytics_svc  │  │ • claims_generator      │ │
│  │ • report    │  │ • llm_client     │  │ • IsolationForest model │ │
│  │ • dataset   │  │ • fraud_analytic │  │ • StandardScaler        │ │
│  │ • rules     │  │                  │  │                         │ │
│  │ • settings  │  │                  │  │                         │ │
│  │ • internal  │  │                  │  │                         │ │
│  └─────────────┘  └──────────────────┘  └─────────────────────────┘ │
│                              │                                       │
│                     ┌────────▼────────┐                              │
│                     │    SQLAlchemy   │                              │
│                     │   ORM Layer     │                              │
│                     └────────┬────────┘                              │
└──────────────────────────────┼───────────────────────────────────────┘
                               │
                    ┌──────────▼──────────┐
                    │   SQLite Database   │
                    │  (pmjay_fraud.db)   │
                    └─────────────────────┘
```
**Data Flow:**
```
Claim Input → Validation (Pydantic) → DB Insert → Historical Context Fetch
    → Feature Engineering (12 features) → Isolation Forest Scoring
    → Rule Engine Evaluation → Composite Risk Calculation
    → Intelligence Layer Assembly → Integrity Assertions
    → DB Persist → API Response
```
---
## Machine Learning Methodology
### Model: Isolation Forest
The system uses **scikit-learn's Isolation Forest** as the unsupervised anomaly detection model.
- **Configuration:** `n_estimators=200`, `contamination=0.18`, `random_state=42`
- **Reasoning:** Isolation Forest is well-suited for small-to-medium datasets (200–300 rows) typical in hackathon/pilot contexts. It requires no labelled data and handles mixed feature types effectively.
### Feature Engineering (12 Features)
| # | Feature | Type | Purpose |
|---|---------|------|---------|
| 1 | `claim_amount_zscore` | Continuous | Detects claim amounts deviating from procedure-code mean |
| 2 | `stay_duration_days` | Continuous | Identifies zero-day stays for inpatient procedures |
| 3 | `claim_to_package_ratio` | Continuous | Flags claims near or exceeding package ceiling |
| 4 | `patient_claim_freq_30d` | Continuous | Tracks 30-day rolling claim frequency per patient |
| 5 | `days_since_last_claim` | Continuous | Detects rapid re-admissions |
| 6 | `hospital_claim_volume_zscore` | Continuous | Flags hospitals with abnormal daily claim volumes |
| 7 | `hospital_cost_deviation_index` | Continuous | Captures systemic cost inflation at hospital level |
| 8 | `repeat_claim_amount_deviation` | Continuous | Measures claim amount consistency across repeats |
| 9 | `is_zero_day_stay` | Binary | Flag for zero-day inpatient stays |
| 10 | `same_proc_repeat_flag` | Binary | Flag for same-procedure repeat within 30 days |
| 11 | `is_high_cost_procedure` | Binary | Flag for procedures in the top 25% by package rate |
| 12 | `patient_multi_hospital_flag` | Binary | Flag for multi-hospital visits within 15 days |
All z-score features use **epsilon-stabilised division** (`std + 1e-6`) to prevent division-by-zero in small groups.
### Risk Scoring Formula
```
Final Risk Score = 0.70 × R_norm + 0.30 × A_norm
```
- **R_norm** (Rule Score): Sum of triggered rule points (max 100), normalised to [0, 1].
- **A_norm** (Anomaly Score): Isolation Forest `score_samples()` output, min-max normalised using fixed training-time A_min/A_max values, clamped to [0, 1].
**Rationale for 70/30 weighting:** On small datasets (200–300 rows), Isolation Forest produces noisy decision boundaries. Heavier rule weight ensures known fraud patterns dominate scoring while the anomaly model surfaces novel outliers.
### Threat Classification
| Composite Index | Threat Level | Enforcement State |
|-----------------|--------------|-------------------|
| 0 – 29          | LOW          | CLEAR             |
| 30 – 59         | MEDIUM       | MONITOR           |
| 60 – 84         | HIGH         | ESCALATED         |
| 85 – 100        | CRITICAL     | HARD_STOP         |
### Rule Engine (5 Deterministic Rules)
| Rule | Condition | Points |
|------|-----------|--------|
| Zero-day inpatient stay | `is_zero_day_stay == 1` AND `is_inpatient == 1` | +30 |
| High claim amount z-score | `claim_amount_zscore > 2.0` | +25 |
| Same-procedure repeat | `same_proc_repeat_flag == 1` | +20 |
| Near package ceiling | `claim_to_package_ratio > 0.95` | +15 |
| High patient frequency | `patient_claim_freq_30d >= 3` | +10 |
---
## Dataset
The system uses **synthetically generated claims** designed to satisfy statistical stability guardrails:
- **Volume:** ~250 claims (205 base + 18 upcoding + 16 phantom + 11 repeat abuse)
- **Hospitals:** 10 hospitals (H1–H10), each with ≥15 claims
- **Procedures:** 8 procedure codes (P1–P8), each appearing ≥20 times
- **Patients:** 300 patient IDs (PAT0001–PAT0300)
- **Date Range:** 90 days from 2024-01-01
- **Package Rates:** ₹5,000 to ₹80,000 across procedure codes
- **Inpatient Procedures:** P3, P4, P5, P6, P7
### Fraud Injection Strategy (~15–20% of dataset)
| Fraud Type | Count | Injection Method |
|------------|-------|------------------|
| **Upcoding** | 18 claims | `claim_amount × uniform(1.3, 2.0)`, concentrated in H1/H2 |
| **Phantom Billing** | 16 claims | `discharge_date = admission_date` (zero-day) in 4 clusters across H3/H4/H5 |
| **Repeat Abuse** | 11 claims | Same patient-procedure pairs within 3–15 day windows at H6/H7/H8 |
Fraud claims are distributed across ≥3 hospitals and no claim carries more than one fraud type.
### Demo Mode
When `DEMO_MODE=true`, the system seeds 10 curated demo claims with realistic hospital names (e.g., "CityCare Multispeciality Hospital") and patient names, covering LOW, MEDIUM, and HIGH risk scenarios.
---
## Results and Observations
### Model Performance
- The hybrid scoring system successfully separates LOW, MEDIUM, and HIGH risk claims using the 70/30 rule-anomaly weighting.
- Epsilon-stabilised z-scores prevent NaN/Inf crashes on small procedure groups.
- Fixed A_min/A_max from training eliminates score drift during inference, ensuring consistent risk classification.
### Observed Patterns
- **Upcoding clusters** in H1/H2 produce elevated `claim_amount_zscore` and `claim_to_package_ratio`, triggering both `high_amount_zscore` and `near_package_ceiling` rules.
- **Phantom billing** in H3/H4/H5 triggers `zero_day_inpatient` with the highest single-rule weight (+30 points).
- **Repeat abuse** in H6/H7/H8 is detected through `same_proc_repeat_flag` and elevated `patient_claim_freq_30d`.
### Strengths
- Robust to small datasets due to rule-heavy weighting.
- Deterministic rules provide interpretable fraud explanations.
- Composite intelligence layer provides granular signal decomposition for auditors.
### Limitations
- Isolation Forest boundaries are noisy on 200–300 row datasets.
- Binary features contribute limited information gain per tree split (capped at 4/12 features).
- The system operates on synthetic data — real-world PM-JAY claims would require recalibration of thresholds and contamination parameters.
---
## Repository Structure
```
HackWithAI-Project/
│
├── main.py                         # FastAPI application entry point with lifespan management
├── requirements.txt                # Python dependencies
├── .env                            # Environment configuration (API keys, JWT secret, demo mode)
├── .gitignore                      # Git ignore rules
├── FRAUD_INTELLIGENCE_SPEC.md      # Detailed ML specification document
├── pmjay_fraud.db                  # SQLite database (auto-created)
│
├── backend/                        # Backend application package
│   ├── __init__.py
│   ├── database.py                 # SQLAlchemy engine, session, and Base configuration
│   ├── models.py                   # ORM models (User, Claim, FraudAnalysis, InvestigationReport, RuleConfig, SystemConfig)
│   ├── schemas.py                  # Pydantic request/response schemas with validation
│   ├── crud.py                     # Database CRUD operations and query functions
│   ├── auth_utils.py               # JWT, password hashing, Google OAuth, RBAC utilities
│   ├── seed_demo_entities.py       # Demo dataset seeding with curated claims
│   │
│   ├── ml/                         # Machine learning modules
│   │   ├── feature_engineering.py  # 12-feature computation pipeline
│   │   ├── risk_engine.py          # FraudEngine class, Isolation Forest scoring, risk classification
│   │   └── claims_generator.py     # Synthetic claims generator with fraud injection
│   │
│   ├── routers/                    # FastAPI route handlers
│   │   ├── fraud_router.py         # Claim scoring, intelligence retrieval, metrics, health check
│   │   ├── auth_router.py          # Register, login, Google OAuth, user profile
│   │   ├── analytics_router.py     # User/hospital profiling, CSV export, hospital loss
│   │   ├── report_router.py        # LLM investigation report generation (RBAC-gated)
│   │   ├── dataset_router.py       # Paginated claims with analysis data
│   │   ├── rule_router.py          # Rule configuration CRUD
│   │   ├── settings_router.py      # System configuration (threat bands) CRUD
│   │   └── internal_router.py      # Batch benchmarking and self-check endpoints
│   │
│   └── services/                   # Business logic services
│       ├── fraud_service.py        # Composite intelligence scoring, rule evaluation, explanation engine
│       ├── report_service.py       # Report prompt construction and LLM orchestration
│       ├── llm_client.py           # OpenAI API integration (isolated from scoring)
│       ├── analytics_service.py    # User and hospital fraud profiling
│       └── fraud_analytics_service.py  # Hospital-level loss exposure calculation
│
├── data/                           # Data processing and model artifacts
│   ├── generate_claims.py          # Standalone synthetic claim generation script
│   ├── feature_engineering.py      # Standalone feature engineering script
│   ├── risk_engine.py              # Model training, scoring, and inference functions
│   └── models/                     # Serialised model artifacts
│       ├── isolation_forest.pkl    # Trained Isolation Forest model
│       ├── scaler.pkl              # Fitted StandardScaler
│       ├── anomaly_metadata.pkl    # A_min / A_max values from training
│       └── feature_metadata.pkl    # Procedure stats, hospital stats, package rate Q75
│
├── frontend/                       # Next.js 16 dashboard application
│   ├── package.json                # Node.js dependencies (React 19, Recharts, Framer Motion, Zustand)
│   ├── tsconfig.json               # TypeScript configuration
│   └── src/
│       ├── app/                    # Next.js App Router pages
│       │   ├── page.tsx            # Intelligence Command Center (dashboard home)
│       │   ├── layout.tsx          # Root layout with sidebar and navbar
│       │   ├── login/              # Authentication page (email/password + Google OAuth)
│       │   ├── score/              # Multi-step claim scoring wizard
│       │   ├── alerts/             # Flagship intelligence screen with report generation
│       │   ├── dataset/            # Dataset explorer with filtering and benchmarking
│       │   ├── hospital/           # Hospital fraud profiling
│       │   ├── hospital-loss/      # Hospital financial loss exposure analytics
│       │   ├── patterns/           # Rule configuration management
│       │   ├── settings/           # System threshold configuration
│       │   └── profile/            # User fraud profile analytics
│       ├── components/             # Reusable UI components
│       │   ├── ui/                 # Base components (Card, Button, Badge, Input, etc.)
│       │   ├── dashboard/          # KPI cards and analytics charts
│       │   └── layout/             # Sidebar, navbar, page transitions
│       ├── store/                  # Zustand state management (auth, app state)
│       ├── providers/              # React query and theme providers
│       └── lib/                    # Utility functions
│
└── test_ui_scenarios.py            # API integration test scenarios
```
---
## Installation
### Prerequisites
- Python 3.10+
- Node.js 18+
- pip
- npm
### Backend Setup
```bash
# 1. Clone the repository
git clone https://github.com/Bhuvan1205/HackWithAI-Project.git
cd HackWithAI-Project
# 2. Create and activate a virtual environment
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # macOS/Linux
# 3. Install Python dependencies
pip install -r requirements.txt
# 4. Configure environment variables
# Edit .env file with your OpenAI API key (optional, for report generation)
# Set DEMO_MODE=true for demo dataset seeding
# 5. Start the backend server
uvicorn main:app --reload --host 127.0.0.1 --port 8000
```
### Frontend Setup
```bash
# 1. Navigate to the frontend directory
cd frontend
# 2. Install Node.js dependencies
npm install
# 3. Start the development server
npm run dev
```
The frontend will be available at `http://localhost:3000` and the backend API at `http://127.0.0.1:8000`.
API documentation (Swagger UI) is available at `http://127.0.0.1:8000/docs`.
---
## Usage
### Scoring a Claim via API
```bash
curl -X POST http://127.0.0.1:8000/api/v1/score-intelligence \
  -H "Content-Type: application/json" \
  -d '{
    "claim_id": "TEST001",
    "hospital_id": "H1",
    "patient_id": "PAT0001",
    "procedure_code": "P3",
    "package_rate": 25000,
    "claim_amount": 45000,
    "admission_date": "2024-02-01",
    "discharge_date": "2024-02-01",
    "is_inpatient": 1
  }'
```
### Scoring a Claim via Frontend
1. Navigate to `http://localhost:3000/score`
2. Complete the 4-step claim scoring wizard (Patient Profile → Facility Data → Clinical Details → Financial Metrics)
3. View the intelligence response with composite index, threat level, knowledge signals, and enforcement state
### Generating an Investigation Report
```bash
curl -X POST http://127.0.0.1:8000/api/v1/generate-report/TEST001 \
  -H "X-User-Role: AUDITOR"
```
### Viewing Hospital Analytics
```bash
curl http://127.0.0.1:8000/api/v1/analytics/hospital/H1
```
### Hospital Loss Exposure
```bash
curl http://127.0.0.1:8000/api/v1/hospital-loss?range=30d
```
### Exporting Dataset
```bash
curl http://127.0.0.1:8000/api/v1/export/dataset -o pmjay_export.csv
```
### Running Batch Benchmark
```bash
curl -X POST "http://127.0.0.1:8000/api/v1/internal/batch-benchmark?n=100"
```
---
## API Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/v1/score-intelligence` | Score a claim through the full intelligence pipeline |
| `GET` | `/api/v1/intelligence/{claim_id}` | Retrieve stored intelligence for a scored claim |
| `GET` | `/api/v1/intelligence-metrics` | Aggregate intelligence metrics across all claims |
| `GET` | `/api/v1/dataset-summary` | Summary statistics of all scored claims |
| `GET` | `/api/v1/claims` | Paginated claims with analysis data (filterable) |
| `POST` | `/api/v1/generate-report/{claim_id}` | Generate LLM investigation report (RBAC-gated) |
| `GET` | `/api/v1/analytics/user/{user_id}` | User-level fraud profiling |
| `GET` | `/api/v1/analytics/hospital/{hospital_id}` | Hospital-level fraud profiling |
| `GET` | `/api/v1/hospital-loss` | Hospital financial loss exposure |
| `GET` | `/api/v1/export/dataset` | CSV export of all claims + analysis |
| `GET` | `/api/v1/rules` | List all rule configurations |
| `PATCH` | `/api/v1/rules/{rule_key}` | Update rule threshold or enabled state |
| `GET` | `/api/v1/config` | List system configuration |
| `PATCH` | `/api/v1/config/{key}` | Update system configuration value |
| `POST` | `/api/v1/auth/register` | Register a new user |
| `POST` | `/api/v1/auth/login` | Login with email/password |
| `POST` | `/api/v1/auth/google-login` | Login with Google OAuth |
| `GET` | `/api/v1/auth/me` | Get current user profile |
| `GET` | `/api/v1/health` | System health check |
| `POST` | `/api/v1/internal/batch-benchmark` | Batch scoring benchmark |
| `GET` | `/api/v1/internal/self-check` | Self-check with LOW and HIGH test cases |
---
## Tech Stack
| Layer | Technology |
|-------|------------|
| **Backend** | Python 3.10+, FastAPI 0.115, SQLAlchemy 2.0, Pydantic 2.9 |
| **ML** | scikit-learn 1.5 (Isolation Forest), pandas 2.2, NumPy 1.26, joblib |
| **Database** | SQLite (default), PostgreSQL-compatible via SQLAlchemy |
| **Authentication** | passlib (bcrypt), python-jose (JWT), Google OAuth2 |
| **LLM** | OpenAI GPT-4o-mini (investigation reports) |
| **Frontend** | Next.js 16, React 19, TypeScript 5, TailwindCSS 4 |
| **UI Components** | Radix UI, Framer Motion, Recharts, Lucide Icons |
| **State Management** | Zustand 5, TanStack React Query 5 |
---
## Future Improvements
- **Real-World Data Integration:** Connect to actual PM-JAY claims databases for production deployment with recalibrated thresholds and contamination parameters.
- **Advanced Models:** Explore ensemble methods (XGBoost, LightGBM) or deep learning autoencoders for improved anomaly detection on larger datasets.
- **Real-Time Streaming Pipeline:** Implement Kafka or Redis Streams for real-time claim ingestion and scoring instead of batch-per-request processing.
- **Graph-Based Fraud Detection:** Build hospital-patient-procedure knowledge graphs to detect coordinated fraud rings across entities.
- **Model Monitoring & Drift Detection:** Add automated monitoring for feature drift, model performance degradation, and anomaly score distribution shifts over time.
- **Production Database:** Migrate from SQLite to PostgreSQL for concurrent access, connection pooling, and production-grade reliability.
- **Containerisation:** Dockerise the full stack (backend + frontend + database) for consistent deployment across environments.
- **Comprehensive Test Suite:** Expand unit and integration testing coverage across all scoring, feature engineering, and API layers.
- **Audit Trail & Logging:** Implement immutable audit logs for all scoring decisions and configuration changes for compliance requirements.
- **Multi-Language Reports:** Extend LLM report generation to support Hindi and regional language outputs for state-level auditors.
---
## Authors
- **Bhuvan** — [GitHub](https://github.com/Bhuvan1205)
