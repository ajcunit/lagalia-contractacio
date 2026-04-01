from sqlalchemy.orm import Query
from sqlalchemy import or_
import models

def apply_department_filter(query: Query, model, current_user: models.Empleado, view_mode: str) -> Query:
    """
    Filtra les consultes SQLAlchemy per departament basat en el rol de l'usuari i la vista (view_mode).
    Suposa que el 'model' té una columna 'departamento_id'.
    """
    with open("debug_access.txt", "a") as f:
        f.write(f"DEBUG: User={current_user.email}, Role={current_user.rol}, ViewMode={view_mode}, DeptID={current_user.departamento_id}\n")
    admin_roles = ['admin', 'responsable_contratacion']
    
    # Si és admin/responsable i està a la vista 'admin', retornem la query original (ho veu tot + sense assignar)
    if current_user.rol in admin_roles and view_mode == 'admin':
        return query
        
    # Si és un usuari bàsic O un admin a la vista 'usuari', filtrem estrictament pel seu departament.
    dept_id = current_user.departamento_id
    
    # Si de casualitat l'usuari no té cap departament assignat, no veu res (filtre impossible)
    if not dept_id:
        return query.filter(model.id == -1) 

    return query.filter(model.departamento_id == dept_id)

def get_sql_dept_filter(current_user: models.Empleado, view_mode: str) -> str:
    """
    Retorna l'string per afegir a clàusules WHERE de crides RAW SQL.
    """
    admin_roles = ['admin', 'responsable_contratacion']
    if current_user.rol in admin_roles and view_mode == 'admin':
        return ""
        
    dept_id = current_user.departamento_id
    if not dept_id:
        return " AND departamento_id = -1 "
        
    return f" AND departamento_id = {dept_id} "
