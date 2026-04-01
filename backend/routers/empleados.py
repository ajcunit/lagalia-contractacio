from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from database import get_db
import models
import schemas
from services.auth_service import get_current_user

router = APIRouter(prefix="/empleados", tags=["empleados"])


@router.get("/", response_model=List[schemas.EmpleadoConDepartamento])
def list_empleados(
    skip: int = 0, 
    limit: int = 100, 
    activo: Optional[bool] = None,
    departamento_id: Optional[int] = None,
    rol: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(models.Empleado)
    if activo is not None:
        query = query.filter(models.Empleado.activo == activo)
    if departamento_id is not None:
        query = query.filter(models.Empleado.departamento_id == departamento_id)
    if rol is not None:
        query = query.filter(models.Empleado.rol == rol)
    return query.offset(skip).limit(limit).all()


@router.get("/{empleado_id}", response_model=schemas.EmpleadoConDepartamento)
def get_empleado(empleado_id: int, db: Session = Depends(get_db)):
    emp = db.query(models.Empleado).filter(models.Empleado.id == empleado_id).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Empleado no encontrado")
    return emp


@router.post("/", response_model=schemas.Empleado)
def create_empleado(
    empleado: schemas.EmpleadoCreate, 
    db: Session = Depends(get_db),
    current_user: models.Empleado = Depends(get_current_user)
):
    if current_user.rol not in ["admin", "responsable_contratacion"]:
        raise HTTPException(status_code=403, detail="No tens permissos per crear usuaris")
    # Check if email already exists
    existing = db.query(models.Empleado).filter(models.Empleado.email == empleado.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="El email ya está registrado")
    
    # Check if departamento exists
    if empleado.departamento_id:
        dept = db.query(models.Departamento).filter(models.Departamento.id == empleado.departamento_id).first()
        if not dept:
            raise HTTPException(status_code=404, detail="Departamento no encontrado")
    
    emp_data = empleado.model_dump()
    password = emp_data.pop("password", None)
    if password:
        emp_data["hashed_password"] = AuthService.get_password_hash(password)
        
    db_emp = models.Empleado(**emp_data)
    db.add(db_emp)
    db.commit()
    db.refresh(db_emp)
    return db_emp


@router.put("/{empleado_id}", response_model=schemas.Empleado)
def update_empleado(
    empleado_id: int, 
    empleado: schemas.EmpleadoUpdate, 
    db: Session = Depends(get_db),
    current_user: models.Empleado = Depends(get_current_user)
):
    if current_user.rol not in ["admin", "responsable_contratacion"]:
        raise HTTPException(status_code=403, detail="No tens permissos per modificar usuaris")
    db_emp = db.query(models.Empleado).filter(models.Empleado.id == empleado_id).first()
    if not db_emp:
        raise HTTPException(status_code=404, detail="Empleado no encontrado")
    
    update_data = empleado.model_dump(exclude_unset=True)
    
    # Check if new departamento exists
    if "departamento_id" in update_data and update_data["departamento_id"]:
        dept = db.query(models.Departamento).filter(models.Departamento.id == update_data["departamento_id"]).first()
        if not dept:
            raise HTTPException(status_code=404, detail="Departamento no encontrado")
            
    # Handle password update
    if "password" in update_data:
        password = update_data.pop("password")
        if password: # Only hash if not empty
            db_emp.hashed_password = AuthService.get_password_hash(password)
    
    for field, value in update_data.items():
        setattr(db_emp, field, value)
    
    db.commit()
    db.refresh(db_emp)
    return db_emp


@router.delete("/{empleado_id}")
def delete_empleado(
    empleado_id: int, 
    db: Session = Depends(get_db),
    current_user: models.Empleado = Depends(get_current_user)
):
    if current_user.rol not in ["admin", "responsable_contratacion"]:
        raise HTTPException(status_code=403, detail="No tens permissos per desactivar usuaris")
    db_emp = db.query(models.Empleado).filter(models.Empleado.id == empleado_id).first()
    if not db_emp:
        raise HTTPException(status_code=404, detail="Empleado no encontrado")
    
    # Soft delete - just deactivate
    db_emp.activo = False
    db.commit()
    return {"message": "Empleado desactivado correctamente"}
