from pydantic import BaseModel, field_validator, model_validator
from datetime import date
from typing import Literal, List
import re

ALLOWED_HOSPITALS = {f"H{i}" for i in range(1, 11)} | {f"HOSP00{i}" for i in range(1, 6)}
ALLOWED_PROCEDURES = {"P1", "P2", "P3", "P4", "P5", "P6", "P7", "P8"}


class ClaimInput(BaseModel):
    claim_id: str
    hospital_id: str
    hospital_name: str | None = None
    patient_id: str
    patient_name: str | None = None
    procedure_code: str
    package_rate: float
    claim_amount: float
    admission_date: date
    discharge_date: date
    is_inpatient: int

    @field_validator("claim_amount")
    @classmethod
    def amount_positive(cls, v):
        if v <= 0:
            raise ValueError("claim_amount must be greater than 0")
        return v

    @field_validator("package_rate")
    @classmethod
    def rate_positive(cls, v):
        if v <= 0:
            raise ValueError("package_rate must be greater than 0")
        return v

    @field_validator("hospital_id")
    @classmethod
    def valid_hospital(cls, v):
        if v not in ALLOWED_HOSPITALS:
            raise ValueError(f"hospital_id '{v}' not in allowed set {sorted(ALLOWED_HOSPITALS)}")
        return v

    @field_validator("procedure_code")
    @classmethod
    def valid_procedure(cls, v):
        if v not in ALLOWED_PROCEDURES:
            raise ValueError(f"procedure_code '{v}' not in allowed set {sorted(ALLOWED_PROCEDURES)}")
        return v

    @model_validator(mode="after")
    def discharge_after_admission(self):
        if self.discharge_date < self.admission_date:
            raise ValueError("discharge_date must be >= admission_date")
        return self


# --- Legacy sub-schemas (preserved) ---
class RuleTriggersSchema(BaseModel):
    zero_day_inpatient: bool
    high_amount_zscore: bool
    repeat_procedure_flag: bool
    near_package_ceiling: bool
    high_patient_frequency: bool


class RiskBreakdownSchema(BaseModel):
    rule_contribution_percent: float
    anomaly_contribution_percent: float


# --- New Composite Intelligence sub-schemas ---
class SignalVectorSchema(BaseModel):
    rule_weight: float
    anomaly_weight: float
    rule_trigger_count: int
    anomaly_intensity_band: Literal["Mild Deviation", "Elevated Anomaly", "Extreme Outlier"]


class KnowledgeSignalSchema(BaseModel):
    signal_code: str
    signal_type: Literal["DETERMINISTIC", "STATISTICAL"]
    severity_weight: float
    description: str
    fraud_category: Literal["PHANTOM", "UPCODING", "REPEAT_ABUSE", "ANOMALY"]


class IntelligenceResponse(BaseModel):
    claim_id: str
    hospital_name: str | None = None
    patient_name: str | None = None

    # Legacy fields
    anomaly_score_norm: float
    rule_score_norm: float
    final_risk_score: float
    risk_level: Literal["LOW", "MEDIUM", "HIGH"]
    risk_breakdown: RiskBreakdownSchema
    rule_triggers: RuleTriggersSchema
    fraud_pattern_detected: Literal["PHANTOM", "UPCODING", "REPEAT_ABUSE", "MIXED", "NONE"]
    investigation_priority: Literal["AUTO_APPROVE", "REVIEW", "ESCALATE"]
    explanation: str

    # New composite intelligence fields
    composite_index: int
    threat_level: Literal["LOW", "MEDIUM", "HIGH", "CRITICAL"]
    confidence_score: int
    enforcement_state: Literal["CLEAR", "MONITOR", "ESCALATED", "HARD_STOP"]
    signal_vector: SignalVectorSchema
    knowledge_signals: List[KnowledgeSignalSchema]


class IntelligenceMetricsResponse(BaseModel):
    total_scored: int
    threat_level_distribution: dict
    hard_stop_count: int
    average_composite_index: float
    anomaly_band_distribution: dict


class TokenUsage(BaseModel):
    prompt_tokens: int
    completion_tokens: int
    total_tokens: int


class ReportGenerationResponse(BaseModel):
    claim_id: str
    report_text: str
    generated_at: str
    model_used: str
    token_usage: TokenUsage
    generation_status: str


# ── Authentication Schemas ───────────────────────────────────────────────────
class RegisterSchema(BaseModel):
    email: str
    password: str
    full_name: str = ""

    @field_validator("email")
    @classmethod
    def valid_email(cls, v):
        if "@" not in v or "." not in v.split("@")[-1]:
            raise ValueError("Invalid email format")
        return v.lower().strip()

    @field_validator("password")
    @classmethod
    def strong_password(cls, v):
        if len(v) < 6:
            raise ValueError("Password must be at least 6 characters")
        return v


class LoginSchema(BaseModel):
    email: str
    password: str


class GoogleTokenSchema(BaseModel):
    id_token: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_email: str
    user_role: str
    user_name: str


class UserProfileResponse(BaseModel):
    id: int
    email: str
    full_name: str | None
    role: str
    auth_provider: str
    is_active: bool


# ── Hospital-Level Loss Exposure (Hitha's Feature) ───────────────────────────
class HospitalLossItem(BaseModel):
    hospital_id: str
    total_claims: int
    high_risk_claims: int
    total_claim_amount: float
    risk_weighted_loss: float
    fraud_exposure_percentage: float

HospitalLossResponse = List[HospitalLossItem]

