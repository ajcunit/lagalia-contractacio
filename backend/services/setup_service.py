"""
Servei de configuració inicial (primer arranque).
Gestiona la creació del primer administrador i les configuracions per defecte.
"""
from sqlalchemy.orm import Session
from core.security import hash_password, validate_password_strength
import models


class SetupService:

    @staticmethod
    def needs_setup(db: Session) -> bool:
        """Retorna True si no hi ha cap empleat a la BDD (primer arranque)."""
        count = db.query(models.Empleado).count()
        return count == 0

    @staticmethod
    def initialize(
        db: Session,
        admin_name: str,
        admin_email: str,
        admin_password: str,
        organization_name: str = "La meva organització",
        ine10_code: str = "",
    ) -> models.Empleado:
        """Configura l'aplicació per primera vegada."""

        # 1. Verificar que és primer arranque
        if not SetupService.needs_setup(db):
            raise ValueError("El sistema ja ha estat configurat.")

        # 2. Validar contrasenya
        valid, msg = validate_password_strength(admin_password)
        if not valid:
            raise ValueError(msg)

        # 3. Crear admin
        admin = models.Empleado(
            nombre=admin_name,
            email=admin_email,
            hashed_password=hash_password(admin_password),
            rol="admin",
            activo=True,
            permiso_auditoria=True,
        )
        db.add(admin)

        # 4. Inicialitzar configuració per defecte
        default_configs = [
            ("organization_name", organization_name, "Nom de l'organització"),
            ("ine10_code", ine10_code, "Codi INE10 de l'ens"),
            ("sync_api_url",
             "https://analisi.transparenciacatalunya.cat/resource/ybgg-dgi6.json",
             "URL API de contractes majors"),
            ("sync_menores_url",
             "https://analisi.transparenciacatalunya.cat/resource/sesh-bnbc.json",
             "URL API de contractes menors"),
            ("prorrogues_api_url",
             "https://analisi.transparenciacatalunya.cat/resource/hb6v-jcbf.json",
             "URL Registre Públic de Contractes (Prorrogues i Modificacions)"),
            ("cpv_api_url",
             "https://analisi.transparenciacatalunya.cat/resource/wxdw-5eyv.json?$limit=50000",
             "URL API de CPVs"),
            # IA — desactivada per defecte fins que l'usuari la configuri
            ("ia_enabled", "false", "Activar/desactivar el proveïdor de IA i formularis relacionats"),
            ("ai_provider", "disabled", "Proveïdor d'IA: 'disabled', 'ollama' o 'gemini'"),
            ("ollama_url", "http://localhost:11434", "URL d'Ollama"),
            ("ollama_model", "llama3", "Model d'Ollama per defecte"),
            ("gemini_model", "gemini-1.5-flash", "Model de Gemini"),
            ("gemini_api_key", "", "Clau API de Gemini"),
            ("sync_auto_enabled", "false", "Sincronització automàtica"),
            ("sync_cron_hora", "03:00", "Hora de sincronització (HH:MM)"),
            ("sync_cron_days", "*", "Dies de sincronització"),
            ("sync_cron_timezone", "Europe/Madrid", "Zona horària"),
            ("ldap_enabled", "false", "Autenticació LDAP activa"),
            ("ldap_server", "", "Servidor LDAP"),
            ("ldap_port", "389", "Port LDAP"),
            ("ldap_base_dn", "", "Base DN"),
            ("ldap_user_domain", "", "Domini d'usuari LDAP"),
        ]

        for clave, valor, descripcion in default_configs:
            if not db.query(models.Configuracion).filter(
                models.Configuracion.clave == clave
            ).first():
                db.add(models.Configuracion(
                    clave=clave, valor=valor, descripcion=descripcion
                ))

        # 5. Inicialitzar prompts d'IA
        prompts = {
            "prompt_cpv_extract": (
                'Ets un expert en CPV europeu. Per aquest objecte de contracte:\n'
                '"{description}"\n\n'
                '1. Extrau 4-6 paraules clau en català.\n'
                '2. Identifica les 2 DIVISIONS (2 primers dígits) més probables.\n'
                '3. Suggereix 3 CODIS CPV (8 dígits) concrets.\n\n'
                'Respon NOMÉS amb:\nParaules: p1, p2...\nDivisions: 00, 00\n'
                'Codis: 00000000, 00000000...'
            ),
            "prompt_cpv_rank": (
                'You are an expert in European CPV classification (Reg. 213/2008). '
                'Rank candidates for the contract description. Select the most specific code. '
                'Return JSON array: [{"codigo","descripcion","score","justificacion"}].'
            ),
            "prompt_auditoria": (
                'Ets un auditor expert en contractació pública. Analitza:\n{data}\n\n'
                '{custom_prompt}\n\nProporciona informe en català amb Markdown.'
            ),
        }

        for clave, valor in prompts.items():
            if not db.query(models.Configuracion).filter(
                models.Configuracion.clave == clave
            ).first():
                db.add(models.Configuracion(
                    clave=clave, valor=valor,
                    descripcion=f"Prompt per a {clave.replace('prompt_', '')}"
                ))

        db.commit()
        db.refresh(admin)

        return admin
