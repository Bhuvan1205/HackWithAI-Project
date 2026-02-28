import logging
from datetime import date, timedelta
from faker import Faker
import random

from backend import crud, schemas
from backend.database import SessionLocal, engine, Base
from backend.ml.risk_engine import get_fraud_engine
from backend.services.fraud_service import score_claim_intelligence

logger = logging.getLogger(__name__)
fake = Faker()

# Demo Entities
HOSPITALS = {
    "HOSP001": "CityCare Multispeciality Hospital",
    "HOSP002": "Green Valley Medical Center",
    "HOSP003": "Sunrise Advanced Surgical Institute",
    "HOSP004": "Metro Heart & Trauma Clinic",
    "HOSP005": "Silverline Diagnostics & Surgery"
}

PATIENTS = {
    "PAT001": "Rahul Mehta",
    "PAT002": "Priya Sharma",
    "PAT003": "Arjun Reddy",
    "PAT004": "Neha Kapoor",
    "PAT005": "Vikram Desai"
}

PROCEDURES = ["P1", "P2", "P3", "P4", "P5", "P6", "P7", "P8"]

def get_base_claim(claim_id, hosp_id, pat_id, proc_code, pkg_rate, amt, is_inpatient, offset_days=0):
    admit = date.today() - timedelta(days=30) + timedelta(days=offset_days)
    discharge = admit + timedelta(days=0 if not is_inpatient else random.randint(1, 5))
    return {
        "claim_id": claim_id,
        "hospital_id": hosp_id,
        "hospital_name": HOSPITALS[hosp_id],
        "patient_id": pat_id,
        "patient_name": PATIENTS[pat_id],
        "procedure_code": proc_code,
        "package_rate": float(pkg_rate),
        "claim_amount": float(amt),
        "admission_date": admit,
        "discharge_date": discharge,
        "is_inpatient": is_inpatient
    }

DEMO_CLAIMS = [
    # Case 1: Low Risk (CityCare, Rahul Mehta, Normal amt)
    get_base_claim("C_DEMO_01", "HOSP001", "PAT001", "P1", 20000, 20500, 1, 0),
    # Case 2: Medium Risk (Green Valley, Priya Sharma, Slight inflation)
    get_base_claim("C_DEMO_02", "HOSP002", "PAT002", "P2", 15000, 19500, 1, 5),
    # Case 3: High Risk (Sunrise, Arjun Reddy, Extreme Ceiling, UPCODING)
    get_base_claim("C_DEMO_03", "HOSP003", "PAT003", "P4", 50000, 68000, 1, 10),
    # Case 4: High Risk (Metro Trauma, Neha Kapoor, Repeat / Phantom)
    get_base_claim("C_DEMO_04", "HOSP004", "PAT004", "P6", 10000, 12000, 1, 12),
    get_base_claim("C_DEMO_05", "HOSP004", "PAT004", "P6", 10000, 12500, 1, 15), # Repeat abuse
    # Case 5: Low Risk (Silverline, Vikram Desai, Clean)
    get_base_claim("C_DEMO_06", "HOSP005", "PAT005", "P8", 35000, 34000, 1, 18),
    
    # Random realistic fillers
    get_base_claim("C_DEMO_07", "HOSP001", "PAT002", "P3", 25000, 25500, 0, 20),
    get_base_claim("C_DEMO_08", "HOSP002", "PAT001", "P5", 18000, 25000, 1, 22),
    get_base_claim("C_DEMO_09", "HOSP003", "PAT005", "P7", 40000, 42000, 1, 23),
    get_base_claim("C_DEMO_10", "HOSP005", "PAT003", "P1", 20000, 21000, 1, 25),
]


def seed_demo_data():
    logger.info("Starting DEMO dataset seeding...")
    engine_ml = get_fraud_engine()
    db = SessionLocal()
    
    # Ensure config and rules exist
    crud.seed_system_configs(db)
    crud.seed_rule_configs(db)
    
    # Optional: setup the default users
    if not crud.get_user_by_email(db, "auditor-demo@claimhawk.gov.in"):
        crud.create_user(db, "auditor-demo@claimhawk.gov.in", full_name="Auditor Demo", role="AUDITOR")
        
    for claim in DEMO_CLAIMS:
        try:
            score_claim_intelligence(claim, db, engine_ml)
            logger.info(f"Successfully scored & inserted demo claim: {claim['claim_id']}")
        except ValueError as e:
            if "DUPLICATE" in str(e):
                logger.debug(f"Skipping duplicate claim: {claim['claim_id']}")
            else:
                logger.error(f"Error seeding {claim['claim_id']}: {e}")
        except Exception as e:
            logger.error(f"Unexpected error seeding {claim['claim_id']}: {e}")
            
    db.close()
    logger.info("DEMO dataset seeding complete.")

if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    Base.metadata.create_all(bind=engine)
    seed_demo_data()
