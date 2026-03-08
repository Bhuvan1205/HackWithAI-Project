# ClaimHawk
ClaimHawk is an AI-powered fraud detection system designed to detect suspicious insurance claims in India's PM-JAY healthcare insurance program.

The platform analyzes claim patterns using a hybrid rule-based and machine learning approach to identify fraudulent behavior such as phantom billing, upcoding, and repeat abuse.

---

## Key Highlights

• Hybrid fraud scoring using rules and Isolation Forest  
• 12-feature claim behavior modeling pipeline  
• Detection of phantom billing, upcoding, and repeat abuse  
• Real-time claim scoring via API  
• Interactive analytics dashboard

---

## System Architecture


Claim Input
↓
Validation
↓
Feature Engineering
↓
Isolation Forest Scoring
↓
Rule Engine Evaluation
↓
Composite Risk Calculation
↓
Fraud Intelligence Layer
↓
Dashboard Visualization


---

## Machine Learning Methodology

### Isolation Forest

Used for anomaly detection on claim features.

Configuration:

- n_estimators = 200
- contamination = 0.18

### Hybrid Risk Scoring


Final Score =
0.70 × Rule Score

0.30 × ML Anomaly Score


Rules detect known fraud patterns while ML surfaces novel anomalies.

---

## Fraud Types Detected

• Phantom Billing  
• Upcoding  
• Repeat Abuse

---

## Dataset

Synthetic healthcare claims dataset designed for fraud pattern testing.

Dataset scale:

- ~250 claims
- 10 hospitals
- 300 patients

Fraud injection:

- upcoding
- phantom billing
- repeat abuse

---

## Tech Stack

Backend  
- FastAPI  
- Python  
- scikit-learn  

Frontend  
- Next.js  
- React  

Database  
- SQLite

---

## Future Improvements

• Graph-based fraud detection  
• Advanced anomaly models (XGBoost / Autoencoders)  
• Real-world healthcare dataset integration  
• Real-time claim streaming

---

## Author

Team Dynamite
