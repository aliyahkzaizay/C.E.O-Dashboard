"""Verify officer access for event requests using the existing member access flow."""
from typing import Annotated
from uuid import UUID

import httpx
from fastapi import Depends, Header, Response

from app.routers.members import get_supabase_client
from app.services.members import require_club_access


async def get_officer_org_id(
    response: Response,
    x_org_id: Annotated[UUID, Header(alias="X-Org-Id")],
    client: Annotated[httpx.AsyncClient, Depends(get_supabase_client)],
) -> UUID:
    """Treat the club header as a selection, then verify the caller's membership."""
    response.headers["Cache-Control"] = "no-store"
    await require_club_access(client, x_org_id)
    return x_org_id
