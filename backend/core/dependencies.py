"""
FastAPI dependencies: get_db, get_current_user, require_admin.
"""
from typing import Optional, Generator

from fastapi import Depends, HTTPException, status, Query
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from jose import JWTError

from core.database import get_db  # re-export
from core.security import decode_access_token

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/auth/login", auto_error=False)


def get_current_user(
    token: Optional[str] = Depends(oauth2_scheme),
    query_token: Optional[str] = Query(None, alias="token"),
    db: Session = Depends(get_db),
):
    """Extreu l'usuari actual del JWT.
    NO posa el rol al token — el llegeix de la BDD per evitar privilege escalation."""
    import models  # Lazy import per evitar circular

    actual_token = token or query_token

    if not actual_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="No autenticat",
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        payload = decode_access_token(actual_token)
        email: str = payload.get("sub")
        if email is None:
            raise HTTPException(status_code=401, detail="Token invàlid")
    except JWTError:
        raise HTTPException(status_code=401, detail="Token invàlid o expirat")

    user = db.query(models.Empleado).filter(models.Empleado.email == email).first()
    if not user:
        raise HTTPException(status_code=401, detail="Usuari no trobat")
    if not user.activo:
        raise HTTPException(status_code=401, detail="Compte desactivat")

    return user


def require_admin(current_user=Depends(get_current_user)):
    """Dependency que requereix rol admin o responsable_contratacion."""
    if current_user.rol not in ["admin", "responsable_contratacion"]:
        raise HTTPException(status_code=403, detail="Permisos insuficients")
    return current_user
