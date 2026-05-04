from core.database import SessionLocal
import models
import json

def check_last_sync():
    db = SessionLocal()
    last_sync = db.query(models.Sincronizacion).order_by(models.Sincronizacion.id.desc()).first()
    if not last_sync:
        print("No s'ha trobat cap sincronització.")
        return

    print(f"Sincronització ID: {last_sync.id}")
    print(f"Nuevos: {last_sync.registros_nuevos}")
    print(f"Actualizados: {last_sync.registros_actualizados}")
    
    if last_sync.log_errores:
        try:
            log_data = json.loads(last_sync.log_errores)
            detalles = log_data.get("detalles", [])
            actualitzats = [d for d in detalles if d.get("tipo") == "actualitzat"]
            
            print(f"\nMostrant els primers 10 actualitzats de {len(actualitzats)} totals:")
            for act in actualitzats[:10]:
                print(f"- Expedient: {act.get('expedient')}")
                print(f"  Missatge: {act.get('missatge')}")
        except Exception as e:
            print(f"Error llegint log: {e}")
    
    db.close()

if __name__ == "__main__":
    check_last_sync()
