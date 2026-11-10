"""Exercise event routes against simulated Supabase; no live data is changed."""
import json

import httpx
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.routers import members

ORG = "00000000-0000-4000-8000-000000000001"
USER = "00000000-0000-4000-8000-000000000002"
EVENT = "00000000-0000-4000-8000-000000000003"
OTHER = "00000000-0000-4000-8000-000000000004"
HEADERS = {"Authorization": "Bearer fake-session", "X-Org-Id": ORG}
BODY = {"event_name": " Meeting ", "starts_at": "2026-11-08T15:00:00-05:00"}
URL = f"/api/events/{EVENT}"


@pytest.fixture
def upstream(monkeypatch):
    """Simulate storage and record requests, including filters and caller credentials."""
    monkeypatch.setenv("SUPABASE_URL", "https://example.supabase.co")
    monkeypatch.setenv("SUPABASE_PUBLISHABLE_KEY", "sb_publishable_test")
    state = {"role": "admin", "auth": 200, "requests": [], "status": 200, "found": True, "race": False}
    state["row"] = dict(event_id=EVENT, organization_id=ORG, event_name="Meeting", starts_at=BODY["starts_at"],
        description=None, event_type=None, status="scheduled", check_in_token="test-token", check_in_open=False,
        attendance_finalized_at=None, archived_at=None, updated_at="2026-11-07T12:00:00+00:00")

    def handle(request):
        state["requests"].append(request)
        assert request.headers["authorization"] == HEADERS["Authorization"]
        assert request.headers["apikey"] == "sb_publishable_test"
        if request.url.path == "/auth/v1/user":
            return httpx.Response(state["auth"], json={"id": USER})
        if request.url.path == "/rest/v1/organization_users":
            assert request.url.params["user_id"] == f"eq.{USER}"
            assert request.url.params["organization_id"] == f"eq.{ORG}"
            return httpx.Response(200, json=[{"access_role": state["role"]}] if state["role"] else [])
        assert request.url.path == "/rest/v1/events"
        if state["status"] == "timeout":
            raise httpx.ReadTimeout("private details", request=request)
        if state["status"] != 200:
            return httpx.Response(state["status"], json={"message": "private details"})
        if request.method == "POST":
            payload = json.loads(request.content)
            assert set(payload) <= {"organization_id", "event_name", "starts_at", "event_type", "description", "check_in_token"}
            assert payload["organization_id"] == ORG
            state["row"].update(payload)
        else:
            assert request.url.params["organization_id"] == f"eq.{ORG}"
            if "event_id" in request.url.params:
                assert request.url.params["event_id"] == f"eq.{EVENT}"
        if request.method == "PATCH":
            assert request.url.params["updated_at"] == f"eq.{state['row']['updated_at']}"
            if state["race"]:
                return httpx.Response(200, json=[])
            state["row"].update(json.loads(request.content))
        return httpx.Response(200, json=[state["row"]] if state["found"] else [], headers={"Content-Range": "0-0/1"})

    real_client = httpx.AsyncClient
    monkeypatch.setattr(members.httpx, "AsyncClient", lambda **kwargs: real_client(transport=httpx.MockTransport(handle), **kwargs))
    return state


def call(method="GET", path="/api/events", **kwargs):
    """Use the real FastAPI app with default officer headers."""
    with TestClient(app) as client:
        return client.request(method, path, headers=kwargs.pop("headers", HEADERS), **kwargs)


@pytest.mark.parametrize("role", ["owner", "admin"])
def test_create_and_read_saved_event(upstream, role):
    upstream["role"] = role
    created = call("POST", json=BODY)
    assert created.status_code == 201
    assert created.json()["event_name"] == "Meeting"
    assert len(created.json()["check_in_token"]) == 43
    assert created.headers["cache-control"] == "no-store"
    # A separate request reads the saved representation from Supabase, not module memory.
    assert call(path=URL).json() == created.json()


@pytest.mark.parametrize("method,path,payload", [
    ("GET", "/api/events", None), ("GET", "/api/events?upcoming=true", None), ("POST", "/api/events", BODY), ("GET", URL, None),
    ("PATCH", URL, {"event_name": "Changed"}),
    *[("POST", URL + "/" + action, None) for action in
      ["open-checkin", "close-checkin", "cancel", "archive", "finalize-attendance"]],
])
@pytest.mark.parametrize("failure", ["signed-out", "expired", "outsider", "wrong-role"])
def test_all_routes_require_officer_access(upstream, method, path, payload, failure):
    headers = HEADERS.copy()
    if failure == "signed-out":
        del headers["Authorization"]
    elif failure == "expired":
        upstream["auth"] = 401
    else:
        upstream["role"] = None if failure == "outsider" else "member"
    response = call(method, path, headers=headers, json=payload)
    assert response.status_code == (401 if failure in ("signed-out", "expired") else 404)
    assert not any(r.url.path == "/rest/v1/events" for r in upstream["requests"])


@pytest.mark.parametrize("headers", [{"Authorization": "Bearer fake-session"}, {**HEADERS, "X-Org-Id": "org-a"}])
def test_missing_or_invalid_club_header(upstream, headers):
    assert call(headers=headers).status_code == 422


@pytest.mark.parametrize("payload", [
    {**BODY, "event_name": " "}, {**BODY, "starts_at": "2026-11-08T15:00:00"},
    {**BODY, "organization_id": OTHER}, {**BODY, "check_in_open": True},
    {**BODY, "event_name": "a" * 201},
])
def test_invalid_create(upstream, payload):
    assert call("POST", json=payload).status_code == 422
    assert not any(r.method == "POST" for r in upstream["requests"])


@pytest.mark.parametrize("payload", [{}, {"event_name": None}, {"starts_at": None}, {"check_in_token": "changed"}])
def test_invalid_edit(upstream, payload):
    assert call("PATCH", URL, json=payload).status_code == 422


def test_partial_edit_and_optional_clear(upstream):
    response = call("PATCH", URL, json={"description": "  "})
    assert response.status_code == 200
    assert response.json()["description"] is None
    assert json.loads(upstream["requests"][-1].content) == {"description": None}


def test_list_pagination_and_archived_filter(upstream):
    response = call(path="/api/events?limit=20&offset=0")
    assert response.status_code == 200
    assert response.json()["total"] == 1
    params = upstream["requests"][-1].url.params
    assert params["archived_at"] == "is.null"
    assert params["order"] == "starts_at.desc,event_id.asc"
    call(path="/api/events?include_archived=true")
    assert "archived_at" not in upstream["requests"][-1].url.params


@pytest.mark.parametrize("action,field,value", [
    ("open-checkin", "check_in_open", True), ("close-checkin", "check_in_open", False),
    ("cancel", "status", "cancelled"), ("archive", "archived_at", None),
    ("finalize-attendance", "attendance_finalized_at", None),
])
def test_actions_save(upstream, action, field, value):
    response = call("POST", URL + "/" + action)
    assert response.status_code == 200
    assert response.json()[field] == value if value is not None else response.json()[field] is not None
    if action in ("archive", "cancel"):
        assert response.json()["check_in_open"] is False


@pytest.mark.parametrize("action,state", [
    ("open-checkin", {"status": "cancelled"}),
    ("open-checkin", {"attendance_finalized_at": "2026-11-07T12:00:00Z"}),
    ("finalize-attendance", {"check_in_open": True}),
    ("finalize-attendance", {"status": "cancelled"}),
    ("finalize-attendance", {"attendance_finalized_at": "2026-11-07T12:00:00Z"}),
    ("cancel", {"status": "cancelled"}),
    ("archive", {"archived_at": "2026-11-07T12:00:00Z"}),
])
def test_invalid_state_transitions(upstream, action, state):
    upstream["row"].update(state)
    assert call("POST", URL + "/" + action).status_code == 409
    assert not any(r.method == "PATCH" for r in upstream["requests"])


def test_archived_event_cannot_be_edited(upstream):
    upstream["row"]["archived_at"] = "2026-11-07T12:00:00Z"
    assert call("PATCH", URL, json={"event_name": "Changed"}).status_code == 409


def test_concurrent_change_rejected_without_retry(upstream):
    upstream["race"] = True
    assert call("POST", URL + "/open-checkin").status_code == 409
    assert sum(r.method == "PATCH" for r in upstream["requests"]) == 1


def test_missing_event(upstream):
    upstream["found"] = False
    assert call(path=URL).status_code == 404


def test_unexpected_club_in_response_rejected(upstream):
    upstream["row"]["organization_id"] = OTHER
    assert call(path=URL).status_code == 502


@pytest.mark.parametrize("status,expected", [(401, 401), (403, 403), (409, 409), (500, 502), ("timeout", 502)])
def test_save_failures_are_safe(upstream, status, expected):
    upstream["status"] = status
    response = call("POST", json=BODY)
    assert response.status_code == expected
    assert "private details" not in response.text
    assert sum(r.method == "POST" for r in upstream["requests"]) == 1


@pytest.mark.parametrize("include_archived", ["true", "false"])
def test_upcoming_filters_before_pagination(upstream, include_archived):
    """Nearest future events use a scoped database query, regardless of archive toggle."""
    from datetime import datetime, timezone
    before = datetime.now(timezone.utc)
    response = call(path=f"/api/events?upcoming=true&limit=3&include_archived={include_archived}")
    after = datetime.now(timezone.utc)
    assert response.status_code == 200
    params = upstream["requests"][-1].url.params
    assert params["organization_id"] == f"eq.{ORG}"
    assert params["status"] == "eq.scheduled"
    assert params["archived_at"] == "is.null"
    assert params["order"] == "starts_at.asc,event_id.asc"
    assert params["limit"] == "3"
    assert params["starts_at"].startswith("gte.")
    assert before <= datetime.fromisoformat(params["starts_at"][4:]) <= after
