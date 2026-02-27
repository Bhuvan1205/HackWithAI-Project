import time
import uuid
import random
from datetime import date, timedelta
from typing import Optional
import pandas as pd
from fastapi import APIRouter, Depends, HTTPException, Request, Query
from sqlalchemy.orm import Session
from backend.database import get_db
from backend.ml.claims_generator import PACKAGE_RATES, INPATIENT_PROCEDURES, HOSPITALS, PROCEDURES, PATIENTS, START_DATE
from backend.ml.feature_engineering import compute_features

router = APIRouter()

_PROC_LIST = PROCEDURES
_HOSP_LIST = HOSPITALS
_PAT_LIST = PATIENTS


def _make_benchmark_claim(idx: int) -> dict:
    proc = _PROC_LIST[idx % len(_PROC_LIST)]
    hosp = _HOSP_LIST[idx % len(_HOSP_LIST)]
    pat = _PAT_LIST[idx % len(_PAT_LIST)]
    adm = START_DATE + timedelta(days=random.randint(0, 89))
    pkg = PACKAGE_RATES[proc]
    is_inpatient = 1 if proc in INPATIENT_PROCEDURES else 0
    stay = random.randint(2, 5) if is_inpatient else 0
    return {
        "claim_id": f"BENCH-{uuid.uuid4().hex[:10].upper()}",
        "hospital_id": hosp,
        "patient_id": pat,
        "procedure_code": proc,
        "package_rate": pkg,
        "claim_amount": round(pkg * random.uniform(0.6, 1.0), 2),
        "admission_date": adm,
        "discharge_date": adm + timedelta(days=stay),
        "is_inpatient": is_inpatient,
    }


@router.post("/internal/batch-benchmark")
def batch_benchmark(
    request: Request,
    n: int = Query(default=100, ge=1, le=1000, description="Number of synthetic claims to benchmark"),
    db: Session = Depends(get_db),
):
    engine = request.app.state.fraud_engine
    if not engine.is_ready:
        raise HTTPException(status_code=503, detail="Model artifacts unavailable.")

    random.seed(None)
    benchmark_claims = [_make_benchmark_claim(i) for i in range(n)]

    latencies_ms: list[float] = []

    try:
        base_df = pd.DataFrame(benchmark_claims)

        for i, claim in enumerate(benchmark_claims):
            t_start = time.perf_counter()

            current_df = pd.concat(
                [base_df.iloc[:i], pd.DataFrame([claim])],
                ignore_index=True,
            )
            df_feat = compute_features(current_df)
            feat_row = df_feat[df_feat["claim_id"] == claim["claim_id"]].iloc[0]
            engine.score_row(feat_row)

            elapsed_ms = (time.perf_counter() - t_start) * 1000
            latencies_ms.append(elapsed_ms)

    finally:
        db.rollback()

    total_s = sum(latencies_ms) / 1000.0
    avg_ms = sum(latencies_ms) / len(latencies_ms) if latencies_ms else 0.0
    max_ms = max(latencies_ms) if latencies_ms else 0.0

    return {
        "total_processed": n,
        "total_time_seconds": round(total_s, 4),
        "avg_time_per_claim_ms": round(avg_ms, 3),
        "max_time_ms": round(max_ms, 3),
    }


@router.get("/internal/self-check")
def self_check(request: Request, db: Session = Depends(get_db)):
    from backend.services.fraud_service import score_claim_intelligence
    engine = request.app.state.fraud_engine

    low_claim = {
        "claim_id": f"SELF_CHK_LOW_{uuid.uuid4().hex[:6]}",
        "hospital_id": "H1",
        "patient_id": "P_LOW",
        "procedure_code": "P1",
        "package_rate": 20000.0,
        "claim_amount": 20000.0,
        "admission_date": "2024-01-01",
        "discharge_date": "2024-01-05", # Normal stay
        "is_inpatient": 1
    }

    high_claim = {
        "claim_id": f"SELF_CHK_HIGH_{uuid.uuid4().hex[:6]}",
        "hospital_id": "H2",
        "patient_id": "P_HIGH",
        "procedure_code": "P2",
        "package_rate": 5000.0,
        "claim_amount": 45000.0, # Massive upcode
        "admission_date": "2024-02-01",
        "discharge_date": "2024-02-01", # Zero day stay
        "is_inpatient": 1
    }

    try:
        low_res = score_claim_intelligence(low_claim, db, engine)
        high_res = score_claim_intelligence(high_claim, db, engine)
    finally:
        db.rollback()

    return {
        "status": "pass",
        "low_case": {
            "composite_index": low_res["composite_index"],
            "threat_level": low_res["threat_level"],
            "confidence_score": low_res["confidence_score"]
        },
        "high_case": {
            "composite_index": high_res["composite_index"],
            "threat_level": high_res["threat_level"],
            "confidence_score": high_res["confidence_score"]
        }
    }
