# Fraud Intelligence Specification v2.1 — PM-JAY Claims Anomaly Detection

---

## SECTION 1: Fraud Categories

### Category 1: Phantom Billing (Ghost Claims)

**Definition:** Claims submitted for procedures never actually rendered to the patient.

**Behavioral Pattern:** Hospital submits claims with zero or near-zero stay durations for procedures clinically requiring hospitalization, often with abnormally high claim volumes relative to hospital size.

**Detection Signals:**
1. **Continuous:** `stay_duration_days` = 0 for procedures with expected stay ≥ 1 day.
2. **Continuous:** Hospital's claim volume deviates significantly from its own historical mean (epsilon-stabilized z-score).
3. **Rule-trigger:** `is_zero_day_stay == 1` for inpatient procedure codes.

---

### Category 2: Upcoding (Cost Inflation)

**Definition:** Billing for a costlier procedure than performed, inflating the claimed amount beyond the expected package rate.

**Behavioral Pattern:** Claimed amounts for a procedure code consistently exceed the dataset-wide mean. Hospital systematically bills near or above the package ceiling.

**Detection Signals:**
1. **Continuous:** Claim amount z-score (epsilon-stabilized) relative to same procedure code is > 2.0.
2. **Continuous:** Hospital-level cost deviation index is elevated across its claim portfolio.
3. **Rule-trigger:** `claim_to_package_ratio > 0.95`.

---

### Category 3: Repeat Abuse (Unnecessary Re-admissions)

**Definition:** Multiple claims for the same patient-procedure combination within a clinically unjustifiable window.

**Behavioral Pattern:** A patient is re-admitted for the same procedure within a short timeframe, with near-identical claim amounts — indicating fabricated re-admissions or procedure splitting.

**Detection Signals:**
1. **Continuous:** `days_since_last_claim` < 7 for same patient.
2. **Continuous:** `patient_claim_freq_30d` ≥ 3.
3. **Rule-trigger:** `same_proc_repeat_flag == 1` (same patient + procedure within 30 days).

---

## SECTION 2: Engineered Features (12 Total)

### Feature Type Distribution

**8 continuous numeric + 4 binary.** Isolation Forest relies on continuous variance to construct meaningful split boundaries. Binary features contribute limited information gain per tree split. Capping binary features at 4 (33%) ensures the model's anomaly scoring is driven primarily by continuous distributional deviations rather than sparse binary signals, which is critical for stable performance on 200–300 row datasets.

### Z-Score Stabilization Protocol

All z-score features use epsilon-stabilized division: **z = (x − mean) / (std + 1e-6)**. This prevents division-by-zero when a procedure code or hospital has zero variance (e.g., single-claim procedure groups in small datasets).

### Feature Definitions

| # | Feature Name | Type | Computation Logic | Fraud Relevance | Normal → Fraud |
|---|---|---|---|---|---|
| 1 | `claim_amount_zscore` | Continuous | `(claim_amt − proc_code_mean) / (proc_code_std + 1e-6)` | Upcoding | \|z\| < 1.5 → z > 2.0 |
| 2 | `stay_duration_days` | Continuous | `discharge_date − admission_date` (days) | Phantom | 1–7 → 0 |
| 3 | `claim_to_package_ratio` | Continuous | `claim_amount / procedure_package_rate` | Upcoding | 0.5–0.9 → > 0.95 |
| 4 | `patient_claim_freq_30d` | Continuous | Count of claims per `patient_id` in trailing 30-day window | Repeat Abuse | 1 → ≥ 3 |
| 5 | `days_since_last_claim` | Continuous | Days between current and previous claim for same patient; set to 365 if no prior claim | Repeat, Phantom | > 30 → < 7 |
| 6 | `hospital_claim_volume_zscore` | Continuous | `(hosp_daily_count − hosp_mean_daily) / (hosp_std_daily + 1e-6)` | Phantom | \|z\| < 1.5 → z > 2.5 |
| 7 | `hospital_cost_deviation_index` | Continuous | Mean of `claim_amount_zscore` across all claims for a hospital | Upcoding, Phantom | −0.5–0.5 → > 1.0 |
| 8 | `repeat_claim_amount_deviation` | Continuous | `\|current_amt − prev_amt\| / prev_amt` for same patient-procedure pair. **If no prior same-patient claim exists, set to 1.0** (maximum deviation) to prevent false low-deviation signals in genuinely first-visit normal cases | Repeat Abuse | > 0.3 → < 0.10 |
| 9 | `is_zero_day_stay` | Binary | 1 if `stay_duration_days == 0` | Phantom | ~5% → > 50% |
| 10 | `same_proc_repeat_flag` | Binary | 1 if same `patient_id` + `procedure_code` within 30 days | Repeat Abuse | ~2% → > 40% |
| 11 | `is_high_cost_procedure` | Binary | 1 if procedure's package rate is in top 25% of all procedure codes | Upcoding | ~25% → > 60% |
| 12 | `patient_multi_hospital_flag` | Binary | 1 if patient visited > 1 hospital within 15 days | Repeat Abuse | ~3% → > 25% |

---

## SECTION 3: Risk Aggregation Framework

### Step 1 — Normalized Rule Score (R_norm)

| Rule Condition | Points |
|---|---|
| `is_zero_day_stay == 1` for inpatient procedure | +30 |
| `claim_amount_zscore > 2.0` | +25 |
| `same_proc_repeat_flag == 1` | +20 |
| `claim_to_package_ratio > 0.95` | +15 |
| `patient_claim_freq_30d >= 3` | +10 |

**R_raw = sum of triggered points** (max = 100)
**R_norm = R_raw / 100** → scaled to [0, 1]

### Step 2 — Normalized Anomaly Score (A_norm)

Run Isolation Forest on all 12 features. Use `score_samples()` output:

**A_norm = (A_max − score) / (A_max − A_min)**

**Critical:** A_max and A_min must be computed **once during model training** on the training dataset and stored as model parameters. During inference, the same A_max/A_min values are reused — they are never recomputed per-request. This prevents score drift and ensures consistent risk classification across all inference calls.

Result clamped to [0, 1] after scaling. Higher = more anomalous.

### Step 3 — Combined Risk Score

**Final = 0.70 × R_norm + 0.30 × A_norm**

| Final Score | Risk Level | Action |
|---|---|---|
| 0.00 – 0.30 | **LOW** | Auto-approve |
| 0.31 – 0.60 | **MEDIUM** | Queue for manual review |
| 0.61 – 1.00 | **HIGH** | Flag + escalate |

**Rationale for 70/30:** On 200–300 rows, Isolation Forest produces noisy decision boundaries. Heavier rule weight ensures known fraud patterns dominate scoring while the anomaly model surfaces novel outliers. 0–1 normalization of both components prevents scale mismatch.

---

## SECTION 4: Controlled Synthetic Fraud Injection Strategy

**Target:** 15–20% of dataset (~35–55 claims out of 250).

### Synthetic Data Stability Guardrails

Before fraud injection, the base dataset must satisfy:
1. **Each hospital must have ≥ 15 claims.** This ensures `hospital_claim_volume_zscore` and `hospital_cost_deviation_index` have sufficient sample size for meaningful standard deviation.
2. **Each procedure code must appear ≥ 20 times.** This ensures `claim_amount_zscore` has a stable mean/std per group and avoids degenerate z-scores.
3. **Fraud claims must be distributed across ≥ 3 hospitals.** This prevents the model from learning a single-hospital artifact and ensures `hospital_cost_deviation_index` captures a pattern rather than an outlier.

### Injection by Fraud Type

| Fraud Type | % of Fraud Cases | Injection Method |
|---|---|---|
| Phantom Billing | ~35% | Set `stay_duration = 0` for inpatient procedures; cluster 3–5 claims on same hospital-date |
| Upcoding | ~40% | Multiply `claim_amount` by 1.5–2.5× for selected claims; concentrate in 2–3 hospitals |
| Repeat Abuse | ~25% | Duplicate patient-procedure pairs within 7–15 day windows; keep amounts within ±5% |

- **Phantom:** Override `discharge_date = admission_date` on selected inpatient claims. Assign to 2–3 suspicious hospital IDs.
- **Upcoding:** Scale `claim_amount = package_rate × uniform(1.3, 2.0)`. Concentrate ≥60% in 2 hospitals to trigger hospital-level deviation.
- **Repeat:** Clone existing claims with `admission_date += randint(3, 15)` and `claim_amount *= uniform(0.95, 1.05)`. Ensure ≥2 repeats per patient.
- **No claim should carry more than one fraud type** to keep evaluation clean.

---

## SECTION 5: Why This Design Is Hackathon-Stable

1. **Epsilon-stabilized z-scores** prevent NaN/Inf in small procedure groups — the most common crash in hackathon ML pipelines on synthetic data.

2. **Fixed A_max/A_min** from training eliminates score drift during live demo inference, ensuring consistent LOW/MEDIUM/HIGH classification.

3. **Repeat deviation default = 1.0** for first-visit patients prevents a systematic false-negative bias where normal patients with no history appear "low deviation" and look like repeat fraudsters.

4. **Synthetic guardrails** (≥15 claims/hospital, ≥20 per procedure, fraud across ≥3 hospitals) ensure every feature has sufficient variance to produce separable distributions — critical for Isolation Forest on 200–300 rows.

5. **Implementation estimate:** Feature engineering (~2 hrs), fraud injection script (~1 hr), Isolation Forest (~30 min), rule engine + scoring API (~1.5 hrs). Total: **~5 hours**.
