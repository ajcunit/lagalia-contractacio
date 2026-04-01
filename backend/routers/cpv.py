from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
import models, schemas
from database import get_db
from services.cpv_service import CPVService
from services.ai_service import AIService

router = APIRouter(prefix="/cpv", tags=["cpv"])

@router.get("/search", response_model=List[schemas.CPV])
def search_cpvs(
    q: Optional[str] = None, 
    nivel: Optional[str] = None, 
    padre: Optional[str] = None,
    limit: int = 50,
    db: Session = Depends(get_db)
):
    query = db.query(models.CPV)
    if q:
        search = f"%{q}%"
        query = query.filter(models.CPV.codigo.ilike(search) | models.CPV.descripcion.ilike(search))
    if nivel:
        query = query.filter(models.CPV.nivel == nivel)
    if padre:
        query = query.filter(models.CPV.padre_codigo == padre)
    
    return query.limit(limit).all()

@router.post("/sync")
def sync_cpvs(db: Session = Depends(get_db)):
    return CPVService.sync_cpvs(db)

@router.post("/suggest-ai", response_model=schemas.CPVAIResponse)
async def suggest_cpvs_ai(request: schemas.CPVAIRequest, db: Session = Depends(get_db)):
    # AIService decidirà si usa Ollama o Gemini segons la configuració
    suggestions = await AIService.suggest_cpvs(db, request.descripcion)
    return {"suggestions": suggestions}
