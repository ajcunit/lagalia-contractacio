import logging
from sqlalchemy.orm import Session
from typing import List, Dict, Any, Optional
import models
from services.ollama_service import OllamaService
from services.gemini_service import GeminiService
import unicodedata
import re

logger = logging.getLogger(__name__)

class AIService:
    @staticmethod
    def get_provider(db: Session) -> str:
        provider_cfg = db.query(models.Configuracion).filter(models.Configuracion.clave == "ai_provider").first()
        return provider_cfg.valor.lower() if provider_cfg and provider_cfg.valor else "disabled"

    @staticmethod
    def is_enabled(db: Session) -> bool:
        """Retorna True si la IA està activada (ollama o gemini)."""
        provider = AIService.get_provider(db)
        return provider in ("ollama", "gemini")

    @staticmethod
    async def extract_keywords(db: Session, description: str):
        provider = AIService.get_provider(db)
        if provider == "disabled":
            return [], [], []
        if provider == "gemini":
            return await GeminiService.extract_keywords(db, description)
        return await OllamaService.extract_keywords(db, description)

    @staticmethod
    async def analyze_auditoria(db: Session, data: Dict[str, Any], custom_prompt: Optional[str] = None) -> str:
        provider = AIService.get_provider(db)
        if provider == "disabled":
            return "⚠️ La IA està desactivada. Activa-la des de Configuració > Serveis IA."
        if provider == "gemini":
            return await GeminiService.analyze_auditoria(db, data, custom_prompt)
        return await OllamaService.analyze_auditoria(db, data, custom_prompt)

    @staticmethod
    async def suggest_cpvs(db: Session, description: str):
        provider = AIService.get_provider(db)
        if provider == "disabled":
            return []

        if provider == "gemini":
            return await OllamaService.suggest_cpvs(db, description, provider="gemini")
        
        return await OllamaService.suggest_cpvs(db, description, provider="ollama")
