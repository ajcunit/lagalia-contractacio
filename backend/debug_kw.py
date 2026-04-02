import asyncio, httpx, json
from database import SessionLocal
from services.ollama_service import OllamaService

async def test():
    db = SessionLocal()
    config = OllamaService.get_config(db, feature='cpv')
    desc = "Compra d'una furgoneta per al servei de jardineria municipal"
    prompt = f"Extreu 5 paraules clau en catala per cercar CPV. Retorna NOMES un array JSON de strings. Exemple: [\"furgons\",\"vehicles\"]. Objecte: {desc}"
    payload = {'model': config['model'], 'prompt': prompt, 'stream': False, 'format': 'json'}
    async with httpx.AsyncClient() as client:
        r = await client.post(f"{config['url']}/api/generate", json=payload, timeout=60.0)
        raw = r.json().get('response', '')
        print('RAW:', repr(raw[:500]))
        cleaned = OllamaService.clean_json_response(raw)
        print('CLEANED:', repr(cleaned[:300]))
        parsed = json.loads(cleaned)
        print('PARSED TYPE:', type(parsed), 'VALUE:', parsed)

asyncio.run(test())
