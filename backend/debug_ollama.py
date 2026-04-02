import asyncio, httpx, json
from database import SessionLocal
from services.ollama_service import OllamaService

async def main():
    db = SessionLocal()
    config = OllamaService.get_config(db, feature="cpv")
    print(f"Ollama URL: {config['url']}")
    print(f"Ollama Model: {config['model']}")
    
    desc = "Contractació per la redacció del projecte d'obres de renovació de xarxa d'aigua potable"
    print(f"\nTesting extract_keywords for: {desc}")
    
    keywords = await OllamaService.extract_keywords(db, desc)
    print(f"Keywords: {keywords}")
    
    # Try raw call
    prompt = f"Digues 3 paraules clau per: {desc}"
    payload = {"model": config['model'], "prompt": prompt, "stream": False}
    try:
        async with httpx.AsyncClient() as client:
            r = await client.post(f"{config['url']}/api/generate", json=payload, timeout=30)
            print(f"Raw Status: {r.status_code}")
            print(f"Raw Body: {r.text[:200]}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(main())
