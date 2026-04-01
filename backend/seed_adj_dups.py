from sqlalchemy import text
from database import SessionLocal
import models
import os

db = SessionLocal()
try:
    # 1. Detectar per NIF
    query = text("""
        SELECT adjudicatari_nif as nif, 
               STRING_AGG(DISTINCT adjudicatari_nom, ' | ') as noms
        FROM contratos 
        WHERE adjudicatari_nif IS NOT NULL AND adjudicatari_nif != ''
        GROUP BY adjudicatari_nif 
        HAVING COUNT(DISTINCT adjudicatari_nom) > 1
    """)
    results = db.execute(query).mappings().all()
    count = 0
    for r in results:
        nif = r['nif']
        noms = r['noms'].split(' | ')
        # Generem parelles (tots amb el primer, per simplicitat de validació)
        canonico = noms[0]
        for i in range(1, len(noms)):
            otro = noms[i]
            # Evitem duplicar si ja existeix a la taula de duplicats
            exists = db.query(models.DuplicadoAdjudicatario).filter(
                ((models.DuplicadoAdjudicatario.nombre_1 == canonico) & (models.DuplicadoAdjudicatario.nombre_2 == otro)) |
                ((models.DuplicadoAdjudicatario.nombre_1 == otro) & (models.DuplicadoAdjudicatario.nombre_2 == canonico))
            ).first()
            
            if not exists:
                new_dup = models.DuplicadoAdjudicatario(
                    nombre_1=canonico,
                    nombre_2=otro,
                    nif=nif,
                    motivo="Mateix NIF amb noms diferents",
                    estado="pendiente"
                )
                db.add(new_dup)
                count += 1
    
    db.commit()
    print(f"S'han creat {count} avisos de duplicats d'adjudicataris per NIF.")
    
except Exception as e:
    db.rollback()
    print(f"Error: {e}")
finally:
    db.close()
