"""
Script de migració per afegir les columnes noves a la taula contratos
i crear les noves taules (criteris_adjudicacio, membres_mesa, documents_fase).

Executa: python scripts/migrate_enrichment.py
"""
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from core.database import engine, Base
from sqlalchemy import text, inspect
import models  # Importem tots els models per registrar-los

def run_migration():
    inspector = inspect(engine)
    existing_tables = inspector.get_table_names()
    existing_columns = {}
    
    if 'contratos' in existing_tables:
        existing_columns = {c['name'] for c in inspector.get_columns('contratos')}
    
    # Noves columnes per a la taula contratos
    new_columns = {
        'normativa_aplicable': 'VARCHAR(255)',
        'tipus_publicacio_expedient': 'VARCHAR(100)',
        'procediment_adjudicacio': 'VARCHAR(255)',
        'acces_exclusiu': 'BOOLEAN',
        'tipus_oferta_electronica': 'VARCHAR(100)',
        'compra_publica_innovacio': 'BOOLEAN',
        'contracte_mixt': 'BOOLEAN',
        'te_lots': 'BOOLEAN',
        'contracte_harmonitzat': 'BOOLEAN',
        'data_termini_presentacio': 'TIMESTAMP',
        'preveuen_modificacions': 'BOOLEAN',
        'preveuen_prorrogues': 'BOOLEAN',
        'causa_habilitant': 'TEXT',
        'divisio_lots': 'VARCHAR(100)',
        'garantia_provisional': 'BOOLEAN',
        'garantia_definitiva': 'BOOLEAN',
        'percentatge_garantia_definitiva': 'NUMERIC(5, 2)',
        'reserva_social': 'BOOLEAN',
        'import_adjudicacio_sense_iva': 'NUMERIC(15, 2)',
        'iva_percentatge': 'NUMERIC(5, 2)',
        'valor_estimat_contracte': 'NUMERIC(15, 2)',
        'revisio_preus': 'VARCHAR(255)',
        'total_ofertes_rebudes': 'INTEGER',
        'durada_anys': 'INTEGER',
        'durada_mesos': 'INTEGER',
        'durada_dies': 'INTEGER',
        'data_inici_execucio': 'DATE',
        'data_fi_execucio': 'DATE',
        'adjudicatari_tipus_empresa': 'VARCHAR(100)',
        'adjudicatari_tercer_sector': 'VARCHAR(100)',
        'adjudicatari_telefon': 'VARCHAR(50)',
        'adjudicatari_email': 'VARCHAR(255)',
        'subcontractacio_permesa': 'BOOLEAN',
        'peu_recurs': 'TEXT',
        'fecha_enriquiment': 'TIMESTAMP',
    }
    
    with engine.begin() as conn:
        # 1. Afegir columnes noves a contratos
        added = 0
        for col_name, col_type in new_columns.items():
            if col_name not in existing_columns:
                try:
                    conn.execute(text(f'ALTER TABLE contratos ADD COLUMN {col_name} {col_type}'))
                    print(f'  ✅ Afegida columna: contratos.{col_name} ({col_type})')
                    added += 1
                except Exception as e:
                    print(f'  ⚠️ Error afegint {col_name}: {e}')
            else:
                pass  # Ja existeix
        
        if added == 0:
            print('  ℹ️ Totes les columnes ja existeixen a contratos')
        else:
            print(f'  📊 {added} columnes afegides a contratos')
    
    # 2. Crear noves taules (si no existeixen)
    all_new_tables = [
        'criteris_adjudicacio', 'membres_mesa', 'documents_fase',
        'contrato_departamentos', 'contrato_menor_departamentos',
        'empleado_departamentos', 'contrato_responsables',
        'pla_contractacio_entrades', 'proyectos_generacion', 'documentos_generacion',
    ]
    for table_name in all_new_tables:
        if table_name not in existing_tables:
            if table_name in Base.metadata.tables:
                Base.metadata.tables[table_name].create(engine)
                print(f'  ✅ Creada taula: {table_name}')
            else:
                print(f'  ⚠️ Taula {table_name} no trobada als models')
        else:
            print(f'  ℹ️ Taula {table_name} ja existeix')

    # Afegir columna meses_aviso_vencimiento si no existeix
    if 'meses_aviso_vencimiento' not in existing_columns:
        with engine.begin() as conn:
            try:
                conn.execute(text('ALTER TABLE contratos ADD COLUMN meses_aviso_vencimiento INTEGER'))
                print('  ✅ Afegida columna: contratos.meses_aviso_vencimiento')
            except Exception as e:
                print(f'  ⚠️ Error afegint meses_aviso_vencimiento: {e}')

    # Afegir columna permiso_pla_contractacio a empleados si no existeix
    if 'empleados' in existing_tables:
        emp_cols = {c['name'] for c in inspector.get_columns('empleados')}
        if 'permiso_pla_contractacio' not in emp_cols:
            with engine.begin() as conn:
                try:
                    conn.execute(text('ALTER TABLE empleados ADD COLUMN permiso_pla_contractacio BOOLEAN DEFAULT FALSE'))
                    print('  ✅ Afegida columna: empleados.permiso_pla_contractacio')
                except Exception as e:
                    print(f'  ⚠️ Error afegint permiso_pla_contractacio: {e}')

    # 3. Migrar dades de FK departamento_id cap a taules M2M
    _migrate_fk_to_m2m(inspector)

    print('\n✅ Migració completada!')


def _migrate_fk_to_m2m(inspector):
    """Migra les dades de departamento_id (FK antiga) a les taules M2M noves."""
    existing_tables = inspector.get_table_names()
    
    migrations = [
        {
            'source_table': 'contratos',
            'fk_column': 'departamento_id',
            'm2m_table': 'contrato_departamentos',
            'source_id_col': 'contrato_id',
        },
        {
            'source_table': 'contratos_menores',
            'fk_column': 'departamento_id',
            'm2m_table': 'contrato_menor_departamentos',
            'source_id_col': 'contrato_menor_id',
        },
        {
            'source_table': 'empleados',
            'fk_column': 'departamento_id',
            'm2m_table': 'empleado_departamentos',
            'source_id_col': 'empleado_id',
        },
    ]

    for mig in migrations:
        src = mig['source_table']
        fk = mig['fk_column']
        m2m = mig['m2m_table']
        src_id = mig['source_id_col']

        if src not in existing_tables or m2m not in existing_tables:
            continue

        src_cols = {c['name'] for c in inspector.get_columns(src)}
        if fk not in src_cols:
            print(f'  ℹ️ {src}.{fk} ja no existeix (migració ja feta)')
            continue

        with engine.begin() as conn:
            # Comptar quantes files M2M ja existeixen
            count_m2m = conn.execute(text(f'SELECT COUNT(*) FROM {m2m}')).scalar()
            
            # Comptar quantes files tenen departamento_id
            count_fk = conn.execute(text(f'SELECT COUNT(*) FROM {src} WHERE {fk} IS NOT NULL')).scalar()

            if count_fk > 0 and count_m2m == 0:
                # Migrar dades de FK a M2M
                conn.execute(text(
                    f'INSERT INTO {m2m} ({src_id}, departamento_id) '
                    f'SELECT id, {fk} FROM {src} WHERE {fk} IS NOT NULL'
                ))
                print(f'  ✅ Migrades {count_fk} relacions de {src}.{fk} → {m2m}')
            elif count_fk > 0 and count_m2m > 0:
                print(f'  ℹ️ {m2m} ja té {count_m2m} registres (migració ja feta)')
            else:
                print(f'  ℹ️ No hi ha dades a migrar per {src}.{fk}')


if __name__ == '__main__':
    print('🔄 Executant migració d\'enriquiment...\n')
    run_migration()
