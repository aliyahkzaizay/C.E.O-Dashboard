from datetime import datetime

from fastapi import APIRouter

from app.schemas.event import EventCreate

router = APIRouter(prefix="/api/events", tags=["Events"])


@router.get("")
def list_events():
    return {
        "items": [],
        "total": 0,
        "limit": 50,
        "offset": 0,
    }


@router.post("")
def create_event(event: EventCreate):
    return {
        "event_id": "temp-event-id",
        "organization_id": "temp-org-id",
        "event_name": event.event_name,
        "description": event.description,
        "starts_at": event.starts_at,
        "event_type": event.event_type,
        "status": "scheduled",
        "check_in_open": False,
        "attendance_finalized_at": None,
        "archived_at": None,
    }