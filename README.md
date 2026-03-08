Claim Hawk
An AI-Powered Fraud Intelligence Platform for Healthcare Claims

Claim Hawk is a fraud intelligence platform designed to detect, analyze, and explain suspicious healthcare insurance claims using a hybrid approach that combines statistical anomaly detection, deterministic fraud rules, and structured investigation reporting.

The system transforms raw claim submissions into actionable intelligence by generating composite risk scores, identifying fraud patterns, and producing audit-grade investigation reports. Claim Hawk is designed to support regulators, insurance providers, and audit teams in detecting fraudulent activity such as upcoding, phantom billing, abnormal patient claim frequency, and repeated procedures.

The platform emphasizes transparency, explainability, and operational decision support, ensuring that fraud detection outputs are not only accurate but also interpretable and actionable.

Project Background

Claim Hawk was developed during the HackWithAI National Hackathon, where it was selected among the Top 50 teams out of more than 800 participating teams.

The project explores how hybrid AI systems can strengthen fraud monitoring capabilities within public and private healthcare insurance systems by combining machine learning, deterministic rule evaluation, and explainable reporting.

Problem Context

Healthcare claim fraud is a major challenge across national health insurance systems. Fraud patterns such as cost inflation, phantom procedures, and repeated admissions result in substantial financial losses and increase administrative overhead for auditors and regulators.

Existing fraud detection tools often suffer from one of two limitations:

Static rule engines that fail to adapt to evolving fraud patterns.

Black-box machine learning models that lack transparency and explainability.

Claim Hawk addresses this gap by combining machine learning detection with explainable fraud intelligence, enabling both automated detection and human-interpretable investigation.

Key Features
Hybrid Fraud Detection Engine

Claim Hawk integrates statistical anomaly detection with deterministic fraud rules to detect suspicious claims.

Isolation Forest anomaly detection model

Rule-based fraud signal detection

Combined risk scoring framework

Composite Risk Intelligence

The system converts model outputs into structured risk intelligence using a composite scoring layer.

Composite Risk Index (0–100)

Threat Level Classification (Low, Medium, High, Critical)

Confidence Score

Enforcement State Guidance

Explainable Fraud Signals

Every flagged claim provides transparent reasoning:

Triggered fraud rules

Risk breakdown between anomaly and rule contributions

Fraud pattern classification

Signal vector interpretation

Investigation Report Generation

Claim Hawk includes an investigation report engine that generates structured forensic documentation based on stored intelligence signals. These reports assist auditors in understanding the reasoning behind flagged claims and provide a narrative explanation of fraud indicators.

Hospital and Patient Intelligence

The system supports higher-level analysis by examining fraud patterns across:

Hospitals

Individual claimants

Claim frequency and behavioral patterns

System Architecture

Claim Hawk follows a layered architecture designed to ensure modularity, transparency, and scalability.

Frontend (Next.js)
        │
        ▼
API Layer (FastAPI)
        │
        ├── Claim Intake and Validation
        │
        ├── Feature Engineering
        │
        ├── Fraud Intelligence Engine
        │       ├── Isolation Forest Anomaly Detection
        │       ├── Rule-Based Fraud Signals
        │       └── Composite Intelligence Layer
        │
        ├── PostgreSQL Data Layer
        │       ├── Claims
        │       ├── Fraud Analysis
        │       ├── Investigation Reports
        │       └── Users
        │
        └── Investigation Report Engine

The architecture separates fraud scoring from report generation to ensure deterministic risk calculations while allowing flexible report generation.

Technology Stack
Backend

FastAPI

Python

PostgreSQL

SQLAlchemy

Machine Learning

Scikit-learn

Isolation Forest

Frontend

Next.js

TypeScript

TailwindCSS

AI Integration

OpenAI API for structured investigation reporting

Fraud Detection Pipeline

Claim Submission

Claims are submitted through the frontend interface and validated by the backend API.

Feature Engineering

Statistical and behavioral features are computed, including cost deviations, claim frequency, and procedure patterns.

Fraud Detection

The anomaly detection model identifies statistical outliers while rule-based checks detect known fraud patterns.

Composite Risk Scoring

Signals are combined to compute a composite risk score and threat classification.

Investigation Reporting

Investigation reports summarize fraud indicators and provide structured explanations for audit review.

Example Fraud Indicators

Claim Hawk evaluates multiple indicators of suspicious activity:

Zero-day inpatient admissions

High deviation from standard procedure costs

Repeated procedures within short intervals

Claims approaching or exceeding package ceilings

High claim frequency by a patient

Project Structure
backend/
    api/
    models/
    routers/
    services/
    ml/

frontend/
    components/
    pages/
    services/
    hooks/

database/
    schemas/
    migrations/
Local Setup
Clone Repository
git clone https://github.com/your-username/claim-hawk.git
cd claim-hawk
Backend Setup
pip install -r requirements.txt
uvicorn main:app --reload

Backend runs at:

http://localhost:8000
Frontend Setup
cd frontend
npm install
npm run dev

Frontend runs at:

http://localhost:3000
Future Improvements

Potential directions for further development include:

Graph-based fraud network detection

Real-time claim stream processing

Hospital fraud risk heatmaps

Temporal fraud trend analysis

Automated regulatory reporting pipelines

License

This repository is intended for educational and research purposes.
