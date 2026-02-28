"""
Analytics Router — user fraud profiling + hospital risk intelligence + CSV export.
All calculations are DB-driven via analytics_service.
"""
import csv
import io
import logging
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from backend.database import get_db
from backend import crud
from backend.models import Claim, FraudAnalysis
from backend.auth_utils import get_current_user
from backend.services.analytics_service import build_user_profile, build_hospital_profile
from backend.schemas import HospitalLossItem
from backend.services.fraud_analytics_service import get_hospital_loss

logger = logging.getLogger("analytics_router")

router = APIRouter()


@router.get("/analytics/user/{user_id}")
def user_analytics(user_id: int, db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    user = crud.get_user_by_id(db, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")
    return build_user_profile(user_id, db)


@router.get("/analytics/hospital/{hospital_id}")
def hospital_analytics(hospital_id: str, db: Session = Depends(get_db)):
    return build_hospital_profile(hospital_id, db)


@router.get("/export/dataset")
def export_dataset_csv(db: Session = Depends(get_db)):
    """
    Server-side CSV export of all claims + fraud analysis.
    No frontend-only filtering — all data comes from DB.
    """
    claims = db.query(Claim).all()

    output = io.StringIO()
    writer = csv.writer(output)

    writer.writerow([
        "Claim ID",
        "Hospital",
        "Patient",
        "Procedure",
        "Amount",
        "Package Rate",
        "Admission Date",
        "Discharge Date",
        "Composite Score",
        "Threat Level",
        "Confidence Score",
        "Fraud Pattern",
        "Enforcement State",
        "Investigation Priority",
    ])

    for claim in claims:
        analysis = db.query(FraudAnalysis).filter(FraudAnalysis.claim_id == claim.claim_id).first()
        if not analysis:
            continue

        writer.writerow([
            claim.claim_id,
            claim.hospital_id,
            claim.patient_id,
            claim.procedure_code,
            claim.claim_amount,
            claim.package_rate,
            claim.admission_date,
            claim.discharge_date,
            analysis.composite_index,
            analysis.threat_level,
            analysis.confidence_score,
            analysis.fraud_pattern_detected,
            analysis.enforcement_state,
            analysis.investigation_priority,
        ])

    output.seek(0)

    return StreamingResponse(
        output,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=pmjay_dataset_export.csv"}
    )


@router.get("/hospital-loss", response_model=List[HospitalLossItem], tags=["Analytics"])
def hospital_loss(
    range: Optional[str] = Query(None, pattern=r"^(7d|30d|all)$"),
    db: Session = Depends(get_db)
):
    """
    Hospital-Level Fraud Exposure Analytics (Hitha's Feature).
    Returns risk-weighted financial loss and fraud exposure % per hospital.
    """
    try:
        return get_hospital_loss(db, range)
    except Exception as exc:
        logger.error("Failed to compute hospital loss", exc_info=exc)
        raise HTTPException(status_code=500, detail="Internal server error")
