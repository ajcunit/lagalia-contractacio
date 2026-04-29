"""
Router del Pla de Contractació Anual.
Accés: admin, responsable_contratacion i usuaris amb permiso_pla_contractacio.
"""
from fastapi import APIRouter, Depends, HTTPException, Header
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from datetime import datetime, date

from core.database import get_db
import models, schemas
from services.auth_service import get_current_user

router = APIRouter(prefix="/pla-contractacio", tags=["pla-contractacio"])


def check_pla_permission(user: models.Empleado):
    if (
        user.rol not in ['admin', 'responsable_contratacion']
        and not getattr(user, 'permiso_pla_contractacio', False)
    ):
        raise HTTPException(status_code=403, detail="No tens permisos per accedir al Pla de Contractació")


def _serialize(entrada: models.PlaContractacioEntrada) -> dict:
    return {
        "id": entrada.id,
        "any_exercici": entrada.any_exercici,
        "trimestre": entrada.trimestre,
        "objecte": entrada.objecte,
        "tipus_contracte": entrada.tipus_contracte,
        "ambit_responsable": entrada.ambit_responsable,
        "observacions": entrada.observacions,
        "subvencionat": entrada.subvencionat,
        "import_estimat": float(entrada.import_estimat) if entrada.import_estimat else None,
        "estat": entrada.estat,
        "departamento_id": entrada.departamento_id,
        "departamento_nom": entrada.departamento.nombre if entrada.departamento else None,
        "contrato_id": entrada.contrato_id,
        "codi_expedient": entrada.contrato.codi_expedient if entrada.contrato else None,
        "creat_per_nom": entrada.creat_per.nombre if entrada.creat_per else None,
        "creat_at": entrada.creat_at.isoformat() if entrada.creat_at else None,
    }


@router.get("")
def get_pla_contractacio(
    any_exercici: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: models.Empleado = Depends(get_current_user),
):
    check_pla_permission(current_user)
    year = any_exercici or datetime.now().year
    entrades_query = db.query(models.PlaContractacioEntrada).filter(
        models.PlaContractacioEntrada.any_exercici == year
    )
    
    # Filter by department if not admin/responsable
    if current_user.rol not in ['admin', 'responsable_contratacion']:
        dept_ids = [d.id for d in current_user.departamentos]
        if dept_ids:
            entrades_query = entrades_query.filter(models.PlaContractacioEntrada.departamento_id.in_(dept_ids))
        else:
            # Si no té departaments, només veu el que ha creat ell mateix
            entrades_query = entrades_query.filter(models.PlaContractacioEntrada.creat_per_id == current_user.id)

    entrades = entrades_query.order_by(
        models.PlaContractacioEntrada.trimestre,
        models.PlaContractacioEntrada.id,
    ).all()
    return [_serialize(e) for e in entrades]


@router.post("", status_code=201)
def create_entrada(
    data: schemas.PlaContractacioEntradaCreate,
    db: Session = Depends(get_db),
    current_user: models.Empleado = Depends(get_current_user),
):
    check_pla_permission(current_user)
    if data.trimestre not in (1, 2, 3, 4):
        raise HTTPException(status_code=422, detail="El trimestre ha de ser entre 1 i 4")

    # Validate contrato exists if provided
    if data.contrato_id:
        contrato = db.query(models.Contrato).filter(models.Contrato.id == data.contrato_id).first()
        if not contrato:
            raise HTTPException(status_code=404, detail="Contracte no trobat")

    is_admin = current_user.rol in ['admin', 'responsable_contratacion']
    
    dep_id = data.departamento_id
    estat = 'aprovat'

    if not is_admin:
        estat = 'pendent'
        # Regular users can only create for their own department
        if dep_id and dep_id != current_user.departamento_id:
            raise HTTPException(status_code=403, detail="Només pots crear entrades pel teu departament")
        if not dep_id:
            dep_id = current_user.departamento_id

    entrada = models.PlaContractacioEntrada(
        any_exercici=data.any_exercici,
        trimestre=data.trimestre,
        objecte=data.objecte,
        tipus_contracte=data.tipus_contracte,
        ambit_responsable=data.ambit_responsable,
        observacions=data.observacions,
        subvencionat=data.subvencionat,
        import_estimat=data.import_estimat,
        estat=estat,
        departamento_id=dep_id,
        contrato_id=data.contrato_id,
        creat_per_id=current_user.id,
    )
    db.add(entrada)
    db.commit()
    db.refresh(entrada)
    return _serialize(entrada)


@router.put("/{entrada_id}")
def update_entrada(
    entrada_id: int,
    data: schemas.PlaContractacioEntradaUpdate,
    db: Session = Depends(get_db),
    current_user: models.Empleado = Depends(get_current_user),
):
    check_pla_permission(current_user)
    entrada = db.query(models.PlaContractacioEntrada).filter(
        models.PlaContractacioEntrada.id == entrada_id
    ).first()
    if not entrada:
        raise HTTPException(status_code=404, detail="Entrada no trobada")

    is_admin = current_user.rol in ['admin', 'responsable_contratacion']
    if not is_admin:
        # Check ownership or department
        if entrada.departamento_id != current_user.departamento_id and entrada.creat_per_id != current_user.id:
            raise HTTPException(status_code=403, detail="No pots editar aquesta entrada")
        
        # Non-admins cannot change the state out of 'pendent', nor can they edit 'aprovat' entries easily
        # but let's just make sure they can't set it to 'aprovat'.
        if 'estat' in data.model_dump(exclude_unset=True):
            if data.estat == 'aprovat':
                raise HTTPException(status_code=403, detail="No pots aprovar entrades")
        # Ensure they can't change department
        if 'departamento_id' in data.model_dump(exclude_unset=True):
            if data.departamento_id != current_user.departamento_id:
                raise HTTPException(status_code=403, detail="No pots canviar-ho a un departament que no és el teu")

    if data.trimestre is not None and data.trimestre not in (1, 2, 3, 4):
        raise HTTPException(status_code=422, detail="El trimestre ha de ser entre 1 i 4")

    if data.contrato_id is not None:
        if data.contrato_id:
            contrato = db.query(models.Contrato).filter(models.Contrato.id == data.contrato_id).first()
            if not contrato:
                raise HTTPException(status_code=404, detail="Contracte no trobat")

    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(entrada, field, value)

    db.commit()
    db.refresh(entrada)
    return _serialize(entrada)


@router.delete("/{entrada_id}", status_code=204)
def delete_entrada(
    entrada_id: int,
    db: Session = Depends(get_db),
    current_user: models.Empleado = Depends(get_current_user),
):
    check_pla_permission(current_user)
    entrada = db.query(models.PlaContractacioEntrada).filter(
        models.PlaContractacioEntrada.id == entrada_id
    ).first()
    if not entrada:
        raise HTTPException(status_code=404, detail="Entrada no trobada")
        
    is_admin = current_user.rol in ['admin', 'responsable_contratacion']
    if not is_admin:
        if entrada.departamento_id != current_user.departamento_id and entrada.creat_per_id != current_user.id:
            raise HTTPException(status_code=403, detail="No pots esborrar aquesta entrada")
            
    db.delete(entrada)
    db.commit()


@router.get("/contractes-caducant")
def get_contractes_caducant(
    any_exercici: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: models.Empleado = Depends(get_current_user),
    x_view_mode: str = Header(alias="X-View-Mode", default="user"),
):
    """
    Retorna els contractes que caduquen durant l'any indicat,
    distribuïts per trimestre segons la data de finalització.
    """
    check_pla_permission(current_user)
    year = any_exercici or datetime.now().year

    from dateutil.relativedelta import relativedelta
    
    # Eliminem el filtre de data inicial per permetre que el càlcul en Python 
    # trobi qualsevol contracte que tingui l'avís en l'any demanat.
    query = db.query(models.Contrato).filter(
        func.coalesce(models.Contrato.origen, 'local') == 'local',
        func.coalesce(models.Contrato.tipus_contracte, '') != 'Obres',
        models.Contrato.data_finalitzacio_calculada.isnot(None),
    )

    # Apply department filter for non-admin users
    from services.access_control import apply_department_filter
    query = apply_department_filter(query, models.Contrato, current_user, x_view_mode)

    contratos_raw = query.all()

    def trimestre_from_date(d: date) -> int:
        return (d.month - 1) // 3 + 1

    # Get default alert configuration
    config_meses = db.query(models.Configuracion).filter(models.Configuracion.clave == 'dashboard_mesos_caducitat').first()
    default_meses = int(config_meses.valor) if config_meses and config_meses.valor.isdigit() else 3

    result = []
    for c in contratos_raw:
        # Calcular data d'avís: data_finalitzacio - meses_aviso
        mesos_aviso = c.meses_aviso_vencimiento if c.meses_aviso_vencimiento is not None else default_meses
        df = c.data_finalitzacio_calculada
        
        # Assegurar que és objecte date
        if isinstance(df, datetime):
            df = df.date()
        
        data_avis = df - relativedelta(months=mesos_aviso)
        
        # Només incorporem si la data d'avís cau en l'any que estem consultant
        if data_avis.year == year:
            t = trimestre_from_date(data_avis)
            result.append({
                "id": c.id,
                "trimestre": t,
                "codi_expedient": c.codi_expedient,
                "objecte_contracte": c.objecte_contracte,
                "adjudicatari_nom": c.adjudicatari_nom,
                "tipus_contracte": c.tipus_contracte,
                "data_finalitzacio": str(c.data_finalitzacio_calculada) if c.data_finalitzacio_calculada else None,
                "data_avis_incorporacio": str(data_avis),
                "import_adjudicacio": float(c.import_adjudicacio_amb_iva) if c.import_adjudicacio_amb_iva else None,
                "estat_actual": c.estat_actual,
                "departament": c.departament_adjudicador,
            })

    # Ordenar per trimestre i data d'avís
    result.sort(key=lambda x: (x['trimestre'], x['data_avis_incorporacio']))
    return result
