import httpx
from sqlalchemy.orm import Session
from typing import Dict, Any
import models

class CPVService:
    @staticmethod
    def sync_cpvs(db: Session) -> Dict[str, Any]:
        """Download and sync CPV codes from Open Data Catalunya"""
        cfg = db.query(models.Configuracion).filter(models.Configuracion.clave == "cpv_api_url").first()
        url = cfg.valor if cfg and cfg.valor else "https://analisi.transparenciacatalunya.cat/resource/wxdw-5eyv.json?$limit=50000"
        
        try:
            response = httpx.get(url, timeout=120.0)
            response.raise_for_status()
            data = response.json()
            
            nuevos = 0
            actualizados = 0
            codigos_vistos = set()
            
            # Helper to create/update a CPV record
            def upsert_cpv(codigo, descripcion, nivel, padre=None, record=None):
                nonlocal nuevos, actualizados
                if not codigo or codigo in codigos_vistos:
                    return
                
                codigos_vistos.add(codigo)
                existing = db.query(models.CPV).filter(models.CPV.codigo == codigo).first()
                
                if not existing:
                    cpv = models.CPV(
                        codigo=codigo,
                        descripcion=descripcion,
                        nivel=nivel,
                        padre_codigo=padre,
                        datos_json=record
                    )
                    db.add(cpv)
                    nuevos += 1
                else:
                    existing.descripcion = descripcion
                    existing.nivel = nivel
                    existing.padre_codigo = padre
                    existing.datos_json = record
                    actualizados += 1

            for record in data:
                # Add Division level
                upsert_cpv(
                    record.get("cpv_divisi"), 
                    record.get("descripci_divisi"), 
                    "Divisió"
                )
                
                # Add Group level
                upsert_cpv(
                    record.get("cpv_grup"), 
                    record.get("descripci_grup"), 
                    "Grup", 
                    record.get("cpv_divisi")
                )
                
                # Add Class level
                upsert_cpv(
                    record.get("cpv_classe"), 
                    record.get("descripci_classe"), 
                    "Classe", 
                    record.get("cpv_grup")
                )
                
                # Add Category level (most specific)
                upsert_cpv(
                    record.get("cpv_categoria"), 
                    record.get("descripci_categoria"), 
                    "Categoria", 
                    record.get("cpv_classe"),
                    record
                )
            
            db.commit()
            return {"nuevos": nuevos, "actualizados": actualizados, "total": len(codigos_vistos)}
            
        except Exception as e:
            print(f"Error syncing CPVs: {e}")
            db.rollback()
            return {"error": str(e)}

async def get_cpv_descriptions(codes: list) -> Dict[str, str]:
    """Obte les descripcions d'una llista de codis CPV de la base de dades"""
    from database import SessionLocal
    import models
    
    db = SessionLocal()
    results = {}
    try:
        for code in codes:
            # Cercar coincidència exacta
            cpv = db.query(models.CPV).filter(models.CPV.codigo == code).first()
            
            if not cpv:
                # Si no troba el codi amb el dígit de control (ex: -9), prova sense ell
                base_code = code.split('-')[0] if '-' in code else code
                cpv = db.query(models.CPV).filter(models.CPV.codigo.like(f"{base_code}%")).first()
            
            if cpv:
                results[code] = cpv.descripcion
            else:
                results[code] = "Descripció no trobada"
    finally:
        db.close()
    
    return results
