from datetime import datetime, timedelta, timezone
from typing import Optional
from passlib.context import CryptContext
from jose import jwt, JWTError
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from database import get_db
import models

SECRET_KEY = "contractacio-secure-key-gen-32-bytes"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7 # 1 lletra

pwd_context = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/auth/login")

import os
from ldap3 import Server, Connection, ALL, SUBTREE
from ldap3.core.exceptions import LDAPException

class AuthService:
    @staticmethod
    def verify_password(plain_password, hashed_password):
        if not hashed_password:
            return False
        return pwd_context.verify(plain_password, hashed_password)

    @staticmethod
    def get_password_hash(password):
        return pwd_context.hash(password)

    @staticmethod
    def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
        to_encode = data.copy()
        if expires_delta:
            expire = datetime.now(timezone.utc) + expires_delta
        else:
            expire = datetime.now(timezone.utc) + timedelta(minutes=15)
        to_encode.update({"exp": expire})
        encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
        return encoded_jwt

    @staticmethod
    def ldap_authenticate(db: Session, username: str, password: str) -> Optional[models.Empleado]:
        from models import Configuracion, Empleado, Departamento
        
        # Get LDAP config
        configs = db.query(Configuracion).filter(Configuracion.clave.like("ldap_%")).all()
        ldap_config = {c.clave: c.valor for c in configs}
        
        if ldap_config.get("ldap_enabled") != "true":
            return None
            
        server_uri = ldap_config.get("ldap_server")
        if not server_uri:
            return None
            
        port = int(ldap_config.get("ldap_port", 389))
        base_dn = ldap_config.get("ldap_base_dn")
        user_domain = ldap_config.get("ldap_user_domain", "")
        
        # Format user for bind (e.g. user@domain.local)
        bind_user = username
        if user_domain and not username.endswith(user_domain):
            bind_user = f"{username}{user_domain}"
            
        try:
            server = Server(server_uri, port=port, get_info=ALL)
            conn = Connection(server, user=bind_user, password=password, auto_bind=True)
            
            # If we reach here, authentication is successful
            # Search for user details to sync attributes
            search_filter = f"(&(objectClass=user)(sAMAccountName={username.split('@')[0]}))"
            conn.search(base_dn, search_filter, attributes=['displayName', 'mail', 'memberOf'])
            
            if not conn.entries:
                return None
                
            entry = conn.entries[0]
            email = entry.mail.value if hasattr(entry, 'mail') and entry.mail.value else username
            if domain_suffix := user_domain:
                if not email.endswith(domain_suffix) and "@" not in email:
                    email = f"{email}{domain_suffix}"
            
            # Sync user with local DB
            user = db.query(Empleado).filter(Empleado.email == email).first()
            
            # Extract roles and department from groups if mappings exist
            new_rol = "empleado"
            new_dept_id = None
            
            group_mappings_json = ldap_config.get("ldap_group_mappings")
            if group_mappings_json and hasattr(entry, 'memberOf'):
                import json
                try:
                    mappings = json.loads(group_mappings_json)
                    user_groups = entry.memberOf.values if isinstance(entry.memberOf.values, list) else [entry.memberOf.value]
                    
                    for mapping in mappings:
                        ad_group = mapping.get("ad_group")
                        if any(ad_group.lower() in ug.lower() for ug in user_groups):
                            if mapping.get("role"):
                                new_rol = mapping.get("role")
                            if mapping.get("dept_id"):
                                new_dept_id = mapping.get("dept_id")
                            # If we find a higher role (admin), we might want to stop or prioritize
                            if new_rol == "admin":
                                break
                except Exception as me:
                    print(f"Mapping error: {str(me)}")

            if not user:
                # Auto-provision user
                user = Empleado(
                    nombre=entry.displayName.value if hasattr(entry, 'displayName') else username,
                    email=email,
                    activo=True,
                    rol=new_rol,
                    departamento_id=new_dept_id
                )
                db.add(user)
                db.commit()
                db.refresh(user)
            else:
                # Update attributes
                if hasattr(entry, 'displayName') and entry.displayName.value:
                    user.nombre = entry.displayName.value
                user.rol = new_rol
                if new_dept_id:
                    user.departamento_id = new_dept_id
                user.activo = True
                db.commit()
                db.refresh(user)
                
            return user
            
        except LDAPException as e:
            print(f"LDAP Error: {str(e)}")
            return None
        except Exception as e:
            print(f"Auth Error: {str(e)}")
            return None

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="No s'han pogut validar les credencials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
        
    user = db.query(models.Empleado).filter(models.Empleado.email == email).first()
    if user is None:
        raise credentials_exception
    if not user.activo:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Usuari inactiu")
    return user
