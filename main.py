import os
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from backend.database import engine as db_engine, Base, SessionLocal
from backend.routers.fraud_router import router as fraud_router
from backend.routers.internal_router import router as internal_router
from backend.routers.report_router import router as report_router
from backend.routers.rule_router import router as rule_router
from backend.routers.dataset_router import router as dataset_router
from backend.routers.settings_router import router as settings_router
from backend.routers.auth_router import router as auth_router
from backend.routers.analytics_router import router as analytics_router
from backend.ml.risk_engine import FraudEngine
from backend import crud
from backend.seed_demo_entities import seed_demo_data

load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s — %(message)s",
)
logger = logging.getLogger("main")


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=db_engine)

    # Seed default config tables on first boot (no-op if already populated)
    with SessionLocal() as db:
        crud.seed_rule_configs(db)
        crud.seed_system_configs(db)

    fraud_engine = FraudEngine()
    try:
        fraud_engine.load()
        logger.info("FraudEngine loaded successfully.")
        logger.info("FraudEngine + Composite Intelligence Layer Version 1.0 Loaded")
    except RuntimeError as exc:
        logger.error("FraudEngine failed to load: %s", exc)

    app.state.fraud_engine = fraud_engine

    if os.getenv("DEMO_MODE", "false").lower() == "true":
        with SessionLocal() as db:
            from backend.models import Claim
            if db.query(Claim).count() == 0:
                logger.info("Demo Dataset Loaded")
                seed_demo_data()

    yield


app = FastAPI(
    title="PM-JAY Fraud Intelligence API",
    description="Hybrid rule + Isolation Forest fraud detection for Ayushman Bharat claims",
    version="5.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost",
        "http://127.0.0.1"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router, prefix="/api/v1", tags=["Authentication"])
app.include_router(fraud_router, prefix="/api/v1", tags=["Fraud Intelligence"])
app.include_router(internal_router, prefix="/api/v1", tags=["Internal / Benchmarking"])
app.include_router(report_router, prefix="/api/v1", tags=["Investigation Reports"])
app.include_router(rule_router, prefix="/api/v1", tags=["Rule Configuration"])
app.include_router(dataset_router, prefix="/api/v1", tags=["Dataset Explorer"])
app.include_router(settings_router, prefix="/api/v1", tags=["System Settings"])
app.include_router(analytics_router, prefix="/api/v1", tags=["Analytics"])
