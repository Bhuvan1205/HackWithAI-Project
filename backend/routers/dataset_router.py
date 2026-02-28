"""
Dataset Router — GET /api/v1/claims
Serves live claim + analysis data for the Dataset Explorer page.
"""
import logging
from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from backend.database import get_db
from backend import crud

logger = logging.getLogger("dataset_router")

router = APIRouter()


@router.get("/claims")
def list_claims(
    min_score: Optional[int] = Query(default=None, ge=0, le=100),
    max_score: Optional[int] = Query(default=None, ge=0, le=100),
    risk_level: Optional[str] = Query(default=None, regex="^(LOW|MEDIUM|HIGH|CRITICAL)$"),
    limit: int = Query(default=500, ge=1, le=2000),
    db: Session = Depends(get_db),
):
    results = crud.get_claims_with_analysis(db, min_score=min_score, max_score=max_score, risk_level=risk_level)
    return results[:limit]
