from fastapi import APIRouter, Depends, Query, HTTPException, Header
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import List, Dict, Any
from core.database import get_db
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
    dept_ids = [d.id for d in current_user.departamentos]
    dept_filter_major = ""
    dept_filter_menor = ""
    if current_user.rol not in admin_roles or x_view_mode != 'admin':
        if not dept_ids:
            dept_filter_major = " AND 1=0 "
            dept_filter_menor = " AND 1=0 "
        else:
            ids_str = ",".join(map(str, dept_ids))
            dept_filter_major = f" AND EXISTS (SELECT 1 FROM contrato_departamentos WHERE contrato_id = contratos.id AND departamento_id IN ({ids_str}))"
            dept_filter_menor = f" AND EXISTS (SELECT 1 FROM contrato_menor_departamentos WHERE contrato_menor_id = contratos_menores.id AND departamento_id IN ({ids_str}))"

    query = f"""
    WITH combined AS (
        SELECT adjudicatari_nom as nombre, import_adjudicacio_amb_iva as importe, adjudicatari_nif as nif
        FROM contratos
        WHERE adjudicatari_nom IS NOT NULL AND adjudicatari_nom != '' AND COALESCE(origen, 'local') = 'local' {dept_filter_major}
        
        UNION ALL
        
        SELECT adjudicatari as nombre, import_adjudicacio as importe, NULL as nif
        FROM contratos_menores
        WHERE adjudicatari IS NOT NULL AND adjudicatari != '' {dept_filter_menor}
    ),
    grouped AS (
        SELECT 
            nombre,
            MAX(nif) as nif,
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
        WHERE adjudicatari_nom IS NOT NULL AND adjudicatari_nom != '' AND COALESCE(origen, 'local') = 'local' {dept_filter_major}
        
        UNION
        
        SELECT adjudicatari as nombre
        FROM contratos_menores
        WHERE adjudicatari IS NOT NULL AND adjudicatari != '' {dept_filter_menor}
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
    dept_ids = [d.id for d in current_user.departamentos]
    dept_filter_major = ""
    dept_filter_menor = ""
    if current_user.rol not in admin_roles or x_view_mode != 'admin':
        if not dept_ids:
            dept_filter_major = " AND 1=0 "
            dept_filter_menor = " AND 1=0 "
        else:
            ids_str = ",".join(map(str, dept_ids))
            dept_filter_major = f" AND EXISTS (SELECT 1 FROM contrato_departamentos WHERE contrato_id = contratos.id AND departamento_id IN ({ids_str}))"
            dept_filter_menor = f" AND EXISTS (SELECT 1 FROM contrato_menor_departamentos WHERE contrato_menor_id = contratos_menores.id AND departamento_id IN ({ids_str}))"

    query = f"""
    SELECT id, codi_expedient, objecte_contracte as descripcion, import_adjudicacio_amb_iva as importe, 'major' as tipo_registro, data_inici as fecha, estat_actual as estado
    FROM contratos
    WHERE adjudicatari_nom = :nombre AND COALESCE(origen, 'local') = 'local' {dept_filter_major}
    
    UNION ALL
    
    SELECT id, codi_expedient, descripcio_expedient as descripcion, import_adjudicacio as importe, 'menor' as tipo_registro, data_adjudicacio as fecha, 'Adjudicat' as estado
    FROM contratos_menores
    WHERE adjudicatari = :nombre {dept_filter_menor}
    
    ORDER BY fecha DESC NULLS LAST
    """
    
    results = db.execute(text(query), {"nombre": nombre}).mappings().all()
    
    total_importe = sum((r['importe'] or 0) for r in results)
    
    # We also might want the NIF if it's available in the major contracts
    nif_query = "SELECT adjudicatari_nif FROM contratos WHERE adjudicatari_nom = :nombre AND COALESCE(origen, 'local') = 'local' AND adjudicatari_nif IS NOT NULL LIMIT 1"
    nif_result = db.execute(text(nif_query), {"nombre": nombre}).scalar()
    
    return {
        "nombre": nombre,
        "nif": nif_result,
        "total_contratos": len(results),
        "total_importe": total_importe,
        "contratos": [dict(r) for r in results]
    }


import schemas


@router.get("/duplicados/lista", response_model=List[schemas.DuplicadoAdjudicatario])
def list_duplicados_adjudicataris(db: Session = Depends(get_db)):
    """Llista els duplicats d'adjudicataris pendents"""
    return db.query(models.DuplicadoAdjudicatario).filter(
        models.DuplicadoAdjudicatario.estado == 'pendiente'
    ).order_by(models.DuplicadoAdjudicatario.fecha_deteccion.desc()).all()


@router.post("/duplicados/{dup_id}/gestionar")
def gestionar_duplicado_adjudicatario(
    dup_id: int,
    gestion: schemas.DuplicadoAdjudicatarioGestion,
    db: Session = Depends(get_db),
    current_user: models.Empleado = Depends(get_current_user)
):
    """Fusiona o rebutja un duplicat d'adjudicatari"""
    if current_user.rol not in ["admin", "responsable_contratacion"]:
        raise HTTPException(status_code=403, detail="No tens permissos")

    dup = db.query(models.DuplicadoAdjudicatario).filter(models.DuplicadoAdjudicatario.id == dup_id).first()
    if not dup:
        raise HTTPException(status_code=404, detail="No trobat")

    accion = gestion.accion
    if accion == "rechazar":
        dup.estado = "rechazado"
        db.commit()
        return {"message": "Duplicat marcat com a diferent (rebutjat)"}

    # Fusionar
    canonico = dup.nombre_1 if accion == "fusionar_1" else dup.nombre_2
    original = dup.nombre_2 if accion == "fusionar_1" else dup.nombre_1

    # 1. Crear àlies permanent (o actualitzar si ja existia)
    alias = db.query(models.AliasAdjudicatario).filter(models.AliasAdjudicatario.nombre_original == original).first()
    if not alias:
        alias = models.AliasAdjudicatario(nombre_original=original, nombre_canonico=canonico)
        db.add(alias)
    else:
        alias.nombre_canonico = canonico

    # 2. Actualitzar contractes existents (Majors)
    db.query(models.Contrato).filter(models.Contrato.adjudicatari_nom == original).update(
        {models.Contrato.adjudicatari_nom: canonico}, synchronize_session=False
    )

    # 3. Actualitzar contractes menors
    db.query(models.ContratoMenor).filter(models.ContratoMenor.adjudicatari == original).update(
        {models.ContratoMenor.adjudicatari: canonico}, synchronize_session=False
    )

    # 4. Marcar duplicat com a fusionat
    dup.estado = "fusionado"
    
    db.commit()
    return {"message": f"Fusió realitzada correctament a '{canonico}'."}
