from core.database import SessionLocal
import models
import httpx
import json

def compare_one():
    db = SessionLocal()
    expediente = "5324/2021"
    contrato = db.query(models.Contrato).filter(models.Contrato.codi_expedient == expediente).first()
    
    if not contrato:
        print(f"No s'ha trobat el contracte {expediente}")
        return

    # Fetch data from API for this expedient
    codi_ine10 = "4305160009"
    url = f"https://analisi.transparenciacatalunya.cat/resource/ybgg-dgi6.json?codi_expedient={expediente}&codi_ine10={codi_ine10}"
    r = httpx.get(url)
    api_records = r.json()
    
    if not api_records:
        print("No s'ha trobat a l'API")
        return
        
    record = api_records[0] # Agafem el primer
    
    print(f"Comparant {expediente}:")
    
    fields_to_check = [
        "objecte_contracte", "preu_adjudicar", "import_adjudicacio_amb_iva", 
        "cpv_principal_codi", "data_anunci_adjudicacio"
    ]
    
    # Simulem el mapped_data del sync_service per ser fidels
    from services.sync_service import SyncService
    mapped = SyncService.map_api_to_model(record)
    
    for f in fields_to_check:
        db_val = getattr(contrato, f)
        api_val = mapped.get(f)
        
        match = db_val == api_val
        print(f"Camp: {f}")
        print(f"  DB:  '{db_val}' ({type(db_val)})")
        print(f"  API: '{api_val}' ({type(api_val)})")
        print(f"  Match: {match}")
        if not match:
            if isinstance(db_val, str) and isinstance(api_val, str):
                print(f"  Len DB: {len(db_val)}, Len API: {len(api_val)}")
    
    db.close()

if __name__ == "__main__":
    compare_one()
