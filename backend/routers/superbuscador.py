from fastapi import APIRouter, Query, Depends, HTTPException
import httpx
from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session
from core.database import get_db
import models
from services.sync_service import SyncService

router = APIRouter(prefix="/superbuscador", tags=["superbuscador"])

@router.get("/search")
async def search_global_contracts(
    q: Optional[str] = Query(None, description="Cerca global de text"),
    organisme: Optional[str] = Query(None, description="Nom de l'organisme"),
    objecte: Optional[str] = Query(None, description="Paraules clau en l'objecte"),
    min_importe: Optional[float] = Query(None, description="Import adjudicació mínim"),
    max_importe: Optional[float] = Query(None, description="Import adjudicació màxim"),
    fecha_desde: Optional[str] = Query(None, description="Data publicació des de (YYYY-MM-DD)"),
    fecha_hasta: Optional[str] = Query(None, description="Data publicació fins a (YYYY-MM-DD)"),
    limit: int = Query(24, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db)
):
    """
    Cerca contractes directament a l'API de la Generalitat (Socrata)
    sense filtre d'organisme local.
    """
    base_url = SyncService.get_config_val(db, "sync_api_url", SyncService.DEFAULT_API_BASE_URL)
    
    # Build $q (global text search)
    # Combining the main 'q' with 'organisme' and 'objecte' for a more powerful search
    search_terms = []
    if q: search_terms.append(q)
    if organisme: search_terms.append(organisme)
    if objecte: search_terms.append(objecte)
    
    query_params = {
        "$limit": limit,
        "$offset": offset,
        "$order": "data_publicacio_anunci DESC"
    }
    
    if search_terms:
        query_params["$q"] = " ".join(search_terms)
        
    where_clauses = []
    
    # Use numeric filters in $where (only for numbers)
    # Using pressupost_licitacio_amb which is a verified Number field in this dataset
    if min_importe is not None:
        where_clauses.append(f"pressupost_licitacio_amb >= {int(min_importe)}")
    
    if max_importe is not None:
        where_clauses.append(f"pressupost_licitacio_amb <= {int(max_importe)}")
        
    if fecha_desde:
        where_clauses.append(f"data_publicacio_anunci >= '{fecha_desde}T00:00:00'")
        
    if fecha_hasta:
        where_clauses.append(f"data_publicacio_anunci <= '{fecha_hasta}T23:59:59'")
        
    if where_clauses:
        query_params["$where"] = " AND ".join(where_clauses)
        
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(base_url, params=query_params, timeout=30.0)
            
            if response.status_code != 200:
                detail = response.text
                try:
                    detail = response.json().get("message", detail)
                except:
                    pass
                raise HTTPException(status_code=response.status_code, detail=f"Error API Generalitat: {detail}")

            data = response.json()
            
            return {
                "results": data,
                "count": len(data),
                "limit": limit,
                "offset": offset
            }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error en cercar a l'API externa: {str(e)}")

@router.get("/contract/{codi_expedient:path}")
async def get_global_contract_detail(
    codi_expedient: str,
    db: Session = Depends(get_db)
):
    """
    Recupera el detall complet d'un sol contracte de l'API de la Generalitat.
    """
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
                
            return data[0]
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error en recuperar el contracte: {str(e)}")
