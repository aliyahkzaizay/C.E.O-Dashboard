"""Finance persistence using caller-scoped Supabase clients, never service-role keys.

Routes authorize each request. RLS remains the database/storage boundary.
Writes are not automatically retried: a network failure can follow a committed write.
"""
from pathlib import PurePath
from urllib.parse import quote
from uuid import UUID
import httpx
from fastapi import HTTPException, UploadFile
from pydantic import ValidationError
from app.schemas.finance import ReportResponse, SettingsResponse, TransactionResponse
from app.services.members import require_club_access

BUCKET = "purchase-reports"
MAX_FILE_BYTES = 10 * 1024 * 1024


async def request(client, method, path, **kwargs):
    """Translate upstream errors without exposing SQL, tokens or storage internals."""
    try:
        response = await client.request(method, path, **kwargs)
        if response.status_code in (401, 403):
            raise HTTPException(response.status_code, "Finance access denied. Check your sign-in and permissions.")
        if response.status_code == 404:
            raise HTTPException(404, "Record or file not found.")
        if response.status_code == 409:
            raise HTTPException(409, "The record conflicts with its current state. Refresh before retrying.")
        response.raise_for_status()
        return response
    except httpx.HTTPError:
        raise HTTPException(502, "Couldn't confirm the finance request. Refresh before retrying a change.") from None


def records(response):
    """Require a PostgREST list instead of trusting arbitrary upstream JSON."""
    try:
        rows = response.json()
        if not isinstance(rows, list) or any(not isinstance(row, dict) for row in rows):
            raise ValueError()
        return rows
    except ValueError:
        raise HTTPException(502, "Invalid finance response.") from None


def validate(row, model, org_id, record_id=None):
    """Validate both the response schema and its requested organization/identity."""
    try:
        value = model.model_validate(row)
        if value.organization_id != org_id:
            raise ValueError()
        if record_id and getattr(value, 'report_id', getattr(value, 'transaction_id', None)) != record_id:
            raise ValueError()
        if model is ReportResponse and value.object_path != f"{org_id}/{value.report_id}/file":
            raise ValueError()
        return value
    except (ValidationError, ValueError, TypeError):
        raise HTTPException(502, "Invalid finance response.") from None


async def authorize(client, org_id, permission="read"):
    """Verify membership, then owner/finance-editor permissions using stored roles."""
    user_id = await require_club_access(client, org_id)
    if permission == "read":
        return user_id
    rows = records(await request(client, "GET", "/rest/v1/organization_users", params={
        "organization_id": f"eq.{org_id}", "user_id": f"eq.{user_id}",
        "select": "access_role,can_edit_finances", "limit": "1"}))
    allowed = bool(rows) and (rows[0].get("access_role") == "owner" or
        (permission == "edit" and rows[0].get("access_role") == "admin" and rows[0].get("can_edit_finances") is True))
    if not allowed:
        raise HTTPException(403, "Only the club owner can delete reports." if permission == "owner" else "Finance-editing permission is required.")
    return user_id


async def event_exists(client, org_id, event_id):
    """Verify an optional event belongs to this club before creating an association."""
    if event_id is None:
        return
    rows = records(await request(client, "GET", "/rest/v1/events", params={
        "organization_id": f"eq.{org_id}", "event_id": f"eq.{event_id}", "select": "event_id", "limit": "1"}))
    if not rows or rows[0].get("event_id") != str(event_id):
        raise HTTPException(422, "Select an event belonging to this club.")


async def get_settings(client, org_id):
    """Return null until finance has been set up."""
    rows = records(await request(client, "GET", "/rest/v1/finance_settings", params={"organization_id": f"eq.{org_id}", "select": "*"}))
    return validate(rows[0], SettingsResponse, org_id) if rows else None


async def save_settings(client, org_id, payload):
    """Create or update settings with column-limited grants and caller RLS."""
    existing = await get_settings(client, org_id)
    data = payload.model_dump(mode="json")
    options = {"json": data, "headers": {"Prefer": "return=representation"}}
    if existing:
        options["params"] = {"organization_id": f"eq.{org_id}"}
    else:
        data["organization_id"] = str(org_id)
    rows = records(await request(client, "PATCH" if existing else "POST", "/rest/v1/finance_settings", **options))
    if len(rows) != 1:
        raise HTTPException(409, "Settings changed or are unavailable. Refresh before retrying.")
    return validate(rows[0], SettingsResponse, org_id)


async def list_records(client, org_id, table, model, limit, offset):
    """Return a bounded, deterministically ordered page; voided transactions remain visible."""
    identity = "report_id" if table == "purchase_reports" else "transaction_id"
    response = await request(client, "GET", f"/rest/v1/{table}", params={
        "organization_id": f"eq.{org_id}", "select": "*", "order": f"created_at.desc,{identity}.asc",
        "limit": str(limit), "offset": str(offset)}, headers={"Prefer": "count=exact"})
    try:
        total = int(response.headers["Content-Range"].split("/")[-1])
        if total < 0: raise ValueError()
    except (KeyError, ValueError):
        raise HTTPException(502, "Invalid finance count.") from None
    return {"items": [validate(row, model, org_id) for row in records(response)], "total": total, "limit": limit, "offset": offset}


async def create_transaction(client, org_id, payload):
    """Insert a validated transaction; require opening settings first."""
    if await get_settings(client, org_id) is None:
        raise HTTPException(409, "Set up club finances first.")
    await event_exists(client, org_id, payload.event_id)
    data = payload.model_dump(mode="json") | {"organization_id": str(org_id)}
    rows = records(await request(client, "POST", "/rest/v1/finance_transactions", json=data, headers={"Prefer": "return=representation"}))
    if len(rows) != 1: raise HTTPException(502, "Couldn't confirm the transaction was saved.")
    return validate(rows[0], TransactionResponse, org_id)


async def void_transaction(client, org_id, transaction_id, reason):
    """Atomically void only a still-current transaction; the trigger stamps actor/time."""
    rows = records(await request(client, "PATCH", "/rest/v1/finance_transactions", params={
        "organization_id": f"eq.{org_id}", "transaction_id": f"eq.{transaction_id}", "voided_at": "is.null"},
        json={"void_reason": reason}, headers={"Prefer": "return=representation"}))
    if not rows: raise HTTPException(409, "Transaction is unavailable or already voided.")
    return validate(rows[0], TransactionResponse, org_id, transaction_id)


async def get_report(client, org_id, report_id):
    """Resolve a private storage path only from authorized stored metadata."""
    rows = records(await request(client, "GET", "/rest/v1/purchase_reports", params={
        "organization_id": f"eq.{org_id}", "report_id": f"eq.{report_id}", "select": "*", "limit": "1"}))
    if not rows: raise HTTPException(404, "Report not found.")
    return validate(rows[0], ReportResponse, org_id, report_id)


async def upload_report(client, org_id, payload, file: UploadFile):
    """Validate a bounded upload, then create metadata and upload through Storage API.

    Keep metadata on storage failure/timeout: deleting it could orphan a successful
    upload. Return its ID so an owner can inspect/delete it; never silently retry.
    """
    try:
        content = await file.read(MAX_FILE_BYTES + 1)
    finally:
        await file.close()
    if not content or len(content) > MAX_FILE_BYTES:
        raise HTTPException(422, "Choose a nonempty PDF, JPG or PNG up to 10 MB.")
    name = (file.filename or "").replace("\\", "/").split("/")[-1]
    suffix = PurePath(name).suffix.lower()
    formats = {".pdf": ("application/pdf", b"%PDF-"), ".png": ("image/png", b"\x89PNG\r\n\x1a\n"),
               ".jpg": ("image/jpeg", b"\xff\xd8\xff"), ".jpeg": ("image/jpeg", b"\xff\xd8\xff")}
    expected = formats.get(suffix)
    if not expected or not content.startswith(expected[1]) or len(name) > 255 or any(ord(c) < 32 for c in name):
        raise HTTPException(422, "File contents must match a PDF, JPG or PNG filename.")
    await event_exists(client, org_id, payload.event_id)
    data = payload.model_dump(mode="json") | {"organization_id": str(org_id), "filename": name,
        "content_type": expected[0], "file_size_bytes": len(content)}
    rows = records(await request(client, "POST", "/rest/v1/purchase_reports", json=data, headers={"Prefer": "return=representation"}))
    if len(rows) != 1: raise HTTPException(502, "Couldn't confirm the report metadata was saved.")
    report = validate(rows[0], ReportResponse, org_id)
    try:
        await request(client, "POST", f"/storage/v1/object/{BUCKET}/{quote(report.object_path, safe='/')}",
            content=content, headers={"Content-Type": expected[0], "x-upsert": "false"})
    except HTTPException:
        raise HTTPException(502, {"message": "Report details exist, but file upload could not be confirmed. Ask the owner to inspect this report before uploading again.", "report_id": str(report.report_id)}) from None
    return report


async def download_report(client, org_id, report_id):
    """Issue a short-lived relative Storage URL, never expose service credentials."""
    report = await get_report(client, org_id, report_id)
    response = await request(client, "POST", f"/storage/v1/object/sign/{BUCKET}/{report.object_path}", json={"expiresIn": 60})
    try:
        path = response.json()["signedURL"]
        expected = f"/object/sign/{BUCKET}/{report.object_path}?"
        if not isinstance(path, str) or not path.startswith(expected): raise ValueError()
    except (ValueError, KeyError, TypeError):
        raise HTTPException(502, "Invalid download response.") from None
    return {"url": str(client.base_url).rstrip('/') + "/storage/v1" + path, "expires_in": 60}


async def delete_report(client, org_id, report_id):
    """Delete the storage object first; retain metadata if deletion is uncertain."""
    report = await get_report(client, org_id, report_id)
    await request(client, "DELETE", f"/storage/v1/object/{BUCKET}", json={"prefixes": [report.object_path]})
    await request(client, "DELETE", "/rest/v1/purchase_reports", params={
        "organization_id": f"eq.{org_id}", "report_id": f"eq.{report_id}"})
