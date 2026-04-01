from database import SessionLocal
import models
from datetime import datetime

def init_gemini_config():
    db = SessionLocal()
    try:
        # 1. AI Provider (Default to ollama)
        if not db.query(models.Configuracion).filter(models.Configuracion.clave == "ai_provider").first():
            db.add(models.Configuracion(
                clave="ai_provider",
                valor="ollama",
                descripcion="Proveïdor d'IA a utilitzar: 'ollama' o 'gemini'"
            ))
            
        # 2. Gemini API Key
        if not db.query(models.Configuracion).filter(models.Configuracion.clave == "gemini_api_key").first():
            db.add(models.Configuracion(
                clave="gemini_api_key",
                valor="",
                descripcion="Clau API de Google AI Studio per gemini"
            ))

        # 4. Prompts d'IA
        prompts = {
            "prompt_cpv_extract": """Ets un expert en CPV europeu. Per aquest objecte de contracte:
\"{description}\"

1. Extrau 4-6 paraules clau en català (noms o adjectius).
2. Identifica les 2 DIVISIONS (els 2 primers dígits) més probables.
3. Suggereix 3 CODIS CPV (8 dígits) concrets que podrien ser els correctes.

Respon NOMÉS amb aquest format:
Paraules: paraula1, paraula2...
Divisions: 00, 00
Codis: 00000000, 00000000...""",

            "prompt_cpv_rank": """You are an expert in European public procurement, specialized in CPV classification (Reg. 213/2008). 
Your task is to rank the candidates provided below for the contract description. 
Select the most specific and accurate code.
Return a valid JSON array of objects with 'codigo', 'descripcion', 'score' (0.0-1.0), and 'justificacion' (short, in Catalan).""",

            "prompt_auditoria": """Ets un auditor expert en contractació pública. Analitza aquestes dades de risc (redflags):
{data}

{custom_prompt}

Proporciona un informe executiu breu (en català) amb:
1. Resum de riscos detectats.
2. Recomanacions d'actuació.
Utilitza format Markdown."""
        }

        for clave, valor in prompts.items():
            if not db.query(models.Configuracion).filter(models.Configuracion.clave == clave).first():
                db.add(models.Configuracion(
                    clave=clave,
                    valor=valor,
                    descripcion=f"Prompt per a {clave.replace('prompt_', '')}"
                ))

        db.commit()
        print("Configuració de Gemini i Prompts inicialitzada correctament.")
    except Exception as e:
        print(f"Error: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    init_gemini_config()
