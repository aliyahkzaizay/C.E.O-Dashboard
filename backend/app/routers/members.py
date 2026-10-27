"""Authenticated routes for creating and listing a club's members."""

import os
from collections.abc import AsyncIterator
from typing import Annotated
from urllib.parse import urlsplit
from uuid import UUID

import httpx
from fastapi import APIRouter, Depends, HTTPException, Query, Response
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.schemas.members import MemberCreate, MemberListResponse, MemberResponse
from app.services import members as member_service

router = APIRouter(prefix="/api/organizations/{organization_id}/members", tags=["Members"])
bearer = HTTPBearer(auto_error=False)


async def get_supabase_client(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer)],
) -> AsyncIterator[httpx.AsyncClient]:
    """Provide a request-scoped client that preserves the user's database permissions."""
    if credentials is None:
        raise HTTPException(401, "Please sign in to manage members.")

    base_url = os.getenv("SUPABASE_URL", "").strip()
    key = os.getenv("SUPABASE_PUBLISHABLE_KEY", "").strip()
    try:
        parsed = urlsplit(base_url)
        valid_url = (
            bool(parsed.hostname)
            and not parsed.username and not parsed.password
            and not parsed.query and not parsed.fragment
            and parsed.path in ("", "/")
            and (parsed.scheme == "https" or (
                parsed.scheme == "http"
                and parsed.hostname in {"localhost", "127.0.0.1"}
            ))
        )
        parsed.port  # Validate malformed port values before constructing the client.
    except ValueError:
        valid_url = False
    if not valid_url or not key.startswith("sb_publishable_"):
        raise HTTPException(503, "Member API configuration is incomplete.")

    async with httpx.AsyncClient(
        base_url=base_url.rstrip("/"),
        headers={
            "apikey": key,
            "Authorization": f"Bearer {credentials.credentials}",
        },
        timeout=15.0,
        follow_redirects=False,
    ) as client:
        yield client


@router.post("", response_model=MemberResponse, status_code=201)
async def create_member(
    organization_id: UUID,
    payload: MemberCreate,
    response: Response,
    client: Annotated[httpx.AsyncClient, Depends(get_supabase_client)],
) -> MemberResponse:
    """Validate submitted fields and create a member in the authorized club."""
    response.headers["Cache-Control"] = "no-store"
    return await member_service.create_member(client, organization_id, payload)


@router.get("", response_model=MemberListResponse)
async def list_members(
    organization_id: UUID,
    response: Response,
    client: Annotated[httpx.AsyncClient, Depends(get_supabase_client)],
    limit: Annotated[int, Query(ge=1, le=100)] = 40,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> MemberListResponse:
    """Return a bounded page of non-archived members, defaulting to 40 rows."""
    response.headers["Cache-Control"] = "no-store"
    return await member_service.list_members(client, organization_id, limit, offset)
