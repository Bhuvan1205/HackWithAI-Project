import numpy as np
import pandas as pd
from datetime import timedelta

INPATIENT_PROCEDURES = {"P3", "P4", "P5", "P6", "P7"}


def compute_features(df_claims: pd.DataFrame) -> pd.DataFrame:
    df = df_claims.copy()
    df["admission_date"] = pd.to_datetime(df["admission_date"])
    df["discharge_date"] = pd.to_datetime(df["discharge_date"])
    df = df.sort_values("admission_date").reset_index(drop=True)

    df["stay_duration_days"] = (df["discharge_date"] - df["admission_date"]).dt.days
    df["claim_to_package_ratio"] = df["claim_amount"] / df["package_rate"]

    proc_stats = df.groupby("procedure_code")["claim_amount"].agg(["mean", "std"]).rename(
        columns={"mean": "proc_mean", "std": "proc_std"}).fillna(0)
    df = df.join(proc_stats, on="procedure_code")
    df["proc_std"] = df["proc_std"].fillna(0)
    df["claim_amount_zscore"] = (
        (df["claim_amount"] - df["proc_mean"]) / (df["proc_std"] + 1e-6)
    ).fillna(0)
    df.drop(columns=["proc_mean", "proc_std"], inplace=True)

    df["days_since_last_claim"] = (
        df.groupby("patient_id")["admission_date"].transform(lambda s: s.diff().dt.days)
    ).fillna(365)

    freq_map = {}
    for pat, grp in df.groupby("patient_id"):
        grp = grp.sort_values("admission_date")
        for i, row in grp.iterrows():
            ws = row["admission_date"] - timedelta(days=30)
            freq_map[i] = int(((grp["admission_date"] >= ws) & (grp["admission_date"] < row["admission_date"])).sum())
    df["patient_claim_freq_30d"] = [freq_map.get(i, 0) for i in df.index]

    df["claim_date"] = df["admission_date"].dt.date
    hosp_daily = df.groupby(["hospital_id", "claim_date"]).size().reset_index(name="daily_count")
    hosp_stats = hosp_daily.groupby("hospital_id")["daily_count"].agg(["mean", "std"]).rename(
        columns={"mean": "hosp_mean", "std": "hosp_std"})
    hosp_daily = hosp_daily.join(hosp_stats, on="hospital_id")
    hosp_daily["hosp_std"] = hosp_daily["hosp_std"].fillna(0)
    hosp_daily["hosp_vol_zscore"] = (
        (hosp_daily["daily_count"] - hosp_daily["hosp_mean"]) / (hosp_daily["hosp_std"] + 1e-6)
    )
    df = df.merge(hosp_daily[["hospital_id", "claim_date", "hosp_vol_zscore"]],
                  on=["hospital_id", "claim_date"], how="left")
    df["hospital_claim_volume_zscore"] = df["hosp_vol_zscore"].fillna(0)
    df.drop(columns=["hosp_vol_zscore", "claim_date"], inplace=True)

    df["hospital_cost_deviation_index"] = (
        df.groupby("hospital_id")["claim_amount_zscore"]
        .transform(lambda s: s.expanding().mean().shift(1))
        .fillna(0)
    )

    dev_map = {}
    for pat, grp in df.groupby("patient_id"):
        grp = grp.sort_values("admission_date")
        last_amt = {}
        for i, row in grp.iterrows():
            key = row["procedure_code"]
            dev_map[i] = abs(row["claim_amount"] - last_amt[key]) / last_amt[key] if key in last_amt else 1.0
            last_amt[key] = row["claim_amount"]
    df["repeat_claim_amount_deviation"] = [float(dev_map.get(i, 1.0)) for i in df.index]

    df["is_zero_day_stay"] = (df["stay_duration_days"] == 0).astype(int)
    q75 = df["package_rate"].quantile(0.75)
    df["is_high_cost_procedure"] = (df["package_rate"] >= q75).astype(int)

    repeat_map = {}
    for pat, grp in df.groupby("patient_id"):
        grp = grp.sort_values("admission_date")
        for i, row in grp.iterrows():
            ws = row["admission_date"] - timedelta(days=30)
            prior = grp[(grp["admission_date"] >= ws) &
                        (grp["admission_date"] < row["admission_date"]) &
                        (grp["procedure_code"] == row["procedure_code"])]
            repeat_map[i] = 1 if len(prior) > 0 else 0
    df["same_proc_repeat_flag"] = [repeat_map.get(i, 0) for i in df.index]

    hosp_flag_map = {}
    for pat, grp in df.groupby("patient_id"):
        grp = grp.sort_values("admission_date")
        for i, row in grp.iterrows():
            ws = row["admission_date"] - timedelta(days=15)
            prior_hosps = grp[(grp["admission_date"] >= ws) &
                              (grp["admission_date"] < row["admission_date"])]["hospital_id"].unique()
            hosp_flag_map[i] = 1 if len(prior_hosps) > 1 else 0
    df["patient_multi_hospital_flag"] = [hosp_flag_map.get(i, 0) for i in df.index]

    return df[[
        "claim_id", "hospital_id", "patient_id", "procedure_code",
        "package_rate", "claim_amount", "admission_date", "discharge_date", "is_inpatient",
        "claim_amount_zscore", "stay_duration_days", "claim_to_package_ratio",
        "patient_claim_freq_30d", "days_since_last_claim", "hospital_claim_volume_zscore",
        "hospital_cost_deviation_index", "repeat_claim_amount_deviation",
        "is_zero_day_stay", "same_proc_repeat_flag", "is_high_cost_procedure",
        "patient_multi_hospital_flag",
    ]]
