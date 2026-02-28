import logging
import pandas as pd
from sqlalchemy.orm import Session
from backend import crud
from backend.ml.feature_engineering import compute_features
from backend.ml.risk_engine import FraudEngine, classify_risk

logger = logging.getLogger("fraud_service")

# ── Rule metadata for Knowledge Signal Graph ────────────────────────────────
_RULE_META = {
    "zero_day_inpatient": {
        "signal_code": "RULE_01",
        "signal_type": "DETERMINISTIC",
        "severity_weight": 0.30,
        "description": "Zero-day inpatient stay recorded for a procedure requiring hospitalisation. Strong indicator of phantom billing — service may not have been rendered.",
        "fraud_category": "PHANTOM",
    },
    "high_amount_zscore": {
        "signal_code": "RULE_02",
        "signal_type": "DETERMINISTIC",
        "severity_weight": 0.25,
        "description": "Claimed amount exceeds 2σ above the historical mean for this procedure code — a classic marker of upcoding / cost inflation.",
        "fraud_category": "UPCODING",
    },
    "repeat_procedure_flag": {
        "signal_code": "RULE_03",
        "signal_type": "DETERMINISTIC",
        "severity_weight": 0.20,
        "description": "Same procedure claimed for this patient within 30 days. Indicates potential repeat abuse or fabricated re-admission.",
        "fraud_category": "REPEAT_ABUSE",
    },
    "near_package_ceiling": {
        "signal_code": "RULE_04",
        "signal_type": "DETERMINISTIC",
        "severity_weight": 0.15,
        "description": "Claim amount approaches or exceeds the authorised package ceiling (≥ 95%), consistent with systematic cost inflation.",
        "fraud_category": "UPCODING",
    },
    "high_patient_frequency": {
        "signal_code": "RULE_05",
        "signal_type": "DETERMINISTIC",
        "severity_weight": 0.10,
        "description": "Patient has submitted ≥ 3 claims in 30 days — an unusually high utilisation frequency suggesting abuse.",
        "fraud_category": "REPEAT_ABUSE",
    },
}


def _get_rule_triggers(row: pd.Series, db=None) -> dict:
    """
    Evaluate all deterministic fraud rules.
    Thresholds and enabled-state are read from the RuleConfig DB table.
    Falls back to hardcoded defaults if DB is unavailable.
    """
    rule_map = {}
    if db is not None:
        try:
            from backend import crud as _crud
            rule_map = _crud.get_rule_config_map(db)
        except Exception:
            pass

    def _threshold(key: str, default: float) -> float:
        r = rule_map.get(key)
        return r.threshold_value if (r and r.threshold_value is not None) else default

    def _enabled(key: str) -> bool:
        r = rule_map.get(key)
        return r.is_enabled if r is not None else True

    return {
        "zero_day_inpatient": _enabled("zero_day_inpatient") and bool(
            row["is_zero_day_stay"] == 1 and row["is_inpatient"] == 1
        ),
        "high_amount_zscore": _enabled("high_amount_zscore") and bool(
            row["claim_amount_zscore"] > _threshold("high_amount_zscore", 2.0)
        ),
        "repeat_procedure_flag": _enabled("repeat_procedure_flag") and bool(
            row["same_proc_repeat_flag"] == 1
        ),
        "near_package_ceiling": _enabled("near_package_ceiling") and bool(
            row["claim_to_package_ratio"] > _threshold("near_package_ceiling", 0.95)
        ),
        "high_patient_frequency": _enabled("high_patient_frequency") and bool(
            row["patient_claim_freq_30d"] >= _threshold("high_patient_frequency", 3.0)
        ),
    }


def _detect_fraud_pattern(triggers: dict) -> str:
    phantom = triggers["zero_day_inpatient"]
    upcoding = triggers["high_amount_zscore"] or triggers["near_package_ceiling"]
    repeat = triggers["repeat_procedure_flag"] or triggers["high_patient_frequency"]
    active = sum([phantom, upcoding, repeat])
    if active == 0:
        return "NONE"
    if active > 1:
        return "MIXED"
    if phantom:
        return "PHANTOM"
    if upcoding:
        return "UPCODING"
    return "REPEAT_ABUSE"


def _investigation_priority(risk_level: str) -> str:
    return {"LOW": "AUTO_APPROVE", "MEDIUM": "REVIEW", "HIGH": "ESCALATE"}[risk_level]


def _risk_breakdown(rule_score_norm: float, anomaly_score_norm: float) -> dict:
    rule_contrib = 0.70 * rule_score_norm
    anomaly_contrib = 0.30 * anomaly_score_norm
    total = rule_contrib + anomaly_contrib
    if total == 0:
        return {"rule_contribution_percent": 0.0, "anomaly_contribution_percent": 0.0}
    return {
        "rule_contribution_percent": round(100.0 * rule_contrib / total, 2),
        "anomaly_contribution_percent": round(100.0 * anomaly_contrib / total, 2),
    }





# ── 1. Composite Risk Index & Threat Level ───────────────────────────────────
def _compute_composite_index(final_risk_score: float) -> int:
    return min(100, max(0, round(final_risk_score * 100)))


def _classify_threat_level(composite_index: int, db=None) -> str:
    """
    Classify threat level using DB-configured bands.
    Falls back to hardcoded defaults (29/59/84) if DB unavailable.
    """
    low_max, medium_max, high_max = 29, 59, 84
    if db is not None:
        try:
            from backend import crud as _crud
            cfg = _crud.get_config_map(db)
            low_max = int(cfg.get("LOW_MAX", 29))
            medium_max = int(cfg.get("MEDIUM_MAX", 59))
            high_max = int(cfg.get("HIGH_MAX", 84))
        except Exception:
            pass
    if composite_index <= low_max:
        return "LOW"
    elif composite_index <= medium_max:
        return "MEDIUM"
    elif composite_index <= high_max:
        return "HIGH"
    return "CRITICAL"


# ── 2. Model Confidence Score ────────────────────────────────────────────────
def _compute_confidence(
    anomaly_score_norm: float,
    triggers: dict,
    claim_amount_zscore: float,
) -> int:
    anomaly_strength = anomaly_score_norm  # 0.0 – 1.0

    active_count = sum(triggers.values())
    rule_trigger_density = min(active_count / len(triggers), 1.0)

    zscore_intensity = min(max(abs(claim_amount_zscore) / 5.0, 0.0), 1.0)

    raw = 0.5 * anomaly_strength + 0.3 * rule_trigger_density + 0.2 * zscore_intensity
    return min(100, max(0, round(raw * 100)))


# ── 3. Signal Vector Assembly ────────────────────────────────────────────────
def _anomaly_intensity_band(anomaly_score_norm: float) -> str:
    if anomaly_score_norm < 0.40:
        return "Mild Deviation"
    elif anomaly_score_norm < 0.75:
        return "Elevated Anomaly"
    return "Extreme Outlier"


def _build_signal_vector(
    rule_score_norm: float,
    anomaly_score_norm: float,
    triggers: dict,
) -> dict:
    active_count = sum(triggers.values())
    return {
        "rule_weight": round(0.70 * rule_score_norm, 4),
        "anomaly_weight": round(0.30 * anomaly_score_norm, 4),
        "rule_trigger_count": active_count,
        "anomaly_intensity_band": _anomaly_intensity_band(anomaly_score_norm),
    }


# ── 4. Knowledge Signal Graph ────────────────────────────────────────────────
def _build_knowledge_signals(triggers: dict, anomaly_score_norm: float) -> list:
    signals = []
    for key, active in triggers.items():
        if active:
            meta = _RULE_META[key]
            signals.append({
                "signal_code": meta["signal_code"],
                "signal_type": meta["signal_type"],
                "severity_weight": meta["severity_weight"],
                "description": meta["description"],
                "fraud_category": meta["fraud_category"],
            })
    # If no rule fired but anomaly is high, emit a statistical signal
    if not signals and anomaly_score_norm >= 0.6:
        signals.append({
            "signal_code": "STAT_01",
            "signal_type": "STATISTICAL",
            "severity_weight": round(anomaly_score_norm, 4),
            "description": "Isolation Forest flagged this claim as a statistical outlier with no specific deterministic rule trigger.",
            "fraud_category": "ANOMALY",
        })
    return signals


# ── 5. Enforcement Layer ─────────────────────────────────────────────────────
def _compute_enforcement_state(threat_level: str, confidence_score: int) -> str:
    if threat_level == "LOW":
        return "CLEAR"
    if threat_level == "MEDIUM":
        return "MONITOR"
    if threat_level == "HIGH":
        return "ESCALATED"
    # CRITICAL
    return "HARD_STOP"



# ── 8. Enhanced Explanation Engine ──────────────────────────────────────────
def _generate_explanation(
    triggers: dict,
    pattern: str,
    risk_level: str,
    anomaly_score_norm: float,
    composite_index: int,
    threat_level: str,
    confidence_score: int,
    enforcement_state: str,
) -> str:
    if risk_level == "LOW" and pattern == "NONE":
        return (
            f"Composite Risk Index of {composite_index} ({threat_level}) with {confidence_score}% confidence. "
            "This claim presents no statistically significant deviations from expected procedure costs, "
            "stay durations, or patient behaviour patterns. Cleared for auto-approval."
        )

    parts = []
    if triggers["zero_day_inpatient"]:
        parts.append("The claim records a zero-day stay for an inpatient procedure, strongly indicating a phantom billing scenario where the service may not have been rendered.")
    if triggers["high_amount_zscore"]:
        parts.append("The claimed amount is more than 2 standard deviations above the historical mean for this procedure code, a classic marker of upcoding.")
    if triggers["near_package_ceiling"]:
        parts.append("The claim amount approaches or exceeds the authorised package ceiling, consistent with systematic cost inflation.")
    if triggers["repeat_procedure_flag"]:
        parts.append("The same procedure has been claimed for this patient within a 30-day window, indicating potential repeat abuse or fabricated re-admission.")
    if triggers["high_patient_frequency"]:
        parts.append("This patient has submitted an unusually high number of claims in the past 30 days, suggesting a pattern of repeated utilisation abuse.")
    if anomaly_score_norm > 0.6 and not parts:
        parts.append("The claim exhibits a statistical profile significantly divergent from normal claims as identified by the anomaly detection model, though no specific rule was triggered.")

    pattern_suffix = {
        "PHANTOM": "Overall fraud pattern is consistent with Phantom Billing.",
        "UPCODING": "Overall fraud pattern is consistent with Upcoding (cost inflation).",
        "REPEAT_ABUSE": "Overall fraud pattern is consistent with Repeat Abuse (unnecessary re-admissions).",
        "MIXED": "Multiple fraud indicators are active simultaneously, suggesting a complex or coordinated fraud attempt.",
        "NONE": "",
    }[pattern]

    enforcement_note = {
        "HARD_STOP": "System has issued an automatic HARD STOP — claim settlement is blocked pending mandatory manual audit.",
        "ESCALATED": "System has automatically escalated this claim for immediate investigator review.",
        "MONITOR": "Claim is flagged for enhanced monitoring.",
        "CLEAR": "",
    }[enforcement_state]

    body = " ".join(parts)
    if pattern_suffix:
        body = (body + " " + pattern_suffix).strip()

    prefix = (
        f"Composite Risk Index of {composite_index} ({threat_level}) with {confidence_score}% model confidence. "
    )
    suffix = (" " + enforcement_note) if enforcement_note else ""

    return (prefix + body + suffix).strip()


def score_claim_intelligence(claim_data: dict, db: Session, engine: FraudEngine) -> dict:
    claim_id = claim_data["claim_id"]

    if crud.get_claim_by_id(db, claim_id):
        raise ValueError(f"DUPLICATE:{claim_id}")

    crud.insert_claim(db, {
        "claim_id": claim_data["claim_id"],
        "hospital_id": claim_data["hospital_id"],
        "hospital_name": claim_data.get("hospital_name"),
        "patient_id": claim_data["patient_id"],
        "patient_name": claim_data.get("patient_name"),
        "procedure_code": claim_data["procedure_code"],
        "package_rate": claim_data["package_rate"],
        "claim_amount": claim_data["claim_amount"],
        "admission_date": str(claim_data["admission_date"]),
        "discharge_date": str(claim_data["discharge_date"]),
        "is_inpatient": claim_data["is_inpatient"],
    })

    historical_df = crud.get_all_claims_as_df(db)
    new_row = pd.DataFrame([{
        "claim_id": claim_data["claim_id"],
        "hospital_id": claim_data["hospital_id"],
        "hospital_name": claim_data.get("hospital_name"),
        "patient_id": claim_data["patient_id"],
        "patient_name": claim_data.get("patient_name"),
        "procedure_code": claim_data["procedure_code"],
        "package_rate": claim_data["package_rate"],
        "claim_amount": claim_data["claim_amount"],
        "admission_date": claim_data["admission_date"],
        "discharge_date": claim_data["discharge_date"],
        "is_inpatient": claim_data["is_inpatient"],
    }])
    full_df = pd.concat([historical_df, new_row], ignore_index=True)
    df_features = compute_features(full_df)
    feat_row = df_features[df_features["claim_id"] == claim_id].iloc[0]

    scores = engine.score_row(feat_row)
    a_norm = scores["anomaly_score_norm"]
    r_norm = scores["rule_score_norm"]
    final = scores["final_risk_score"]
    risk_level = scores["risk_level"]

    triggers = _get_rule_triggers(feat_row, db)
    pattern = _detect_fraud_pattern(triggers)
    priority = _investigation_priority(risk_level)
    breakdown = _risk_breakdown(r_norm, a_norm)

    # Composite Intelligence Layer
    composite_index = _compute_composite_index(final)
    threat_level = _classify_threat_level(composite_index, db)
    claim_amount_zscore = float(feat_row.get("claim_amount_zscore", 0.0))
    confidence_score = _compute_confidence(a_norm, triggers, claim_amount_zscore)
    signal_vector = _build_signal_vector(r_norm, a_norm, triggers)
    knowledge_signals = _build_knowledge_signals(triggers, a_norm)
    enforcement_state = _compute_enforcement_state(threat_level, confidence_score)
    is_hard_stop = enforcement_state == "HARD_STOP"

    # --- Strict Integrity Assertions ---
    if composite_index != round(final * 100):
        logger.critical(f"Integrity Error: composite_index={composite_index}, final={final}")
        raise RuntimeError("COMPUTATION_INTEGRITY_MISMATCH: composite_index")
    
    expected_threat = _classify_threat_level(composite_index, db)
    if threat_level != expected_threat:
        logger.critical(f"Integrity Error: threat_level={threat_level}, expected={expected_threat}")
        raise RuntimeError("COMPUTATION_INTEGRITY_MISMATCH: threat_level")

    if not (0 <= confidence_score <= 100):
        logger.critical(f"Integrity Error: confidence_score={confidence_score}")
        raise RuntimeError("COMPUTATION_INTEGRITY_MISMATCH: confidence_score bounds")
        
    recomputed_confidence = _compute_confidence(a_norm, triggers, claim_amount_zscore)
    if confidence_score != recomputed_confidence:
        logger.critical(f"Integrity Error: confidence={confidence_score}, recomputed={recomputed_confidence}")
        raise RuntimeError("COMPUTATION_INTEGRITY_MISMATCH: confidence_score deterministic mismatch")

    # --- Debug Telemetry ---
    debug_payload = {
        "claim_id": claim_id,
        "final_risk_score": final,
        "computed_composite_index": composite_index,
        "classified_threat_level": threat_level,
        "anomaly_score_norm": a_norm,
        "rule_score_norm": r_norm,
        "confidence_score": confidence_score,
        "rule_trigger_count": sum(triggers.values()),
    }
    logger.info("INTELLIGENCE_DEBUG", extra=debug_payload)
    
    # Write to discrete file for verification
    import json
    with open("intelligence_debug.jsonl", "a") as df:
        df.write(json.dumps(debug_payload) + "\n")

    explanation = _generate_explanation(
        triggers, pattern, risk_level, a_norm,
        composite_index, threat_level, confidence_score, enforcement_state
    )

    logger.info(
        "Claim scored",
        extra={
            "claim_id": claim_id,
            "composite_index": composite_index,
            "threat_level": threat_level,
            "confidence_score": confidence_score,
            "enforcement_state": enforcement_state,
        },
    )

    crud.insert_fraud_analysis(db, {
        "claim_id": claim_id,
        "anomaly_score_norm": a_norm,
        "rule_score_norm": r_norm,
        "final_risk_score": final,
        "risk_level": risk_level,
        "fraud_pattern_detected": pattern,
        "investigation_priority": priority,
        "rule_triggers": triggers,
        "risk_breakdown": breakdown,
        "explanation": explanation,
        # New
        "composite_index": composite_index,
        "threat_level": threat_level,
        "confidence_score": float(confidence_score),
        "enforcement_state": enforcement_state,
        "signal_vector": signal_vector,
        "knowledge_signals": knowledge_signals,
        "hard_stop": is_hard_stop,
    })

    db.commit()

    return {
        "claim_id": claim_id,
        # Legacy
        "anomaly_score_norm": a_norm,
        "rule_score_norm": r_norm,
        "final_risk_score": final,
        "risk_level": risk_level,
        "risk_breakdown": breakdown,
        "rule_triggers": triggers,
        "fraud_pattern_detected": pattern,
        "investigation_priority": priority,
        "explanation": explanation,
        # New
        "composite_index": composite_index,
        "threat_level": threat_level,
        "confidence_score": confidence_score,
        "enforcement_state": enforcement_state,
        "signal_vector": signal_vector,
        "knowledge_signals": knowledge_signals,
    }
