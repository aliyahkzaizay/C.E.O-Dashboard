"""Officer-only event endpoints backed by Supabase storage."""
from typing import Annotated
from uuid import UUID

import httpx
from fastapi import APIRouter, Depends, Query

from app.dependencies import get_officer_org_id
from app.routers.members import get_supabase_client
from app.schemas.events import EventCreate, EventListResponse, EventResponse, EventSettingsResponse, EventUpdate
from app.services import events as event_service

router = APIRouter(prefix="/api/events", tags=["Events"])
OfficerOrg = Annotated[UUID, Depends(get_officer_org_id)]
SupabaseClient = Annotated[httpx.AsyncClient, Depends(get_supabase_client)]


@router.get("", response_model=EventListResponse)
async def list_events(org_id: OfficerOrg, client: SupabaseClient,
                      include_archived: bool = False,
                      limit: int = Query(50, ge=1, le=200), offset: int = Query(0, ge=0)):
    """List events after verifying the caller's access to the selected club."""
    return await event_service.list_events(client, org_id, include_archived, limit, offset)


@router.post("", response_model=EventResponse, status_code=201)
async def create_event(body: EventCreate, org_id: OfficerOrg, client: SupabaseClient):
    """Create a persisted event with a server-generated check-in token."""
    return await event_service.create_event(client, org_id, body)


@router.get("/{event_id}", response_model=EventResponse)
async def get_event(event_id: UUID, org_id: OfficerOrg, client: SupabaseClient):
    """Retrieve an event only within the authorized club."""
    return await event_service.get_event(client, org_id, event_id)


@router.patch("/{event_id}", response_model=EventResponse)
async def update_event(event_id: UUID, body: EventUpdate, org_id: OfficerOrg, client: SupabaseClient):
    """Apply validated partial edits to a persisted event."""
    return await event_service.update_event(client, org_id, event_id, body)


@router.post("/{event_id}/open-checkin", response_model=EventSettingsResponse)
async def open_checkin(event_id: UUID, org_id: OfficerOrg, client: SupabaseClient):
    """Apply the open-checkin action after verifying access and event state."""
    event = await event_service.change_event_state(client, org_id, event_id, "open-checkin")
    return EventSettingsResponse.model_validate(event.model_dump())


@router.post("/{event_id}/close-checkin", response_model=EventSettingsResponse)
async def close_checkin(event_id: UUID, org_id: OfficerOrg, client: SupabaseClient):
    """Apply the close-checkin action after verifying access and event state."""
    event = await event_service.change_event_state(client, org_id, event_id, "close-checkin")
    return EventSettingsResponse.model_validate(event.model_dump())


@router.post("/{event_id}/cancel", response_model=EventSettingsResponse)
async def cancel(event_id: UUID, org_id: OfficerOrg, client: SupabaseClient):
    """Apply the cancel action after verifying access and event state."""
    event = await event_service.change_event_state(client, org_id, event_id, "cancel")
    return EventSettingsResponse.model_validate(event.model_dump())


@router.post("/{event_id}/archive", response_model=EventSettingsResponse)
async def archive(event_id: UUID, org_id: OfficerOrg, client: SupabaseClient):
    """Apply the archive action after verifying access and event state."""
    event = await event_service.change_event_state(client, org_id, event_id, "archive")
    return EventSettingsResponse.model_validate(event.model_dump())


@router.post("/{event_id}/finalize-attendance", response_model=EventSettingsResponse)
async def finalize_attendance(event_id: UUID, org_id: OfficerOrg, client: SupabaseClient):
    """Apply the finalize-attendance action after verifying access and event state."""
    event = await event_service.change_event_state(client, org_id, event_id, "finalize-attendance")
    return EventSettingsResponse.model_validate(event.model_dump())
