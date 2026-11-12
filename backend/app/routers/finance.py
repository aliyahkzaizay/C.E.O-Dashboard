"""Finance endpoints: authenticated club selection and explicit write permissions."""
from typing import Annotated
from uuid import UUID
import httpx
from fastapi import APIRouter, Depends, File, Form, Header, HTTPException, Query, Response, UploadFile
from pydantic import ValidationError
from app.routers.members import get_supabase_client
from app.schemas.finance import (FinanceSettingsInput, SettingsResponse, TransactionInput,
    TransactionResponse, VoidInput, ReportInput, ReportResponse)
from app.services import finance as service

router = APIRouter(prefix="/api/finance", tags=["Finance"])
Client = Annotated[httpx.AsyncClient, Depends(get_supabase_client)]


async def read_access(response: Response, client: Client, x_org_id: Annotated[UUID, Header()]):
    """Verify membership and prevent caching private financial responses."""
    response.headers["Cache-Control"] = "no-store"
    await service.authorize(client, x_org_id)
    return x_org_id


async def edit_access(org: Annotated[UUID, Depends(read_access)], client: Client):
    """Allow owners or explicitly permitted finance editors."""
    await service.authorize(client, org, "edit")
    return org


async def owner_access(org: Annotated[UUID, Depends(read_access)], client: Client):
    """Treasurer access is deferred until positions have a trusted storage model."""
    await service.authorize(client, org, "owner")
    return org

ReadOrg = Annotated[UUID, Depends(read_access)]
EditOrg = Annotated[UUID, Depends(edit_access)]
OwnerOrg = Annotated[UUID, Depends(owner_access)]


@router.get("/settings", response_model=SettingsResponse | None)
async def get_settings(org: ReadOrg, client: Client):
    """Read saved setup, or null if not configured."""
    return await service.get_settings(client, org)


@router.put("/settings", response_model=SettingsResponse)
async def save_settings(payload: FinanceSettingsInput, org: EditOrg, client: Client):
    """Save opening balance and optional budget."""
    return await service.save_settings(client, org, payload)


@router.get("/transactions")
async def list_transactions(org: ReadOrg, client: Client, limit: Annotated[int, Query(ge=1, le=100)] = 40, offset: Annotated[int, Query(ge=0)] = 0):
    """List a page including voided records for audit visibility."""
    return await service.list_records(client, org, "finance_transactions", TransactionResponse, limit, offset)


@router.post("/transactions", response_model=TransactionResponse, status_code=201)
async def create_transaction(payload: TransactionInput, org: EditOrg, client: Client):
    """Create income or expense after finance setup."""
    return await service.create_transaction(client, org, payload)


@router.post("/transactions/{transaction_id}/void", response_model=TransactionResponse)
async def void_transaction(transaction_id: UUID, payload: VoidInput, org: EditOrg, client: Client):
    """Preserve the record while recording why it is void."""
    return await service.void_transaction(client, org, transaction_id, payload.reason)


@router.get("/reports")
async def list_reports(org: ReadOrg, client: Client, limit: Annotated[int, Query(ge=1, le=100)] = 40, offset: Annotated[int, Query(ge=0)] = 0):
    """List club report metadata, including records whose upload may be incomplete."""
    return await service.list_records(client, org, "purchase_reports", ReportResponse, limit, offset)


@router.post("/reports", response_model=ReportResponse, status_code=201)
async def upload_report(org: ReadOrg, client: Client, file: Annotated[UploadFile, File()],
    title: Annotated[str, Form(min_length=1, max_length=200)],
    event_id: Annotated[UUID | None, Form()] = None,
    notes: Annotated[str | None, Form(max_length=1000)] = None):
    """Upload multipart fields and one file; all club officers may upload."""
    try:
        payload = ReportInput(title=title, event_id=event_id, notes=notes)
    except ValidationError:
        raise HTTPException(422, "Provide a valid report title and notes.") from None
    return await service.upload_report(client, org, payload, file)


@router.get("/reports/{report_id}/download")
async def download_report(report_id: UUID, org: ReadOrg, client: Client):
    """Return a private download link valid for sixty seconds."""
    return await service.download_report(client, org, report_id)


@router.delete("/reports/{report_id}", status_code=204)
async def delete_report(report_id: UUID, org: OwnerOrg, client: Client):
    """Only owners may delete both file and metadata."""
    await service.delete_report(client, org, report_id)
    return Response(status_code=204, headers={"Cache-Control": "no-store"})
