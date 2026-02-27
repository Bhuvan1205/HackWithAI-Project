import numpy as np
import pandas as pd
from datetime import timedelta

df_features = df_claims.copy()
df_features["admission_date"] = pd.to_datetime(df_features["admission_date"])
df_features["discharge_date"] = pd.to_datetime(df_features["discharge_date"])
df_features = df_features.sort_values("admission_date").reset_index(drop=True)

df_features["stay_duration_days"] = (
    df_features["discharge_date"] - df_features["admission_date"]
).dt.days

df_features["claim_to_package_ratio"] = (
    df_features["claim_amount"] / df_features["package_rate"]
)

proc_stats = df_features.groupby("procedure_code")["claim_amount"].agg(["mean", "std"]).rename(
    columns={"mean": "proc_mean", "std": "proc_std"}
)
df_features = df_features.join(proc_stats, on="procedure_code")
df_features["proc_std"] = df_features["proc_std"].fillna(0)
df_features["claim_amount_zscore"] = (
    (df_features["claim_amount"] - df_features["proc_mean"]) /
    (df_features["proc_std"] + 1e-6)
).fillna(0)
df_features.drop(columns=["proc_mean", "proc_std"], inplace=True)

df_features["days_since_last_claim"] = (
    df_features.groupby("patient_id")["admission_date"]
    .transform(lambda s: s.diff().dt.days)
)
df_features["days_since_last_claim"] = df_features["days_since_last_claim"].fillna(365)

def patient_claim_freq_30d(group):
    group = group.sort_values("admission_date")
    result = []
    for i, row in group.iterrows():
        window_start = row["admission_date"] - timedelta(days=30)
        count = ((group["admission_date"] >= window_start) &
                 (group["admission_date"] < row["admission_date"])).sum()
        result.append((i, count))
    return pd.Series(dict(result))

freq_series = df_features.groupby("patient_id").apply(
    lambda g: patient_claim_freq_30d(g), include_groups=False
).explode()
freq_series.index = freq_series.index.get_level_values(1)
df_features["patient_claim_freq_30d"] = freq_series.reindex(df_features.index).astype(int)

df_features["claim_date"] = df_features["admission_date"].dt.date
hosp_daily = (
    df_features.groupby(["hospital_id", "claim_date"])
    .size()
    .reset_index(name="daily_count")
)
hosp_stats = hosp_daily.groupby("hospital_id")["daily_count"].agg(["mean", "std"]).rename(
    columns={"mean": "hosp_mean", "std": "hosp_std"}
)
hosp_daily = hosp_daily.join(hosp_stats, on="hospital_id")
hosp_daily["hosp_std"] = hosp_daily["hosp_std"].fillna(0)
hosp_daily["hosp_vol_zscore"] = (
    (hosp_daily["daily_count"] - hosp_daily["hosp_mean"]) /
    (hosp_daily["hosp_std"] + 1e-6)
)
df_features = df_features.merge(
    hosp_daily[["hospital_id", "claim_date", "hosp_vol_zscore"]],
    on=["hospital_id", "claim_date"],
    how="left"
)
df_features["hospital_claim_volume_zscore"] = df_features["hosp_vol_zscore"].fillna(0)
df_features.drop(columns=["hosp_vol_zscore", "claim_date"], inplace=True)

df_features["hospital_cost_deviation_index"] = (
    df_features.groupby("hospital_id")["claim_amount_zscore"]
    .transform(lambda s: s.expanding().mean().shift(1))
    .fillna(0)
)

def repeat_deviation(group):
    group = group.sort_values("admission_date")
    result = {}
    last_amt = {}
    for i, row in group.iterrows():
        key = row["procedure_code"]
        if key in last_amt:
            dev = abs(row["claim_amount"] - last_amt[key]) / last_amt[key]
        else:
            dev = 1.0
        result[i] = dev
        last_amt[key] = row["claim_amount"]
    return pd.Series(result)

dev_series = df_features.groupby("patient_id").apply(repeat_deviation, include_groups=False).explode()
dev_series.index = dev_series.index.get_level_values(1)
df_features["repeat_claim_amount_deviation"] = (
    dev_series.reindex(df_features.index).astype(float).fillna(1.0)
)

df_features["is_zero_day_stay"] = (df_features["stay_duration_days"] == 0).astype(int)

q75 = df_features["package_rate"].quantile(0.75)
df_features["is_high_cost_procedure"] = (df_features["package_rate"] >= q75).astype(int)

def same_proc_repeat(group):
    group = group.sort_values("admission_date")
    result = {}
    for i, row in group.iterrows():
        window_start = row["admission_date"] - timedelta(days=30)
        prior = group[
            (group["admission_date"] >= window_start) &
            (group["admission_date"] < row["admission_date"]) &
            (group["procedure_code"] == row["procedure_code"])
        ]
        result[i] = 1 if len(prior) > 0 else 0
    return pd.Series(result)

repeat_flag = df_features.groupby("patient_id").apply(same_proc_repeat, include_groups=False).explode()
repeat_flag.index = repeat_flag.index.get_level_values(1)
df_features["same_proc_repeat_flag"] = (
    repeat_flag.reindex(df_features.index).astype(int).fillna(0)
)

def multi_hospital_flag(group):
    group = group.sort_values("admission_date")
    result = {}
    for i, row in group.iterrows():
        window_start = row["admission_date"] - timedelta(days=15)
        prior_hosps = group[
            (group["admission_date"] >= window_start) &
            (group["admission_date"] < row["admission_date"])
        ]["hospital_id"].unique()
        result[i] = 1 if len(prior_hosps) > 1 else 0
    return pd.Series(result)

hosp_flag = df_features.groupby("patient_id").apply(multi_hospital_flag, include_groups=False).explode()
hosp_flag.index = hosp_flag.index.get_level_values(1)
df_features["patient_multi_hospital_flag"] = (
    hosp_flag.reindex(df_features.index).astype(int).fillna(0)
)

df_features = df_features[[
    "claim_id", "hospital_id", "patient_id", "procedure_code",
    "package_rate", "claim_amount", "admission_date", "discharge_date", "is_inpatient",
    "claim_amount_zscore", "stay_duration_days", "claim_to_package_ratio",
    "patient_claim_freq_30d", "days_since_last_claim", "hospital_claim_volume_zscore",
    "hospital_cost_deviation_index", "repeat_claim_amount_deviation",
    "is_zero_day_stay", "same_proc_repeat_flag", "is_high_cost_procedure",
    "patient_multi_hospital_flag",
]]
