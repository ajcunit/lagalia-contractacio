"""
Control d'accés per departament — SEGUR.
- Sense SQL raw (tot ORM parametritzat)
- Sense fitxers de debug
"""
from sqlalchemy.orm import Query
from sqlalchemy import or_
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
    dept_ids = [d.id for d in current_user.departamentos] if current_user.departamentos else []

    if not dept_ids:
        if hasattr(model, 'responsables'):
            return query.filter(model.responsables.any(id=current_user.id))
        else:
            return query.filter(model.id < 0)

    if hasattr(model, 'departamentos'):
        dept_cond = model.departamentos.any(models.Departamento.id.in_(dept_ids))
    else:
        dept_cond = model.departamento_id.in_(dept_ids)

    if hasattr(model, 'responsables'):
        return query.filter(
            or_(
                dept_cond,
                model.responsables.any(id=current_user.id)
            )
        )
        
    return query.filter(dept_cond)


# ELIMINAT: get_sql_dept_filter()
# Era vulnerable a SQL injection: f" AND departamento_id = {dept_id} "
# Si cal SQL raw, usar paràmetres enlazats:
#   db.execute(text("SELECT * FROM x WHERE dept_id = :d"), {"d": dept_id})
