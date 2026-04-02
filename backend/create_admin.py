import sys
import os

# Afegir el directori actual al path per poder importar els mòduls del projecte
sys.path.append(os.getcwd())

from database import SessionLocal
import models
from services.auth_service import AuthService

def create_admin():
    db = SessionLocal()
    try:
        # 1. Assegurar-se que existeix almenys un departament
        dept = db.query(models.Departamento).first()
        if not dept:
            print("Creant departament per defecte...")
            dept = models.Departamento(
                codigo="ADMIN",
                nombre="Administració",
                descripcion="Departament administrador del sistema"
            )
            db.add(dept)
            db.commit()
            db.refresh(dept)
        
        # 2. Comprovar si l'usuari admin ja existeix
        admin_email = "admin@admin.com"
        admin = db.query(models.Empleado).filter(models.Empleado.email == admin_email).first()
        
        if admin:
            print(f"L'usuari {admin_email} ja existeix. Actualitzant contrasenya...")
            admin.hashed_password = AuthService.get_password_hash("admin")
            admin.rol = "admin"
            admin.activo = True
        else:
            print("Creant usuari administrador...")
            admin = models.Empleado(
                nombre="Administrador",
                email=admin_email,
                hashed_password=AuthService.get_password_hash("admin"),
                rol="admin",
                activo=True,
                departamento_id=dept.id,
                permiso_auditoria=True
            )
            db.add(admin)
        
        db.commit()
        print("Usuari administrador creat correctament!")
        print(f"Email: {admin_email}")
        print("Contrasenya: admin")
        
    except Exception as e:
        print(f"Error en crear l'admin: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    create_admin()
