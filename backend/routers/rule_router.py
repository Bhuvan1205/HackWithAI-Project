"""
Rule Config Router — GET /api/v1/rules, PATCH /api/v1/rules/{rule_key}
Allows auditors and admins to view and configure fraud detection rule thresholds.
"""
import logging
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from backend.database import get_db
from backend import crud

logger = logging.getLogger("rule_router")

router = APIRouter()


@router.get("/rules")
def list_rules(db: Session = Depends(get_db)):
    rules = crud.get_all_rule_configs(db)
    return [
        {
            "id": r.id,
            "rule_key": r.rule_key,
            "description": r.description,
            "threshold_value": r.threshold_value,
            "is_enabled": r.is_enabled,
            "updated_at": r.updated_at.isoformat() if r.updated_at else None,
        }
        for r in rules
    ]


@router.patch("/rules/{rule_key}")
def patch_rule(rule_key: str, payload: dict, db: Session = Depends(get_db)):
    allowed_keys = {"threshold_value", "is_enabled"}
    filtered = {k: v for k, v in payload.items() if k in allowed_keys}
    if not filtered:
        raise HTTPException(status_code=422, detail="No valid fields provided. Allowed: threshold_value, is_enabled")

    updated = crud.update_rule_config(db, rule_key, filtered)
    if not updated:
        raise HTTPException(status_code=404, detail=f"Rule '{rule_key}' not found.")

    logger.info("Rule config updated", extra={"rule_key": rule_key, "changes": str(filtered)})
    return {
        "id": updated.id,
        "rule_key": updated.rule_key,
        "description": updated.description,
        "threshold_value": updated.threshold_value,
        "is_enabled": updated.is_enabled,
        "updated_at": updated.updated_at.isoformat() if updated.updated_at else None,
    }
