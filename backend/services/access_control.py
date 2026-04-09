"""
Control d'accés per departament — SEGUR.
- Sense SQL raw (tot ORM parametritzat)
- Sense fitxers de debug
"""
from sqlalchemy.orm import Query
import models

ADMIN_ROLES = ['admin', 'responsable_contratacion']


def apply_department_filter(
    query: Query,
    model,
    current_user: models.Empleado,
    view_mode: str,
) -> Query:
    """
    Filtra les consultes SQLAlchemy per departament basat en el rol de l'usuari.
    Suposa que el 'model' té una columna 'departamento_id'.
    """
    # Admin en vista admin → veu-ho tot
    if current_user.rol in ADMIN_ROLES and view_mode == 'admin':
        return query

    # Qualsevol altre cas → filtra per departament
    dept_id = current_user.departamento_id

    if not dept_id:
        # Sense departament assignat → no veu res
        return query.filter(model.id < 0)

    return query.filter(model.departamento_id == dept_id)


# ELIMINAT: get_sql_dept_filter()
# Era vulnerable a SQL injection: f" AND departamento_id = {dept_id} "
# Si cal SQL raw, usar paràmetres enlazats:
#   db.execute(text("SELECT * FROM x WHERE dept_id = :d"), {"d": dept_id})
