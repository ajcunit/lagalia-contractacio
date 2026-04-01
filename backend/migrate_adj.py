from database import engine
from models import Base
import models # ensure models are registered

try:
    Base.metadata.create_all(bind=engine)
    print("Taules de duplicats d'adjudicataris i àlies creades correctament.")
except Exception as e:
    print(f"Error creant taules: {e}")
