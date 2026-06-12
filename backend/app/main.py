from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.routers import upload, extract, units, export, documents, deadlines

app = FastAPI(
    title="Heimio API",
    description="Property management API for Heimio — smart German Mietverwaltung.",
    version="0.3.0",
    docs_url="/docs" if settings.environment == "development" else None,
    redoc_url=None,
)

# CORS — allow Next.js frontend.
# AnyHttpUrl normalises to a trailing slash; strip it so browsers match the
# bare origin (e.g. "http://localhost:3000", not "http://localhost:3000/").
_origin = str(settings.frontend_url).rstrip("/")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[_origin],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(upload.router)
app.include_router(extract.router)
app.include_router(units.router)
app.include_router(export.router)
app.include_router(documents.router)
app.include_router(deadlines.router)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}