from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.orm import Session
from typing import List, Dict, Any, Optional
from pydantic import BaseModel

from core.database import get_db
from core.dependencies import get_current_user
from services.ppt_service import PPTService
from core.rate_limiter import limiter
from starlette.requests import Request

router = APIRouter(prefix="/ppt", tags=["Generador PPT"])


class IndexRequest(BaseModel):
    urls: List[str]


class SectionRequest(BaseModel):
    title: str
    instructions: str
    urls: List[str]


@router.post("/generate-index")
@limiter.limit("5/minute")
async def generate_ppt_index(
    request: Request,
    payload: IndexRequest,
    db: Session = Depends(get_db),
    current_user: Any = Depends(get_current_user)
):
    """Genera un índex suggerit de PPT basat en els documents escollits."""
    try:
        index_data = await PPTService.extract_index_from_documents(db, payload.urls)
        return {"success": True, "index": index_data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/generate-section")
@limiter.limit("10/minute")
async def generate_ppt_section(
    request: Request,
    payload: SectionRequest,
    db: Session = Depends(get_db),
    current_user: Any = Depends(get_current_user)
):
    """Genera el text markdown d'un subapartat del PPT."""
    try:
        content = await PPTService.generate_section(
            db, payload.title, payload.instructions, payload.urls
        )
        return {"success": True, "content": content}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class DraftSaveRequest(BaseModel):
    titol: str
    contrato_id: Optional[int] = None
    contingut_json: str

@router.get("/esborranys")
def get_user_drafts(db: Session = Depends(get_db), current_user: Any = Depends(get_current_user)):
    from models import PPTEsborrany, Contrato
    drafts = db.query(PPTEsborrany).filter(PPTEsborrany.empleado_id == current_user.id).order_by(PPTEsborrany.fecha_modificacion.desc()).all()
    res = []
    for d in drafts:
        contract = db.query(Contrato).filter(Contrato.id == d.contrato_id).first() if d.contrato_id else None
        res.append({
            "id": d.id,
            "titol": d.titol,
            "contrato_id": d.contrato_id,
            "expedient": contract.codi_expedient if contract else None,
            "fecha_modificacion": d.fecha_modificacion,
        })
    return res

@router.get("/esborranys/{draft_id}")
def get_draft(draft_id: int, db: Session = Depends(get_db), current_user: Any = Depends(get_current_user)):
    from models import PPTEsborrany
    draft = db.query(PPTEsborrany).filter(PPTEsborrany.id == draft_id, PPTEsborrany.empleado_id == current_user.id).first()
    if not draft:
        raise HTTPException(status_code=404, detail="Esborrany no trobat")
    return {
        "id": draft.id,
        "titol": draft.titol,
        "contrato_id": draft.contrato_id,
        "contingut_json": draft.contingut_json
    }

@router.post("/esborranys")
def create_draft(payload: DraftSaveRequest, db: Session = Depends(get_db), current_user: Any = Depends(get_current_user)):
    from models import PPTEsborrany
    draft = PPTEsborrany(
        empleado_id=current_user.id,
        titol=payload.titol,
        contrato_id=payload.contrato_id,
        contingut_json=payload.contingut_json
    )
    db.add(draft)
    db.commit()
    db.refresh(draft)
    return {"id": draft.id, "titol": draft.titol}

@router.put("/esborranys/{draft_id}")
def update_draft(draft_id: int, payload: DraftSaveRequest, db: Session = Depends(get_db), current_user: Any = Depends(get_current_user)):
    from models import PPTEsborrany
    draft = db.query(PPTEsborrany).filter(PPTEsborrany.id == draft_id, PPTEsborrany.empleado_id == current_user.id).first()
    if not draft:
        raise HTTPException(status_code=404, detail="Esborrany no trobat")
    draft.titol = payload.titol
    draft.contrato_id = payload.contrato_id
    draft.contingut_json = payload.contingut_json
    db.commit()
    return {"id": draft.id, "titol": draft.titol}

@router.delete("/esborranys/{draft_id}")
def delete_draft(draft_id: int, db: Session = Depends(get_db), current_user: Any = Depends(get_current_user)):
    from models import PPTEsborrany
    draft = db.query(PPTEsborrany).filter(PPTEsborrany.id == draft_id, PPTEsborrany.empleado_id == current_user.id).first()
    if not draft:
        raise HTTPException(status_code=404, detail="Esborrany no trobat")
    db.delete(draft)
    db.commit()
    return {"success": True}
