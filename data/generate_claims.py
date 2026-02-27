import numpy as np
import pandas as pd
import random
from datetime import date, timedelta

random.seed(42)
np.random.seed(42)

START_DATE = date(2024, 1, 1)
HOSPITALS = [f"H{i}" for i in range(1, 11)]
PROCEDURES = [f"P{i}" for i in range(1, 9)]
PATIENTS = [f"PAT{str(i).zfill(4)}" for i in range(1, 301)]

PACKAGE_RATES = {
    "P1": 8000,
    "P2": 15000,
    "P3": 25000,
    "P4": 40000,
    "P5": 55000,
    "P6": 70000,
    "P7": 80000,
    "P8": 5000,
}

INPATIENT_PROCEDURES = {"P3", "P4", "P5", "P6", "P7"}

def random_date(start, days=90):
    return start + timedelta(days=random.randint(0, days - 1))

def make_claim(claim_id, hospital_id, patient_id, procedure_code, adm_date, amount_factor=None):
    pkg = PACKAGE_RATES[procedure_code]
    is_inpatient = 1 if procedure_code in INPATIENT_PROCEDURES else 0
    stay = random.randint(2, 7) if is_inpatient else random.randint(0, 1)
    discharge_date = adm_date + timedelta(days=stay)
    factor = amount_factor if amount_factor is not None else random.uniform(0.6, 1.0)
    claim_amount = round(pkg * factor, 2)
    return {
        "claim_id": claim_id,
        "hospital_id": hospital_id,
        "patient_id": patient_id,
        "procedure_code": procedure_code,
        "package_rate": pkg,
        "claim_amount": claim_amount,
        "admission_date": adm_date,
        "discharge_date": discharge_date,
        "is_inpatient": is_inpatient,
    }

records = []
claim_counter = 1
hosp_counts = {h: 0 for h in HOSPITALS}
proc_counts = {p: 0 for p in PROCEDURES}

TARGET_BASE = 205

while len(records) < TARGET_BASE:
    low_hosp = [h for h in HOSPITALS if hosp_counts[h] < 15]
    low_proc = [p for p in PROCEDURES if proc_counts[p] < 20]
    proc = random.choice(low_proc) if low_proc else random.choice(PROCEDURES)
    hosp = random.choice(low_hosp) if low_hosp else random.choice(HOSPITALS)
    patient = random.choice(PATIENTS)
    adm = random_date(START_DATE)
    rec = make_claim(f"CLM{claim_counter:04d}", hosp, patient, proc, adm)
    records.append(rec)
    hosp_counts[hosp] += 1
    proc_counts[proc] += 1
    claim_counter += 1

# ── UPCODING: 18 claims ──────────────────────────────────────────────────────
UPCODING_HOSPITALS = ["H1", "H2"]
for i in range(18):
    hosp = UPCODING_HOSPITALS[i % 2] if i < 11 else random.choice([h for h in HOSPITALS if h not in UPCODING_HOSPITALS])
    proc = random.choice(list(INPATIENT_PROCEDURES))
    patient = random.choice(PATIENTS)
    adm = random_date(START_DATE)
    rec = make_claim(f"CLM{claim_counter:04d}", hosp, patient, proc, adm, amount_factor=random.uniform(1.3, 2.0))
    records.append(rec)
    hosp_counts[hosp] += 1
    proc_counts[proc] += 1
    claim_counter += 1

# ── PHANTOM BILLING: 16 claims (4 clusters of 4, same hospital + same date) ─
phantom_clusters = [
    ("H3", START_DATE + timedelta(days=10), 4),
    ("H4", START_DATE + timedelta(days=25), 4),
    ("H5", START_DATE + timedelta(days=40), 4),
    ("H3", START_DATE + timedelta(days=55), 4),
]
for hosp, cluster_date, cluster_size in phantom_clusters:
    for _ in range(cluster_size):
        proc = random.choice(list(INPATIENT_PROCEDURES))
        patient = random.choice(PATIENTS)
        pkg = PACKAGE_RATES[proc]
        claim_amount = round(pkg * random.uniform(0.6, 1.0), 2)
        records.append({
            "claim_id": f"CLM{claim_counter:04d}",
            "hospital_id": hosp,
            "patient_id": patient,
            "procedure_code": proc,
            "package_rate": pkg,
            "claim_amount": claim_amount,
            "admission_date": cluster_date,
            "discharge_date": cluster_date,
            "is_inpatient": 1,
        })
        hosp_counts[hosp] += 1
        proc_counts[proc] += 1
        claim_counter += 1

# ── REPEAT ABUSE: 11 claims (3 patients: 4 + 4 + 3) ─────────────────────────
# Patient 1 -> H6: 1 base + 3 repeats = 4 claims
# Patient 2 -> H7: 1 base + 3 repeats = 4 claims
# Patient 3 -> H8: 1 base + 2 repeats = 3 claims
REPEAT_CONFIG = [
    ("H6", 3),
    ("H7", 3),
    ("H8", 2),
]
repeat_patients = random.sample(PATIENTS, 3)

for pat, (hosp, num_repeats) in zip(repeat_patients, REPEAT_CONFIG):
    proc = random.choice(list(INPATIENT_PROCEDURES))
    adm = random_date(START_DATE, 50)
    factor = random.uniform(0.6, 1.0)
    base_rec = make_claim(f"CLM{claim_counter:04d}", hosp, pat, proc, adm, amount_factor=factor)
    records.append(base_rec)
    hosp_counts[hosp] += 1
    proc_counts[proc] += 1
    claim_counter += 1

    prev_adm = adm
    prev_amt = base_rec["claim_amount"]
    stay = (base_rec["discharge_date"] - base_rec["admission_date"]).days

    for _ in range(num_repeats):
        new_adm = prev_adm + timedelta(days=random.randint(3, 15))
        new_amt = round(prev_amt * random.uniform(0.95, 1.05), 2)
        records.append({
            "claim_id": f"CLM{claim_counter:04d}",
            "hospital_id": hosp,
            "patient_id": pat,
            "procedure_code": proc,
            "package_rate": PACKAGE_RATES[proc],
            "claim_amount": new_amt,
            "admission_date": new_adm,
            "discharge_date": new_adm + timedelta(days=stay),
            "is_inpatient": 1,
        })
        hosp_counts[hosp] += 1
        proc_counts[proc] += 1
        claim_counter += 1
        prev_adm = new_adm
        prev_amt = new_amt

df_claims = pd.DataFrame(records).reset_index(drop=True)
df_claims["claim_id"] = [f"CLM{str(i+1).zfill(4)}" for i in range(len(df_claims))]
df_claims = df_claims[[
    "claim_id", "hospital_id", "patient_id", "procedure_code",
    "package_rate", "claim_amount", "admission_date", "discharge_date", "is_inpatient"
]]
