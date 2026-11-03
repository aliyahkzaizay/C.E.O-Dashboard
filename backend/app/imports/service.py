
from uuid import UUID

import httpx
from fastapi import HTTPException

from app.imports.cleaning import matching_key
from app.imports.parsers import ParsedFile
from app.imports.validation import (
    CleanMember,
    ImportIssue,
    ValidationResult,
    suggest_mapping,
    validate_rows,
)
from app.schemas.members import MemberCreate

_PAGE = 1000
BATCH_SIZE = 100 


class DuplicateMemberError(Exception):
    """Another member of this club already has the same email or external ID."""


class RosterUnavailable(Exception):
    """The roster could not be read or written, so the result of a save is unknown."""


class SupabaseRoster:
    """One club's roster, reached with the officer's request-scoped Supabase client."""

    def __init__(self, client: httpx.AsyncClient, organization_id: UUID):
        self.client = client
        self.organization_id = organization_id

    async def matching_method(self) -> str:
        try:
            response = await self.client.get(
                "/rest/v1/organizations",
                params={
                    "select": "matching_method",
                    "organization_id": f"eq.{self.organization_id}",
                    "limit": "1",
                },
            )
            response.raise_for_status()
            method = response.json()[0]["matching_method"]
        except (httpx.HTTPError, ValueError, KeyError, IndexError, TypeError):
            raise HTTPException(502, "Unable to read the club's settings. Please try again.") from None
        if method not in ("email", "external_id"):
            raise HTTPException(502, "Unable to read the club's settings. Please try again.")
        return method

    async def existing_keys(self, method: str) -> set[str]:
        """Matching values of every member, archived ones included (they keep their identifiers)."""
        keys: set[str] = set()
        offset = 0
        try:
            while True:
                response = await self.client.get(
                    "/rest/v1/members",
                    params={
                        "select": "email,external_member_id",
                        "organization_id": f"eq.{self.organization_id}",
                        "order": "member_id.asc",
                        "limit": str(_PAGE),
                        "offset": str(offset),
                    },
                )
                response.raise_for_status()
                records = response.json()
                if not isinstance(records, list):
                    raise ValueError("Invalid roster response")
                for record in records:
                    key = matching_key(record.get("email"), record.get("external_member_id"), method)
                    if key:
                        keys.add(key)
                if len(records) < _PAGE:
                    return keys
                offset += _PAGE
        except (httpx.HTTPError, ValueError, TypeError):
            raise HTTPException(502, "Unable to read the roster. Please try again.") from None

    @staticmethod
    def _payload(member: CleanMember, organization_id: UUID) -> dict:
        data = MemberCreate(
            name=member.name,
            email=member.email,
            external_member_id=member.external_member_id,
            date_joined=member.date_joined,
            class_year=member.class_year,
        ).model_dump(mode="json")  # every key is sent, so rows in one batch share the same columns
        data["organization_id"] = str(organization_id)
        return data

    async def _insert(self, body: dict | list[dict]) -> None:
        try:
            response = await self.client.post(
                "/rest/v1/members", json=body, headers={"Prefer": "return=minimal"}
            )
        except httpx.HTTPError:
            raise RosterUnavailable from None  # the write may or may not have committed
        if response.status_code == 409:
            raise DuplicateMemberError
        if response.status_code >= 400:
            raise RosterUnavailable

    async def add_member(self, member: CleanMember) -> None:
        """Insert one active member. The database rejects a duplicate with 409."""
        await self._insert(self._payload(member, self.organization_id))

    async def add_members(self, members: list[CleanMember]) -> None:
        """Insert several members in one request. All of them are saved, or none are.

        Raises DuplicateMemberError if any row clashes (nothing was saved) and RosterUnavailable
        if the result is unknown.
        """
        await self._insert([self._payload(m, self.organization_id) for m in members])


async def _validate(parsed: ParsedFile, mapping: dict[str, str], roster: SupabaseRoster) -> ValidationResult:
    method = await roster.matching_method()
    return validate_rows(parsed, mapping, method, existing_keys=await roster.existing_keys(method))


async def preview_import(parsed: ParsedFile, mapping: dict[str, str] | None, roster: SupabaseRoster) -> dict:
    """Check the file against the club roster. Saves nothing."""
    used = mapping if mapping is not None else suggest_mapping(parsed.headers)
    result = await _validate(parsed, used, roster)
    return {
        "file_type": parsed.file_type,
        "headers": parsed.headers,
        "suggested_mapping": suggest_mapping(parsed.headers),
        "mapping_issues": [i.to_dict() for i in result.mapping_issues],
        "summary": result.summary,
        "issues": [i.to_dict() for i in result.issues],
    }


async def run_import(
    parsed: ParsedFile, mapping: dict[str, str], roster: SupabaseRoster
) -> tuple[dict | None, list[ImportIssue]]:
    """Check the file again (the preview is not trusted), then save every ready row.

    Returns (result, mapping_issues). When the mapping is unusable nothing is saved and result
    is None. Counts come from what was actually saved. If the roster stops answering, the import
    stops, the rows not yet saved are reported as failed, and the result says it was interrupted.
    Uploading the same file again is safe: saved rows are skipped as duplicates.
    """
    validation = await _validate(parsed, mapping, roster)
    if validation.mapping_issues:
        return None, validation.mapping_issues

    created = 0
    skipped_late = 0
    unsaved = 0
    interrupted = False
    late: list[ImportIssue] = []

    def lost(row_number: int, code: str, message: str) -> None:
        nonlocal unsaved
        unsaved += 1
        late.append(ImportIssue(row_number, None, code, message))

    ready = [row for row in validation.rows if row.status == "ready" and row.member is not None]
    for start in range(0, len(ready), BATCH_SIZE):
        batch = ready[start:start + BATCH_SIZE]
        if interrupted:
            for row in batch:
                lost(row.row_number, "SAVE_NOT_ATTEMPTED", "The import stopped before this row was saved.")
            continue
        try:
            await roster.add_members([row.member for row in batch])
            created += len(batch)
            continue
        except RosterUnavailable:
            interrupted = True
            for row in batch:
                lost(row.row_number, "SAVE_UNCONFIRMED", "Could not confirm this row was saved. Upload the file again to finish.")
            continue
        except DuplicateMemberError:
            pass  # nothing in the batch was saved: fall back to one row at a time

        for index, row in enumerate(batch):
            if interrupted:
                lost(row.row_number, "SAVE_NOT_ATTEMPTED", "The import stopped before this row was saved.")
                continue
            try:
                await roster.add_member(row.member)
                created += 1
            except DuplicateMemberError:
                skipped_late += 1
                late.append(ImportIssue(row.row_number, None, "DUPLICATE_MEMBER_IDENTIFIER",
                                        "A member with this identifier already exists, so the row was skipped.",
                                        "warning"))
            except RosterUnavailable:
                interrupted = True
                lost(row.row_number, "SAVE_UNCONFIRMED", "Could not confirm this row was saved. Upload the file again to finish.")

    summary = validation.summary
    return {
        "summary": {
            "created": created,
            "skipped": summary["skipped"] + skipped_late,
            "failed": summary["failed"] + unsaved,
        },
        "interrupted": interrupted,
        "issues": [i.to_dict() for i in validation.issues] + [i.to_dict() for i in late],
    }, []