import numpy as np
import pandas as pd
import joblib
import os
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler

CONTINUOUS_FEATURES = [
    "claim_amount_zscore", "stay_duration_days", "claim_to_package_ratio",
    "patient_claim_freq_30d", "days_since_last_claim", "hospital_claim_volume_zscore",
    "hospital_cost_deviation_index", "repeat_claim_amount_deviation",
]
BINARY_FEATURES = [
    "is_zero_day_stay", "same_proc_repeat_flag", "is_high_cost_procedure", "patient_multi_hospital_flag",
]

_MODEL_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "data", "models")


def classify_risk(score: float) -> str:
    if score <= 0.30:
        return "LOW"
    elif score <= 0.60:
        return "MEDIUM"
    return "HIGH"


class FraudEngine:
    def __init__(self):
        self.iso_forest = None
        self.scaler = None
        self.A_min = None
        self.A_max = None
        self.feature_metadata = None

    def load(self):
        model_dir = os.path.abspath(_MODEL_DIR)
        required = ["isolation_forest.pkl", "scaler.pkl", "anomaly_metadata.pkl", "feature_metadata.pkl"]
        missing = [f for f in required if not os.path.exists(os.path.join(model_dir, f))]
        if missing:
            raise RuntimeError(f"Model artifacts missing: {missing}")
        try:
            self.iso_forest = joblib.load(os.path.join(model_dir, "isolation_forest.pkl"))
            self.scaler = joblib.load(os.path.join(model_dir, "scaler.pkl"))
            meta = joblib.load(os.path.join(model_dir, "anomaly_metadata.pkl"))
            self.A_min = meta["A_min"]
            self.A_max = meta["A_max"]
            self.feature_metadata = joblib.load(os.path.join(model_dir, "feature_metadata.pkl"))
        except Exception as exc:
            self.iso_forest = None
            raise RuntimeError(f"Failed to load model artifacts: {exc}") from exc

    @property
    def is_ready(self) -> bool:
        return self.iso_forest is not None


    def score_row(self, feat_row: pd.Series) -> dict:
        X_cont = self.scaler.transform(feat_row[CONTINUOUS_FEATURES].values.reshape(1, -1))
        X_bin = feat_row[BINARY_FEATURES].values.reshape(1, -1)
        X_inf = np.hstack([X_cont, X_bin])

        raw = self.iso_forest.score_samples(X_inf)
        denom = (self.A_max - self.A_min) if (self.A_max - self.A_min) != 0 else 1e-6
        a_norm = float(np.clip((self.A_max - raw) / denom, 0.0, 1.0)[0])

        r_raw = 0.0
        r_raw += 30.0 if (feat_row["is_zero_day_stay"] == 1 and feat_row["is_inpatient"] == 1) else 0.0
        r_raw += 25.0 if feat_row["claim_amount_zscore"] > 2.0 else 0.0
        r_raw += 20.0 if feat_row["same_proc_repeat_flag"] == 1 else 0.0
        r_raw += 15.0 if feat_row["claim_to_package_ratio"] > 0.95 else 0.0
        r_raw += 10.0 if feat_row["patient_claim_freq_30d"] >= 3 else 0.0
        r_norm = r_raw / 100.0

        final = 0.70 * r_norm + 0.30 * a_norm

        return {
            "anomaly_score_norm": round(a_norm, 6),
            "rule_score_norm": round(r_norm, 6),
            "final_risk_score": round(final, 6),
            "risk_level": classify_risk(final),
            "feat_row": feat_row,
        }


def get_fraud_engine() -> FraudEngine:
    """
    Factory function that creates and loads a FraudEngine instance.
    Used by seed_demo_entities and other callers that need a standalone engine
    (outside the FastAPI app.state lifecycle).
    """
    engine = FraudEngine()
    try:
        engine.load()
    except RuntimeError as exc:
        import logging
        logging.getLogger("risk_engine").warning(
            "get_fraud_engine: model artifacts not available (%s). "
            "Engine will operate in degraded mode.", exc
        )
    return engine

