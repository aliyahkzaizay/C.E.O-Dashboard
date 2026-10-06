"""Local API scaffold. No authentication or database operations yet."""

from fastapi import FastAPI
from pydantic import BaseModel

app = FastAPI(title="C.E.O. API", version="0.1.0")


class HealthResponse(BaseModel):
    status: str


@app.get("/api/health", response_model=HealthResponse, tags=["Health"])
def health() -> HealthResponse:
    """Process liveness only; this does not check Supabase connectivity."""
    return HealthResponse(status="ok")
