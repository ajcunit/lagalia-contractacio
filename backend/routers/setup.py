"""
Router del Setup Wizard — Endpoints públics per configuració inicial.
Només funcionen si no existeix cap empleat a la BDD.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from core.dependencies import get_db
from services.setup_service import SetupService
from core.rate_limiter import limiter
from starlette.requests import Request

router = APIRouter(prefix="/setup", tags=["setup"])


class SetupStatusResponse(BaseModel):
    needs_setup: bool


class SetupRequest(BaseModel):
    admin_name: str
    admin_email: str
    admin_password: str
    admin_password_confirm: str
    organization_name: str = "La meva organització"
    ine10_code: str = ""


@router.get("/status", response_model=SetupStatusResponse)
def get_setup_status(db: Session = Depends(get_db)):
    """Comprova si cal configuració inicial. Endpoint PÚBLIC."""
    return {"needs_setup": SetupService.needs_setup(db)}


@router.post("/initialize")
@limiter.limit("3/minute")
def initialize_setup(
    request: Request,
    data: SetupRequest,
    db: Session = Depends(get_db),
):
    """Configura l'aplicació per primera vegada. Només funciona si no hi ha usuaris."""
    if not SetupService.needs_setup(db):
        raise HTTPException(status_code=403, detail="El sistema ja està configurat.")

    if data.admin_password != data.admin_password_confirm:
        raise HTTPException(status_code=400, detail="Les contrasenyes no coincideixen.")

    if len(data.admin_name.strip()) < 2:
        raise HTTPException(status_code=400, detail="El nom ha de tenir almenys 2 caràcters.")

    try:
        admin = SetupService.initialize(
            db=db,
            admin_name=data.admin_name.strip(),
            admin_email=data.admin_email.strip().lower(),
            admin_password=data.admin_password,
            organization_name=data.organization_name.strip(),
            ine10_code=data.ine10_code.strip(),
        )
        return {
            "message": "Sistema configurat correctament!",
            "admin_email": admin.email,
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
