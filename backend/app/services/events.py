"""Persist events with the verified officer's Supabase client and RLS scope.

Routes must verify club access first. Never use a service-role client here.
Writes are not retried automatically because a timeout can follow a committed write.
"""
import secrets
from datetime import datetime, timezone
from typing import Literal
from uuid import UUID

import httpx
from fastapi import HTTPException

from app.schemas.events import EventCreate, EventListResponse, EventResponse, EventUpdate

EventAction = Literal["open-checkin", "close-checkin", "cancel", "archive", "finalize-attendance"]


async def _request(client: httpx.AsyncClient, method: str, **kwargs) -> httpx.Response:
    """Translate upstream failures without exposing database details or retrying writes."""
    writing = method != "GET"
    try:
        response = await client.request(method, "/rest/v1/events", **kwargs)
        if response.status_code == 401:
            raise HTTPException(401, "Please sign in again.")
        if response.status_code == 403:
            raise HTTPException(403, "You do not have permission to access these events.")
        if response.status_code == 409:
            raise HTTPException(409, "The event conflicts with its current state. Refresh events.")
        response.raise_for_status()
        return response
    except httpx.HTTPError:
        message = ("Couldn't confirm the change was saved. Refresh events before trying again."
                   if writing else "Unable to load events. Please try again.")
        raise HTTPException(502, message) from None


def _records(response: httpx.Response) -> list[dict]:
    """Require the list shape returned by PostgREST representations."""
    try:
        rows = response.json()
        if not isinstance(rows, list) or any(not isinstance(row, dict) for row in rows):
            raise ValueError()
        return rows
    except ValueError:
        raise HTTPException(502, "Invalid events response. Refresh events before trying again.") from None


def _event(row: dict, org_id: UUID, event_id: UUID | None = None) -> EventResponse:
    """Validate returned data and ensure it belongs to the requested club/event."""
    try:
        event = EventResponse.model_validate(row)
        if UUID(event.organization_id) != org_id or (event_id and UUID(event.event_id) != event_id):
            raise ValueError()
        UUID(event.event_id)
        return event
    except (ValueError, TypeError):
        raise HTTPException(502, "Invalid events response. Refresh events before trying again.") from None


async def list_events(client, org_id: UUID, include_archived: bool, limit: int, offset: int) -> EventListResponse:
    """Read a stable, paginated list scoped to one authorized club."""
    params = {"select": "*", "organization_id": f"eq.{org_id}",
              "order": "starts_at.desc,event_id.asc", "limit": str(limit), "offset": str(offset)}
    if not include_archived:
        params["archived_at"] = "is.null"
    response = await _request(client, "GET", params=params, headers={"Prefer": "count=exact"})
    rows = _records(response)
    try:
        total = int(response.headers["Content-Range"].split("/")[-1])
        if total < 0:
            raise ValueError()
    except (KeyError, ValueError):
        raise HTTPException(502, "Invalid event count. Please refresh events.") from None
    return EventListResponse(items=[_event(row, org_id) for row in rows], total=total, limit=limit, offset=offset)


async def create_event(client, org_id: UUID, body: EventCreate) -> EventResponse:
    """Insert allowed creation fields; database defaults assign identity and timestamps."""
    data = body.model_dump(mode="json")
    data.update(organization_id=str(org_id), check_in_token=secrets.token_urlsafe(32))
    response = await _request(client, "POST", json=data, headers={"Prefer": "return=representation"})
    rows = _records(response)
    if len(rows) != 1:
        raise HTTPException(502, "Couldn't confirm the event was saved. Refresh events before trying again.")
    return _event(rows[0], org_id)


async def _read(client, org_id: UUID, event_id: UUID) -> dict:
    """Read one event using both identity and club filters."""
    response = await _request(client, "GET", params={"select": "*", "organization_id": f"eq.{org_id}",
                                                    "event_id": f"eq.{event_id}", "limit": "1"})
    rows = _records(response)
    if not rows:
        raise HTTPException(404, "Event not found or unavailable.")
    if len(rows) != 1:
        raise HTTPException(502, "Invalid events response.")
    _event(rows[0], org_id, event_id)
    return rows[0]


async def get_event(client, org_id: UUID, event_id: UUID) -> EventResponse:
    """Return details for an event in the authorized club."""
    return _event(await _read(client, org_id, event_id), org_id, event_id)


async def _save(client, org_id: UUID, event_id: UUID, previous: dict, changes: dict) -> EventResponse:
    """Update only if the row has not changed since validation (optimistic concurrency)."""
    version = previous.get("updated_at")
    try:
        if not isinstance(version, str) or datetime.fromisoformat(version.replace("Z", "+00:00")).tzinfo is None:
            raise ValueError()
    except ValueError:
        raise HTTPException(502, "Invalid event version. Refresh events before trying again.") from None
    response = await _request(client, "PATCH", params={"organization_id": f"eq.{org_id}",
        "event_id": f"eq.{event_id}", "updated_at": f"eq.{version}"}, json=changes,
        headers={"Prefer": "return=representation"})
    rows = _records(response)
    if not rows:
        raise HTTPException(409, "The event changed or is no longer available. Refresh events before trying again.")
    if len(rows) != 1:
        raise HTTPException(502, "Couldn't confirm the change was saved. Refresh events before trying again.")
    return _event(rows[0], org_id, event_id)


async def update_event(client, org_id: UUID, event_id: UUID, body: EventUpdate) -> EventResponse:
    """Edit supplied fields while preventing edits to archived events."""
    row = await _read(client, org_id, event_id)
    if row["archived_at"]:
        raise HTTPException(409, "Archived events cannot be edited.")
    return await _save(client, org_id, event_id, row, body.model_dump(mode="json", exclude_unset=True))


async def change_event_state(client, org_id: UUID, event_id: UUID, action: EventAction) -> EventResponse:
    """Validate officer lifecycle actions and save against the state that was checked."""
    row = await _read(client, org_id, event_id)
    if row["archived_at"]:
        raise HTTPException(409, "Event is archived.")
    if action in ("open-checkin", "finalize-attendance"):
        if row["status"] == "cancelled":
            raise HTTPException(409, "Event is cancelled.")
        if row["attendance_finalized_at"]:
            raise HTTPException(409, "Attendance already finalized.")
    if action == "open-checkin":
        changes = {"check_in_open": True}
    elif action == "close-checkin":
        changes = {"check_in_open": False}
    elif action == "cancel":
        if row["status"] == "cancelled":
            raise HTTPException(409, "Event already cancelled.")
        changes = {"status": "cancelled", "check_in_open": False}
    elif action == "archive":
        changes = {"archived_at": datetime.now(timezone.utc).isoformat(), "check_in_open": False}
    elif action == "finalize-attendance":
        if row["check_in_open"]:
            raise HTTPException(409, "Close check-in first.")
        changes = {"attendance_finalized_at": datetime.now(timezone.utc).isoformat()}
    else:
        raise HTTPException(422, "Unknown event action.")
    return await _save(client, org_id, event_id, row, changes)
