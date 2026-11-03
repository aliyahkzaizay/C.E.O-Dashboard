from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI
from pydantic import BaseModel
from app.routers import events

from app.routers.invitations import router as invitations_router
from app.routers.member_imports import router as member_imports_router
from app.routers.members import router as members_router

load_dotenv(Path(__file__).resolve().parents[1] / ".env")

app = FastAPI(title="C.E.O. API", version="0.1.0")
app.include_router(invitations_router)
app.include_router(members_router)
app.include_router(events.router)
app.include_router(member_imports_router)


class HealthResponse(BaseModel):
    status: str


@app.get("/api/health", response_model=HealthResponse, tags=["Health"])
def health() -> HealthResponse:
    return HealthResponse(status="ok")