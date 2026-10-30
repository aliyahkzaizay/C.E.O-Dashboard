import secrets
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query

from app.dependencies import get_officer_org_id
from app.schemas.events import (
    EventCreate,
    EventListResponse,
    EventResponse,
    EventSettingsResponse,
    EventUpdate,
)

router = APIRouter(prefix="/api/events", tags=["Events"])
_EVENTS: dict[str, dict] = {}


def _get(event_id: str, org_id: str) -> dict:
    event = _EVENTS.get(event_id)
    if not event or event["organization_id"] != org_id:
        raise HTTPException(404, "Event not found")
    return event


def _refuse(condition: bool, message: str):
    if condition:
        raise HTTPException(409, message)


@router.get("", response_model=EventListResponse)
def list_events(
    include_archived: bool = False,
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    org_id: str = Depends(get_officer_org_id),
):
    items = [
        e for e in _EVENTS.values()
        if e["organization_id"] == org_id
        and (include_archived or not e["archived_at"])
    ]
    items.sort(key=lambda e: e["starts_at"], reverse=True)
    return {"items": items[offset:offset + limit], "total": len(items),
            "limit": limit, "offset": offset}


@router.post("", response_model=EventResponse, status_code=201)
def create_event(body: EventCreate, org_id: str = Depends(get_officer_org_id)):
    event = {
        "event_id": str(uuid.uuid4()),
        "organization_id": org_id,
        **body.model_dump(),
        "status": "scheduled",
        "check_in_token": secrets.token_urlsafe(32),
        "check_in_open": False,
        "attendance_finalized_at": None,
        "archived_at": None,
    }
    _EVENTS[event["event_id"]] = event
    return event


@router.get("/{event_id}", response_model=EventResponse)
def get_event(event_id: str, org_id: str = Depends(get_officer_org_id)):
    return _get(event_id, org_id)


@router.patch("/{event_id}", response_model=EventResponse)
def update_event(event_id: str, body: EventUpdate,
                 org_id: str = Depends(get_officer_org_id)):
    event = _get(event_id, org_id)
    _refuse(event["archived_at"], "Archived events cannot be edited")
    updates = body.model_dump(exclude_unset=True)
    if updates.get("event_name", "x") is None or updates.get("starts_at", "x") is None:
        raise HTTPException(422, "event_name and starts_at cannot be null")
    event.update(updates)
    return event


@router.post("/{event_id}/open-checkin", response_model=EventSettingsResponse)
def open_checkin(event_id: str, org_id: str = Depends(get_officer_org_id)):
    event = _get(event_id, org_id)
    _refuse(event["status"] == "cancelled", "Event is cancelled")
    _refuse(event["archived_at"], "Event is archived")
    _refuse(event["attendance_finalized_at"], "Attendance already finalized")
    event["check_in_open"] = True
    return event


@router.post("/{event_id}/close-checkin", response_model=EventSettingsResponse)
def close_checkin(event_id: str, org_id: str = Depends(get_officer_org_id)):
    event = _get(event_id, org_id)
    event["check_in_open"] = False
    return event


@router.post("/{event_id}/cancel", response_model=EventSettingsResponse)
def cancel_event(event_id: str, org_id: str = Depends(get_officer_org_id)):
    event = _get(event_id, org_id)
    _refuse(event["archived_at"], "Event is archived")
    _refuse(event["status"] == "cancelled", "Event already cancelled")
    event["status"] = "cancelled"
    event["check_in_open"] = False
    return event


@router.post("/{event_id}/archive", response_model=EventSettingsResponse)
def archive_event(event_id: str, org_id: str = Depends(get_officer_org_id)):
    event = _get(event_id, org_id)
    _refuse(event["archived_at"], "Event already archived")
    event["archived_at"] = datetime.now(timezone.utc)
    event["check_in_open"] = False
    return event


@router.post("/{event_id}/finalize-attendance", response_model=EventSettingsResponse)
def finalize_attendance(event_id: str, org_id: str = Depends(get_officer_org_id)):
    event = _get(event_id, org_id)
    _refuse(event["status"] == "cancelled", "Event is cancelled")
    _refuse(event["check_in_open"], "Close check-in first")
    _refuse(event["attendance_finalized_at"], "Attendance already finalized")
    event["attendance_finalized_at"] = datetime.now(timezone.utc)
    return event