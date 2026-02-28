"""
Report Router — POST /api/v1/generate-report/{claim_id}
RBAC guarded, telemetry-enabled, isolated from scoring.
"""
import logging
import time
from fastapi import APIRouter, Depends, HTTPException, Header
from sqlalchemy.orm import Session
from backend.database import get_db
from backend.schemas import ReportGenerationResponse
from backend.services.report_service import generate_investigation_report

logger = logging.getLogger("report_router")

router = APIRouter()

ALLOWED_ROLES = {"AUDITOR", "ADMIN"}


@router.post("/generate-report/{claim_id}", response_model=ReportGenerationResponse, status_code=200)
def generate_report(
    claim_id: str,
    regenerate: bool = False,
    x_user_role: str = Header(default="", alias="X-User-Role"),
    db: Session = Depends(get_db),
):
    # ── RBAC Guard ───────────────────────────────────────────────────────────
    role = x_user_role.strip().upper()
    if role not in ALLOWED_ROLES:
        logger.warning(
            "Unauthorized report generation attempt",
            extra={"claim_id": claim_id, "role": role or "MISSING"},
        )
        raise HTTPException(
            status_code=403,
            detail=f"Role '{role or 'NONE'}' is not authorised to generate investigation reports. Required: AUDITOR or ADMIN.",
        )

    # ── Generate ─────────────────────────────────────────────────────────────
    start = time.time()
    result = generate_investigation_report(claim_id, db, regenerate=regenerate)
    elapsed_ms = int((time.time() - start) * 1000)

    # ── Error handling ───────────────────────────────────────────────────────
    if "error" in result:
        error_code = result.get("error", "UNKNOWN")
        status_code = result.get("status_code", 500)

        if error_code == "LLM_UNAVAILABLE":
            raise HTTPException(
                status_code=503,
                detail="Report generation service temporarily unavailable. The LLM backend is unreachable.",
            )
        elif error_code == "CLAIM_NOT_FOUND":
            raise HTTPException(
                status_code=404,
                detail=f"Claim '{claim_id}' not found in database.",
            )
        elif error_code == "ANALYSIS_NOT_FOUND":
            raise HTTPException(
                status_code=404,
                detail=f"Fraud analysis for claim '{claim_id}' not found. Score the claim first.",
            )
        else:
            raise HTTPException(status_code=status_code, detail=error_code)

    # ── Telemetry ────────────────────────────────────────────────────────────
    logger.info(
        "Report endpoint completed",
        extra={
            "claim_id": claim_id,
            "model": result.get("model_used", "unknown"),
            "total_tokens": result.get("token_usage", {}).get("total_tokens", 0),
            "generation_time_ms": elapsed_ms,
            "generation_status": result.get("generation_status", "UNKNOWN"),
            "regenerated": regenerate,
        },
    )

    return result
