"""
Auth Router — /auth/register, /auth/login, /auth/google-login, /auth/me
"""
import logging
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from backend.database import get_db
from backend import crud
from backend.schemas import (
    RegisterSchema, LoginSchema, GoogleTokenSchema,
    TokenResponse, UserProfileResponse,
)
from backend.auth_utils import (
    hash_password, verify_password, create_access_token,
    get_current_user, verify_google_token,
)

logger = logging.getLogger("auth_router")

router = APIRouter()


@router.post("/auth/register", response_model=dict)
def register(payload: RegisterSchema, db: Session = Depends(get_db)):
    existing = crud.get_user_by_email(db, payload.email)
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered.")

    user = crud.create_user(
        db,
        email=payload.email,
        hashed_password=hash_password(payload.password),
        full_name=payload.full_name,
        auth_provider="LOCAL",
    )

    logger.info("User registered", extra={"email": user.email, "provider": "LOCAL"})
    return {"message": "User registered successfully", "user_id": user.id}


@router.post("/auth/login", response_model=TokenResponse)
def login(payload: LoginSchema, db: Session = Depends(get_db)):
    user = crud.get_user_by_email(db, payload.email)

    if not user or not user.hashed_password:
        raise HTTPException(status_code=401, detail="Invalid email or password.")

    if not verify_password(payload.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid email or password.")

    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account deactivated.")

    token = create_access_token({
        "sub": user.email,
        "role": user.role,
        "user_id": user.id,
    })

    logger.info("User logged in", extra={"email": user.email})
    return TokenResponse(
        access_token=token,
        user_email=user.email,
        user_role=user.role,
        user_name=user.full_name or "",
    )


@router.post("/auth/google-login", response_model=TokenResponse)
async def google_login(payload: GoogleTokenSchema, db: Session = Depends(get_db)):
    id_info = await verify_google_token(payload.id_token)

    email = id_info["email"]
    user = crud.get_user_by_email(db, email)

    if not user:
        user = crud.create_user(
            db,
            email=email,
            full_name=id_info.get("name", ""),
            auth_provider="GOOGLE",
        )
        logger.info("Google user auto-registered", extra={"email": email})

    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account deactivated.")

    token = create_access_token({
        "sub": user.email,
        "role": user.role,
        "user_id": user.id,
    })

    return TokenResponse(
        access_token=token,
        user_email=user.email,
        user_role=user.role,
        user_name=user.full_name or "",
    )


@router.get("/auth/me", response_model=UserProfileResponse)
def get_me(current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    user = crud.get_user_by_email(db, current_user["sub"])
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")
    return UserProfileResponse(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        role=user.role,
        auth_provider=user.auth_provider,
        is_active=user.is_active,
    )
