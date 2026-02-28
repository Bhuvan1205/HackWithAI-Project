"""
Analytics Service — deterministic, DB-driven fraud profiling.
All calculations are server-side. No mock data.
"""
from sqlalchemy.orm import Session
from backend.models import Claim, FraudAnalysis, User


def build_user_profile(user_id: int, db: Session) -> dict:
    """Build behavioral fraud profile from ALL claims made by a user."""
    user = db.query(User).filter(User.id == user_id).first()
    email = user.email if user else "unknown"

    claims = db.query(Claim).filter(Claim.user_id == user_id).all()
    total_claims = len(claims)

    if total_claims == 0:
        return {
            "user_id": user_id,
            "email": email,
            "total_claims": 0,
            "avg_composite_score": 0,
            "high_risk_count": 0,
            "high_risk_ratio": 0,
            "risk_distribution": {"LOW": 0, "MEDIUM": 0, "HIGH": 0, "CRITICAL": 0},
            "fraud_patterns": {},
            "behavior_label": "NO_ACTIVITY",
        }

    composite_scores = []
    high_risk_count = 0
    risk_distribution = {"LOW": 0, "MEDIUM": 0, "HIGH": 0, "CRITICAL": 0}
    pattern_counts: dict[str, int] = {}

    for claim in claims:
        analysis = db.query(FraudAnalysis).filter(FraudAnalysis.claim_id == claim.claim_id).first()
        if not analysis:
            continue

        composite_scores.append(analysis.composite_index or 0)
        tl = analysis.threat_level or "LOW"
        if tl in risk_distribution:
            risk_distribution[tl] += 1

        if tl in ("HIGH", "CRITICAL"):
            high_risk_count += 1

        pat = analysis.fraud_pattern_detected or "NONE"
        pattern_counts[pat] = pattern_counts.get(pat, 0) + 1

    scored_total = len(composite_scores) or 1
    avg_score = round(sum(composite_scores) / scored_total, 2)
    high_ratio = round(high_risk_count / scored_total, 2)

    if high_ratio < 0.1:
        behavior_label = "LOW_RISK_USER"
    elif high_ratio < 0.3:
        behavior_label = "MONITORED_USER"
    else:
        behavior_label = "REPEAT_HIGH_RISK_USER"

    return {
        "user_id": user_id,
        "email": email,
        "total_claims": total_claims,
        "avg_composite_score": avg_score,
        "high_risk_count": high_risk_count,
        "high_risk_ratio": high_ratio,
        "risk_distribution": risk_distribution,
        "fraud_patterns": pattern_counts,
        "behavior_label": behavior_label,
    }


def build_hospital_profile(hospital_id: str, db: Session) -> dict:
    """Analyze systemic fraud behavior at a hospital facility."""
    claims = db.query(Claim).filter(Claim.hospital_id == hospital_id).all()
    total = len(claims)
    
    # Get hospital name from the first claim found (or fallback to ID)
    hospital_name = claims[0].hospital_name if total > 0 else hospital_id

    if total == 0:
        return {
            "hospital_id": hospital_id,
            "hospital_name": hospital_id,
            "total_claims": 0,
            "avg_composite_score": 0,
            "high_risk_count": 0,
            "high_risk_percent": 0,
            "fraud_patterns": {"upcoding": 0, "phantom": 0, "repeat_abuse": 0},
            "threat_distribution": {"LOW": 0, "MEDIUM": 0, "HIGH": 0, "CRITICAL": 0},
            "pattern_distribution": {},
            "hospital_risk_rating": "NO_DATA",
        }

    high = 0
    upcoding = 0
    phantom = 0
    repeat_abuse = 0
    composite_scores = []
    threat_dist: dict[str, int] = {"LOW": 0, "MEDIUM": 0, "HIGH": 0, "CRITICAL": 0}
    pattern_dist: dict[str, int] = {}

    for claim in claims:
        analysis = db.query(FraudAnalysis).filter(FraudAnalysis.claim_id == claim.claim_id).first()
        if not analysis:
            continue

        composite_scores.append(analysis.composite_index or 0)
        tl = analysis.threat_level or "LOW"
        if tl in threat_dist:
            threat_dist[tl] += 1

        if tl in ("HIGH", "CRITICAL"):
            high += 1

        pat = analysis.fraud_pattern_detected or "NONE"
        pattern_dist[pat] = pattern_dist.get(pat, 0) + 1

        if pat == "UPCODING":
            upcoding += 1
        elif pat == "PHANTOM":
            phantom += 1
        elif pat == "REPEAT_ABUSE":
            repeat_abuse += 1

    scored_total = len(composite_scores) or 1
    avg_score = round(sum(composite_scores) / scored_total, 2)
    high_percent = round((high / scored_total) * 100, 2)

    if high_percent < 15:
        rating = "LOW"
    elif high_percent < 35:
        rating = "MEDIUM"
    else:
        rating = "CRITICAL"

    upcoding_count = upcoding
    upcoding_percent = round((upcoding / scored_total) * 100, 2)

    return {
        "hospital_id": hospital_id,
        "hospital_name": hospital_name,
        "total_claims": total,
        "avg_composite_score": avg_score,
        "high_risk_count": high,
        "high_risk_percent": high_percent,
        "upcoding_count": upcoding_count,
        "upcoding_frequency_percent": upcoding_percent,
        "fraud_patterns": {
            "upcoding": upcoding,
            "phantom": phantom,
            "repeat_abuse": repeat_abuse,
        },
        "threat_distribution": threat_dist,
        "pattern_distribution": pattern_dist,
        "hospital_risk_rating": rating,
    }
