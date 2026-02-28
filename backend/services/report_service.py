"""
Report Service — Builds structured prompts from DB records and orchestrates LLM report generation.
Strictly reads from persisted data. Never recomputes ML values.
"""
import json
import logging
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from backend import crud
from backend.services.llm_client import generate_report_text

logger = logging.getLogger("report_service")

# ── System Prompt ────────────────────────────────────────────────────────────
SYSTEM_PROMPT = """You are a Senior Fraud Intelligence Analyst for the PM-JAY (Pradhan Mantri Jan Arogya Yojana) government health insurance programme.

You are generating a formal, audit-grade investigation report based on structured fraud intelligence data.

STRICT RULES:
1. Use formal, forensic language suitable for government compliance review.
2. Do NOT invent, fabricate, or hallucinate any numerical values.
3. Use ONLY the structured data provided in the user message.
4. Do NOT modify, round, or recompute any metric — transcribe them exactly.
5. Do NOT introduce new fraud categories beyond those in the data.
6. Do NOT override enforcement_state, threat_level, composite_index, or confidence_score.
7. Include all 11 mandatory report sections in order.
8. Include the legal disclaimer in Section 11.
9. Maintain structured section headers using Markdown formatting.
10. This is an interpretation and explanation layer ONLY — not a decision engine.
"""


def _build_user_prompt(claim, analysis) -> str:
    """Construct the user prompt from DB records. All values are transcribed verbatim.
    claim may be None for legacy claims not in the Claim table — fields are sourced from analysis."""
    claim_id = analysis.claim_id
    data_block = {
        "claim_id": claim_id,
        "hospital_id": claim.hospital_id if claim else analysis.hospital_id if hasattr(analysis, "hospital_id") else "N/A",
        "patient_id": claim.patient_id if claim else analysis.patient_id if hasattr(analysis, "patient_id") else "N/A",
        "procedure_code": claim.procedure_code if claim else analysis.procedure_code if hasattr(analysis, "procedure_code") else "N/A",
        "package_rate": claim.package_rate if claim else "N/A",
        "claim_amount": claim.claim_amount if claim else "N/A",
        "admission_date": str(claim.admission_date) if claim else "N/A",
        "discharge_date": str(claim.discharge_date) if claim else "N/A",
        "is_inpatient": claim.is_inpatient if claim else "N/A",
        "final_risk_score": analysis.final_risk_score,
        "risk_level": analysis.risk_level,
        "composite_index": analysis.composite_index,
        "threat_level": analysis.threat_level,
        "confidence_score": analysis.confidence_score,
        "enforcement_state": analysis.enforcement_state,
        "fraud_pattern_detected": analysis.fraud_pattern_detected,
        "investigation_priority": analysis.investigation_priority,
        "anomaly_score_norm": analysis.anomaly_score_norm,
        "rule_score_norm": analysis.rule_score_norm,
        "rule_triggers": analysis.rule_triggers,
        "risk_breakdown": analysis.risk_breakdown,
        "signal_vector": analysis.signal_vector,
        "knowledge_signals": analysis.knowledge_signals,
        "explanation": analysis.explanation,
    }

    return f"""Generate a formal PM-JAY Fraud Investigation Report using ONLY the following structured intelligence data. Do NOT invent any values.

STRUCTURED INTELLIGENCE DATA:
```json
{json.dumps(data_block, indent=2, default=str)}
```

MANDATORY REPORT STRUCTURE (use these exact section headers):

## 1. Executive Summary
Brief overview of the risk assessment outcome.

## 2. Claim Overview
Claim ID, Hospital ID, Patient ID, Procedure Code, Claim Amount, Package Rate, Admission/Discharge dates.

## 3. Risk Assessment Summary
Final Risk Score, Composite Index, Threat Level, Confidence Score, Enforcement State — transcribe exactly.

## 4. Fraud Pattern Analysis
Explain the fraud_pattern_detected value and its implications.

## 5. Rule Trigger Analysis
For each triggered rule (value=true), explain what it means. If none triggered, state that.

## 6. Anomaly Detection Interpretation
Explain what anomaly_score_norm means in context.

## 7. Composite Intelligence Layer Interpretation
Explain the relationship between composite_index, threat_level, and the scoring bands.

## 8. Signal Vector Analysis
Explain rule_weight, anomaly_weight, rule_trigger_count, and anomaly_intensity_band.

## 9. Knowledge Signals
If knowledge_signals are present, explain each. If empty, state no signals emitted.

## 10. Enforcement Recommendation
Restate enforcement_state with justification based on the data.

## 11. Legal and Compliance Note
Include: "This report is AI-assisted and intended to support investigation, not replace human adjudication. All numerical values are sourced from the PM-JAY Fraud Intelligence Engine and have not been modified by the language model."
"""


def generate_investigation_report(claim_id: str, db: Session, regenerate: bool = False) -> dict:
    """
    Orchestrate report generation:
    1. Validate claim + analysis exist
    2. Check cache (unless regenerate=True)
    3. Build prompt from DB records
    4. Call LLM
    5. Persist report
    6. Return response
    """
    # 1. Validate — FraudAnalysis is primary source of truth
    analysis = crud.get_fraud_analysis_by_claim_id(db, claim_id)
    if not analysis:
        return {"error": "ANALYSIS_NOT_FOUND", "status_code": 404}

    # Claim table may be missing for claims scored before FK migration
    claim = crud.get_claim_by_id(db, claim_id)

    # 2. Cache check
    if not regenerate:
        existing = crud.get_latest_report_by_claim_id(db, claim_id)
        if existing:
            logger.info("Returning cached report", extra={"claim_id": claim_id})
            return {
                "claim_id": claim_id,
                "report_text": existing.report_text,
                "generated_at": existing.generated_at.isoformat() if existing.generated_at else "",
                "model_used": existing.model_name,
                "token_usage": {
                    "prompt_tokens": existing.prompt_tokens or 0,
                    "completion_tokens": existing.completion_tokens or 0,
                    "total_tokens": existing.total_tokens or 0,
                },
                "generation_status": existing.generation_status,
            }

    # 3. Build prompt — uses claim if available, else reconstructs from analysis
    user_prompt = _build_user_prompt(claim, analysis)

    # 4. Call LLM
    result = generate_report_text(SYSTEM_PROMPT, user_prompt)
    if result is None:
        return {"error": "LLM_UNAVAILABLE", "status_code": 503}

    now = datetime.now(timezone.utc)

    # 5. Persist
    report_data = {
        "claim_id": claim_id,
        "report_text": result["text"],
        "model_name": result["model"],
        "prompt_tokens": result["prompt_tokens"],
        "completion_tokens": result["completion_tokens"],
        "total_tokens": result["total_tokens"],
        "generated_at": now,
        "generation_status": "SUCCESS",
        "version": "1.0",
    }
    crud.insert_investigation_report(db, report_data)
    db.commit()

    # 6. Telemetry (safe — no prompt/report text logged)
    logger.info(
        "Report generated",
        extra={
            "claim_id": claim_id,
            "model": result["model"],
            "total_tokens": result["total_tokens"],
            "generation_time_ms": result.get("generation_time_ms", 0),
            "generation_status": "SUCCESS",
        },
    )

    # 7. Return
    return {
        "claim_id": claim_id,
        "report_text": result["text"],
        "generated_at": now.isoformat(),
        "model_used": result["model"],
        "token_usage": {
            "prompt_tokens": result["prompt_tokens"],
            "completion_tokens": result["completion_tokens"],
            "total_tokens": result["total_tokens"],
        },
        "generation_status": "SUCCESS",
    }
