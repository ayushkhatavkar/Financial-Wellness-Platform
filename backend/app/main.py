from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.db.session import engine, Base
from app.api.routes import router as api_router
from app.models.entities import * # Ensure all models are registered on Base

# Create tables in PostgreSQL if not already present
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="SahayakFin API",
    description="Alternative Credit Scoring and Financial Wellness Platform for Indian Gig Workers",
    version="1.0.0"
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
