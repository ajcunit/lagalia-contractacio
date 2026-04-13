import sys
import os
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from sqlalchemy import create_engine
from backend.models import Base

DATABASE_URL = "postgresql://postgres:postgres@127.0.0.1:5432/contractacio"
engine = create_engine(DATABASE_URL)

try:
    Base.metadata.create_all(bind=engine)
    print("Database tables synchronized successfully.")
except Exception as e:
    print("Error:", e)
