from sqlalchemy.orm import Session
from sqlalchemy import func
from backend.models import Claim, FraudAnalysis
from typing import Optional
import pandas as pd


def get_claim_by_id(db: Session, claim_id: str) -> Optional[Claim]:
    return db.query(Claim).filter(Claim.claim_id == claim_id).first()


def insert_claim(db: Session, claim_data: dict) -> Claim:
    claim = Claim(**claim_data)
    db.add(claim)
    db.flush()
    return claim


def insert_fraud_analysis(db: Session, analysis_data: dict) -> FraudAnalysis:
    record = FraudAnalysis(**analysis_data)
    db.add(record)
    db.flush()
    return record


def get_all_claims_as_df(db: Session) -> pd.DataFrame:
    rows = db.query(Claim).all()
    if not rows:
        return pd.DataFrame(columns=[
            "claim_id", "hospital_id", "patient_id", "procedure_code",
            "package_rate", "claim_amount", "admission_date", "discharge_date", "is_inpatient"
        ])
    return pd.DataFrame([{
        "claim_id": r.claim_id,
        "hospital_id": r.hospital_id,
        "patient_id": r.patient_id,
        "procedure_code": r.procedure_code,
        "package_rate": r.package_rate,
        "claim_amount": r.claim_amount,
        "admission_date": r.admission_date,
        "discharge_date": r.discharge_date,
        "is_inpatient": r.is_inpatient,
    } for r in rows])


def get_dataset_summary(db: Session) -> dict:
    total = db.query(func.count(FraudAnalysis.id)).scalar() or 0
    avg_score = db.query(func.avg(FraudAnalysis.final_risk_score)).scalar() or 0.0
    high = db.query(func.count(FraudAnalysis.id)).filter(FraudAnalysis.risk_level == "HIGH").scalar() or 0
    medium = db.query(func.count(FraudAnalysis.id)).filter(FraudAnalysis.risk_level == "MEDIUM").scalar() or 0
    low = db.query(func.count(FraudAnalysis.id)).filter(FraudAnalysis.risk_level == "LOW").scalar() or 0
    return {
        "total_claims": total,
        "risk_distribution": {"HIGH": high, "MEDIUM": medium, "LOW": low},
        "avg_final_risk_score": round(float(avg_score), 4),
        "high_risk_count": high,
        "medium_risk_count": medium,
        "low_risk_count": low,
    }


def get_intelligence_metrics(db: Session) -> dict:
    rows = db.query(FraudAnalysis).all()
    total = len(rows)

    threat_dist = {"LOW": 0, "MEDIUM": 0, "HIGH": 0, "CRITICAL": 0}
    band_dist = {"Mild Deviation": 0, "Elevated Anomaly": 0, "Extreme Outlier": 0}
    hard_stops = 0
    composite_sum = 0.0

    for r in rows:
        tl = r.threat_level or "LOW"
        if tl in threat_dist:
            threat_dist[tl] += 1
        if r.hard_stop:
            hard_stops += 1
        ci = r.composite_index or 0
        composite_sum += ci
        sv = r.signal_vector or {}
        band = sv.get("anomaly_intensity_band", "Mild Deviation")
        if band in band_dist:
            band_dist[band] += 1

    avg_ci = round(composite_sum / total, 2) if total > 0 else 0.0

    return {
        "total_scored": total,
        "threat_level_distribution": threat_dist,
        "hard_stop_count": hard_stops,
        "average_composite_index": avg_ci,
        "anomaly_band_distribution": band_dist,
    }
