from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
import models, schemas
from core.database import get_db
from services.auth_service import get_current_user

router = APIRouter(prefix="/favoritos", tags=["favoritos"])

@router.get("/carpetas", response_model=List[schemas.CarpetaFavoritaResponse])
def get_carpetas(db: Session = Depends(get_db), current_user: models.Empleado = Depends(get_current_user)):
    return db.query(models.CarpetaFavorita).filter(models.CarpetaFavorita.empleado_id == current_user.id).order_by(models.CarpetaFavorita.fecha_creacion.desc()).all()

@router.post("/carpetas", response_model=schemas.CarpetaFavoritaResponse)
def create_carpeta(carpeta: schemas.CarpetaFavoritaCreate, db: Session = Depends(get_db), current_user: models.Empleado = Depends(get_current_user)):
    # Comprovar si ja existeix una amb el mateix nom per AQUEST usuari
    existing = db.query(models.CarpetaFavorita).filter(
        models.CarpetaFavorita.nombre == carpeta.nombre,
        models.CarpetaFavorita.empleado_id == current_user.id
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Ja existeix una carpeta amb aquest nom")
        
    db_carpeta = models.CarpetaFavorita(**carpeta.model_dump(), empleado_id=current_user.id)
    db.add(db_carpeta)
    db.commit()
    db.refresh(db_carpeta)
    return db_carpeta

@router.delete("/carpetas/{carpeta_id}")
def delete_carpeta(carpeta_id: int, db: Session = Depends(get_db), current_user: models.Empleado = Depends(get_current_user)):
    db_carpeta = db.query(models.CarpetaFavorita).filter(
        models.CarpetaFavorita.id == carpeta_id,
        models.CarpetaFavorita.empleado_id == current_user.id
    ).first()
    if not db_carpeta:
        raise HTTPException(status_code=404, detail="Carpeta no trobada o no tens permís")
    db.delete(db_carpeta)
    db.commit()
    return {"ok": True}

@router.put("/carpetas/{carpeta_id}", response_model=schemas.CarpetaFavoritaResponse)
def update_carpeta(carpeta_id: int, carpeta: schemas.CarpetaFavoritaUpdate, db: Session = Depends(get_db), current_user: models.Empleado = Depends(get_current_user)):
    db_carpeta = db.query(models.CarpetaFavorita).filter(
        models.CarpetaFavorita.id == carpeta_id,
        models.CarpetaFavorita.empleado_id == current_user.id
    ).first()
    if not db_carpeta:
        raise HTTPException(status_code=404, detail="Carpeta no trobada o no tens permís")
    
    if carpeta.nombre is not None:
        db_carpeta.nombre = carpeta.nombre
    if carpeta.descripcion is not None:
        db_carpeta.descripcion = carpeta.descripcion
    if carpeta.color is not None:
        db_carpeta.color = carpeta.color
        
    db.commit()
    db.refresh(db_carpeta)
    return db_carpeta

@router.get("/carpetas/{carpeta_id}/contratos", response_model=List[schemas.ContratoFavoritoResponse])
def get_favoritos_carpeta(carpeta_id: int, db: Session = Depends(get_db), current_user: models.Empleado = Depends(get_current_user)):
    db_carpeta = db.query(models.CarpetaFavorita).filter(
        models.CarpetaFavorita.id == carpeta_id,
        models.CarpetaFavorita.empleado_id == current_user.id
    ).first()
    if not db_carpeta:
        raise HTTPException(status_code=404, detail="Carpeta no trobada o no tens permís")
    
    # Ens assegurem de carregar el contracte
    return db.query(models.ContratoFavorito).filter(models.ContratoFavorito.carpeta_id == carpeta_id).order_by(models.ContratoFavorito.fecha_agregado.desc()).all()

@router.post("/carpetas/{carpeta_id}/contratos", response_model=schemas.ContratoFavoritoResponse)
def add_favorito(carpeta_id: int, favorito: schemas.ContratoFavoritoCreate, db: Session = Depends(get_db), current_user: models.Empleado = Depends(get_current_user)):
    db_carpeta = db.query(models.CarpetaFavorita).filter(
        models.CarpetaFavorita.id == carpeta_id,
        models.CarpetaFavorita.empleado_id == current_user.id
    ).first()
    if not db_carpeta:
        raise HTTPException(status_code=404, detail="Carpeta no trobada o no tens permís")
    
    db_contrato = db.query(models.Contrato).filter(models.Contrato.id == favorito.contrato_id).first()
    if not db_contrato:
        raise HTTPException(status_code=404, detail="Contracte no trobat a la base de dades")

    existing = db.query(models.ContratoFavorito).filter(
        models.ContratoFavorito.carpeta_id == carpeta_id,
        models.ContratoFavorito.contrato_id == favorito.contrato_id
    ).first()
    
    if existing:
        raise HTTPException(status_code=400, detail="Aquest contracte ja es troba en aquesta carpeta")

    db_fav = models.ContratoFavorito(
        carpeta_id=carpeta_id,
        contrato_id=favorito.contrato_id,
        notas=favorito.notas
    )
    db.add(db_fav)
    db.commit()
    db.refresh(db_fav)
    return db_fav

@router.delete("/carpetas/{carpeta_id}/contratos/{contrato_id}")
def delete_favorito(carpeta_id: int, contrato_id: int, db: Session = Depends(get_db), current_user: models.Empleado = Depends(get_current_user)):
    db_carpeta = db.query(models.CarpetaFavorita).filter(
        models.CarpetaFavorita.id == carpeta_id,
        models.CarpetaFavorita.empleado_id == current_user.id
    ).first()
    if not db_carpeta:
        raise HTTPException(status_code=404, detail="Carpeta no trobada o no tens permís")

    db_fav = db.query(models.ContratoFavorito).filter(
        models.ContratoFavorito.carpeta_id == carpeta_id,
        models.ContratoFavorito.contrato_id == contrato_id
    ).first()
    if not db_fav:
        raise HTTPException(status_code=404, detail="Favorit no trobat a aquesta carpeta")
    
    db.delete(db_fav)
    db.commit()
    return {"ok": True}

@router.get("/todos", response_model=List[schemas.ContratoFavoritoResponse])
def get_todos_favoritos(db: Session = Depends(get_db), current_user: models.Empleado = Depends(get_current_user)):
    """Retorna tots els favorits de l'USUARI per saber ràpidament quins contractes ja estan guardats i on."""
    return db.query(models.ContratoFavorito).join(models.CarpetaFavorita).filter(
        models.CarpetaFavorita.empleado_id == current_user.id
    ).all()

@router.post("/carpetas/{carpeta_id}/contratos/by-expediente", response_model=schemas.ContratoFavoritoResponse)
async def add_favorito_by_expediente(carpeta_id: int, request: schemas.ContratoFavoritoByExpedienteCreate, db: Session = Depends(get_db), current_user: models.Empleado = Depends(get_current_user)):
    db_carpeta = db.query(models.CarpetaFavorita).filter(
        models.CarpetaFavorita.id == carpeta_id,
        models.CarpetaFavorita.empleado_id == current_user.id
    ).first()
    if not db_carpeta:
        raise HTTPException(status_code=404, detail="Carpeta no trobada o no tens permís")
        
    codi_expedient = request.codi_expedient
    db_contrato = db.query(models.Contrato).filter(models.Contrato.codi_expedient == codi_expedient).first()
    
    if not db_contrato:
        # Fetch from API natively
        import httpx
        from services.sync_service import SyncService
        base_url = SyncService.get_config_val(db, "sync_api_url", SyncService.DEFAULT_API_BASE_URL)
        query_params = {
            "codi_expedient": codi_expedient,
            "$limit": 1
        }
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(base_url, params=query_params, timeout=20.0)
                response.raise_for_status()
                data = response.json()
                if not data:
                    raise HTTPException(status_code=404, detail="Contracte no trobat a la plataforma externa")
                
                # Create local contract DB record
                api_record = data[0]
                model_data = SyncService.map_api_to_model(api_record)
                model_data["datos_json"] = api_record
                model_data["hash_contenido"] = SyncService.calculate_hash(api_record)
                db_contrato = models.Contrato(**model_data)
                db.add(db_contrato)
                db.commit()
                db.refresh(db_contrato)
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Error al sincronitzar i guardar contracte: {str(e)}")

    # Add favorite
    existing = db.query(models.ContratoFavorito).filter(
        models.ContratoFavorito.carpeta_id == carpeta_id,
        models.ContratoFavorito.contrato_id == db_contrato.id
    ).first()
    
    if existing:
        raise HTTPException(status_code=400, detail="Aquest contracte ja es troba en aquesta carpeta")

    db_fav = models.ContratoFavorito(
        carpeta_id=carpeta_id,
        contrato_id=db_contrato.id,
        notas=request.notas
    )
    db.add(db_fav)
    db.commit()
    db.refresh(db_fav)
    return db_fav
