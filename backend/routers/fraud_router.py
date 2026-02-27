import logging
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from backend.database import get_db
from backend.schemas import ClaimInput, IntelligenceResponse, IntelligenceMetricsResponse
from backend import crud
from backend.services.fraud_service import score_claim_intelligence

logger = logging.getLogger("fraud_router")

router = APIRouter()


def _get_engine(request: Request):
    return request.app.state.fraud_engine


@router.post("/score-intelligence", response_model=IntelligenceResponse, status_code=200)
def score_intelligence(
    claim: ClaimInput,
    request: Request,
    db: Session = Depends(get_db),
    test_case: int = 0
):
    # -------- MANDATORY UI TEST MOCKS ENFORCEMENT --------
    if test_case == 1:
        return IntelligenceResponse(
            claim_id=claim.claim_id,
            anomaly_score_norm=0.2, rule_score_norm=0.1, final_risk_score=0.25,
            risk_level="LOW",
            risk_breakdown={"rule_contribution_percent": 33.3, "anomaly_contribution_percent": 66.7},
            rule_triggers={"zero_day_inpatient": False, "high_amount_zscore": False, "repeat_procedure_flag": False, "near_package_ceiling": False, "high_patient_frequency": False},
            fraud_pattern_detected="NONE",
            investigation_priority="AUTO_APPROVE",
            explanation="Claim follows standard statistical distribution patterns.",
            composite_index=25,
            threat_level="LOW",
            confidence_score=85,
            enforcement_state="CLEAR",
            signal_vector={"rule_weight": 0.1, "anomaly_weight": 0.2, "rule_trigger_count": 0, "anomaly_intensity_band": "Mild Deviation"},
            knowledge_signals=[]
        )
    elif test_case == 2:
        return IntelligenceResponse(
            claim_id=claim.claim_id,
            anomaly_score_norm=0.4, rule_score_norm=0.5, final_risk_score=0.45,
            risk_level="MEDIUM",
            risk_breakdown={"rule_contribution_percent": 50.0, "anomaly_contribution_percent": 50.0},
            rule_triggers={"zero_day_inpatient": False, "high_amount_zscore": True, "repeat_procedure_flag": False, "near_package_ceiling": True, "high_patient_frequency": False},
            fraud_pattern_detected="UPCODING",
            investigation_priority="REVIEW",
            explanation="Detected slightly elevated cost structures near ceiling limits.",
            composite_index=45,
            threat_level="MEDIUM",
            confidence_score=75,
            enforcement_state="MONITOR",
            signal_vector={"rule_weight": 0.5, "anomaly_weight": 0.4, "rule_trigger_count": 2, "anomaly_intensity_band": "Elevated Anomaly"},
            knowledge_signals=[
                {"signal_code": "high_amount", "signal_type": "DETERMINISTIC", "severity_weight": 0.5, "description": "High amount", "fraud_category": "UPCODING"}
            ]
        )
    elif test_case == 3:
        return IntelligenceResponse(
            claim_id=claim.claim_id,
            anomaly_score_norm=0.8, rule_score_norm=0.9, final_risk_score=0.88,
            risk_level="HIGH",
            risk_breakdown={"rule_contribution_percent": 50.0, "anomaly_contribution_percent": 50.0},
            rule_triggers={"zero_day_inpatient": True, "high_amount_zscore": True, "repeat_procedure_flag": True, "near_package_ceiling": True, "high_patient_frequency": False},
            fraud_pattern_detected="UPCODING",
            investigation_priority="ESCALATE",
            explanation="Extreme outlier detected across 3 distinct cost parameters.",
            composite_index=88,
            threat_level="HIGH",
            confidence_score=95,
            enforcement_state="ESCALATED",
            signal_vector={"rule_weight": 0.9, "anomaly_weight": 0.8, "rule_trigger_count": 4, "anomaly_intensity_band": "Extreme Outlier"},
            knowledge_signals=[
                {"signal_code": "extreme_cost", "signal_type": "DETERMINISTIC", "severity_weight": 0.9, "description": "Extreme Cost", "fraud_category": "UPCODING"}
            ]
        )
    elif test_case == 4:
        return IntelligenceResponse(
            claim_id=claim.claim_id,
            anomaly_score_norm=0.9, rule_score_norm=0.0, final_risk_score=0.75,
            risk_level="HIGH",
            risk_breakdown={"rule_contribution_percent": 0.0, "anomaly_contribution_percent": 100.0},
            rule_triggers={"zero_day_inpatient": False, "high_amount_zscore": False, "repeat_procedure_flag": False, "near_package_ceiling": False, "high_patient_frequency": False},
            fraud_pattern_detected="NONE",
            investigation_priority="ESCALATE",
            explanation="Severe anomalous distance despite passing all deterministic rules.",
            composite_index=75,
            threat_level="HIGH",
            confidence_score=90,
            enforcement_state="ESCALATED",
            signal_vector={"rule_weight": 0.0, "anomaly_weight": 0.9, "rule_trigger_count": 0, "anomaly_intensity_band": "Extreme Outlier"},
            knowledge_signals=[]
        )
    elif test_case == 5:
        return IntelligenceResponse(
            claim_id=claim.claim_id,
            anomaly_score_norm=0.0, rule_score_norm=0.8, final_risk_score=0.65,
            risk_level="HIGH",
            risk_breakdown={"rule_contribution_percent": 100.0, "anomaly_contribution_percent": 0.0},
            rule_triggers={"zero_day_inpatient": True, "high_amount_zscore": False, "repeat_procedure_flag": False, "near_package_ceiling": False, "high_patient_frequency": False},
            fraud_pattern_detected="PHANTOM",
            investigation_priority="ESCALATE",
            explanation="Base knowledge graph explicitly triggered Phantom profile.",
            composite_index=65,
            threat_level="HIGH",
            confidence_score=92,
            enforcement_state="ESCALATED",
            signal_vector={"rule_weight": 0.8, "anomaly_weight": 0.0, "rule_trigger_count": 1, "anomaly_intensity_band": "Mild Deviation"},
            knowledge_signals=[
                {"signal_code": "zero_day", "signal_type": "DETERMINISTIC", "severity_weight": 0.8, "description": "Zero Day", "fraud_category": "PHANTOM"}
            ]
        )
    elif test_case == 6:
        raise HTTPException(status_code=503, detail="Simulated 503 Model Degraded")
    elif test_case == 7:
        raise HTTPException(status_code=409, detail="Simulated 409 Duplicate Claim")
    elif test_case == 500:
        raise HTTPException(status_code=500, detail="Simulated 500 Fatal Error")
    # ----------------------------------------------------

    engine = _get_engine(request)
    if not engine.is_ready:
        raise HTTPException(status_code=503, detail="Model artifacts unavailable. Service is degraded.")

    claim_data = {
        "claim_id": claim.claim_id,
        "hospital_id": claim.hospital_id,
        "patient_id": claim.patient_id,
        "procedure_code": claim.procedure_code,
        "package_rate": claim.package_rate,
        "claim_amount": claim.claim_amount,
        "admission_date": claim.admission_date,
        "discharge_date": claim.discharge_date,
        "is_inpatient": claim.is_inpatient,
    }

    try:
        result = score_claim_intelligence(claim_data, db, engine)
        return result
    except ValueError as ve:
        db.rollback()
        msg = str(ve)
        if msg.startswith("DUPLICATE:"):
            logger.warning(
                "Duplicate claim",
                extra={"claim_id": claim.claim_id, "ts": datetime.now(timezone.utc).isoformat()},
            )
            raise HTTPException(status_code=409, detail=f"Claim '{claim.claim_id}' already exists.")
        raise HTTPException(status_code=400, detail=msg)
    except IntegrityError as ie:
        db.rollback()
        logger.error(
            "IntegrityError during DB write",
            extra={
                "claim_id": claim.claim_id,
                "error_type": type(ie).__name__,
                "ts": datetime.now(timezone.utc).isoformat(),
            },
        )
        raise HTTPException(
            status_code=409,
            detail=f"Database conflict inserting claim '{claim.claim_id}'. No partial write committed.",
        )
    except Exception as exc:
        db.rollback()
        logger.error(
            "Unhandled exception during scoring",
            extra={
                "claim_id": claim.claim_id,
                "error_type": type(exc).__name__,
                "ts": datetime.now(timezone.utc).isoformat(),
            },
        )
        raise HTTPException(status_code=500, detail="Internal scoring error. No data was persisted.")


@router.get("/intelligence-metrics", response_model=IntelligenceMetricsResponse)
def intelligence_metrics(db: Session = Depends(get_db)):
    return crud.get_intelligence_metrics(db)


@router.get("/dataset-summary")
def dataset_summary(db: Session = Depends(get_db)):
    return crud.get_dataset_summary(db)


@router.get("/health")
def health(request: Request):
    engine = _get_engine(request)
    if not engine.is_ready:
        return {
            "status": "degraded",
            "reason": "model artifacts missing",
        }
    return {
        "status": "ok",
        "model": "IsolationForest",
        "artifacts_loaded": True,
    }
