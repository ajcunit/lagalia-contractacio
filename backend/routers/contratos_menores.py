from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from database import get_db
import models
import schemas
from services.auth_service import get_current_user
from services.access_control import apply_department_filter
from sqlalchemy import or_, func
from fastapi import Header

router = APIRouter(prefix="/contratos-menores", tags=["contratos-menores"])

@router.get("/", response_model=List[schemas.ContratoMenor])
def list_contratos_menores(
    skip: int = 0,
    limit: int = 50,
    search: Optional[str] = None,
    adjudicatari: Optional[str] = None,
    exercici: Optional[int] = None,
    recent: Optional[bool] = False,
    departamento_id: Optional[int] = None,
    estado_interno: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: models.Empleado = Depends(get_current_user),
    x_view_mode: str = Header(alias="X-View-Mode", default="user")
):
    query = db.query(models.ContratoMenor)
    query = apply_department_filter(query, models.ContratoMenor, current_user, x_view_mode)

    if search:
        search_filter = f"%{search}%"
        query = query.filter(
            or_(
                models.ContratoMenor.codi_expedient.ilike(search_filter),
                models.ContratoMenor.descripcio_expedient.ilike(search_filter)
            )
        )
    
    if adjudicatari:
        query = query.filter(models.ContratoMenor.adjudicatari.ilike(f"%{adjudicatari}%"))
        
    if exercici:
        query = query.filter(models.ContratoMenor.exercici == exercici)
        
    if recent:
        from sqlalchemy import text
        query = query.filter(text("data_adjudicacio >= date('now', '-1 year')"))

    if departamento_id:
        query = query.filter(models.ContratoMenor.departamento_id == departamento_id)

    if estado_interno:
        query = query.filter(models.ContratoMenor.estado_interno == estado_interno)

    total = query.count()
    contratos = query.order_by(models.ContratoMenor.data_adjudicacio.desc().nullslast()).offset(skip).limit(limit).all()
    
    return contratos

@router.get("/{id}", response_model=schemas.ContratoMenor)
def get_contrato_menor(id: int, db: Session = Depends(get_db)):
    contrato = db.query(models.ContratoMenor).filter(models.ContratoMenor.id == id).first()
    if not contrato:
        raise HTTPException(status_code=404, detail="Contrato menor no encontrado")
    return contrato

@router.post("/sincronizar")
def sincronizar_menores(
    codi_ine10: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: models.Empleado = Depends(get_current_user)
):
    if current_user.rol not in ["admin", "responsable_contratacion"]:
        raise HTTPException(status_code=403, detail="No tens permissos per sincronitzar contractes")
        
    from services.sync_service import SyncService
    if not codi_ine10:
        codi_ine10 = SyncService.get_config_val(db, "ine10_code", SyncService.DEFAULT_INE10)
    
    stats = SyncService.sync_menores(db, codi_ine10)
    return {"message": "Sincronització de menors completada", "stats": stats}

@router.put("/{id}", response_model=schemas.ContratoMenor)
def update_contrato_menor(
    id: int,
    contrato: schemas.ContratoMenorUpdate,
    db: Session = Depends(get_db),
    current_user: models.Empleado = Depends(get_current_user)
):
    db_contrato = db.query(models.ContratoMenor).filter(models.ContratoMenor.id == id).first()
    if not db_contrato:
        raise HTTPException(status_code=404, detail="Contracte menor no trobat")
        
    if current_user.rol not in ["admin", "responsable_contratacion"]:
        raise HTTPException(status_code=403, detail="No tens permissos per modificar contractes")
        
    update_data = contrato.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_contrato, field, value)
        
    db.commit()
    db.refresh(db_contrato)
    return db_contrato

@router.post("/asignar_masivo")
def asignar_masivo_menores(
    asignacion: schemas.ContratoMassAssign,
    db: Session = Depends(get_db),
    current_user: models.Empleado = Depends(get_current_user)
):
    if current_user.rol not in ["admin", "responsable_contratacion"]:
        raise HTTPException(status_code=403, detail="No tens permissos per assignar contractes massivament")
    
    contratos = db.query(models.ContratoMenor).filter(
        models.ContratoMenor.id.in_(asignacion.contrato_ids)
    ).all()
    
    for c in contratos:
        c.departamento_id = asignacion.departamento_id
        
    db.commit()
    return {"message": f"{len(contratos)} contractes menors assignats correctament"}
