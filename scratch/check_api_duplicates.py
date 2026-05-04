import httpx
from collections import Counter

def check_api_duplicates():
    codi_ine10 = "4305160009"
    url = f"https://analisi.transparenciacatalunya.cat/resource/ybgg-dgi6.json?codi_ine10={codi_ine10}&$limit=50000"
    r = httpx.get(url)
    data = r.json()
    
    keys = []
    for record in data:
        exp = record.get("codi_expedient")
        estat = record.get("resultat") or record.get("fase_publicacio")
        lot = record.get("numero_lot")
        if exp:
            keys.append((exp, estat, lot))
            
    counts = Counter(keys)
    duplicates = {k: v for k, v in counts.items() if v > 1}
    
    print(f"Total registres API: {len(data)}")
    print(f"Combinacions (Expedient, Estat, Lot) duplicades: {len(duplicates)}")
    
    print("\nExemples de duplicats:")
    for k, v in list(duplicates.items())[:10]:
        print(f"- {k}: {v} vegades")

if __name__ == "__main__":
    check_api_duplicates()
