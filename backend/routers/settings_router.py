"""
Settings Router — GET /api/v1/config, PATCH /api/v1/config/{key}
Controls dynamic threat level thresholds (LOW_MAX, MEDIUM_MAX, HIGH_MAX).
"""
import logging
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from backend.database import get_db
from backend import crud

logger = logging.getLogger("settings_router")

router = APIRouter()


@router.get("/config")
def list_config(db: Session = Depends(get_db)):
    configs = crud.get_all_system_configs(db)
    return [
        {
            "config_key": c.config_key,
            "config_value": c.config_value,
            "description": c.description,
        }
        for c in configs
    ]


@router.patch("/config/{key}")
def update_config(key: str, payload: dict, db: Session = Depends(get_db)):
    if "value" not in payload:
        raise HTTPException(status_code=422, detail="Payload must contain 'value' field.")

    # Validate numeric for threshold keys
    if key in ("LOW_MAX", "MEDIUM_MAX", "HIGH_MAX"):
        try:
            val = int(payload["value"])
            if not (0 <= val <= 100):
                raise ValueError
        except (ValueError, TypeError):
            raise HTTPException(status_code=422, detail=f"'{key}' must be an integer between 0 and 100.")

    updated = crud.update_system_config(db, key, str(payload["value"]))
    if not updated:
        raise HTTPException(status_code=404, detail=f"Config key '{key}' not found.")

    logger.info("System config updated", extra={"key": key, "new_value": payload["value"]})
    return {
        "config_key": updated.config_key,
        "config_value": updated.config_value,
        "description": updated.description,
    }
