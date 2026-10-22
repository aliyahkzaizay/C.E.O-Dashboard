import uuid
from datetime import datetime

from fastapi import APIRouter

from app.schemas.events import EventCreate

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
    event_id = str(uuid.uuid4())
    check_in_token = str(uuid.uuid4())

    return {
        "event_id": event_id,
        "organization_id": "temp-org-id",
        "event_name": event.event_name,
        "description": event.description,
        "starts_at": event.starts_at,
        "event_type": event.event_type,
        "status": "scheduled",
        "check_in_token": check_in_token,
        "check_in_open": False,
        "attendance_finalized_at": None,
        "archived_at": None,
    }
    
    @router.post("/{event_id}/open-checkin")
    def open_checkin(event_id: str):
        return {
        "event_id": event_id,
        "check_in_open": True,
    }
    
    @router.post("/{event_id}/close-checkin")
    def close_checkin(event_id: str):
        return {
            "event_id": event_id,
            "check_in_open": False,
    }

    @router.post("/{event_id}/cancel")
    def cancel_event(event_id: str):
        return {
            "event_id": event_id,
            "status": "cancelled",
            "check_in_open": False,
    }

    @router.post("/{event_id}/archive")
    def archive_event(event_id: str):
    return {
        "event_id": event_id,
        "status": "archived",
        "archived_at": datetime.utcnow(),
    }

    @router.post("/{event_id}/finalize-attendance")
    def finalize_attendance(event_id: str):
    return {
        "event_id": event_id,
        "attendance_finalized_at": datetime.utcnow(),
    }