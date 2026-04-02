import os
import sys
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv

# Add parent dir to path if needed
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

import models

load_dotenv()

# Database setup
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/contractacio")
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_contract_type_from_cpv(cpv_code):
    if not cpv_code:
        return "unknown"
    
    # Simple logic based on CPV divisions
    # 45xxxxxx-x: Works (Obres)
    # 00-44, 48: Supplies (Subministraments)
    # 50-98: Services (Serveis)
    
    prefix = cpv_code[:2]
    if prefix == "45":
        return "obra"
    elif prefix.isdigit() and int(prefix) < 45 or prefix == "48":
        return "subministrament"
    else:
        return "servei"

from services.ollama_service import OllamaService

def detect_contract_type_logic(description):
    """Use the real logic from the service"""
    return OllamaService._detect_contract_type(description)

def analyze():
    db = SessionLocal()
    try:
        # Get contracts with CPV and Object
        contracts = db.query(
            models.Contrato.objecte_contracte,
            models.Contrato.cpv_principal_codi,
            models.Contrato.cpv_principal_descripcio,
            models.Contrato.tipus_contracte
        ).filter(
            models.Contrato.cpv_principal_codi.isnot(None),
            models.Contrato.objecte_contracte.isnot(None)
        ).all()
        
        print(f"Found {len(contracts)} contracts for analysis.")
        
        results = []
        matches = 0
        total = 0
        
        confusion = {
            "obra": {}, "servei": {}, "subministrament": {}, "unknown": {}
        }
        type_counts = {"obra": 0, "servei": 0, "subministrament": 0, "unknown": 0}

        for c in contracts:
            actual_type = get_contract_type_from_cpv(c.cpv_principal_codi)
            detected_type = detect_contract_type_logic(c.objecte_contracte)
            
            total += 1
            type_counts[actual_type] += 1
            confusion[actual_type][detected_type] = confusion[actual_type].get(detected_type, 0) + 1
            
            if actual_type == detected_type:
                matches += 1
            else:
                results.append({
                    "object": c.objecte_contracte,
                    "cpv": c.cpv_principal_codi,
                    "cpv_desc": c.cpv_principal_descripcio,
                    "actual": actual_type,
                    "detected": detected_type
                })
            
        print(f"\nOverall Type detection accuracy: {matches/total if total > 0 else 0:.2%}")
        
        # Save to CSV for inspection
        import csv
        with open("cpv_failures.csv", "w", newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(f, fieldnames=["actual", "detected", "cpv", "cpv_desc", "object"])
            writer.writeheader()
            writer.writerows(results)
        print(f"Saved {len(results)} failures to cpv_failures.csv")

    finally:
        db.close()

if __name__ == "__main__":
    analyze()
