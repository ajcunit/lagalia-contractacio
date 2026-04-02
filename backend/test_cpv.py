from database import SessionLocal
from services.ollama_service import OllamaService
import asyncio

async def test():
    db = SessionLocal()
    
    test_cases = [
        {
            "desc": "Compra d'una furgoneta per al servei de jardineria municipal",
            "expected": "34136"  # Prefix dels furgons
        },
        {
            "desc": """Servei per part d'una entitat protectora, especialitzada en la recollida, el tracte i la gestió d'animals de companyia, sobretot gossos, per efectuar les tasques inherents a la recollida i cura dels animals, junt amb la gestió de les instal·lació de la gossera municipal""",
            "expected": "98380000-0"  # Serveis de gossera
        }
    ]
    
    for tc in test_cases:
        desc = tc["desc"]
        expected = tc["expected"]
        print(f"\n{'='*60}")
        print(f"DESC: {desc[:80]}...")
        
        # Clean + type
        cleaned = OllamaService._clean_description(desc)
        ctype = OllamaService._detect_contract_type(desc)
        print(f"CLEAN: {cleaned[:80]}")
        print(f"TYPE:  {ctype}")
        
        # Keywords
        keywords = await OllamaService.extract_keywords(db, cleaned)
        print(f"KWS:   {keywords}")
        
        # DB check
        from models import CPV
        for k in (keywords or [])[:5]:
            res = db.query(CPV).filter(CPV.descripcion.ilike(f"%{k}%")).limit(3).all()
            if res:
                print(f"  '{k}' -> {[(r.codigo, r.descripcion[:40]) for r in res]}")
        
        print(f"EXPECTED CPV prefix: {expected}")

if __name__ == "__main__":
    asyncio.run(test())
