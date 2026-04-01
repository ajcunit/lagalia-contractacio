import httpx
import json
import logging
from sqlalchemy.orm import Session
from typing import List, Dict, Any, Optional
import models

logger = logging.getLogger(__name__)

class OllamaService:
    @staticmethod
    def get_config(db: Session, feature: str = "cpv") -> Dict[str, str]:
        url_cfg = db.query(models.Configuracion).filter(models.Configuracion.clave == "ollama_url").first()
        model_clave = f"ollama_model_{feature}"
        model_cfg = db.query(models.Configuracion).filter(models.Configuracion.clave == model_clave).first()
        
        # Fallback to general 'ollama_model' if the specific one is missing (legacy compat)
        if not model_cfg or not model_cfg.valor:
            model_cfg = db.query(models.Configuracion).filter(models.Configuracion.clave == "ollama_model").first()
            
        think_cfg = db.query(models.Configuracion).filter(models.Configuracion.clave == "ollama_think").first()
        
        return {
            "url": url_cfg.valor if url_cfg else "http://localhost:11434",
            "model": model_cfg.valor if model_cfg and model_cfg.valor else "llama3",
            "think": think_cfg.valor if think_cfg else "smart"
        }

    @staticmethod
    def get_think_param(db: Session, model_name: str):
        """Retorna el valor adequat per al paràmetre 'think' segons el model o la configuració."""
        config = OllamaService.get_config(db, feature="cpv") # Use cpv default for reading think setting
        think_conf = config.get("think", "smart").lower()
        
        if think_conf == "none":
            return None
        if think_conf == "false":
            return False
        if think_conf in ["low", "medium", "high"]:
            return think_conf
            
        # Logica 'smart' (per defecte)
        model_name = model_name.lower()
        if "gpt-oss" in model_name:
            return "low"
        if "deepseek-r1" in model_name or "qwen3" in model_name:
            return False
        return None

    @staticmethod
    def clean_json_response(content: str) -> str:
        """Neteja la resposta per extreure el JSON vālid, manejant blocs de 'thinking' i markdown."""
        content = content.strip()
        
        # 1. Eliminar blocs de <thought> o <thinking> si existeixen (models tipus DeepSeek R1)
        if "<thought>" in content and "</thought>" in content:
            content = content.split("</thought>")[-1].strip()
        if "<thinking>" in content and "</thinking>" in content:
            content = content.split("</thinking>")[-1].strip()
            
        # 2. Si el contingut encara sembla JSON però està dins de blocs markdown
        if "```" in content:
            parts = content.split("```")
            for part in parts:
                cleaned = part.strip()
                if cleaned.startswith("json"):
                    cleaned = cleaned[4:].strip()
                if (cleaned.startswith("[") and cleaned.endswith("]")) or (cleaned.startswith("{") and cleaned.endswith("}")):
                    return cleaned
                    
        # 3. Intentar trobar el primer '[' i l'ultim ']' si no s'ha trobat res encara
        if not (content.startswith("[") or content.startswith("{")):
            start_bracket = content.find("[")
            end_bracket = content.rfind("]")
            if start_bracket != -1 and end_bracket != -1:
                return content[start_bracket:end_bracket+1]
                
        return content

    @staticmethod
    def clean_text_response(content: str) -> str:
        """Neteja la resposta per extreure text, manejant blocs de 'think' propis de certs models."""
        content = content.strip()
        
        while "<think>" in content and "</think>" in content:
            start = content.find("<think>")
            end = content.find("</think>") + len("</think>")
            content = content[:start] + content[end:]
            content = content.strip()
            
        if "<thought>" in content and "</thought>" in content:
            content = content.split("</thought>")[-1].strip()
        if "<thinking>" in content and "</thinking>" in content:
            content = content.split("</thinking>")[-1].strip()
            
        return content.strip()

    @staticmethod
    async def extract_keywords(db: Session, description: str) -> List[str]:
        # Aquesta funció es manté per compatibilitat però ara redirigeix a un prompt simple
        config = OllamaService.get_config(db, feature="cpv")
        prompt = f"Extract 3-5 keywords for CPV search from: '{description}'. Return ONLY a JSON list of strings."
        
        think_val = OllamaService.get_think_param(db, config['model'])
        payload = {"model": config['model'], "prompt": prompt, "stream": False, "format": "json"}
        if think_val is not None:
            payload["think"] = think_val

        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{config['url']}/api/generate",
                    json=payload,
                    timeout=90.0
                )
                response.raise_for_status()
                content = response.json().get("response", "[]")
                cleaned = OllamaService.clean_json_response(content)
                return json.loads(cleaned)
        except Exception:
            return []

    @staticmethod
    async def analyze_auditoria(db: Session, data: Dict[str, Any], custom_prompt: Optional[str] = None) -> str:
        config = OllamaService.get_config(db, feature="auditoria")
        
        if custom_prompt:
            prompt = custom_prompt + f"\n\nDatos:\n{json.dumps(data, indent=2, ensure_ascii=False)}"
        else:
            prompt = f"""
Actúa como un Auditor/Interventor experto en contratación pública. 
Analiza este resumen de alertas (red flags) y proporciona un breve comentario crítico identificando los riesgos principales en 2-3 párrafos como máximo. Responde en catalán.

Datos:
{json.dumps(data, indent=2, ensure_ascii=False)}
"""
        think_val = OllamaService.get_think_param(db, config['model'])
        payload = {
            "model": config['model'],
            "prompt": prompt,
            "stream": False
        }
        if think_val is not None:
            payload["think"] = think_val

        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{config['url']}/api/generate",
                    json=payload,
                    timeout=120.0
                )
                response.raise_for_status()
                content = response.json().get("response", "")
                return OllamaService.clean_text_response(content)
        except Exception as e:
            return f"Error connectant amb IA: {str(e)}"

    @staticmethod
    def _detect_contract_type(description: str) -> str:
        """Detecta el tipus de contracte per guiar la cerca CPV."""
        desc_lower = description.lower().strip()
        
        # 1. PRIORITAT MÀXIMA: Paraules al principi de la descripció (indicador definitiu)
        supply_starts = ['subministrament', 'adquisició', 'compra', 'lliurament', 'equipament']
        service_starts = ['manteniment', 'servei de', 'serveis de', 'reparació', 'consultoria',
                          'assessorament', 'gestió de', 'suport', 'assistència']
        works_starts = ['obra', 'obres', 'construcció', 'rehabilitació', 'urbanització',
                        'pavimentació', 'edificació', 'demolició', 'adequació', 'reforma']
        
        for w in supply_starts:
            if desc_lower.startswith(w):
                return "subministrament"
        for w in service_starts:
            if desc_lower.startswith(w):
                return "servei"
        for w in works_starts:
            if desc_lower.startswith(w):
                return "obra"
        
        # 2. FALLBACK: Scoring per paraules clau (quan el principi no és definitiu)
        # Serveis / Manteniment
        service_words = ['manteniment', 'reparació', 'consultoria',
                         'assessorament', 'gestió', 'vigilància',
                         'preventiu', 'correctiu', 'assistència', 'suport', 'formació',
                         'auditoria', 'inspecció', 'revisió']
        # Obres
        works_words = ['obra', 'obres', 'construcció', 'rehabilitació', 'urbanització',
                       'pavimentació', 'edificació', 'demolició', 'adequació', 'reforma']
        # Subministrament
        supply_words = ['subministrament', 'adquisició', 'compra', 'lliurament',
                        'equipament', 'instal·lació', 'material', 'mobiliari']
        
        service_score = sum(1 for w in service_words if w in desc_lower)
        works_score = sum(1 for w in works_words if w in desc_lower)
        supply_score = sum(1 for w in supply_words if w in desc_lower)
        
        if service_score > supply_score and service_score > works_score:
            return "servei"
        elif works_score > supply_score and works_score > service_score:
            return "obra"
        else:
            return "subministrament"

    @staticmethod
    async def suggest_cpvs(db: Session, description: str) -> List[Dict[str, Any]]:
        """
        Cerca CPV híbrida (Text + LLM) per a màxima robustesa:
        1. Detectar tipus de contracte (servei/subministrament/obra).
        2. Extreure paraules clau del contracte.
        3. Cerca textual forta filtrada o ponderada pel tipus.
        4. El LLM tria el millor d'aquesta llista filtrada.
        """
        config = OllamaService.get_config(db, feature="cpv")
        think_val = OllamaService.get_think_param(db, config['model'])
        
        # 1. Detectar tipus de contracte
        contract_type = OllamaService._detect_contract_type(description)
        logger.info(f"CPV: Tipus de contracte detectat: {contract_type}")
        
        # 2. Extreure paraules clau
        raw_keywords = await OllamaService.extract_keywords(db, description)
        
        # Normalitzar: pot venir com a llista, dict, o string
        keywords = []
        if isinstance(raw_keywords, list):
            keywords = [str(k) for k in raw_keywords if isinstance(k, str)]
        elif isinstance(raw_keywords, dict):
            for v in list(raw_keywords.keys()) + list(raw_keywords.values()):
                if isinstance(v, str) and len(v) > 2:
                    keywords.extend(v.split())
                elif isinstance(v, list):
                    keywords.extend([str(x) for x in v if isinstance(x, str)])
        
        stopwords = {'de', 'del', 'la', 'les', 'el', 'els', 'per', 'pel', 'als', 'amb',
                     'una', 'un', 'uns', 'unes', 'que', 'com', 'més', 'des', 'dins',
                     'sobre', 'entre', 'fins', 'tot', 'seva', 'seus', 'ses', 'aquest',
                     'aquesta', 'servei', 'multi', 'tipus', 'dels', 'les'}
        
        if not keywords:
            keywords = [w for w in description.lower().split() if len(w) > 3 and w not in stopwords]
        
        # Afegir paraules de la descripció que no estiguin ja (per cobrir termes importants)
        desc_words = [w for w in description.lower().split() if len(w) > 3 and w not in stopwords]
        for w in desc_words:
            if w not in keywords:
                keywords.append(w)
        
        # Deduplicar
        keywords = list(dict.fromkeys(keywords))
        logger.info(f"CPV: Paraules clau: {keywords}")

        # 3. Cerca textual a la BD amb múltiples estratègies
        search_results = []
        seen_codes = set()
        match_scores = {}  # codigo -> score de rellevància
        
        def add_result(cpv, score=1.0):
            if cpv.codigo not in seen_codes:
                search_results.append(cpv)
                seen_codes.add(cpv.codigo)
                match_scores[cpv.codigo] = score
            else:
                # Incrementar score si ja existia (trobat per múltiples keywords)
                match_scores[cpv.codigo] = match_scores.get(cpv.codigo, 1.0) + score
        
        # 3a. Cerca amb combinacions de 2 paraules clau (AND) - Màxima precisió
        significant_keywords = [k for k in keywords if len(k) > 3][:8]
        for i, k1 in enumerate(significant_keywords):
            for k2 in significant_keywords[i+1:]:
                found = db.query(models.CPV).filter(
                    models.CPV.descripcion.ilike(f"%{k1}%"),
                    models.CPV.descripcion.ilike(f"%{k2}%")
                ).limit(10).all()
                for f in found:
                    add_result(f, score=3.0)  # Score alt: coincidència doble
        
        # 3b. Cerca per paraula clau individual
        for k in keywords[:8]:
            if len(k) < 3:
                continue
            found = db.query(models.CPV).filter(
                models.CPV.descripcion.ilike(f"%{k}%")
            ).limit(25).all()
            for f in found:
                add_result(f, score=1.0)
        
        # 3c. Cerca específica per tipus de contracte
        type_search_terms = {
            "servei": ["serveis de", "manteniment de", "reparació de", "servei de"],
            "obra": ["treballs de", "construcció de", "obres de"],
            "subministrament": []  # ja cobert per les paraules clau
        }
        
        # Combinar termes de tipus amb les paraules clau del domini
        domain_keywords = [k for k in significant_keywords 
                          if k not in {'manteniment', 'preventiu', 'correctiu', 'servei', 
                                       'serveis', 'subministrament', 'obra', 'obres',
                                       'reparació', 'treballs'}][:4]
        
        for prefix in type_search_terms.get(contract_type, []):
            # Buscar "serveis de [keyword]", "manteniment de [keyword]", etc.
            for dk in domain_keywords:
                found = db.query(models.CPV).filter(
                    models.CPV.descripcion.ilike(f"%{prefix}%"),
                    models.CPV.descripcion.ilike(f"%{dk}%")
                ).limit(10).all()
                for f in found:
                    add_result(f, score=4.0)  # Score molt alt: match per tipus + domini
            
            # Buscar només pel prefix de tipus (ampliar candidats)
            found = db.query(models.CPV).filter(
                models.CPV.descripcion.ilike(f"%{prefix}%")
            ).limit(10).all()
            for f in found:
                add_result(f, score=0.5)
        
        if not search_results:
            # Fallback: buscar paraules de la descripció directament
            for w in description.lower().split()[:10]:
                if len(w) < 4:
                    continue
                found = db.query(models.CPV).filter(models.CPV.descripcion.ilike(f"%{w}%")).limit(10).all()
                for f in found:
                    add_result(f, score=0.5)

        if not search_results:
            return []
        
        # Ordenar per score de rellevància (els millors primers)
        search_results.sort(key=lambda r: match_scores.get(r.codigo, 0), reverse=True)
        
        # Limitar als 60 millors candidats
        top_results = search_results[:60]
        
        logger.info(f"CPV: {len(search_results)} candidats trobats, top 5: {[(r.codigo, r.descripcion[:40]) for r in top_results[:5]]}")

        # 4. El LLM tria de la llista
        list_text = "\n".join([f"- {r.codigo}: {r.descripcion} ({r.nivel})" for r in top_results])
        
        type_instruction = {
            "servei": "Aquest contracte és de SERVEIS/MANTENIMENT. Prioritza CPVs que comencin per 'Serveis de...', 'Manteniment de...' o 'Reparació de...' (divisions 50, 71-79). NO triïs CPVs de subministrament de productes.",
            "obra": "Aquest contracte és d'OBRES. Prioritza CPVs que comencin per 'Treballs de...' o 'Construcció de...' (divisions 45). NO triïs CPVs de subministrament de materials.",
            "subministrament": "Aquest contracte és de SUBMINISTRAMENT. Prioritza CPVs que descriguin el producte concret a comprar."
        }
        
        prompt = f"""Ets un expert en classificació CPV (Common Procurement Vocabulary). Has de triar el codi CPV MÉS ESPECÍFIC i EXACTE per al contracte descrit.

CONTRACTE: "{description}"

TIPUS DE CONTRACTE DETECTAT: {contract_type.upper()}
{type_instruction.get(contract_type, '')}

CANDIDATS TROBATS A LA BASE DE DADES (ordenats per rellevància):
{list_text}

REGLES CRÍTIQUES (seguir en ordre de prioritat):
1. ESPECIFICITAT: Tria SEMPRE el codi de nivell "Categoria" si encaixa, NO el "Grup" ni la "Classe" genèrics.
   - Ex: Si existeix "Ordinadors portàtils (Categoria)" NO triïs "Ordinadors personals (Categoria)" ni "Maquinari de microordinadors (Categoria)".
   - Ex: Si existeix "Serveis de manteniment d'enllumenat (Categoria)" NO triïs "Serveis de manteniment d'instal·lacions d'enllumenat públic i semàfors (Classe)".
2. COHERÈNCIA AMB TIPUS: El codi ha de ser coherent amb el tipus de contracte (servei/subministrament/obra).
3. OBJECTE PRINCIPAL: Tria el codi que descriu l'OBJECTE PRINCIPAL del contracte, no accessoris ni peces.
   - Ex: "ordinadors portàtils" → "Ordinadors portàtils" (NO "Peces d'ordinadors" NI "Accessoris")
   - Ex: "vehicle amb grua" → "Camions grua" o "Vehicles d'ús especial" (NO "Grues" NI "Vehicles tot terreny")
4. Respon NOMÉS amb un JSON vàlid (array d'objectes). Tria 1-3 codis ordenats per rellevància.

FORMAT DE RESPOSTA:
[
  {{"codigo": "CODI-CPV", "descripcion": "Descripció", "score": 0.95, "justificacion": "Raó breu"}}
]
"""
        try:
            async with httpx.AsyncClient() as client:
                res = await client.post(
                    f"{config['url']}/api/generate",
                    json={
                        "model": config['model'],
                        "prompt": prompt,
                        "stream": False,
                        "format": "json",
                        "think": think_val
                    },
                    timeout=90.0
                )
                res.raise_for_status()
                data = json.loads(OllamaService.clean_json_response(res.json().get("response", "[]")))
                
                # Normalitzar llista
                if isinstance(data, dict):
                    for k in ["suggestions", "results", "cpvs"]:
                        if k in data: data = data[k]; break
                if isinstance(data, dict): data = [data]

                final = []
                for s in (data if isinstance(data, list) else [])[:5]:
                    code = s.get("codigo")
                    db_cpv = db.query(models.CPV).filter(models.CPV.codigo == code).first()
                    if db_cpv:
                        s["descripcion"] = db_cpv.descripcion
                        final.append(s)
                return final
        except Exception as e:
            logger.error(f"Error hybrid step: {e}")
            return []
    @staticmethod
    async def get_available_models(db: Session) -> List[str]:
        config = OllamaService.get_config(db)
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(f"{config['url']}/api/tags", timeout=10.0)
                response.raise_for_status()
                data = response.json()
                
                # Manejar format de llista directa o diccionari amb clau 'models'
                if isinstance(data, list):
                    models_list = data
                else:
                    models_list = data.get("models", [])
                
                return [m["name"] for m in models_list]
        except Exception as e:
            logger.error(f"Error fetching Ollama models: {e}")
            return []
