"""Local API scaffold. No authentication or database operations yet."""

from fastapi import FastAPI
from pydantic import BaseModel
from app.routers.event_routers import router as events_router

app = FastAPI(title="C.E.O. API", version="0.1.0")
app.include_router(events_router)

class HealthResponse(BaseModel):
    status: str


@app.get("/api/health", response_model=HealthResponse, tags=["Health"])
def health() -> HealthResponse:
    """Process liveness only; this does not check Supabase connectivity."""
    return HealthResponse(status="ok")
