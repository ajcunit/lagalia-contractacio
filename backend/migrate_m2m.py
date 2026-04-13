from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
import os

# Configuration from environment (approximated for local but adaptable)
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/contractacio")

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def migrate():
    db = SessionLocal()
    try:
        print("Starting M2M migration...")
        
        # 1. Empleados
        print("Migrating Empleados...")
        empleados = db.execute(text("SELECT id, departamento_id FROM empleados WHERE departamento_id IS NOT NULL")).fetchall()
        for emp_id, dept_id in empleados:
            # Check if exists to avoid duplicates
            exists = db.execute(text("SELECT 1 FROM empleado_departamentos WHERE empleado_id = :e AND departamento_id = :d"), 
                              {"e": emp_id, "d": dept_id}).fetchone()
            if not exists:
                db.execute(text("INSERT INTO empleado_departamentos (empleado_id, departamento_id) VALUES (:e, :d)"),
                          {"e": emp_id, "d": dept_id})
        
        # 2. Contratos
        print("Migrating Contratos...")
        contratos = db.execute(text("SELECT id, departamento_id FROM contratos WHERE departamento_id IS NOT NULL")).fetchall()
        for c_id, dept_id in contratos:
            exists = db.execute(text("SELECT 1 FROM contrato_departamentos WHERE contrato_id = :c AND departamento_id = :d"),
                              {"c": c_id, "d": dept_id}).fetchone()
            if not exists:
                db.execute(text("INSERT INTO contrato_departamentos (contrato_id, departamento_id) VALUES (:c, :d)"),
                          {"c": c_id, "d": dept_id})

        # 3. Contratos Menores
        print("Migrating Contratos Menores...")
        # Note: I just added contracto_menor_departamentos table, so it should exist if Base.metadata.create_all was called.
        # But if not, we can create it or ignore if it fails.
        try:
            menores = db.execute(text("SELECT id, departamento_id FROM contratos_menores WHERE departamento_id IS NOT NULL")).fetchall()
            for c_id, dept_id in menores:
                exists = db.execute(text("SELECT 1 FROM contrato_menor_departamentos WHERE contrato_menor_id = :c AND departamento_id = :d"),
                                  {"c": c_id, "d": dept_id}).fetchone()
                if not exists:
                    db.execute(text("INSERT INTO contrato_menor_departamentos (contrato_menor_id, departamento_id) VALUES (:c, :d)"),
                              {"c": c_id, "d": dept_id})
        except Exception as e:
            print(f"Skipping Contratos Menores migration (table might not exist yet): {e}")

        db.commit()
        print("Migration completed successfully.")
    except Exception as e:
        db.rollback()
        print(f"Migration failed: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    migrate()
