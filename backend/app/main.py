import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.db.session import engine, Base, SessionLocal
from app.api.routes import router as api_router
from app.models.entities import * # Ensure all models are registered on Base
from app.core.config import EXCEL_DATASET_PATH
from app.imports.excel_importer import import_excel_dataset

# Create tables in database if not already present
Base.metadata.create_all(bind=engine)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Auto-seed if database is empty
    db = SessionLocal()
    try:
        user_count = db.query(User).count()
        if user_count == 0 and os.path.exists(EXCEL_DATASET_PATH):
            print(f"Empty database detected. Seeding from {EXCEL_DATASET_PATH}...")
            import_excel_dataset(EXCEL_DATASET_PATH, db)
            print("Database seeded successfully.")
    except Exception as e:
        print(f"Warning during startup seed check: {e}")
    finally:
        db.close()
    yield

app = FastAPI(
    title="SahayakFin API",
    description="Alternative Credit Scoring and Financial Wellness Platform for Indian Gig Workers",
    version="1.0.0",
    lifespan=lifespan
)

# CORS Middleware to allow React frontend requests
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount all REST routes under /api
app.include_router(api_router, prefix="/api")

@app.get("/")
def root():
    return {
        "platform": "SahayakFin",
        "description": "Alternative Credit Scoring for Indian Gig Workers",
        "docs_url": "/docs",
        "health_check": "/api/health"
    }
