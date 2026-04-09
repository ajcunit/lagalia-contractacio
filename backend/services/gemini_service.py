import json
import logging
from sqlalchemy.orm import Session
from typing import List, Dict, Any, Optional, Tuple
import models
import re

from core.config import settings
from services.external_api_client import ExternalAPIClient

logger = logging.getLogger(__name__)

class GeminiService:
    @staticmethod
    def get_config(db: Session) -> Dict[str, str]:
        # Prioritat: env var > BDD
        api_key = settings.GEMINI_API_KEY
        if not api_key:
            api_key_cfg = db.query(models.Configuracion).filter(
                models.Configuracion.clave == "gemini_api_key"
            ).first()
            api_key = api_key_cfg.valor if api_key_cfg else ""

        model_cfg = db.query(models.Configuracion).filter(
            models.Configuracion.clave == "gemini_model"
        ).first()
        
        return {
            "api_key": api_key,
            "model": model_cfg.valor if model_cfg and model_cfg.valor else "gemini-1.5-flash"
        }

    @staticmethod
    async def _call_gemini(db: Session, prompt: str) -> str:
        config = GeminiService.get_config(db)
        if not config["api_key"]:
            logger.error("Gemini API Key missing in configuration")
            return ""

        # API key al HEADER (no a la URL) + rate limit extern
        payload = {
            "contents": [{
                "parts": [{"text": prompt}]
            }],
            "generationConfig": {
                "temperature": 0.1,
                "topK": 1,
                "topP": 1,
                "maxOutputTokens": 2048,
            }
        }

        try:
            data = await ExternalAPIClient.fetch_gemini(
                model=config["model"],
                api_key=config["api_key"],
                payload=payload,
            )
            
            if "candidates" in data and len(data["candidates"]) > 0:
                text = data["candidates"][0]["content"]["parts"][0]["text"]
                logger.info(f"Gemini raw response: {text[:200]}...")
                return text
            logger.warning(f"No candidates in Gemini response")
            return ""
        except Exception as e:
            logger.error(f"Error calling Gemini API: {str(e)}")
            return ""

    @staticmethod
    def clean_text_response(text: str) -> str:
        # Eliminar blocs de pensament (si n'hi hagués)
        text = re.sub(r'<think>.*?</think>', '', text, flags=re.DOTALL)
        # Eliminar blocs de codi markdown
        text = re.sub(r'```json\s*(.*?)\s*```', r'\1', text, flags=re.DOTALL)
        text = re.sub(r'```\w*\s*(.*?)\s*```', r'\1', text, flags=re.DOTALL)
        return text.strip()

    @staticmethod
    def get_prompt(db: Session, clave: str, default: str) -> str:
        cfg = db.query(models.Configuracion).filter(models.Configuracion.clave == clave).first()
        return cfg.valor if cfg and cfg.valor else default

    @staticmethod
    async def extract_keywords(db: Session, description: str) -> Tuple[List[str], List[str], List[str]]:
        default_prompt = """Ets un expert en CPV europeu. Per aquest objecte de contracte:
"{description}"

1. Extrau 4-6 paraules clau en català (noms o adjectius).
2. Identifica les 2 DIVISIONS (els 2 primers dígits) més probables.
3. Suggereix 3 CODIS CPV (8 dígits) concrets que podrien ser els correctes.

Respon NOMÉS amb aquest format:
Paraules: paraula1, paraula2...
Divisions: 00, 00
Codis: 00000000, 00000000..."""

        prompt_tmpl = GeminiService.get_prompt(db, "prompt_cpv_extract", default_prompt)
        prompt = prompt_tmpl.format(description=description)

        raw_text = await GeminiService._call_gemini(db, prompt)
        content = GeminiService.clean_text_response(raw_text)
        
        import re
        # Mateixa lògica d'extracció que a OllamaService per coherència
        words_match = re.search(r'paraules:\s*(.*)', content, re.IGNORECASE)
        words_str = words_match.group(1) if words_match else content
        all_words = re.findall(r'[a-zàèòéíóúüç\d]{4,}', words_str.lower())
        
        divs_match = re.search(r'divisions:\s*(.*)', content, re.IGNORECASE)
        divs_str = divs_match.group(1) if divs_match else ""
        divisions = re.findall(r'\b\d{2}\b', divs_str)
        
        codes_match = re.search(r'codis:\s*(.*)', content, re.IGNORECASE)
        codes_str = codes_match.group(1) if codes_match else ""
        suggested_codes = re.findall(r'\b\d{8}\b', codes_str)
        
        stopwords = {
            'aquest', 'aquesta', 'aquestes', 'aquells', 'aquelles', 'perquè', 'com', 'quan', 'on',
            'molt', 'poc', 'més', 'menys', 'estat', 'estan', 'sigui', 'seria', 'tenen', 'tenia',
            'sobre', 'entre', 'sota', 'fent', 'cada', 'segle', 'any', 'mes', 'dia', 'hores',
            'contracte', 'servei', 'serveis', 'subministrament', 'obra', 'obres', 'menor', 'major',
            'licitació', 'adjudicació', 'expedient', 'objecte', 'paraules'
        }
        
        keywords = [w for w in all_words if w not in stopwords and not re.search(r'\d', w)]
        return list(dict.fromkeys(keywords))[:10], list(dict.fromkeys(divisions))[:3], list(dict.fromkeys(suggested_codes))[:5]

    @staticmethod
    async def rank_candidates(db: Session, description: str, candidates: List[models.CPV]) -> List[Dict[str, Any]]:
        list_text = "\n".join([f"- {r.codigo}: {r.descripcion} ({r.nivel})" for r in candidates])
        
        default_prompt = """You are an expert in European public procurement, specialized in CPV classification (Reg. 213/2008). 
Your task is to rank the candidates provided below for the contract description. 
Select the most specific and accurate code.
Return a valid JSON array of objects with 'codigo', 'descripcion', 'score' (0.0-1.0), and 'justificacion' (short, in Catalan)."""

        prompt_tmpl = GeminiService.get_prompt(db, "prompt_cpv_rank", default_prompt)
        try:
            prompt = prompt_tmpl.format(description=description, candidates=list_text)
        except Exception:
            prompt = f"{prompt_tmpl}\n\n- OBJECT: \"{description}\"\n\n- CANDIDATE LIST:\n{list_text}"

        raw_text = await GeminiService._call_gemini(db, prompt)
        content = GeminiService.clean_text_response(raw_text)
        
        try:
            results = json.loads(content)
            if isinstance(results, dict) and "suggestions" in results:
                results = results["suggestions"]
            
            # Millorar descripcions
            code_map = {c.codigo: c.descripcion for c in candidates}
            for res in results[:5]:
                if res.get('codigo') in code_map:
                    res['descripcion'] = code_map[res['codigo']]
            return results[:5]
        except Exception as e:
            logger.error(f"Error parsing Gemini ranking: {str(e)}")
            return [{"codigo": c.codigo, "descripcion": c.descripcion, "score": 0.5, "justificacion": "Error IA"} for c in candidates[:3]]

    @staticmethod
    async def analyze_auditoria(db: Session, data: Dict[str, Any], custom_prompt: Optional[str] = None) -> str:
        default_prompt = """Ets un auditor expert en contractació pública. Analitza aquestes dades de risc (redflags):
{data}

{custom_prompt}

Proporciona un informe executiu breu (en català) amb:
1. Resum de riscos detectats.
2. Recomanacions d'actuació.
Utilitza format Markdown."""

        prompt_tmpl = GeminiService.get_prompt(db, "prompt_auditoria", default_prompt)
        try:
            prompt = prompt_tmpl.format(data=json.dumps(data, indent=2, ensure_ascii=False), custom_prompt=custom_prompt or "")
        except Exception:
            prompt = f"{prompt_tmpl}\n\nDATA:\n{json.dumps(data, indent=2, ensure_ascii=False)}\n\n{custom_prompt or ''}"

        return await GeminiService._call_gemini(db, prompt)
