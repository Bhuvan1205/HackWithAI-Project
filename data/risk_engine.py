import numpy as np
import pandas as pd
import joblib
import os
from datetime import timedelta
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler

CONTINUOUS_FEATURES = [
    "claim_amount_zscore",
    "stay_duration_days",
    "claim_to_package_ratio",
    "patient_claim_freq_30d",
    "days_since_last_claim",
    "hospital_claim_volume_zscore",
    "hospital_cost_deviation_index",
    "repeat_claim_amount_deviation",
]

BINARY_FEATURES = [
    "is_zero_day_stay",
    "same_proc_repeat_flag",
    "is_high_cost_procedure",
    "patient_multi_hospital_flag",
]

MODEL_DIR = os.path.join(
    os.path.dirname(os.path.abspath(__file__)) if "__file__" in dir() else os.path.join(os.getcwd(), "data"),
    "models"
)
os.makedirs(MODEL_DIR, exist_ok=True)

df_scored = df_features.copy()

proc_stats = (
    df_scored.groupby("procedure_code")["claim_amount"]
    .agg(["mean", "std"])
    .rename(columns={"mean": "proc_mean", "std": "proc_std"})
    .fillna(0)
)
proc_stats["proc_std"] = proc_stats["proc_std"].fillna(0)

hosp_daily = (
    df_scored.assign(claim_date=pd.to_datetime(df_scored["admission_date"]).dt.date)
    .groupby(["hospital_id", "claim_date"])
    .size()
    .reset_index(name="daily_count")
)
hosp_vol_stats = (
    hosp_daily.groupby("hospital_id")["daily_count"]
    .agg(["mean", "std"])
    .rename(columns={"mean": "hosp_vol_mean", "std": "hosp_vol_std"})
    .fillna(0)
)

hosp_cost_stats = (
    df_scored.groupby("hospital_id")["claim_amount_zscore"]
    .mean()
    .rename("hosp_cost_mean")
    .fillna(0)
    .to_frame()
)

package_rate_q75 = float(df_scored["package_rate"].quantile(0.75))

feature_metadata = {
    "proc_stats": proc_stats.to_dict(),
    "hosp_vol_stats": hosp_vol_stats.to_dict(),
    "hosp_cost_stats": hosp_cost_stats.to_dict(),
    "package_rate_q75": package_rate_q75,
}
joblib.dump(feature_metadata, os.path.join(MODEL_DIR, "feature_metadata.pkl"))

scaler = StandardScaler()
X_continuous = scaler.fit_transform(df_scored[CONTINUOUS_FEATURES])
X_binary = df_scored[BINARY_FEATURES].values
X = np.hstack([X_continuous, X_binary])

iso_forest = IsolationForest(n_estimators=200, contamination=0.18, random_state=42)
iso_forest.fit(X)
raw_scores = iso_forest.score_samples(X)

A_min = raw_scores.min()
A_max = raw_scores.max()
A_norm = (A_max - raw_scores) / ((A_max - A_min) if (A_max - A_min) != 0 else 1e-6)
A_norm = np.clip(A_norm, 0.0, 1.0)

R_raw = np.zeros(len(df_scored))
R_raw += 30 * ((df_scored["is_zero_day_stay"] == 1) & (df_scored["is_inpatient"] == 1)).astype(int)
R_raw += 25 * (df_scored["claim_amount_zscore"] > 2.0).astype(int)
R_raw += 20 * (df_scored["same_proc_repeat_flag"] == 1).astype(int)
R_raw += 15 * (df_scored["claim_to_package_ratio"] > 0.95).astype(int)
R_raw += 10 * (df_scored["patient_claim_freq_30d"] >= 3).astype(int)
R_norm = R_raw / 100.0

final_risk_score = 0.70 * R_norm + 0.30 * A_norm


def classify_risk(score):
    if score <= 0.30:
        return "LOW"
    elif score <= 0.60:
        return "MEDIUM"
    else:
        return "HIGH"


df_scored["anomaly_score_norm"] = A_norm
df_scored["rule_score_norm"] = R_norm
df_scored["final_risk_score"] = final_risk_score
df_scored["risk_level"] = df_scored["final_risk_score"].apply(classify_risk)

joblib.dump(iso_forest, os.path.join(MODEL_DIR, "isolation_forest.pkl"))
joblib.dump(scaler, os.path.join(MODEL_DIR, "scaler.pkl"))
joblib.dump({"A_min": float(A_min), "A_max": float(A_max)}, os.path.join(MODEL_DIR, "anomaly_metadata.pkl"))

_loaded_iso = joblib.load(os.path.join(MODEL_DIR, "isolation_forest.pkl"))
_loaded_scaler = joblib.load(os.path.join(MODEL_DIR, "scaler.pkl"))
_loaded_meta = joblib.load(os.path.join(MODEL_DIR, "anomaly_metadata.pkl"))
_loaded_A_min = _loaded_meta["A_min"]
_loaded_A_max = _loaded_meta["A_max"]
_loaded_feature_meta = joblib.load(os.path.join(MODEL_DIR, "feature_metadata.pkl"))


def transform_claim(df_input: pd.DataFrame) -> pd.DataFrame:
    df = df_input.copy()
    df["admission_date"] = pd.to_datetime(df["admission_date"])
    df["discharge_date"] = pd.to_datetime(df["discharge_date"])
    df = df.sort_values("admission_date").reset_index(drop=True)

    pm = _loaded_feature_meta["proc_stats"]
    proc_mean_map = pm["proc_mean"]
    proc_std_map = pm["proc_std"]

    df["stay_duration_days"] = (df["discharge_date"] - df["admission_date"]).dt.days

    df["claim_to_package_ratio"] = df["claim_amount"] / df["package_rate"]

    df["claim_amount_zscore"] = df.apply(
        lambda r: (r["claim_amount"] - proc_mean_map.get(r["procedure_code"], r["claim_amount"])) /
                  (proc_std_map.get(r["procedure_code"], 0) + 1e-6),
        axis=1
    ).fillna(0)

    hv = _loaded_feature_meta["hosp_vol_stats"]
    hosp_vol_mean_map = hv["hosp_vol_mean"]
    hosp_vol_std_map = hv["hosp_vol_std"]

    df["claim_date"] = df["admission_date"].dt.date
    daily_count_map = df.groupby(["hospital_id", "claim_date"]).size().to_dict()
    df["_daily_count"] = df.apply(lambda r: daily_count_map.get((r["hospital_id"], r["claim_date"]), 1), axis=1)
    df["hospital_claim_volume_zscore"] = df.apply(
        lambda r: (r["_daily_count"] - hosp_vol_mean_map.get(r["hospital_id"], r["_daily_count"])) /
                  (hosp_vol_std_map.get(r["hospital_id"], 0) + 1e-6),
        axis=1
    ).fillna(0)
    df.drop(columns=["_daily_count", "claim_date"], inplace=True)

    hc = _loaded_feature_meta["hosp_cost_stats"]
    hosp_cost_mean_map = hc["hosp_cost_mean"]
    df["hospital_cost_deviation_index"] = df["hospital_id"].map(hosp_cost_mean_map).fillna(0)

    df["days_since_last_claim"] = (
        df.groupby("patient_id")["admission_date"].transform(lambda s: s.diff().dt.days)
    ).fillna(365)

    df["patient_claim_freq_30d"] = df.groupby("patient_id")["admission_date"].transform(
        lambda s: s.expanding().count() - 1
    ).astype(int)

    df["repeat_claim_amount_deviation"] = 1.0
    for pat, grp in df.groupby("patient_id"):
        grp = grp.sort_values("admission_date")
        last_amt = {}
        for i, row in grp.iterrows():
            key = row["procedure_code"]
            if key in last_amt:
                df.at[i, "repeat_claim_amount_deviation"] = abs(row["claim_amount"] - last_amt[key]) / last_amt[key]
            last_amt[key] = row["claim_amount"]

    df["is_zero_day_stay"] = (df["stay_duration_days"] == 0).astype(int)

    q75 = _loaded_feature_meta["package_rate_q75"]
    df["is_high_cost_procedure"] = (df["package_rate"] >= q75).astype(int)

    df["same_proc_repeat_flag"] = 0
    for pat, grp in df.groupby("patient_id"):
        grp = grp.sort_values("admission_date")
        for i, row in grp.iterrows():
            window_start = row["admission_date"] - timedelta(days=30)
            prior = grp[
                (grp["admission_date"] >= window_start) &
                (grp["admission_date"] < row["admission_date"]) &
                (grp["procedure_code"] == row["procedure_code"])
            ]
            if len(prior) > 0:
                df.at[i, "same_proc_repeat_flag"] = 1

    df["patient_multi_hospital_flag"] = 0
    for pat, grp in df.groupby("patient_id"):
        grp = grp.sort_values("admission_date")
        for i, row in grp.iterrows():
            window_start = row["admission_date"] - timedelta(days=15)
            prior_hosps = grp[
                (grp["admission_date"] >= window_start) &
                (grp["admission_date"] < row["admission_date"])
            ]["hospital_id"].unique()
            if len(prior_hosps) > 1:
                df.at[i, "patient_multi_hospital_flag"] = 1

    return df


def score_new_claim(df_input: pd.DataFrame) -> pd.DataFrame:
    df_transformed = transform_claim(df_input)

    X_cont = _loaded_scaler.transform(df_transformed[CONTINUOUS_FEATURES])
    X_bin = df_transformed[BINARY_FEATURES].values
    X_inf = np.hstack([X_cont, X_bin])

    raw = _loaded_iso.score_samples(X_inf)
    denom = (_loaded_A_max - _loaded_A_min) if (_loaded_A_max - _loaded_A_min) != 0 else 1e-6
    a_norm = (_loaded_A_max - raw) / denom
    a_norm = np.clip(a_norm, 0.0, 1.0)

    r_raw = np.zeros(len(df_transformed))
    r_raw += 30 * ((df_transformed["is_zero_day_stay"] == 1) & (df_transformed["is_inpatient"] == 1)).astype(int)
    r_raw += 25 * (df_transformed["claim_amount_zscore"] > 2.0).astype(int)
    r_raw += 20 * (df_transformed["same_proc_repeat_flag"] == 1).astype(int)
    r_raw += 15 * (df_transformed["claim_to_package_ratio"] > 0.95).astype(int)
    r_raw += 10 * (df_transformed["patient_claim_freq_30d"] >= 3).astype(int)
    r_norm = r_raw / 100.0

    final = 0.70 * r_norm + 0.30 * a_norm

    result = df_input.copy().reset_index(drop=True)
    result["anomaly_score_norm"] = a_norm
    result["rule_score_norm"] = r_norm
    result["final_risk_score"] = final
    result["risk_level"] = pd.Series(final).apply(classify_risk).values

    return result[["anomaly_score_norm", "rule_score_norm", "final_risk_score", "risk_level"]]
