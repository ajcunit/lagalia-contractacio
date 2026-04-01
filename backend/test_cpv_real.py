"""
Test del sistema de suggeriment CPV contra contractes reals de la BD.
Agafa N contractes aleatoris amb CPV assignat i comprova si el sistema encerta.
"""
import asyncio
import random
import sys
import unicodedata
from database import SessionLocal
from models import Contrato, CPV
from services.ollama_service import OllamaService

N_TESTS = 5  # Quants contractes provar

async def test_real_contracts():
    db = SessionLocal()
    
    # Agafar contractes ordinaris amb CPV i objecte no nuls, filtrant soroll administratiu
    contracts = db.query(Contrato).filter(
        Contrato.cpv_principal_codi.isnot(None),
        Contrato.objecte_contracte.isnot(None),
        Contrato.cpv_principal_codi != '',
        Contrato.objecte_contracte != '',
        ~Contrato.objecte_contracte.ilike('1.4.6.%'),
        ~Contrato.objecte_contracte.ilike('%MENOR%')
    ).all()
    
    if not contracts:
        print("No s'han trobat contractes amb CPV assignat.")
        return
    
    # Mostra aleatoria
    sample = random.sample(contracts, min(N_TESTS, len(contracts)))
    
    synonyms = {
        'furgoneta': ['furgons'], 'furgonetes': ['furgons'],
        'gossera': ['gossos'], 'software': ['programari'],
        'ordinador': ['equips informatics'], 'platja': ['platges', 'plaja'],
        'plaja': ['platja', 'platges'], 'festa': ['festes', 'esdeveniments'],
        'festes': ['festa', 'esdeveniments'], 'jardineris': ['jardins', 'jardineria'],
        'jardins': ['jardineria', 'paisatgisme'], 'paisatge': ['paisatgisme', 'jardins'],
        'aigues': ['aigua', 'distribucio'], 'aigüa': ['distribucio', 'conduccio'],
        'acces': ['accessibilitat'], 'camio': ['vehicles pesants', 'camions'],
        'vela': ['tenda', 'carpa', 'marquesina', 'parasol'],
        'climatitzacio': ['calefaccio', 'ventilacio', 'aire condicionat', 'clima'],
        'vials': ['pavimentacio', 'asfaltat', 'voreres', 'vies'],
        'projecte': ['redaccio', 'estudi', 'disseny', 'projectes']
    }
    
    hits = 0
    for i, c in enumerate(sample):
        expected_code = c.cpv_principal_codi.strip().split('||')[0].strip()
        expected_desc = c.cpv_principal_descripcio or '?'
        obj = c.objecte_contracte.strip()
        
        db_cpv = db.query(CPV).filter(CPV.codigo == expected_code).first()
        
        sep = '=' * 65
        print(f"\n{sep}")
        print(f"[{i+1}/{N_TESTS}] Contracte: {c.codi_expedient}")
        print(f"  Objecte : {obj[:100]}{'...' if len(obj) > 100 else ''}")
        print(f"  Tipus   : {c.tipus_contracte or '?'}")
        print(f"  CPV BD  : {expected_code} -- {expected_desc[:60]}")
        print(f"  CPV exist: {'SI' if db_cpv else 'NO (CPV desconegut)'}")
        
        cleaned = OllamaService._clean_description(obj)
        detected_type = OllamaService._detect_contract_type(obj)
        
        from services.ai_service import AIService
        keywords, divisions, suggested_codes = await AIService.extract_keywords(db, cleaned)
        
        # Sincronitzar amb producció: si no n'hi ha, fem split de la descripció
        stopwords_prod = {'de', 'del', 'la', 'les', 'el', 'els', 'per', 'pel', 'als', 'amb', 'una', 'un', 'uns', 'unes', 'que', 'com', 'més', 'des', 'dins', 'sobre', 'entre', 'fins', 'tot', 'seva', 'seus', 'ses', 'aquest', 'aquesta', 'servei', 'multi', 'tipus', 'dels', 'les', 'cunit'}
        if not keywords:
            keywords = [w for w in cleaned.lower().split() if len(w) > 3 and w not in stopwords_prod]
            
        print(f"  Netejat : {cleaned[:80]}{'...' if len(cleaned) > 80 else ''}")
        print(f"  Tipus IA: {detected_type}")
        print(f"  Kw IA   : {keywords[:6]} | Divs: {divisions}")
        print(f"  IA Codes: {suggested_codes}")
        
        # Cerca candidats textuals
        candidates_found = set()
        
        # 1. Cerca Directa (IA suggested)
        for code in suggested_codes:
            found_code = db.query(CPV).filter(CPV.codigo.startswith(code)).first()
            if found_code: candidates_found.add(found_code.codigo)

        # 2. Cerca Jeràrquica (Divisions)
        for div in divisions:
            # Arrels
            prefix_root = f"{div}000000"
            res = db.query(CPV).filter(CPV.codigo.startswith(prefix_root)).limit(5).all()
            for r in res: candidates_found.add(r.codigo)
            # Ample (per prefix)
            prefix_broad = f"{div}%0000"
            res_broad = db.query(CPV).filter(CPV.codigo.ilike(prefix_broad)).limit(10).all()
            for r in res_broad: candidates_found.add(r.codigo)

        # 3. Cerca per paraules IA o split
        for kw in keywords[:12]:
            s = OllamaService._stem_catalan(kw)
            res = db.query(CPV).filter(CPV.descripcion.ilike(f"%{s}%")).limit(10).all()
            for r in res: candidates_found.add(r.codigo)
        
        # També paraules de la descripció neta directament (com fa suggest_cpvs)
        desc_words = [w for w in cleaned.lower().split() if len(w) > 3 and w not in stopwords_prod]
        for w in desc_words[:5]:
            if w not in keywords:
                s = OllamaService._stem_catalan(w)
                res = db.query(CPV).filter(CPV.descripcion.ilike(f"%{s}%")).limit(10).all()
                for r in res: candidates_found.add(r.codigo)
        
        # Expandir sinonims
        for k in list(keywords):
            k_norm = unicodedata.normalize('NFKD', k).encode('ASCII', 'ignore').decode('utf-8').lower()
            for syn in synonyms.get(k_norm, synonyms.get(k, [])):
                res = db.query(CPV).filter(CPV.descripcion.ilike(f"%{syn}%")).limit(5).all()
                for r in res: candidates_found.add(r.codigo)
        
        if expected_code in candidates_found:
            print(f"  [OK] CPV ESPERAT TROBAT entre {len(candidates_found)} candidats")
            hits += 1
        else:
            print(f"  [KO] CPV ESPERAT NO TROBAT en {len(candidates_found)} candidats")
            top_candidates = list(candidates_found)[:5]
            for tc in top_candidates:
                tc_cpv = db.query(CPV).filter(CPV.codigo == tc).first()
                if tc_cpv:
                    print(f"     Candidat: {tc_cpv.codigo} -- {tc_cpv.descripcion[:50]}")
    
    print(f"\n{'='*65}")
    print(f"RESULTAT: {hits}/{N_TESTS} CPVs esperats en candidats textuals ({hits/N_TESTS*100:.0f}%)")
    db.close()

if __name__ == "__main__":
    asyncio.run(test_real_contracts())
