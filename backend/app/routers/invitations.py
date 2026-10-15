"""Owner-only invitation endpoint using the caller's Supabase access token."""

import os
import re
from collections import defaultdict, deque
from threading import Lock
from time import monotonic
from typing import Annotated
from urllib.parse import urlsplit, urlunsplit
from uuid import UUID

import httpx
from fastapi import APIRouter, Depends, HTTPException, Response
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.services.email import send_invitation_email

router = APIRouter(prefix="/api", tags=["Invitations"])
bearer = HTTPBearer(auto_error=False)
_attempts: dict[str, deque[float]] = defaultdict(deque)
_attempts_lock = Lock()


class InvitationRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    organization_id: UUID
    email: str = Field(min_length=3, max_length=254)

    @field_validator("email")
    @classmethod
    def normalize_email(cls, value: str) -> str:
        value = value.strip().lower()
        if not re.fullmatch(r"[^\s@]+@[^\s@]+\.[^\s@]+", value):
            raise ValueError("Enter a valid email address.")
        return value


class InvitationResponse(BaseModel):
    invitation_id: UUID
    link: str
    email: str
    expires_at: str
    email_sent: bool


def configured_url(name: str) -> str:
    """Only allow configured HTTPS destinations, or HTTP on local development."""
    value = os.getenv(name, "").strip()
    parsed = urlsplit(value)
    if (
        not parsed.hostname or parsed.username or parsed.password
        or parsed.query or parsed.fragment
        or not (parsed.scheme == "https" or (
            parsed.scheme == "http" and parsed.hostname in {"localhost", "127.0.0.1"}
        ))
    ):
        raise HTTPException(503, "Invitation configuration is incomplete. Check backend settings.")
    return value.rstrip("/")


def limit_attempts(user_id: str) -> None:
    """Limit email attempts to 10 per minute per signed-in user in this process."""
    now = monotonic()
    with _attempts_lock:
        for key in list(_attempts):
            while _attempts[key] and _attempts[key][0] <= now - 60:
                _attempts[key].popleft()
            if not _attempts[key]:
                del _attempts[key]
        if len(_attempts[user_id]) >= 10:
            raise HTTPException(429, "Please wait a minute before creating another invitation.")
        _attempts[user_id].append(now)


@router.post("/invitations", response_model=InvitationResponse, status_code=201)
async def create_invitation(
    payload: InvitationRequest,
    response: Response,
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer)],
) -> InvitationResponse:
    """Create through the owner-checked RPC, then attempt email without losing the link."""
    if credentials is None:
        raise HTTPException(401, "Sign in to create an invitation.")
    base_url = configured_url("SUPABASE_URL")
    app_url = configured_url("APP_URL")
    key = os.getenv("SUPABASE_PUBLISHABLE_KEY", "").strip()
    if not key.startswith("sb_publishable_"):
        raise HTTPException(503, "Set the backend Supabase publishable key.")
    headers = {"apikey": key, "Authorization": f"Bearer {credentials.credentials}"}
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            user = await client.get(f"{base_url}/auth/v1/user", headers=headers)
            if user.status_code in (401, 403):
                raise HTTPException(401, "Your session expired. Sign in again.")
            user.raise_for_status()
            user_id = str(UUID(user.json()["id"]))
            limit_attempts(user_id)

            # RLS protects this lookup; the RPC below independently checks ownership.
            organization = await client.get(
                f"{base_url}/rest/v1/organizations",
                headers=headers,
                params={"organization_id": f"eq.{payload.organization_id}", "select": "organization_name"},
            )
            organization.raise_for_status()
            rows = organization.json()
            if not rows:
                raise HTTPException(403, "You do not have access to this club.")
            club_name = rows[0]["organization_name"]
            created = await client.post(
                f"{base_url}/rest/v1/rpc/create_organization_invitation",
                headers=headers,
                json={"p_organization_id": str(payload.organization_id), "p_email": payload.email},
            )
            if created.status_code in (401, 403):
                raise HTTPException(403, "You do not have permission to create invitations for this club.")
            if created.status_code == 400 and created.json().get("message") == "Only the club owner can create invitations.":
                raise HTTPException(403, "Only the club owner can create invitations.")
            created.raise_for_status()
            invitation = created.json()[0]
            invitation_id = UUID(invitation["invitation_id"])
            token = invitation["invitation_token"]
            if not isinstance(token, str) or not re.fullmatch(r"[0-9a-f]{64}", token):
                raise ValueError("Invalid invitation response")
            expires_at = invitation["expires_at"]
            parsed = urlsplit(app_url)
            link = urlunsplit((parsed.scheme, parsed.netloc, parsed.path or "/", "", f"invite={token}"))
            email_sent = await send_invitation_email(
                client, invitation_id=str(invitation_id), recipient=payload.email,
                club_name=club_name, link=link,
            )
    except (httpx.HTTPError, ValueError, KeyError, IndexError, TypeError):
        # Never expose tokens or upstream error bodies. Do not automatically retry creation.
        raise HTTPException(502, "Couldn't confirm invitation creation. Refresh the invitation list before trying again.") from None
    response.headers["Cache-Control"] = "no-store"
    return InvitationResponse(
        invitation_id=invitation_id, link=link, email=payload.email,
        expires_at=expires_at, email_sent=email_sent,
    )
