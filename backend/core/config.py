"""
Configuració centralitzada — Pydantic BaseSettings.
Tota la configuració es llegeix de variables d'entorn o .env.
SECRET_KEY i DATABASE_URL són OBLIGATÒRIES.
"""
import os
import secrets
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List


class Settings(BaseSettings):

    # === OBLIGATÒRIES ===
    DATABASE_URL: str = ""
    SECRET_KEY: str = ""

    # === JWT ===
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # === CORS ===
    CORS_ORIGINS: List[str] = ["http://localhost:5173", "http://localhost:3000"]

    # === IA ===
    GEMINI_API_KEY: str = ""
    OLLAMA_URL: str = "http://localhost:11434"

    # === Rate Limits ===
    RATE_LIMIT_LOGIN: str = "5/minute"
    RATE_LIMIT_API: str = "100/minute"
    RATE_LIMIT_SETUP: str = "3/minute"
    RATE_LIMIT_EXTERNAL_SYNC: str = "10/minute"
    RATE_LIMIT_EXTERNAL_AI: str = "30/minute"
    RATE_LIMIT_EXTERNAL_PROXY: str = "10/minute"

    # === App ===
    APP_NAME: str = "LAGALia Contractació"
    APP_VERSION: str = "2.0.0"
    DEBUG: bool = False

    model_config = SettingsConfigDict(
        env_file=os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    @staticmethod
    def generate_secret_key() -> str:
        """Genera una SECRET_KEY criptogràficament segura de 64 chars hex."""
        return secrets.token_hex(32)


def get_settings() -> Settings:
    """Factory que valida la configuració obligatòria."""
    s = Settings()

    if not s.DATABASE_URL:
        raise RuntimeError(
            "ERROR FATAL: DATABASE_URL no està definida. "
            "Afegeix-la al fitxer .env o com a variable d'entorn.\n"
            "Exemple: DATABASE_URL=postgresql://user:pass@localhost:5432/licitia"
        )

    if not s.DATABASE_URL.startswith("postgresql"):
        raise RuntimeError(
            "ERROR FATAL: DATABASE_URL ha de ser PostgreSQL.\n"
            f"Valor actual: {s.DATABASE_URL[:30]}..."
        )

    if not s.SECRET_KEY:
        # En mode desenvolupament, generar una clau temporal amb warning
        import warnings
        s.SECRET_KEY = Settings.generate_secret_key()
        warnings.warn(
            "⚠️  SECRET_KEY no definida — s'ha generat una clau temporal. "
            "Defineix-la al .env per a producció!",
            RuntimeWarning,
            stacklevel=2,
        )

    return s


settings = get_settings()
