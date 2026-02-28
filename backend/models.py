from sqlalchemy import Column, String, Float, Integer, Text, DateTime, ForeignKey, JSON, Boolean
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from backend.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, autoincrement=True)
    email = Column(String, unique=True, nullable=False, index=True)
    hashed_password = Column(String, nullable=True)  # Null for Google OAuth users
    full_name = Column(String, nullable=True)
    role = Column(String, default="AUDITOR", nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    auth_provider = Column(String, default="LOCAL", nullable=False)  # LOCAL / GOOGLE
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    claims = relationship("Claim", back_populates="user")


class Claim(Base):
    __tablename__ = "claims"

    claim_id = Column(String, primary_key=True, index=True)
    hospital_id = Column(String, nullable=False)
    hospital_name = Column(String, nullable=True)
    patient_id = Column(String, nullable=False)
    patient_name = Column(String, nullable=True)
    procedure_code = Column(String, nullable=False)
    package_rate = Column(Float, nullable=False)
    claim_amount = Column(Float, nullable=False)
    admission_date = Column(String, nullable=False)
    discharge_date = Column(String, nullable=False)
    is_inpatient = Column(Integer, nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    user = relationship("User", back_populates="claims")
    fraud_analysis = relationship("FraudAnalysis", back_populates="claim", uselist=False)
    investigation_reports = relationship("InvestigationReport", back_populates="claim", order_by="InvestigationReport.generated_at.desc()")


class FraudAnalysis(Base):
    __tablename__ = "fraud_analysis"

    id = Column(Integer, primary_key=True, autoincrement=True)
    claim_id = Column(String, ForeignKey("claims.claim_id"), nullable=False, unique=True, index=True)

    # --- Legacy fields (preserved) ---
    anomaly_score_norm = Column(Float, nullable=False)
    rule_score_norm = Column(Float, nullable=False)
    final_risk_score = Column(Float, nullable=False)
    risk_level = Column(String, nullable=False)
    fraud_pattern_detected = Column(String, nullable=False)
    investigation_priority = Column(String, nullable=False)
    rule_triggers = Column(JSON, nullable=False)
    risk_breakdown = Column(JSON, nullable=False)
    explanation = Column(Text, nullable=False)

    # --- New Composite Intelligence fields ---
    composite_index = Column(Integer, nullable=True)
    threat_level = Column(String, nullable=True)
    confidence_score = Column(Float, nullable=True)
    enforcement_state = Column(String, nullable=True)
    signal_vector = Column(JSON, nullable=True)
    knowledge_signals = Column(JSON, nullable=True)
    hard_stop = Column(Boolean, default=False)

    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    claim = relationship("Claim", back_populates="fraud_analysis")


class InvestigationReport(Base):
    __tablename__ = "investigation_reports"

    id = Column(Integer, primary_key=True, autoincrement=True)
    claim_id = Column(String, ForeignKey("claims.claim_id"), nullable=False, index=True)
    report_text = Column(Text, nullable=False)
    model_name = Column(String, nullable=False)
    prompt_tokens = Column(Integer, nullable=True)
    completion_tokens = Column(Integer, nullable=True)
    total_tokens = Column(Integer, nullable=True)
    generated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    generation_status = Column(String, nullable=False, default="SUCCESS")
    version = Column(String, nullable=False, default="1.0")

    claim = relationship("Claim", back_populates="investigation_reports")


class RuleConfig(Base):
    __tablename__ = "rule_config"

    id = Column(Integer, primary_key=True, autoincrement=True)
    rule_key = Column(String, unique=True, nullable=False, index=True)
    description = Column(String, nullable=False)
    threshold_value = Column(Float, nullable=True)
    is_enabled = Column(Boolean, default=True, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc),
                        onupdate=lambda: datetime.now(timezone.utc))


class SystemConfig(Base):
    __tablename__ = "system_config"

    id = Column(Integer, primary_key=True, autoincrement=True)
    config_key = Column(String, unique=True, nullable=False, index=True)
    config_value = Column(String, nullable=False)
    description = Column(String, nullable=True)
