import sys
import os

# Add backend directory to path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from core.config import settings
import models

engine = create_engine(settings.DATABASE_URL)
SessionLocal = sessionmaker(bind=engine)
db = SessionLocal()

try:
    print("Distinct levels in CPV table:")
    levels = db.query(models.CPV.nivel).distinct().all()
    for level in levels:
        print(f" - '{level[0]}'")

    count = db.query(models.CPV).count()
    print(f"Total CPVs: {count}")

    if count > 0:
        print("\nSample root nodes (nivel='Divisió'):")
        roots = db.query(models.CPV).filter(models.CPV.nivel == 'Divisió').limit(5).all()
        for r in roots:
            print(f"[{r.codigo}] {r.descripcion} (Padre: {r.padre_codigo})")

        print("\nSample nodes (any):")
        samples = db.query(models.CPV).limit(5).all()
        for s in samples:
            print(f"[{s.codigo}] {s.descripcion} ({s.nivel})")

finally:
    db.close()
