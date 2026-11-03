import json

import httpx
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.imports import service
from app.routers import member_imports as imports
from app.routers import members

ORG = "00000000-0000-4000-8000-000000000001"
OTHER_ORG = "00000000-0000-4000-8000-0000000000bb"
USER = "00000000-0000-4000-8000-000000000002"
HEADERS = {"Authorization": "Bearer fake-session"}
MAPPING = {"name": "Full Name", "external_member_id": "Student ID", "email": "E-mail", "date_joined": "Joined"}
VALID_MAPPING = {"name": "Name", "external_member_id": "RIN", "email": "Email", "date_joined": "Date Joined"}


@pytest.fixture
def db(monkeypatch):
    monkeypatch.setenv("SUPABASE_URL", "https://example.supabase.co")
    monkeypatch.setenv("SUPABASE_PUBLISHABLE_KEY", "sb_publishable_test")
    state = {"role": "admin", "method": "external_id", "members": [], "fail_after": None, "inserts": 0, "posts": []}

    def handle(request):
        path = request.url.path
        if path == "/auth/v1/user":
            return httpx.Response(200, json={"id": USER})
        if path == "/rest/v1/organization_users":
            org = request.url.params["organization_id"].removeprefix("eq.")
            ok = state["role"] and org == ORG
            return httpx.Response(200, json=[{"access_role": state["role"]}] if ok else [])
        if path == "/rest/v1/organizations":
            return httpx.Response(200, json=[{"matching_method": state["method"]}])
        assert path == "/rest/v1/members"
        org = request.url.params.get("organization_id", "").removeprefix("eq.")
        if request.method == "GET":
            assert "archived_at" not in request.url.params
            rows = [m for m in state["members"] if m["organization_id"] == org]
            offset, limit = int(request.url.params["offset"]), int(request.url.params["limit"])
            return httpx.Response(200, json=rows[offset:offset + limit])
        body = json.loads(request.content)
        rows = body if isinstance(body, list) else [body]
        assert len({tuple(sorted(r)) for r in rows}) == 1
        assert request.headers["prefer"] == "return=minimal"
        state["posts"].append(len(rows))
        state["inserts"] += 1
        if state["fail_after"] is not None and state["inserts"] > state["fail_after"]:
            raise httpx.ReadTimeout("private details", request=request)
        taken = list(state["members"])
        for row in rows:
            for m in taken:
                if m["organization_id"] == row["organization_id"] and (
                    (row.get("email") and m.get("email") == row["email"])
                    or (row.get("external_member_id") and m.get("external_member_id") == row["external_member_id"])
                ):
                    return httpx.Response(409, json={"message": "duplicate key"})
            taken.append(row)
        state["members"].extend({"email": None, "external_member_id": None, **r} for r in rows)
        return httpx.Response(201)

    real_client = httpx.AsyncClient
    monkeypatch.setattr(members.httpx, "AsyncClient",
                        lambda **kw: real_client(transport=httpx.MockTransport(handle), **kw))
    return state


@pytest.fixture(autouse=True)
def fresh_limits():
    imports.PREVIEW_LIMIT.reset()
    imports.IMPORT_LIMIT.reset()
    yield
    imports.PREVIEW_LIMIT.reset()
    imports.IMPORT_LIMIT.reset()


@pytest.fixture
def client(db):
    with TestClient(app) as c:
        yield c


def post(client, path, content, filename="roster.csv", mapping=None, org=ORG, headers=HEADERS):
    data = {"mapping": json.dumps(mapping)} if mapping is not None else {}
    return client.post(f"/api/organizations/{org}/member-imports{path}",
                       files={"file": (filename, content, "text/csv")}, data=data, headers=headers)


def test_preview_saves_nothing_and_reports_counts(client, db, fixture_bytes):
    response = post(client, "/preview", fixture_bytes("members_messy.csv"))
    assert response.status_code == 200
    body = response.json()
    assert body["summary"] == {"total": 8, "ready": 3, "skipped": 1, "failed": 4}
    assert body["suggested_mapping"] == MAPPING
    assert db["members"] == []
    assert response.headers["cache-control"] == "no-store"


def test_import_saves_only_valid_rows_cleaned(client, db, fixture_bytes):
    response = post(client, "", fixture_bytes("members_messy.csv"), mapping=MAPPING)
    assert response.status_code == 200
    assert response.json()["summary"] == {"created": 3, "skipped": 1, "failed": 4}
    assert response.json()["interrupted"] is False
    assert {m["external_member_id"] for m in db["members"]} == {"001234567", "001234568", "001234573"}
    jordan = next(m for m in db["members"] if m["external_member_id"] == "001234568")
    assert jordan["email"] == "jordan.lee@example.edu" and jordan["name"] == "Jordan Lee"
    assert all(m["organization_id"] == ORG for m in db["members"])


def test_importing_the_same_file_twice_creates_nothing_the_second_time(client, db, fixture_bytes):
    one = post(client, "", fixture_bytes("members_valid.csv"), mapping=VALID_MAPPING)
    two = post(client, "", fixture_bytes("members_valid.csv"), mapping=VALID_MAPPING)
    assert one.json()["summary"] == {"created": 4, "skipped": 0, "failed": 0}
    assert two.json()["summary"] == {"created": 0, "skipped": 4, "failed": 0}
    assert len(db["members"]) == 4


def test_existing_and_archived_members_are_skipped_not_changed(client, db, fixture_bytes):
    db["members"].append({"organization_id": ORG, "name": "Old Name", "email": "old@example.edu",
                          "external_member_id": "001234567", "archived_at": "2026-01-01T00:00:00Z"})
    response = post(client, "", fixture_bytes("members_valid.csv"), mapping=VALID_MAPPING)
    assert response.json()["summary"] == {"created": 3, "skipped": 1, "failed": 0}
    assert next(m for m in db["members"] if m["external_member_id"] == "001234567")["name"] == "Old Name"


def test_row_that_becomes_duplicate_during_save_is_skipped(client, db, fixture_bytes, monkeypatch):
    from app.imports import service

    async def stale_keys(self):
        return set(), set()

    monkeypatch.setattr(service.SupabaseRoster, "existing_identifiers", stale_keys)
    db["members"].append({"organization_id": ORG, "name": "Sneaky", "email": None, "external_member_id": "001234568"})
    response = post(client, "", fixture_bytes("members_valid.csv"), mapping=VALID_MAPPING)
    assert response.json()["summary"] == {"created": 3, "skipped": 1, "failed": 0}
    assert "DUPLICATE_MEMBER_IDENTIFIER" in [i["code"] for i in response.json()["issues"]]
    assert len(db["members"]) == 4


def test_interrupted_import_reports_what_was_saved_and_retry_finishes(client, db, fixture_bytes, monkeypatch):
    monkeypatch.setattr(service, "BATCH_SIZE", 2)
    db["fail_after"] = 1
    response = post(client, "", fixture_bytes("members_valid.csv"), mapping=VALID_MAPPING)
    body = response.json()
    assert response.status_code == 200 and body["interrupted"] is True
    assert body["summary"] == {"created": 2, "skipped": 0, "failed": 2}
    assert len(db["members"]) == 2
    assert "private details" not in response.text
    assert [i["code"] for i in body["issues"]] == ["SAVE_UNCONFIRMED", "SAVE_UNCONFIRMED"]
    db["fail_after"] = None
    retry = post(client, "", fixture_bytes("members_valid.csv"), mapping=VALID_MAPPING)
    assert retry.json()["summary"] == {"created": 2, "skipped": 2, "failed": 0}
    assert len(db["members"]) == 4


def test_batches_after_an_interruption_are_not_attempted(client, db, fixture_bytes, monkeypatch):
    monkeypatch.setattr(service, "BATCH_SIZE", 1)
    db["fail_after"] = 1
    body = post(client, "", fixture_bytes("members_valid.csv"), mapping=VALID_MAPPING).json()
    assert body["summary"] == {"created": 1, "skipped": 0, "failed": 3}
    assert [i["code"] for i in body["issues"]] == ["SAVE_UNCONFIRMED", "SAVE_NOT_ATTEMPTED", "SAVE_NOT_ATTEMPTED"]
    assert db["inserts"] == 2


def test_rows_are_saved_in_batches_not_one_by_one(client, db, fixture_bytes, monkeypatch):
    post(client, "", fixture_bytes("members_valid.csv"), mapping=VALID_MAPPING)
    assert db["posts"] == [4]
    db["members"].clear(); db["posts"].clear()
    monkeypatch.setattr(service, "BATCH_SIZE", 3)
    post(client, "", fixture_bytes("members_valid.csv"), mapping=VALID_MAPPING)
    assert db["posts"] == [3, 1]


def test_a_clashing_batch_saves_nothing_then_rows_are_retried_one_by_one(client, db, fixture_bytes, monkeypatch):
    async def stale_keys(self):
        return set(), set()

    monkeypatch.setattr(service.SupabaseRoster, "existing_identifiers", stale_keys)
    db["members"].append({"organization_id": ORG, "name": "Sneaky", "email": None, "external_member_id": "001234569"})
    response = post(client, "", fixture_bytes("members_valid.csv"), mapping=VALID_MAPPING)
    assert response.json()["summary"] == {"created": 3, "skipped": 1, "failed": 0}
    assert db["posts"] == [4, 1, 1, 1, 1]
    assert len(db["members"]) == 4


def test_a_large_file_uses_a_few_requests(client, db):
    rows = "\n".join(f"Person {i},{i:09d},p{i}@example.edu,2026-09-01" for i in range(250))
    response = post(client, "", ("Name,RIN,Email,Date Joined\n" + rows).encode(), mapping=VALID_MAPPING)
    assert response.json()["summary"] == {"created": 250, "skipped": 0, "failed": 0}
    assert db["posts"] == [100, 100, 50]


def test_class_year_is_imported_in_common_spellings(client, db):
    csv = ("Name,RIN,Class Year\nA,001,Freshman\nB,002,Jr.\nC,003,3rd year\nD,004,Grad\nE,005,\n").encode()
    mapping = {"name": "Name", "external_member_id": "RIN", "class_year": "Class Year"}
    preview = post(client, "/preview", csv).json()
    assert preview["suggested_mapping"]["class_year"] == "Class Year"
    response = post(client, "", csv, mapping=mapping)
    assert response.json()["summary"] == {"created": 5, "skipped": 0, "failed": 0}
    years = {m["external_member_id"]: m["class_year"] for m in db["members"]}
    assert years == {"001": "first_year", "002": "junior", "003": "junior", "004": "graduate", "005": None}


def test_unknown_class_year_fails_only_that_row(client, db):
    csv = b"Name,RIN,Class Year\nA,001,Freshman\nB,002,Wizard\n"
    mapping = {"name": "Name", "external_member_id": "RIN", "class_year": "Class Year"}
    body = post(client, "", csv, mapping=mapping).json()
    assert body["summary"] == {"created": 1, "skipped": 0, "failed": 1}
    issue = body["issues"][0]
    assert (issue["row"], issue["field"], issue["code"]) == (3, "class_year", "INVALID_CLASS_YEAR")
    assert [m["external_member_id"] for m in db["members"]] == ["001"]


def test_rate_limit_stops_repeated_imports_with_retry_after(client, db, fixture_bytes, monkeypatch):
    from app.imports.ratelimit import SlidingWindowLimiter

    monkeypatch.setattr(imports, "IMPORT_LIMIT", SlidingWindowLimiter(max_calls=2, window_seconds=600))
    for _ in range(2):
        assert post(client, "", fixture_bytes("members_valid.csv"), mapping=VALID_MAPPING).status_code == 200
    blocked = post(client, "", fixture_bytes("members_valid.csv"), mapping=VALID_MAPPING)
    assert blocked.status_code == 429
    assert blocked.json()["error"]["code"] == "RATE_LIMITED" and set(blocked.json()["error"]) == {"code", "message", "field"}
    assert int(blocked.headers["retry-after"]) >= 1
    assert post(client, "/preview", fixture_bytes("members_valid.csv")).status_code == 200


def test_signed_out_requests_do_not_use_up_the_limit(client, db, fixture_bytes, monkeypatch):
    from app.imports.ratelimit import SlidingWindowLimiter

    monkeypatch.setattr(imports, "PREVIEW_LIMIT", SlidingWindowLimiter(max_calls=1, window_seconds=600))
    for _ in range(3):
        assert post(client, "/preview", fixture_bytes("members_valid.csv"), headers={}).status_code == 401
    assert post(client, "/preview", fixture_bytes("members_valid.csv")).status_code == 200


def test_email_matching_clubs_allow_external_id_with_warning(client, db):
    db["method"] = "email"
    response = post(client, "", b"Name,RIN\nAlex,001\n", mapping={"name": "Name", "external_member_id": "RIN"})
    assert response.status_code == 200
    assert response.json()["summary"]["created"] == 1
    assert response.json()["issues"][0]["code"] == "MISSING_CHECK_IN_IDENTIFIER"



def test_signed_out_and_non_officers_are_refused(client, db, fixture_bytes):
    assert post(client, "/preview", fixture_bytes("members_valid.csv"), headers={}).status_code == 401
    db["role"] = None
    assert post(client, "/preview", fixture_bytes("members_valid.csv")).status_code == 404
    assert post(client, "", fixture_bytes("members_valid.csv"), mapping=VALID_MAPPING).status_code == 404
    assert db["members"] == []


def test_other_clubs_are_not_reachable(client, db, fixture_bytes):
    response = post(client, "", fixture_bytes("members_valid.csv"), mapping=VALID_MAPPING, org=OTHER_ORG)
    assert response.status_code == 404
    assert db["members"] == []


@pytest.mark.parametrize("filename,content,code", [
    ("roster.txt", b"a,b\n1,2\n", "UNSUPPORTED_FILE_TYPE"),
    ("roster.csv", b"", "EMPTY_FILE"),
    ("roster.csv", b"Name,RIN\n", "EMPTY_FILE"),
    ("roster.csv", b"Name,Name\nA,B\n", "DUPLICATE_COLUMN"),
])
def test_bad_files_use_the_shared_error_shape(client, filename, content, code):
    response = post(client, "/preview", content, filename=filename)
    assert response.status_code == 422
    error = response.json()["error"]
    assert error["code"] == code and set(error) == {"code", "message", "field"}


def test_oversized_file_is_rejected(client):
    response = post(client, "/preview", b"x" * (2 * 1024 * 1024 + 1))
    assert response.status_code == 422 and response.json()["error"]["code"] == "FILE_TOO_LARGE"


def test_mapping_problems(client, fixture_bytes):
    assert post(client, "", fixture_bytes("members_valid.csv")).json()["error"]["code"] == "MAPPING_REQUIRED"
    bad = client.post(f"/api/organizations/{ORG}/member-imports/preview", headers=HEADERS,
                      files={"file": ("r.csv", fixture_bytes("members_valid.csv"), "text/csv")}, data={"mapping": "nope"})
    assert bad.status_code == 422 and bad.json()["error"]["code"] == "INVALID_MAPPING"
    soft = post(client, "/preview", fixture_bytes("members_valid.csv"), mapping={"name": "Nope"})
    assert soft.status_code == 200 and soft.json()["mapping_issues"]

def test_preview_sample_is_bounded_but_all_rows_saved(client, db):
    content = ("Name,Email\n" + "".join(f"Member {i},m{i}@example.test\n" for i in range(120))).encode()
    mapping = {"name": "Name", "email": "Email"}
    preview = post(client, "/preview", content, mapping=mapping).json()
    assert preview["summary"]["ready"] == 120
    assert len(preview["rows"]) == preview["preview_limit"] == 100
    assert preview["rows"][0]["member"]["name"] == "Member 0"
    assert not db["members"]
    assert post(client, "", content, mapping=mapping).json()["summary"]["created"] == 120
    assert post(client, "", content, mapping=mapping).json()["summary"]["skipped"] == 120


def test_secondary_email_duplicate_is_caught_before_save(client, db):
    db["members"] = [{"organization_id": ORG, "email": "a@example.test", "external_member_id": "old", "archived_at": "2026-01-01"}]
    content = b"Name,Email,RIN\nNew,A@example.test,new\n"
    preview = post(client, "/preview", content, mapping={"name": "Name", "email": "Email", "external_member_id": "RIN"}).json()
    assert preview["summary"]["skipped"] == 1
    assert preview["rows"][0]["status"] == "skipped"
    assert not db["posts"]


def test_xlsx_preview_save_and_repeat(client, db, make_xlsx):
    content = make_xlsx([["Name", "Email", "ID"], ["Alex", None, "001"], ["Sam", "sam@example.test", None]])
    mapping = {"name": "Name", "email": "Email", "external_member_id": "ID"}
    assert post(client, "/preview", content, filename="members.xlsx", mapping=mapping).json()["rows"][0]["member"]["external_member_id"] == "001"
    assert post(client, "", content, filename="members.xlsx", mapping=mapping).json()["summary"]["created"] == 2
    assert post(client, "", content, filename="members.xlsx", mapping=mapping).json()["summary"]["skipped"] == 2


def test_failed_preview_rows_preserve_mapped_values_without_allowing_save(client, db):
    content = b"Name,Email,ID,Joined,Year\nTaylor Invalid,not-an-email,001,bad-date,unknown\nMissing Identifier,,,,\n"
    mapping = {"name": "Name", "email": "Email", "external_member_id": "ID", "date_joined": "Joined", "class_year": "Year"}
    preview = post(client, "/preview", content, mapping=mapping).json()
    invalid, missing = preview["rows"]
    assert invalid["member"] is None and missing["member"] is None
    assert invalid["source_values"] == {"name": "Taylor Invalid", "email": "not-an-email", "external_member_id": "001", "date_joined": "bad-date", "class_year": "unknown"}
    assert missing["source_values"]["name"] == "Missing Identifier"
    assert "INVALID_EMAIL" in {issue["code"] for issue in invalid["issues"]}
    assert "REQUIRED_FIELD_MISSING" in {issue["code"] for issue in missing["issues"]}
    assert post(client, "", content, mapping=mapping).json()["summary"]["created"] == 0
    assert not db["members"]
