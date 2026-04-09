"""
Funcions de seguretat: hashing de contrasenyes (Argon2), JWT tokens, validació.
Cap secret hardcoded — tot ve de core.config.settings.
"""
from datetime import datetime, timedelta, timezone
from typing import Optional, Tuple
import hashlib
import secrets

from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError, VerificationError
from jose import jwt, JWTError

from core.config import settings

ph = PasswordHasher()


# =============================================
# Password Hashing (Argon2id)
# =============================================

def hash_password(password: str) -> str:
    """Hashing amb Argon2id (guanyador Password Hashing Competition)."""
    return ph.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verifica una contrasenya contra el seu hash."""
    if not hashed_password:
        return False
    try:
        return ph.verify(hashed_password, plain_password)
    except (VerifyMismatchError, VerificationError):
        return False


# =============================================
# Password Strength Validation
# =============================================

def validate_password_strength(password: str) -> Tuple[bool, str]:
    """Valida la fortalesa d'una contrasenya. Retorna (valid, missatge_error)."""
    if len(password) < 8:
        return False, "La contrasenya ha de tenir mínim 8 caràcters"
    if not any(c.isupper() for c in password):
        return False, "Ha de contenir almenys una majúscula"
    if not any(c.islower() for c in password):
        return False, "Ha de contenir almenys una minúscula"
    if not any(c.isdigit() for c in password):
        return False, "Ha de contenir almenys un número"
    return True, ""


# =============================================
# JWT Access Tokens
# =============================================

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Crea un JWT access token. NO inclou el rol (es llegeix de BDD)."""
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (
        expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    to_encode.update({"exp": expire, "type": "access"})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def decode_access_token(token: str) -> dict:
    """Decodifica i valida un access token. Llança JWTError si invàlid."""
    payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
    if payload.get("type") != "access":
        raise JWTError("Token type invalid")
    return payload


# =============================================
# Refresh Tokens (opacs, no JWT)
# =============================================

def create_refresh_token() -> str:
    """Genera un refresh token opac de 64 bytes URL-safe."""
    return secrets.token_urlsafe(64)


def hash_refresh_token(token: str) -> str:
    """Hash SHA-256 del refresh token per emmagatzemar a BDD (mai plaintext)."""
    return hashlib.sha256(token.encode()).hexdigest()
