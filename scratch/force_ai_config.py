import sys
import os

# Afegir el directori actual al path per poder importar els mòduls del backend
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from core.database import SessionLocal
import models

def force_ai_config():
    db = SessionLocal()
    try:
        def set_val(clave, valor):
            cfg = db.query(models.Configuracion).filter(models.Configuracion.clave == clave).first()
            if cfg:
                cfg.valor = valor
            else:
                cfg = models.Configuracion(clave=clave, valor=valor)
                db.add(cfg)
            print(f"Configurat: {clave} -> {valor}")

        # Forçar els valors de la captura de pantalla
        set_val("ai_provider", "ollama")
        set_val("ai_active", "true")
        set_val("ollama_url", "http://192.168.50.83:11434")
        set_val("ollama_model", "qwen3.6:35b")
        set_val("ollama_model_cpv", "qwen3.6:35b") # Per si de cas
        
        db.commit()
        print("--- Configuració forçada correctament ---")
    except Exception as e:
        print(f"Error forçant la configuració: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    force_ai_config()
