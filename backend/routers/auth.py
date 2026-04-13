"""
Router d'autenticació v2 — amb refresh tokens i audit log.
"""
from datetime import timedelta, datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from pydantic import BaseModel

from core.dependencies import get_db, get_current_user
from core.config import settings
from core.security import (
    verify_password, create_access_token,
    create_refresh_token, hash_refresh_token,
)
from core.rate_limiter import limiter
from starlette.requests import Request
from services.auth_service import AuthService
import models
import schemas

router = APIRouter(prefix="/auth", tags=["auth"])


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class RefreshRequest(BaseModel):
    refresh_token: str


@router.post("/login")
@limiter.limit("5/minute")
def login_for_access_token(
    request: Request,
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
):
    # 1. Intentar LDAP primer
    user = AuthService.ldap_authenticate(db, form_data.username, form_data.password)

    # 2. Fallback a local
    if not user:
        user = db.query(models.Empleado).filter(
            models.Empleado.email == form_data.username
        ).first()
        if not user or not verify_password(form_data.password, user.hashed_password):
            # Log intent fallit
            db.add(models.AuditLog(
                action="login", user_email=form_data.username,
                ip_address=request.client.host if request.client else "unknown",
                success="failure", details="Credencials incorrectes",
            ))
            db.commit()
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Email o contrasenya incorrectes",
                headers={"WWW-Authenticate": "Bearer"},
            )

    if not user.activo:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Aquest compte d'usuari ha estat desactivat.",
        )

    # 3. Generar tokens
    access_token = create_access_token(data={"sub": user.email})
    refresh_tok = create_refresh_token()

    # 4. Guardar refresh token hashejat
    db.add(models.RefreshToken(
        token_hash=hash_refresh_token(refresh_tok),
        empleado_id=user.id,
        expires_at=datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS),
    ))

    # 5. Log èxit
    db.add(models.AuditLog(
        action="login", user_email=user.email,
        ip_address=request.client.host if request.client else "unknown",
        success="success",
    ))
    db.commit()

    return {
        "access_token": access_token,
        "refresh_token": refresh_tok,
        "token_type": "bearer",
    }


@router.post("/refresh")
@limiter.limit("10/minute")
def refresh_token(
    request: Request,
    data: RefreshRequest,
    db: Session = Depends(get_db),
):
    """Renova l'access token usant el refresh token."""
    token_hash = hash_refresh_token(data.refresh_token)
    stored = db.query(models.RefreshToken).filter(
        models.RefreshToken.token_hash == token_hash,
        models.RefreshToken.revoked == False,
        models.RefreshToken.expires_at > datetime.now(timezone.utc),
    ).first()

    if not stored:
        raise HTTPException(status_code=401, detail="Refresh token invàlid o expirat")

    user = db.query(models.Empleado).filter(
        models.Empleado.id == stored.empleado_id
    ).first()
    if not user or not user.activo:
        raise HTTPException(status_code=401, detail="Usuari no trobat o desactivat")

    # Revocar el refresh antic (rotation)
    stored.revoked = True

    # Nous tokens
    new_access = create_access_token(data={"sub": user.email})
    new_refresh = create_refresh_token()

    db.add(models.RefreshToken(
        token_hash=hash_refresh_token(new_refresh),
        empleado_id=user.id,
        expires_at=datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS),
    ))
    db.commit()

    return {
        "access_token": new_access,
        "refresh_token": new_refresh,
        "token_type": "bearer",
    }


@router.post("/logout")
def logout(
    data: RefreshRequest,
    db: Session = Depends(get_db),
):
    """Revoca el refresh token (no cal estar autenticat per logout)."""
    token_hash = hash_refresh_token(data.refresh_token)
    stored = db.query(models.RefreshToken).filter(
        models.RefreshToken.token_hash == token_hash
    ).first()
    if stored:
        stored.revoked = True
        db.commit()
    return {"message": "Sessió tancada correctament"}


@router.get("/me", response_model=schemas.Empleado)
def read_users_me(current_user: models.Empleado = Depends(get_current_user)):
    return current_user
