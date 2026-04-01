from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
import json
from typing import List, Optional
from datetime import datetime
from database import get_db
import models
import schemas
from services.sync_service import SyncService
from services.auth_service import get_current_user, SECRET_KEY, ALGORITHM

router = APIRouter(prefix="/sincronizacion", tags=["sincronizacion"])
# Separate router for SSE endpoints that handle auth manually (EventSource can't send headers)
router_public = APIRouter(prefix="/sincronizacion", tags=["sincronizacion"])


@router.get("/", response_model=List[schemas.Sincronizacion])
def list_sincronizaciones(
    skip: int = 0,
    limit: int = 20,
    db: Session = Depends(get_db)
):
    return db.query(models.Sincronizacion).order_by(
        models.Sincronizacion.fecha_hora_inicio.desc()
    ).offset(skip).limit(limit).all()


@router.get("/ultima", response_model=Optional[schemas.Sincronizacion])
def get_ultima_sincronizacion(db: Session = Depends(get_db)):
    return db.query(models.Sincronizacion).order_by(
        models.Sincronizacion.fecha_hora_inicio.desc()
    ).first()


@router_public.get("/ejecutar/stream")
def ejecutar_sincronizacion_stream(
    codi_ine10: str,
    token: str = Query(..., description="JWT token for authentication (EventSource can't send headers)"),
    db: Session = Depends(get_db),
):
    # EventSource (SSE) cannot send Authorization headers, so we accept the token via query param
    from jose import jwt, JWTError
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            return StreamingResponse(
                iter([f'data: {json.dumps({"msg": "Token invàlid", "progress": 100, "error": True})}\n\n']),
                media_type="text/event-stream"
            )
        current_user = db.query(models.Empleado).filter(models.Empleado.email == email).first()
        if not current_user or not current_user.activo:
            return StreamingResponse(
                iter([f'data: {json.dumps({"msg": "Usuari no trobat o inactiu", "progress": 100, "error": True})}\n\n']),
                media_type="text/event-stream"
            )
    except JWTError:
        return StreamingResponse(
            iter([f'data: {json.dumps({"msg": "Token invàlid o expirat", "progress": 100, "error": True})}\n\n']),
            media_type="text/event-stream"
        )

    if current_user.rol not in ["admin", "responsable_contratacion"]:
        return StreamingResponse(
            iter([f'data: {json.dumps({"msg": "No tens permissos per executar la sincronització", "progress": 100, "error": True})}\n\n']),
            media_type="text/event-stream"
        )
    sync_en_proceso = db.query(models.Sincronizacion).filter(
        models.Sincronizacion.estado == 'en_proceso'
    ).first()
    
    if sync_en_proceso:
        return StreamingResponse(
            iter([f'data: {json.dumps({"msg": "Ja hi ha una sincronització en procés", "progress": 100, "error": True})}\n\n']),
            media_type="text/event-stream"
        )
    
    # Get config for sync URL
    base_url = SyncService.get_config_val(db, "sync_api_url", SyncService.DEFAULT_API_BASE_URL)
    
    sync = models.Sincronizacion(
        url_endpoint=f"{base_url}?codi_ine10={codi_ine10}",
        estado='en_proceso'
    )
    db.add(sync)
    db.commit()
    sync_id = sync.id
    db.close()
    
    return StreamingResponse(
        SyncService.run_sync_stream(sync_id, codi_ine10),
        media_type="text/event-stream"
    )

@router.post("/ejecutar")
def ejecutar_sincronizacion(
    codi_ine10: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: models.Empleado = Depends(get_current_user)
):
    if current_user.rol not in ["admin", "responsable_contratacion"]:
        raise HTTPException(status_code=403, detail="No tens permissos per executar la sincronització")
    if not codi_ine10:
        codi_ine10 = SyncService.get_config_val(db, "ine10_code", SyncService.DEFAULT_INE10)
    # Check if there's already a sync in progress
    sync_en_proceso = db.query(models.Sincronizacion).filter(
        models.Sincronizacion.estado == 'en_proceso'
    ).first()
    
    if sync_en_proceso:
        raise HTTPException(
            status_code=400, 
            detail="Ya hay una sincronización en proceso"
        )
    
    # Get config for sync URL
    base_url = SyncService.get_config_val(db, "sync_api_url", SyncService.DEFAULT_API_BASE_URL)

    # Create sync record
    sync = models.Sincronizacion(
        url_endpoint=f"{base_url}?codi_ine10={codi_ine10}",
        estado='en_proceso'
    )
    db.add(sync)
    db.commit()
    sync_id = sync.id
    
    # Close this session before running sync (sync uses its own session)
    db.close()
    
    # Run sync inline (blocking) - uses its own session
    SyncService.run_sync(sync_id, codi_ine10)
    
    # Also sync prorrogues (need to re-open or use SessionLocal as run_sync closed its session)
    from database import SessionLocal as db_local
    db_p = db_local()
    prorrogues_stats = SyncService.sync_prorrogues(db_p, codi_ine10)
    db_p.close()
    
    return {
        "message": "Sincronització completada",
        "sync_id": sync_id,
        "prorrogues": prorrogues_stats
    }


@router.post("/prorrogues")
def sincronitzar_prorrogues(
    codi_ine10: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: models.Empleado = Depends(get_current_user)
):
    if current_user.rol not in ["admin", "responsable_contratacion"]:
        raise HTTPException(status_code=403, detail="No tens permissos per sincronitzar pròrrogues")
    if not codi_ine10:
        codi_ine10 = SyncService.get_config_val(db, "ine10_code", SyncService.DEFAULT_INE10)
    stats = SyncService.sync_prorrogues(db, codi_ine10)
    return {"message": "Sincronització de pròrrogues completada", "stats": stats}


@router.get("/{sync_id}", response_model=schemas.Sincronizacion)
def get_sincronizacion(sync_id: int, db: Session = Depends(get_db)):
    sync = db.query(models.Sincronizacion).filter(models.Sincronizacion.id == sync_id).first()
    if not sync:
        raise HTTPException(status_code=404, detail="Sincronización no encontrada")
    return sync


# Duplicados endpoints
@router.get("/duplicados/", response_model=List[schemas.DuplicadoConContratos])
def list_duplicados(
    estado: Optional[str] = "pendiente",
    skip: int = 0,
    limit: int = 20,
    db: Session = Depends(get_db)
):
    query = db.query(models.Duplicado)
    if estado:
        query = query.filter(models.Duplicado.estado_validacion == estado)
    return query.order_by(models.Duplicado.fecha_deteccion.desc()).offset(skip).limit(limit).all()


@router.get("/duplicados/count")
def count_duplicados_pendientes(db: Session = Depends(get_db)):
    # Contractes duplicats
    count_contratos = db.query(models.Duplicado).filter(
        models.Duplicado.estado_validacion == 'pendiente'
    ).count()
    
    # Adjudicataris duplicats
    count_adj = db.query(models.DuplicadoAdjudicatario).filter(
        models.DuplicadoAdjudicatario.estado == 'pendiente'
    ).count()
    
    return {"pendientes": count_contratos + count_adj}


@router.post("/duplicados/{duplicado_id}/validar")
def validar_duplicado(
    duplicado_id: int,
    validacion: schemas.DuplicadoValidacion,
    db: Session = Depends(get_db),
    current_user: models.Empleado = Depends(get_current_user)
):
    if current_user.rol not in ["admin", "responsable_contratacion"]:
        raise HTTPException(status_code=403, detail="No tens permissos per validar duplicats")
    
    usuario_id = current_user.id
    duplicado = db.query(models.Duplicado).filter(models.Duplicado.id == duplicado_id).first()
    if not duplicado:
        raise HTTPException(status_code=404, detail="Duplicado no encontrado")
    
    if duplicado.estado_validacion != 'pendiente':
        raise HTTPException(status_code=400, detail="Este duplicado ya fue validado")
    
    # Update duplicado
    duplicado.estado_validacion = 'aprobado' if validacion.accion_tomada.startswith('aprobar') else validacion.accion_tomada
    duplicado.accion_tomada = validacion.accion_tomada
    duplicado.observaciones = validacion.observaciones
    duplicado.usuario_validador_id = usuario_id
    duplicado.fecha_validacion = datetime.now()
    
    # Update contratos based on action
    contrato_1 = db.query(models.Contrato).filter(models.Contrato.id == duplicado.contrato_id_1).first()
    contrato_2 = db.query(models.Contrato).filter(models.Contrato.id == duplicado.contrato_id_2).first()
    
    if validacion.accion_tomada == 'aprobar_1':
        contrato_1.estado_interno = 'aprobado'
        contrato_2.estado_interno = 'rechazado'
    elif validacion.accion_tomada == 'aprobar_2':
        contrato_1.estado_interno = 'rechazado'
        contrato_2.estado_interno = 'aprobado'
    elif validacion.accion_tomada == 'rechazar_ambos':
        contrato_1.estado_interno = 'rechazado'
        contrato_2.estado_interno = 'rechazado'
    elif validacion.accion_tomada == 'fusionar':
        # Keep the most recent one
        if contrato_1.data_actualitzacio and contrato_2.data_actualitzacio:
            if contrato_1.data_actualitzacio >= contrato_2.data_actualitzacio:
                contrato_1.estado_interno = 'aprobado'
                contrato_2.estado_interno = 'rechazado'
            else:
                contrato_1.estado_interno = 'rechazado'
                contrato_2.estado_interno = 'aprobado'
        else:
            contrato_1.estado_interno = 'aprobado'
            contrato_2.estado_interno = 'rechazado'
    
    db.commit()
    
    return {"message": "Duplicado validado correctamente"}


# Reglas de asociación
@router.get("/reglas/", response_model=List[schemas.ReglaAsociacion])
def list_reglas(
    activa: Optional[bool] = None,
    departamento_id: Optional[int] = None,
    db: Session = Depends(get_db)
):
    query = db.query(models.ReglaAsociacion)
    if activa is not None:
        query = query.filter(models.ReglaAsociacion.activa == activa)
    if departamento_id is not None:
        query = query.filter(models.ReglaAsociacion.departamento_id == departamento_id)
    return query.order_by(models.ReglaAsociacion.prioridad.desc()).all()


@router.post("/reglas/", response_model=schemas.ReglaAsociacion)
def create_regla(
    regla: schemas.ReglaAsociacionCreate, 
    db: Session = Depends(get_db),
    current_user: models.Empleado = Depends(get_current_user)
):
    if current_user.rol not in ["admin", "responsable_contratacion"]:
        raise HTTPException(status_code=403, detail="No tens permissos per gestionar regles")
    db_regla = models.ReglaAsociacion(**regla.model_dump())
    db.add(db_regla)
    db.commit()
    db.refresh(db_regla)
    return db_regla


@router.put("/reglas/{regla_id}", response_model=schemas.ReglaAsociacion)
def update_regla(
    regla_id: int,
    regla: schemas.ReglaAsociacionUpdate,
    db: Session = Depends(get_db),
    current_user: models.Empleado = Depends(get_current_user)
):
    if current_user.rol not in ["admin", "responsable_contratacion"]:
        raise HTTPException(status_code=403, detail="No tens permissos per gestionar regles")
    db_regla = db.query(models.ReglaAsociacion).filter(models.ReglaAsociacion.id == regla_id).first()
    if not db_regla:
        raise HTTPException(status_code=404, detail="Regla no encontrada")
    
    update_data = regla.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_regla, field, value)
    
    db.commit()
    db.refresh(db_regla)
    return db_regla


@router.delete("/reglas/{regla_id}")
def delete_regla(
    regla_id: int, 
    db: Session = Depends(get_db),
    current_user: models.Empleado = Depends(get_current_user)
):
    if current_user.rol not in ["admin", "responsable_contratacion"]:
        raise HTTPException(status_code=403, detail="No tens permissos per gestionar regles")
    db_regla = db.query(models.ReglaAsociacion).filter(models.ReglaAsociacion.id == regla_id).first()
    if not db_regla:
        raise HTTPException(status_code=404, detail="Regla no encontrada")
    
    db.delete(db_regla)
    db.commit()
    return {"message": "Regla eliminada correctamente"}
