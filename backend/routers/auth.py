from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from database import get_db
import models, schemas
from services.auth_service import AuthService, ACCESS_TOKEN_EXPIRE_MINUTES, get_current_user
from typing import Optional

router = APIRouter(prefix="/auth", tags=["auth"])

@router.post("/login")
def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    # 1. Try LDAP login first (if enabled in config)
    user = AuthService.ldap_authenticate(db, form_data.username, form_data.password)
    
    # 2. If LDAP fails or is disabled, fallback to local DB login
    if not user:
        user = db.query(models.Empleado).filter(models.Empleado.email == form_data.username).first()
        if not user or not AuthService.verify_password(form_data.password, user.hashed_password):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Email o contrasenya incorrectes",
                headers={"WWW-Authenticate": "Bearer"},
            )
    
    if not user.activo:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Aquest compte d'usuari ha estat desactivat. Contacta amb l'administrador."
        )
        
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = AuthService.create_access_token(
        data={"sub": user.email, "rol": user.rol}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

@router.get("/me")
def read_users_me(current_user: models.Empleado = Depends(get_current_user)):
    return {
        "id": current_user.id,
        "email": current_user.email,
        "nombre": current_user.nombre,
        "rol": current_user.rol,
        "permiso_auditoria": current_user.permiso_auditoria
    }
