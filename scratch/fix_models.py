from core.database import SessionLocal
import models

def fix():
    db = SessionLocal()
    try:
        def set_val(clave, valor):
            cfg = db.query(models.Configuracion).filter(models.Configuracion.clave == clave).first()
            if cfg:
                cfg.valor = valor
            else:
                cfg = models.Configuracion(clave=clave, valor=valor)
                db.add(cfg)
            print(f"OK: {clave} -> {valor}")

        model_name = "qwen3.6:35b"
        set_val("ollama_model", model_name)
        set_val("ollama_model_cpv", model_name)
        set_val("ollama_model_auditoria", model_name)
        set_val("ai_provider", "ollama")
        set_val("ai_active", "true")
        
        db.commit()
        print("Configuració de models corregida!")
    except Exception as e:
        print(f"Error: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    fix()
