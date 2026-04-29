"""
Router d'auditoria — Anàlisi de red flags i riscos en contractació.
SEGUR: Sense SQL raw amb concatenació, usa ORM parametritzat.
"""
from fastapi import APIRouter, Depends, HTTPException, Header
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, cast, Float
from typing import List, Dict, Any, Optional
from pydantic import BaseModel
from datetime import datetime, timedelta
from core.database import get_db
import models
from services.auth_service import get_current_user
from services.ai_service import AIService
from services.access_control import apply_department_filter

router = APIRouter(prefix="/auditoria", tags=["auditoria"])

class AuditoriaAIRequest(BaseModel):
    custom_prompt: Optional[str] = None

def check_auditoria_permission(user: models.Empleado):
    if not user.permiso_auditoria and user.rol != 'admin':
        raise HTTPException(status_code=403, detail="No tens permisos d'auditoria (Intervenció)")

@router.get("/redflags/fraccionamientos")
def get_posibles_fraccionamientos(
    db: Session = Depends(get_db), 
    current_user: models.Empleado = Depends(get_current_user),
    x_view_mode: str = Header(alias="X-View-Mode", default="user")
):
    check_auditoria_permission(current_user)
    
    one_year_ago = datetime.now() - timedelta(days=365)
    
    query = db.query(
        models.ContratoMenor.adjudicatari.label("nombre"),
        func.sum(models.ContratoMenor.import_adjudicacio).label("importe_total"),
        func.count(models.ContratoMenor.id).label("numero_contratos"),
    ).filter(
        models.ContratoMenor.data_adjudicacio >= one_year_ago,
        models.ContratoMenor.adjudicatari.isnot(None),
    )
    
    # Aplicar filtre de departament de forma segura
    if current_user.rol not in ['admin', 'responsable_contratacion'] or x_view_mode != 'admin':
        dept_ids = [d.id for d in current_user.departamentos]
        if dept_ids:
            query = query.filter(models.ContratoMenor.departamentos.any(models.Departamento.id.in_(dept_ids)))
        else:
            return []
    
    results = query.group_by(
        models.ContratoMenor.adjudicatari
    ).having(
        and_(
            func.sum(models.ContratoMenor.import_adjudicacio) >= 15000,
            func.count(models.ContratoMenor.id) > 1,
        )
    ).order_by(
        func.sum(models.ContratoMenor.import_adjudicacio).desc()
    ).all()
    
    return [{"nombre": r.nombre, "importe_total": float(r.importe_total or 0), "numero_contratos": r.numero_contratos} for r in results]

@router.get("/redflags/bajas_temerarias")
def get_bajas_temerarias(
    db: Session = Depends(get_db), 
    current_user: models.Empleado = Depends(get_current_user),
    x_view_mode: str = Header(alias="X-View-Mode", default="user")
):
    check_auditoria_permission(current_user)
    
    query = db.query(models.Contrato).filter(
        func.coalesce(models.Contrato.origen, 'local') == 'local',
        models.Contrato.preu_licitar > 0,
        models.Contrato.preu_adjudicar > 0,
        models.Contrato.preu_adjudicar <= models.Contrato.preu_licitar * 0.8,
    )
    
    query = apply_department_filter(query, models.Contrato, current_user, x_view_mode)
    
    results = query.order_by(
        ((models.Contrato.preu_licitar - models.Contrato.preu_adjudicar) / models.Contrato.preu_licitar).desc()
    ).limit(100).all()
    
    return [
        {
            "id": c.id,
            "codi_expedient": c.codi_expedient,
            "objecte_contracte": c.objecte_contracte,
            "adjudicatari_nom": c.adjudicatari_nom,
            "preu_licitar": float(c.preu_licitar or 0),
            "preu_adjudicar": float(c.preu_adjudicar or 0),
            "porcentaje_baja": round(((c.preu_licitar - c.preu_adjudicar) / c.preu_licitar) * 100, 1) if c.preu_licitar else 0,
        }
        for c in results
    ]

@router.get("/redflags/falta_concurrencia")
def get_falta_concurrencia(db: Session = Depends(get_db), current_user: models.Empleado = Depends(get_current_user)):
    check_auditoria_permission(current_user)
    return []

@router.get("/redflags/caducidad_proxima")
def get_caducidad_proxima(
    db: Session = Depends(get_db), 
    current_user: models.Empleado = Depends(get_current_user),
    x_view_mode: str = Header(alias="X-View-Mode", default="user")
):
    check_auditoria_permission(current_user)
    
    now = datetime.now()
    
    query = db.query(models.Contrato).filter(
        func.coalesce(models.Contrato.origen, 'local') == 'local',
        models.Contrato.alerta_finalitzacio == True
    )
    
    query = apply_department_filter(query, models.Contrato, current_user, x_view_mode)
    
    results = query.order_by(models.Contrato.data_finalitzacio_calculada.asc()).all()
    
    return [
        {
            "id": c.id,
            "codi_expedient": c.codi_expedient,
            "objecte_contracte": c.objecte_contracte,
            "adjudicatari_nom": c.adjudicatari_nom,
            "fecha_fin": str(c.data_finalitzacio_calculada) if c.data_finalitzacio_calculada else None,
        }
        for c in results
    ]

@router.post("/ai-analysis")
async def get_ai_analysis(
    request: AuditoriaAIRequest, 
    db: Session = Depends(get_db), 
    current_user: models.Empleado = Depends(get_current_user),
    x_view_mode: str = Header(alias="X-View-Mode", default="user")
):
    check_auditoria_permission(current_user)
    
    fraccionamientos = get_posibles_fraccionamientos(db, current_user, x_view_mode)
    bajas = get_bajas_temerarias(db, current_user, x_view_mode)
    caducidad = get_caducidad_proxima(db, current_user, x_view_mode)
    
    data = {
        "posibles_fraccionamientos": fraccionamientos[:5],
        "bajas_temerarias_excesivas": bajas[:5],
        "caducidad_proxima": caducidad[:5]
    }
    
    analysis = await AIService.analyze_auditoria(db, data, custom_prompt=request.custom_prompt)
    return {"analysis": analysis}
