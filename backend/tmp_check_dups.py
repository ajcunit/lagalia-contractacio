from sqlalchemy import text
from database import engine
import os

try:
    with engine.connect() as conn:
        # Cerquem NIFs que tinguin més d'un nom associat als contractes majors
        query = text("""
            SELECT adjudicatari_nif, COUNT(DISTINCT adjudicatari_nom) as num_noms, 
                   STRING_AGG(DISTINCT adjudicatari_nom, ' | ') as noms
            FROM contratos 
            WHERE adjudicatari_nif IS NOT NULL AND adjudicatari_nif != ''
            GROUP BY adjudicatari_nif 
            HAVING COUNT(DISTINCT adjudicatari_nom) > 1
            LIMIT 20
        """)
        results = conn.execute(query).mappings().all()
        print(f"S'han trobat {len(results)} NIFs amb noms duplicats.")
        for r in results:
            print(f"NIF {r['adjudicatari_nif']}: {r['noms']}")
except Exception as e:
    print(f"Error: {e}")
