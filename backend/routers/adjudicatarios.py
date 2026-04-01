from fastapi import APIRouter, Depends, Query, HTTPException, Header
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import List, Dict, Any
from database import get_db
import models
from services.auth_service import get_current_user

router = APIRouter(
    prefix="/adjudicatarios",
    tags=["adjudicatarios"]
)

@router.get("/", response_model=Dict[str, Any])
def get_adjudicatarios(
    db: Session = Depends(get_db), 
    limit: int = 50, 
    offset: int = 0, 
    search: str | None = None,
    sort_by: str = Query("total_importe", description="Columna para ordenar: total_importe, total_contratos, nombre"),
    sort_desc: bool = Query(True, description="Orden descendente"),
    current_user: models.Empleado = Depends(get_current_user),
    x_view_mode: str = Header(alias="X-View-Mode", default="user")
):
    search_filter = ""
    params: Dict[str, Any] = {}
    if search:
        search_filter = "WHERE LOWER(nombre) LIKE LOWER(:search)"
        params['search'] = f"%{search}%"
        
    order_clause = "total_importe DESC NULLS LAST"
    if sort_by == 'nombre':
        order_clause = f"nombre {'DESC' if sort_desc else 'ASC'}"
    elif sort_by == 'total_contratos':
        order_clause = f"total_contratos {'DESC' if sort_desc else 'ASC'}"
    elif sort_by == 'total_importe':
        order_clause = f"total_importe {'DESC' if sort_desc else 'ASC'} NULLS LAST"

    admin_roles = ['admin', 'responsable_contratacion']
    dept_filter = ""
    if current_user.rol not in admin_roles or x_view_mode != 'admin':
        dept_id = current_user.departamento_id if current_user.departamento_id else -1
        dept_filter = f" AND departamento_id = {dept_id}"

    query = f"""
    WITH combined AS (
        SELECT adjudicatari_nom as nombre, import_adjudicacio_amb_iva as importe
        FROM contratos
        WHERE adjudicatari_nom IS NOT NULL AND adjudicatari_nom != '' {dept_filter}
        
        UNION ALL
        
        SELECT adjudicatari as nombre, import_adjudicacio as importe
        FROM contratos_menores
        WHERE adjudicatari IS NOT NULL AND adjudicatari != '' {dept_filter}
    ),
    grouped AS (
        SELECT 
            nombre,
            COUNT(*) as total_contratos,
            SUM(importe) as total_importe
        FROM combined
        {search_filter}
        GROUP BY nombre
    )
    SELECT * FROM grouped
    ORDER BY {order_clause}
    LIMIT :limit OFFSET :offset
    """
    params['limit'] = limit
    params['offset'] = offset
    
    results = db.execute(text(query), params).mappings().all()
    
    count_query = f"""
    WITH combined AS (
        SELECT adjudicatari_nom as nombre
        FROM contratos
        WHERE adjudicatari_nom IS NOT NULL AND adjudicatari_nom != '' {dept_filter}
        
        UNION
        
        SELECT adjudicatari as nombre
        FROM contratos_menores
        WHERE adjudicatari IS NOT NULL AND adjudicatari != '' {dept_filter}
    )
    SELECT COUNT(*) as total FROM combined
    {search_filter}
    """
    total_count = db.execute(text(count_query), params).scalar()
    
    return {
        "items": [dict(r) for r in results],
        "total": total_count,
        "limit": limit,
        "offset": offset
    }

@router.get("/{nombre_b64}", response_model=Dict[str, Any])
def get_adjudicatario_detalle(
    nombre_b64: str, 
    db: Session = Depends(get_db),
    current_user: models.Empleado = Depends(get_current_user),
    x_view_mode: str = Header(alias="X-View-Mode", default="user")
):
    import base64
    import urllib.parse
    try:
        # Add padding back if missing
        padded_b64 = nombre_b64 + "=" * ((4 - len(nombre_b64) % 4) % 4)
        # Decode base64 then unquote URI components
        decoded_b64 = base64.urlsafe_b64decode(padded_b64.encode()).decode('utf-8')
        nombre = urllib.parse.unquote(decoded_b64)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Nom invàlid o mal formatat: {str(e)}")

    admin_roles = ['admin', 'responsable_contratacion']
    dept_filter = ""
    if current_user.rol not in admin_roles or x_view_mode != 'admin':
        dept_id = current_user.departamento_id if current_user.departamento_id else -1
        dept_filter = f" AND departamento_id = {dept_id}"

    query = f"""
    SELECT id, codi_expedient, objecte_contracte as descripcion, import_adjudicacio_amb_iva as importe, 'major' as tipo_registro, data_inici as fecha, estat_actual as estado
    FROM contratos
    WHERE adjudicatari_nom = :nombre {dept_filter}
    
    UNION ALL
    
    SELECT id, codi_expedient, descripcio_expedient as descripcion, import_adjudicacio as importe, 'menor' as tipo_registro, data_adjudicacio as fecha, 'Adjudicat' as estado
    FROM contratos_menores
    WHERE adjudicatari = :nombre {dept_filter}
    
    ORDER BY fecha DESC NULLS LAST
    """
    
    results = db.execute(text(query), {"nombre": nombre}).mappings().all()
    
    total_importe = sum((r['importe'] or 0) for r in results)
    
    # We also might want the NIF if it's available in the major contracts
    nif_query = "SELECT adjudicatari_nif FROM contratos WHERE adjudicatari_nom = :nombre AND adjudicatari_nif IS NOT NULL LIMIT 1"
    nif_result = db.execute(text(nif_query), {"nombre": nombre}).scalar()
    
    return {
        "nombre": nombre,
        "nif": nif_result,
        "total_contratos": len(results),
        "total_importe": total_importe,
        "contratos": [dict(r) for r in results]
    }
