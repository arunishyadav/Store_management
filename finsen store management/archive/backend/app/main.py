from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.database import create_tables, get_db
from app.routers import auth, users, locations, materials, inward, issues

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: create tables
    await create_tables()
    yield
    # Shutdown logic if any

app = FastAPI(
    title="Finsen Store Management API",
    description="Enterprise-grade store management backend",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS config
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins for development, configure properly for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(auth.router)
app.include_router(users.router)
app.include_router(locations.router)
app.include_router(materials.router)
app.include_router(inward.router)
app.include_router(issues.router)

@app.get("/", tags=["Health"])
async def root():
    return {"message": "Finsen Store Management API is running"}
