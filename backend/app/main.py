"""C.E.O. API: health checks and authenticated club invitations."""

from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI
from pydantic import BaseModel
from app.routers import events

from app.routers.invitations import router as invitations_router

load_dotenv(Path(__file__).resolve().parents[1] / ".env")

app = FastAPI(title="C.E.O. API", version="0.1.0")
<<<<<<< HEAD
app.include_router(invitations_router)

=======
app.include_router(events.router)
>>>>>>> madhav/events-setup-s4-t3

class HealthResponse(BaseModel):
    status: str


@app.get("/api/health", response_model=HealthResponse, tags=["Health"])
def health() -> HealthResponse:
    """Process liveness only; this does not check Supabase connectivity."""
    return HealthResponse(status="ok")
