import asyncio, httpx, json
import sys
import os

# Adaptar path si cal per importar d'allà
sys.path.append(os.getcwd())

from database import SessionLocal
from services.ollama_service import OllamaService

async def debug_one(desc):
    db = SessionLocal()
    config = OllamaService.get_config(db, feature="cpv")
    print(f"\n--- TESTING DESCRIPTION: {desc} ---")
    
    # Provem el prompt que volem usar
    prompt = f"De la descripció següent, extreu 3-5 paraules clau en català per cercar codis CPV. Retorna NOMÉS un array JSON de strings. Descripció: {desc}"
    payload = {"model": config['model'], "prompt": prompt, "stream": False, "format": "json"}
    
    async with httpx.AsyncClient() as client:
        r = await client.post(f"{config['url']}/api/generate", json=payload, timeout=60.0)
        raw = r.json().get("response", "")
        print(f"RAW RESP: {repr(raw)}")
        
        cleaned = OllamaService.clean_json_response(raw)
        print(f"CLEANED: {repr(cleaned)}")
        
        try:
            parsed = json.loads(cleaned)
            print(f"PARSED: {parsed}")
            if isinstance(parsed, dict):
                # Si Ollama força un objecte (format:json sovint ho fa)
                for v in parsed.values():
                    if isinstance(v, list):
                        print(f"EXTRACTED FROM LIST VALUE: {v}")
                print(f"EXTRACTED FROM KEYS: {list(parsed.keys())}")
        except Exception as e:
            print(f"ERROR PARSING: {e}")

async def main():
    test_cases = [
        "Contractació per la redacció del projecte d'obres de renovació de xarxa d'aigua potable",
        "Representació i defensa de l'Ajuntament de Cunit en aquest recurs ordinari",
        "Servei de recollida de trucades d'atenció al ciutadà fent el despatx corresponent",
        "Contractació dels serveis artístics per la realització dels concerts en la Festa Major d'hivern",
        "Prestació serveis per cobrir les necessitats específiques dels sistemes de xarxa wifi"
    ]
    for desc in test_cases:
        await debug_one(desc)

if __name__ == "__main__":
    asyncio.run(main())
