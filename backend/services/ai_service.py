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
        return provider_cfg.valor.lower() if provider_cfg and provider_cfg.valor else "ollama"

    @staticmethod
    async def extract_keywords(db: Session, description: str):
        provider = AIService.get_provider(db)
        if provider == "gemini":
            return await GeminiService.extract_keywords(db, description)
        return await OllamaService.extract_keywords(db, description)

    @staticmethod
    async def analyze_auditoria(db: Session, data: Dict[str, Any], custom_prompt: Optional[str] = None) -> str:
        provider = AIService.get_provider(db)
        if provider == "gemini":
            return await GeminiService.analyze_auditoria(db, data, custom_prompt)
        return await OllamaService.analyze_auditoria(db, data, custom_prompt)

    @staticmethod
    async def suggest_cpvs(db: Session, description: str):
        provider = AIService.get_provider(db)
        
        # Aquesta lògica és la mateixa per a tots dos, només canvia qui fa la "crida" final a l'IA
        # Per ara, per no trencar res i anar ràpid, deleguem la funció sencera al servei corresponent
        # si GeminiService ja la té implementada. 
        # Com que GeminiService encara no té 'suggest_cpvs' sencer (només els helpers), 
        # usarem la lògica d'OllamaService però canviant el provider de keywords.
        
        # NOTA: En una refactorització més profunda, suggest_cpvs hauria d'estar AQUÍ 
        # i cridar a provider.extract_keywords i provider.rank_candidates.
        
        if provider == "gemini":
            # Per ara, fem que OllamaService pugui rebre un provider opcional o 
            # simplement repliquem la lògica a GeminiService si cal.
            # Millor: actualitzem OllamaService perquè sigui el "motor" i AIService el "selector".
            return await OllamaService.suggest_cpvs(db, description, provider="gemini")
        
        return await OllamaService.suggest_cpvs(db, description, provider="ollama")
