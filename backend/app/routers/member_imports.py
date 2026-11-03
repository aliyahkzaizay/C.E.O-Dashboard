import json
from typing import Annotated
from uuid import UUID

import httpx
from fastapi import APIRouter, Depends, File, Form, Response, UploadFile
from fastapi.responses import JSONResponse

from app.imports.parsers import ImportFileError, parse_member_file
from app.imports.ratelimit import SlidingWindowLimiter
from app.imports.service import SupabaseRoster, preview_import, run_import
from app.routers.members import get_supabase_client
from app.services.members import require_club_access

router = APIRouter(prefix="/api/organizations/{organization_id}/member-imports", tags=["Member import"])


PREVIEW_LIMIT = SlidingWindowLimiter(max_calls=30, window_seconds=600)
IMPORT_LIMIT = SlidingWindowLimiter(max_calls=10, window_seconds=600)


def _too_many(limiter: SlidingWindowLimiter, user_id: UUID, organization_id: UUID) -> JSONResponse | None:
    wait = limiter.hit(f"{user_id}:{organization_id}")
    if wait is None:
        return None
    reply = _error(429, "RATE_LIMITED", f"Too many imports. Try again in {wait} seconds.")
    reply.headers["Retry-After"] = str(wait)
    return reply


def _error(status: int, code: str, message: str, field: str | None = None) -> JSONResponse:
    return JSONResponse(status_code=status, content={"error": {"code": code, "message": message, "field": field}})


def _read_mapping(raw: str | None) -> tuple[dict[str, str] | None, JSONResponse | None]:
    if raw is None or not raw.strip():
        return None, None
    try:
        value = json.loads(raw)
    except ValueError:
        return None, _error(422, "INVALID_MAPPING", "The mapping must be valid JSON.", "mapping")
    if not isinstance(value, dict) or not all(isinstance(k, str) and isinstance(v, str) for k, v in value.items()):
        return None, _error(422, "INVALID_MAPPING", "The mapping must map member fields to column names.", "mapping")
    return value, None


@router.post("/preview")
async def preview(
    organization_id: UUID,
    response: Response,
    client: Annotated[httpx.AsyncClient, Depends(get_supabase_client)],
    file: UploadFile = File(...),
    mapping: str | None = Form(default=None),
):
    response.headers["Cache-Control"] = "no-store"
    user_id = await require_club_access(client, organization_id)
    if (limited := _too_many(PREVIEW_LIMIT, user_id, organization_id)) is not None:
        return limited
    chosen, bad = _read_mapping(mapping)
    if bad is not None:
        return bad
    try:
        parsed = parse_member_file(file.filename or "", await file.read())
    except ImportFileError as exc:
        return JSONResponse(status_code=422, content=exc.to_dict())
    return await preview_import(parsed, chosen, SupabaseRoster(client, organization_id))


@router.post("")
async def import_members(
    organization_id: UUID,
    response: Response,
    client: Annotated[httpx.AsyncClient, Depends(get_supabase_client)],
    file: UploadFile = File(...),
    mapping: str | None = Form(default=None),
):
    response.headers["Cache-Control"] = "no-store"
    user_id = await require_club_access(client, organization_id)
    if (limited := _too_many(IMPORT_LIMIT, user_id, organization_id)) is not None:
        return limited
    chosen, bad = _read_mapping(mapping)
    if bad is not None:
        return bad
    if chosen is None:
        return _error(422, "MAPPING_REQUIRED", "Send the column mapping you confirmed in the preview.", "mapping")
    try:
        parsed = parse_member_file(file.filename or "", await file.read())
    except ImportFileError as exc:
        return JSONResponse(status_code=422, content=exc.to_dict())
    result, mapping_issues = await run_import(parsed, chosen, SupabaseRoster(client, organization_id))
    if mapping_issues:
        first = mapping_issues[0]
        return _error(422, first.code, first.message, first.field)
    return result