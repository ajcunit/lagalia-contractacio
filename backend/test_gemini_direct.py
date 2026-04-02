import asyncio
from database import SessionLocal
from services.ai_service import AIService
import json

async def test_gemini():
    db = SessionLocal()
    description = "Servei de manteniment preventiu i correctiu de l'enllumenat públic de la zona sud"
    print(f"Buscant CPV per: {description}")
    
    try:
        suggestions = await AIService.suggest_cpvs(db, description)
        print("\nSUGGERIMENTS GEMINI:")
        for s in suggestions:
            print(f"- {s.get('codigo')}: {s.get('descripcion')}")
            print(f"  Puntuació: {s.get('score')}")
            print(f"  Justificació: {s.get('justificacion')}")
            print("-" * 20)
    except Exception as e:
        print(f"Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    asyncio.run(test_gemini())
