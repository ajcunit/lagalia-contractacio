import logging
from datetime import date
from dateutil.relativedelta import relativedelta
from sqlalchemy.orm import Session
import models

logger = logging.getLogger(__name__)

def update_and_notify_expirations(db: Session):
    config_meses = db.query(models.Configuracion).filter(models.Configuracion.clave == 'dashboard_mesos_caducitat').first()
    default_meses = int(config_meses.valor) if config_meses and config_meses.valor.isdigit() else 3

    hoy = date.today()
    
    # Check all active contracts
    contratos = db.query(models.Contrato).filter(
        models.Contrato.data_final.isnot(None),
        models.Contrato.possiblement_finalitzat == False
    ).all()

    for contrato in contratos:
        meses_aviso = contrato.meses_aviso_vencimiento if contrato.meses_aviso_vencimiento is not None else default_meses
        
        limite_aviso = hoy + relativedelta(months=int(meses_aviso))
        df = contrato.data_final
        if hasattr(df, 'date'):
            df = df.date()
            
        if df < hoy:
            # Its finished!
            if not contrato.possiblement_finalitzat:
                contrato.possiblement_finalitzat = True
                contrato.alerta_finalitzacio = False
        else:
            es_alerta = (hoy <= df <= limite_aviso)
            if es_alerta and not contrato.alerta_finalitzacio:
                contrato.alerta_finalitzacio = True
                send_expiration_emails(contrato)
            elif not es_alerta and contrato.alerta_finalitzacio:
                contrato.alerta_finalitzacio = False
                
    db.commit()

def send_expiration_emails(contrato: models.Contrato):
    # This is where the email system integration goes.
    if not contrato.responsables:
        logger.info(f"Contract {contrato.codi_expedient} is near expiration but has no responsables assigned.")
        return
    
    for responsable in contrato.responsables:
        if responsable.email:
            msg = f"Recordatori: El contracte {contrato.codi_expedient} ({contrato.objecte_contracte}) " \
                  f"finalitza el proper {contrato.data_final}. Si us plau, reviseu-lo."
            print(f"=============================")
            print(f"EMAIL MOCK SENT TO {responsable.email}")
            print(f"SUBJECT: Avís de Venciment de Contracte - {contrato.codi_expedient}")
            print(f"BODY: {msg}")
            print(f"=============================")
            logger.info(f"Email mock logged for {responsable.email} regarding {contrato.codi_expedient}")
