from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger
from core.database import SessionLocal
import models
from services.sync_service import SyncService
import traceback
import logging

logger = logging.getLogger("scheduler_service")
scheduler = BackgroundScheduler()
job_id = "auto_sync_contratos"

def run_automated_sync():
    logger.info("Starting automated synchronization...")
    db = SessionLocal()
    try:
        # Check if another auto sync is running
        sync_en_proceso = db.query(models.Sincronizacion).filter(
            models.Sincronizacion.estado == 'en_proceso'
        ).first()
        
        if sync_en_proceso:
            logger.warning("Auto-sync skipped: another synchronization is already in progress.")
            return

        codi_ine10 = SyncService.get_config_val(db, "ine10_code", SyncService.DEFAULT_INE10)
        base_url = SyncService.get_config_val(db, "sync_api_url", SyncService.DEFAULT_API_BASE_URL)

        # 1. Main Sync
        sync = models.Sincronizacion(
            url_endpoint=f"AUTO: {base_url}?codi_ine10={codi_ine10}",
            estado='en_proceso'
        )
        db.add(sync)
        db.commit()
        sync_id = sync.id
        
        SyncService.run_sync(sync_id, codi_ine10)
        
        # 2. Menores Sync
        logger.info("Executing automated sync for minor contracts...")
        SyncService.sync_menores(db, codi_ine10)
        
        logger.info("Automated synchronization completed perfectly.")
    except Exception as e:
        logger.error(f"Error during automated synchronization: {e}")
        traceback.print_exc()
    finally:
        db.close()

def reload_scheduler():
    db = SessionLocal()
    try:
        enabled_str = SyncService.get_config_val(db, "sync_auto_enabled", "false")
        hora_str = SyncService.get_config_val(db, "sync_cron_hora", "03:00")
        days_str = SyncService.get_config_val(db, "sync_cron_days", "*")
        tz_str = SyncService.get_config_val(db, "sync_cron_timezone", "Europe/Madrid")
        
        is_enabled = enabled_str.strip().lower() == "true"
        
        # Remove existing job
        if scheduler.get_job(job_id):
            scheduler.remove_job(job_id)
            
        if is_enabled:
            try:
                hour, minute = map(int, hora_str.split(":"))
                trigger = CronTrigger(day_of_week=days_str, hour=hour, minute=minute, timezone=tz_str)
                scheduler.add_job(run_automated_sync, trigger, id=job_id, replace_existing=True)
                logger.info(f"Automated synchronization scheduled at {hour:02d}:{minute:02d} ({tz_str}) on {days_str}")
                print(f"Scheduled auto-sync at {hour:02d}:{minute:02d} ({tz_str}) on {days_str}")
            except Exception as e:
                logger.error(f"Failed to parse cron time {hora_str} or days {days_str}: {e}")
        else:
            logger.info("Automated synchronization is disabled.")
            print("Auto-sync is disabled in configuration.")
    finally:
        db.close()

def start_scheduler():
    if not scheduler.running:
        scheduler.start()
        reload_scheduler()

def shutdown_scheduler():
    if scheduler.running:
        scheduler.shutdown()
