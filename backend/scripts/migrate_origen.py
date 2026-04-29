"""
Migració: Afegir camp 'origen' a la taula contratos.

Executa amb:
    python scripts/migrate_origen.py

Això:
1. Afegeix la columna 'origen' (VARCHAR(20), default 'local') si no existeix.
2. Marca tots els contractes existents com a 'local' (ja que tots eren de l'ajuntament).
"""
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from core.database import engine
from sqlalchemy import text

def migrate():
    with engine.connect() as conn:
        # Check if column already exists
        result = conn.execute(text("""
            SELECT column_name FROM information_schema.columns 
            WHERE table_name = 'contratos' AND column_name = 'origen'
        """))
        
        if result.fetchone():
            print("✅ La columna 'origen' ja existeix. No cal migrar.")
            return
        
        print("🔄 Afegint columna 'origen' a la taula contratos...")
        conn.execute(text("""
            ALTER TABLE contratos 
            ADD COLUMN origen VARCHAR(20) DEFAULT 'local'
        """))
        
        # Set all existing to 'local' (they are all from the ajuntament sync)
        result = conn.execute(text("UPDATE contratos SET origen = 'local' WHERE origen IS NULL"))
        print(f"✅ {result.rowcount} contractes marcats com a 'local'")
        
        # Create index
        conn.execute(text("CREATE INDEX IF NOT EXISTS ix_contratos_origen ON contratos (origen)"))
        print("✅ Índex creat sobre 'origen'")
        
        conn.commit()
        print("✅ Migració completada amb èxit!")

if __name__ == "__main__":
    migrate()
