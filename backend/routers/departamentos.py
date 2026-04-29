from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from core.database import get_db
import models
import schemas
from services.auth_service import get_current_user

router = APIRouter(prefix="/departamentos", tags=["departamentos"])


@router.get("/", response_model=List[schemas.Departamento])
def list_departamentos(
    skip: int = 0, 
    limit: int = 100, 
    activo: Optional[bool] = None,
    db: Session = Depends(get_db)
):
    query = db.query(models.Departamento)
    if activo is not None:
        query = query.filter(models.Departamento.activo == activo)
    return query.offset(skip).limit(limit).all()


@router.get("/{departamento_id}", response_model=schemas.Departamento)
def get_departamento(departamento_id: int, db: Session = Depends(get_db)):
    dept = db.query(models.Departamento).filter(models.Departamento.id == departamento_id).first()
    if not dept:
        raise HTTPException(status_code=404, detail="Departamento no encontrado")
    return dept


@router.post("/", response_model=schemas.Departamento)
def create_departamento(
    departamento: schemas.DepartamentoCreate, 
    db: Session = Depends(get_db),
    current_user: models.Empleado = Depends(get_current_user)
):
    if current_user.rol not in ["admin", "responsable_contratacion"]:
        raise HTTPException(status_code=403, detail="No tens permissos per crear departaments")
    # Check if codigo already exists
    existing = db.query(models.Departamento).filter(models.Departamento.codigo == departamento.codigo).first()
    if existing:
        raise HTTPException(status_code=400, detail="El código de departamento ya existe")
    
    db_dept = models.Departamento(**departamento.model_dump())
    db.add(db_dept)
    db.commit()
    db.refresh(db_dept)
    return db_dept


@router.put("/{departamento_id}", response_model=schemas.Departamento)
def update_departamento(
    departamento_id: int, 
    departamento: schemas.DepartamentoUpdate, 
    db: Session = Depends(get_db),
    current_user: models.Empleado = Depends(get_current_user)
):
    if current_user.rol not in ["admin", "responsable_contratacion"]:
        raise HTTPException(status_code=403, detail="No tens permissos per modificar departaments")
    db_dept = db.query(models.Departamento).filter(models.Departamento.id == departamento_id).first()
    if not db_dept:
        raise HTTPException(status_code=404, detail="Departamento no encontrado")
    
    update_data = departamento.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_dept, field, value)
    
    db.commit()
    db.refresh(db_dept)
    return db_dept


@router.delete("/{departamento_id}")
def delete_departamento(
    departamento_id: int, 
    db: Session = Depends(get_db),
    current_user: models.Empleado = Depends(get_current_user)
):
    if current_user.rol not in ["admin", "responsable_contratacion"]:
        raise HTTPException(status_code=403, detail="No tens permissos per desactivar departaments")
    db_dept = db.query(models.Departamento).filter(models.Departamento.id == departamento_id).first()
    if not db_dept:
        raise HTTPException(status_code=404, detail="Departamento no encontrado")
    
    # Soft delete - just deactivate
    db_dept.activo = False
    db.commit()
    return {"message": "Departamento desactivado correctamente"}


@router.get("/{departamento_id}/empleados", response_model=List[schemas.Empleado])
def get_departamento_empleados(departamento_id: int, db: Session = Depends(get_db)):
    dept = db.query(models.Departamento).filter(models.Departamento.id == departamento_id).first()
    if not dept:
        raise HTTPException(status_code=404, detail="Departamento no encontrado")
    return db.query(models.Empleado).filter(
        models.Empleado.departamentos.any(models.Departamento.id == departamento_id)
    ).all()


@router.get("/{departamento_id}/contratos", response_model=List[schemas.ContratoListItem])
def get_departamento_contratos(
    departamento_id: int, 
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db)
):
    dept = db.query(models.Departamento).filter(models.Departamento.id == departamento_id).first()
    if not dept:
        raise HTTPException(status_code=404, detail="Departamento no encontrado")
    return db.query(models.Contrato).filter(
        func.coalesce(models.Contrato.origen, 'local') == 'local',
        models.Contrato.departamentos.any(models.Departamento.id == departamento_id)
    ).order_by(models.Contrato.data_publicacio.desc()).offset(skip).limit(limit).all()
