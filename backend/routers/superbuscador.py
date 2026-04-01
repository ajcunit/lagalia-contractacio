from fastapi import APIRouter, Query, Depends, HTTPException
import httpx
from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session
from database import get_db
import models
from services.sync_service import SyncService

router = APIRouter(prefix="/superbuscador", tags=["superbuscador"])

@router.get("/search")
async def search_global_contracts(
    q: Optional[str] = Query(None, description="Cerca global de text"),
    organisme: Optional[str] = Query(None, description="Nom de l'organisme"),
    objecte: Optional[str] = Query(None, description="Paraules clau en l'objecte"),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db)
):
    """
    Cerca contractes directament a l'API de la Generalitat (Socrata)
    sense filtre d'organisme local.
    """
    # Get the base URL from config or use default
    base_url = SyncService.get_config_val(db, "sync_api_url", SyncService.DEFAULT_API_BASE_URL)
    
    # Build SoQL query
    # The dataset is ybgg-dgi6
    
    where_clauses = []
    
    if organisme:
        where_clauses.append(f"nom_organ like '%{organisme.upper()}%'")
    
    if objecte:
        where_clauses.append(f"objecte_contracte like '%{objecte}%'")
        
    query_params = {
        "$limit": limit,
        "$offset": offset,
        "$order": "data_publicacio_contracte DESC"
    }
    
    if q:
        query_params["$q"] = q
        
    if where_clauses:
        query_params["$where"] = " AND ".join(where_clauses)
        
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(base_url, params=query_params, timeout=30.0)
            response.raise_for_status()
            data = response.json()
            
            # Enrich data if needed? For now just return it
            return {
                "results": data,
                "count": len(data),
                "limit": limit,
                "offset": offset
            }
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
