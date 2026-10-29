import os
from pathlib import Path
from dotenv import load_dotenv

# Base backend directory
BASE_DIR = Path(__file__).resolve().parent.parent.parent

# Load .env file
load_dotenv(BASE_DIR / ".env")

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/sahayakfin")
JWT_SECRET = os.getenv("JWT_SECRET", "sahayakfin_dev_jwt_secret_key_2026")
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "1440"))
ENVIRONMENT = os.getenv("ENVIRONMENT", "development")

# Path to the source Excel demo dataset
EXCEL_DATASET_PATH = os.getenv("EXCEL_DATASET_PATH", str(BASE_DIR.parent / "SahayakFin_Demo_Dataset.xlsx"))
