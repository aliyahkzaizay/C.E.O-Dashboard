"""Handle member storage and organization-access checks.

Callers must supply an AsyncClient configured with the Supabase project root
URL, a publishable API key, the caller's bearer token, and a finite timeout.
Never supply a service-role client: requests must retain the caller's RLS scope.
"""

from uuid import UUID

import httpx
from fastapi import HTTPException

from app.schemas.members import MemberCreate, MemberListResponse, MemberResponse


async def require_club_access(
    client: httpx.AsyncClient,
    organization_id: UUID,
) -> UUID:
    """Verify the signed-in user is an owner or admin of this club."""
    try:
        user_response = await client.get("/auth/v1/user")
        if user_response.status_code in (401, 403):
            raise HTTPException(401, "Please sign in again.")
        user_response.raise_for_status()
        user_id = UUID(user_response.json()["id"])

        access_response = await client.get(
            "/rest/v1/organization_users",
            params={
                "select": "access_role",
                "organization_id": f"eq.{organization_id}",
                "user_id": f"eq.{user_id}",
                "limit": "1",
            },
        )
        if access_response.status_code in (401, 403):
            raise HTTPException(401, "Please sign in again.")
        access_response.raise_for_status()
        records = access_response.json()
        if not isinstance(records, list):
            raise ValueError("Invalid access response")
        if not records or records[0]["access_role"] not in ("owner", "admin"):
            raise HTTPException(404, "Club not found or unavailable.")
        return user_id
    except (httpx.HTTPError, ValueError, KeyError, IndexError, TypeError):
        raise HTTPException(
            502, "Unable to verify club access. Please try again."
        ) from None


async def create_member(
    client: httpx.AsyncClient,
    organization_id: UUID,
    member: MemberCreate,
) -> MemberResponse:
    """Save a member after verifying the officer's club access."""
    await require_club_access(client, organization_id)

    data = member.model_dump(mode="json")
    data["organization_id"] = str(organization_id)

    try:
        response = await client.post(
            "/rest/v1/members",
            json=data,
            headers={"Prefer": "return=representation"},
        )
        if response.status_code == 409:
            raise HTTPException(
                409,
                "A member with this email or external ID already exists. "
                "Check archived members too.",
            )
        if response.status_code == 401:
            raise HTTPException(401, "Please sign in again.")
        if response.status_code == 403:
            raise HTTPException(
                403, "You do not have permission to add members to this club."
            )
        response.raise_for_status()
        saved_member = response.json()[0]
        return MemberResponse.model_validate(saved_member)
    except (httpx.HTTPError, ValueError, KeyError, IndexError, TypeError):
        # A connection may fail after the database commits. Never retry blindly.
        raise HTTPException(
            502,
            "Couldn't confirm the member was saved. "
            "Refresh the roster before trying again.",
        ) from None


async def list_members(
    client: httpx.AsyncClient,
    organization_id: UUID,
    limit: int = 40,
    offset: int = 0,
) -> MemberListResponse:
    """Return a page of current members from an authorized club."""
    if not 1 <= limit <= 100 or offset < 0:
        raise HTTPException(422, "Invalid pagination settings.")

    await require_club_access(client, organization_id)

    try:
        response = await client.get(
            "/rest/v1/members",
            params={
                "select": "*",
                "organization_id": f"eq.{organization_id}",
                "archived_at": "is.null",
                "order": "name.asc,member_id.asc",
                "limit": str(limit),
                "offset": str(offset),
            },
            headers={"Prefer": "count=exact"},
        )
        if response.status_code == 401:
            raise HTTPException(401, "Please sign in again.")
        if response.status_code == 403:
            raise HTTPException(
                403, "You do not have permission to view this roster."
            )
        response.raise_for_status()

        records = response.json()
        if not isinstance(records, list):
            raise ValueError("Invalid roster response")
        total = int(response.headers["Content-Range"].split("/")[-1])

        return MemberListResponse(
            items=[MemberResponse.model_validate(record) for record in records],
            total=total,
            limit=limit,
            offset=offset,
        )
    except (httpx.HTTPError, ValueError, KeyError, TypeError):
        raise HTTPException(
            502, "Unable to load members. Please try again."
        ) from None
