from fastapi import APIRouter, Depends, HTTPException, Header
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import List, Dict, Any, Optional
from pydantic import BaseModel
from database import get_db
import models
from services.auth_service import get_current_user
from services.ai_service import AIService
from services.access_control import get_sql_dept_filter

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
    dept_filter = get_sql_dept_filter(current_user, x_view_mode)
    
    # Contractes menors adjudicats al mateix proveïdor en l'últim any que sumen > 15.000€ i tenen > 1 contracte
    query = f"""
    SELECT adjudicatari as nombre, SUM(import_adjudicacio) as importe_total, COUNT(id) as numero_contratos
    FROM contratos_menores 
    WHERE data_adjudicacio >= date('now', '-1 year') AND adjudicatari IS NOT NULL {dept_filter}
    GROUP BY adjudicatari 
    HAVING SUM(import_adjudicacio) >= 15000 AND COUNT(id) > 1
    ORDER BY importe_total DESC
    """
    
    result = db.execute(text(query)).mappings().all()
    # Convert mappings to dicts
    return [dict(row) for row in result]

@router.get("/redflags/bajas_temerarias")
def get_bajas_temerarias(
    db: Session = Depends(get_db), 
    current_user: models.Empleado = Depends(get_current_user),
    x_view_mode: str = Header(alias="X-View-Mode", default="user")
):
    check_auditoria_permission(current_user)
    dept_filter = get_sql_dept_filter(current_user, x_view_mode)
    
    # Adjudicacions un 20% més barates que el pressupost de licitació
    # preu_adjudicar vs preu_licitar
    query = f"""
    SELECT id, codi_expedient, objecte_contracte, adjudicatari_nom, preu_licitar, preu_adjudicar, 
           ((preu_licitar - preu_adjudicar) / NULLIF(preu_licitar, 0)) * 100 as porcentaje_baja
    FROM contratos
    WHERE preu_licitar > 0 AND preu_adjudicar > 0 {dept_filter}
    AND preu_adjudicar <= preu_licitar * 0.8  -- Més d'un 20% de baixa
    ORDER BY porcentaje_baja DESC
    LIMIT 100
    """
    
    result = db.execute(text(query)).mappings().all()
    return [dict(row) for row in result]

@router.get("/redflags/falta_concurrencia")
def get_falta_concurrencia(db: Session = Depends(get_db), current_user: models.Empleado = Depends(get_current_user)):
    check_auditoria_permission(current_user)
    # This might require checking 'numero_licitadors' if we had that field. 
    # Let's check for 'procediment' == 'Obert' but maybe very few bidders? We don't have numero_licitadors in model.
    # Return empty for now or adapt
    return []

@router.get("/redflags/caducidad_proxima")
def get_caducidad_proxima(
    db: Session = Depends(get_db), 
    current_user: models.Empleado = Depends(get_current_user),
    x_view_mode: str = Header(alias="X-View-Mode", default="user")
):
    check_auditoria_permission(current_user)
    dept_filter = get_sql_dept_filter(current_user, x_view_mode)
    
    query = f"""
    SELECT id, codi_expedient, objecte_contracte, adjudicatari_nom, data_finalitzacio_calculada as fecha_fin
    FROM contratos
    WHERE estat_actual = 'Execució' {dept_filter}
    AND data_finalitzacio_calculada >= date('now') 
    AND data_finalitzacio_calculada <= date('now', '+6 months')
    ORDER BY data_finalitzacio_calculada ASC
    """
    
    result = db.execute(text(query)).mappings().all()
    return [dict(row) for row in result]

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
        "posibles_fraccionamientos": fraccionamientos[:5],  # Limitem per no ofegar el prompt
        "bajas_temerarias_excesivas": bajas[:5],
        "caducidad_proxima": caducidad[:5]
    }
    
    analysis = await AIService.analyze_auditoria(db, data, custom_prompt=request.custom_prompt)
    return {"analysis": analysis}
