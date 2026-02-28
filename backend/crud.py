from sqlalchemy.orm import Session
from sqlalchemy import func
from backend.models import Claim, FraudAnalysis, User
from typing import Optional
import pandas as pd


def get_claim_by_id(db: Session, claim_id: str) -> Optional[Claim]:
    return db.query(Claim).filter(Claim.claim_id == claim_id).first()


# ── User CRUD ────────────────────────────────────────────────────────────────
def get_user_by_email(db: Session, email: str) -> Optional[User]:
    return db.query(User).filter(User.email == email.lower().strip()).first()


def get_user_by_id(db: Session, user_id: int) -> Optional[User]:
    return db.query(User).filter(User.id == user_id).first()


def create_user(db: Session, email: str, hashed_password: str = None,
                full_name: str = "", auth_provider: str = "LOCAL", role: str = "AUDITOR") -> User:
    user = User(
        email=email.lower().strip(),
        hashed_password=hashed_password,
        full_name=full_name,
        auth_provider=auth_provider,
        role=role,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


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
            "claim_id", "hospital_id", "hospital_name", "patient_id", "patient_name", "procedure_code",
            "package_rate", "claim_amount", "admission_date", "discharge_date", "is_inpatient"
        ])
    return pd.DataFrame([{
        "claim_id": r.claim_id,
        "hospital_id": r.hospital_id,
        "hospital_name": r.hospital_name,
        "patient_id": r.patient_id,
        "patient_name": r.patient_name,
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


def get_fraud_analysis_by_claim_id(db: Session, claim_id: str) -> Optional[FraudAnalysis]:
    return db.query(FraudAnalysis).filter(FraudAnalysis.claim_id == claim_id).first()


def insert_investigation_report(db: Session, data: dict):
    from backend.models import InvestigationReport
    record = InvestigationReport(**data)
    db.add(record)
    db.flush()
    return record


def get_latest_report_by_claim_id(db: Session, claim_id: str):
    from backend.models import InvestigationReport
    return (
        db.query(InvestigationReport)
        .filter(InvestigationReport.claim_id == claim_id)
        .order_by(InvestigationReport.generated_at.desc())
        .first()
    )


# ── Rule Config ──────────────────────────────────────────────────────────────
def get_all_rule_configs(db: Session):
    from backend.models import RuleConfig
    return db.query(RuleConfig).order_by(RuleConfig.id).all()


def get_rule_config_map(db: Session) -> dict:
    from backend.models import RuleConfig
    rules = db.query(RuleConfig).all()
    return {r.rule_key: r for r in rules}


def update_rule_config(db: Session, rule_key: str, data: dict):
    from backend.models import RuleConfig
    rule = db.query(RuleConfig).filter(RuleConfig.rule_key == rule_key).first()
    if not rule:
        return None
    for key, value in data.items():
        if hasattr(rule, key):
            setattr(rule, key, value)
    db.commit()
    db.refresh(rule)
    return rule


_DEFAULT_RULES = [
    {"rule_key": "zero_day_inpatient",   "description": "Zero-day stay for inpatient procedure (Phantom Billing indicator)", "threshold_value": None, "is_enabled": True},
    {"rule_key": "high_amount_zscore",   "description": "Claim amount z-score threshold (Upcoding indicator)", "threshold_value": 2.0,  "is_enabled": True},
    {"rule_key": "repeat_procedure_flag","description": "Same-procedure repeat within 30 days flag (Repeat Abuse indicator)", "threshold_value": None, "is_enabled": True},
    {"rule_key": "near_package_ceiling", "description": "Claim/package ratio threshold (Cost Inflation indicator)", "threshold_value": 0.95, "is_enabled": True},
    {"rule_key": "high_patient_frequency","description": "Patient claim frequency in 30 days (Abuse indicator)", "threshold_value": 3.0,  "is_enabled": True},
]


def seed_rule_configs(db: Session):
    from backend.models import RuleConfig
    if db.query(RuleConfig).count() == 0:
        for rule_data in _DEFAULT_RULES:
            db.add(RuleConfig(**rule_data))
        db.commit()


# ── System Config ────────────────────────────────────────────────────────────
def get_config_map(db: Session) -> dict:
    from backend.models import SystemConfig
    configs = db.query(SystemConfig).all()
    return {c.config_key: c.config_value for c in configs}


def get_all_system_configs(db: Session):
    from backend.models import SystemConfig
    return db.query(SystemConfig).order_by(SystemConfig.id).all()


def update_system_config(db: Session, key: str, value: str):
    from backend.models import SystemConfig
    config = db.query(SystemConfig).filter(SystemConfig.config_key == key).first()
    if not config:
        return None
    config.config_value = value
    db.commit()
    db.refresh(config)
    return config


_DEFAULT_SYSTEM_CONFIGS = [
    {"config_key": "LOW_MAX",    "config_value": "29",  "description": "Composite index ≤ this value → LOW threat"},
    {"config_key": "MEDIUM_MAX", "config_value": "59",  "description": "Composite index ≤ this value → MEDIUM threat"},
    {"config_key": "HIGH_MAX",   "config_value": "84",  "description": "Composite index ≤ this value → HIGH threat (above → CRITICAL)"},
]


def seed_system_configs(db: Session):
    from backend.models import SystemConfig
    if db.query(SystemConfig).count() == 0:
        for cfg in _DEFAULT_SYSTEM_CONFIGS:
            db.add(SystemConfig(**cfg))
        db.commit()


# ── Claims + Analysis Join ───────────────────────────────────────────────────
def get_claims_with_analysis(
    db: Session,
    min_score: Optional[int] = None,
    max_score: Optional[int] = None,
    risk_level: Optional[str] = None,
) -> list:
    rows = (
        db.query(Claim, FraudAnalysis)
        .join(FraudAnalysis, Claim.claim_id == FraudAnalysis.claim_id, isouter=True)
        .all()
    )
    results = []
    for claim, analysis in rows:
        ci = analysis.composite_index if analysis else None
        tl = analysis.threat_level if analysis else None
        if min_score is not None and (ci is None or ci < min_score):
            continue
        if max_score is not None and (ci is None or ci > max_score):
            continue
        if risk_level and tl != risk_level:
            continue
        results.append({
            "claim_id": claim.claim_id,
            "hospital_id": claim.hospital_id,
            "hospital_name": claim.hospital_name,
            "patient_id": claim.patient_id,
            "patient_name": claim.patient_name,
            "procedure_code": claim.procedure_code,
            "package_rate": claim.package_rate,
            "claim_amount": claim.claim_amount,
            "admission_date": str(claim.admission_date),
            "discharge_date": str(claim.discharge_date),
            "is_inpatient": claim.is_inpatient,
            "created_at": claim.created_at.isoformat() if claim.created_at else None,
            "composite_index": ci,
            "threat_level": tl,
            "risk_level": analysis.risk_level if analysis else None,
            "final_risk_score": analysis.final_risk_score if analysis else None,
            "fraud_pattern_detected": analysis.fraud_pattern_detected if analysis else None,
            "investigation_priority": analysis.investigation_priority if analysis else None,
            "enforcement_state": analysis.enforcement_state if analysis else None,
        })
    return results
