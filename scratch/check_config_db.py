import sys
import os

# Afegir el directori actual al path per poder importar els mòduls del backend
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from core.database import SessionLocal
import models

def check_config():
    db = SessionLocal()
    try:
        configs = db.query(models.Configuracion).all()
        print("--- CONFIGURACIÓ ACTUAL A LA BD ---")
        for c in configs:
            print(f"{c.clave}: {c.valor}")
        if not configs:
            print("La taula de configuració està BUIDA.")
    except Exception as e:
        print(f"Error llegint la BD: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    check_config()
