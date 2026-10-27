"""Member edits exercise the real router/service with no live Supabase requests."""
import json

import httpx
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.routers import members

ORG = "00000000-0000-4000-8000-000000000001"
USER = "00000000-0000-4000-8000-000000000002"
MEMBER = "00000000-0000-4000-8000-000000000003"
URL = f"/api/organizations/{ORG}/members/{MEMBER}"
HEADERS = {"Authorization": "Bearer fake-session"}


@pytest.fixture
def upstream(monkeypatch):
    monkeypatch.setenv("SUPABASE_URL", "https://example.supabase.co")
    monkeypatch.setenv("SUPABASE_PUBLISHABLE_KEY", "sb_publishable_test")
    state = {"role": "admin", "auth": 200, "status": 200, "found": True, "requests": []}
    row = dict(member_id=MEMBER, organization_id=ORG, name="Alex", email="alex@example.test",
               external_member_id="001234", date_joined=None, class_year=None,
               created_at="2026-10-26T12:00:00Z", updated_at="2026-10-26T12:00:01Z", archived_at=None)

    def handle(request):
        state["requests"].append(request)
        assert request.headers["authorization"] == "Bearer fake-session"
        assert request.headers["apikey"] == "sb_publishable_test"
        if request.url.path == "/auth/v1/user":
            return httpx.Response(state["auth"], json={"id": USER})
        if request.url.path == "/rest/v1/organization_users":
            assert request.url.params["user_id"] == f"eq.{USER}"
            assert request.url.params["organization_id"] == f"eq.{ORG}"
            return httpx.Response(200, json=[{"access_role": state["role"]}] if state["role"] else [])
        if request.method == "GET" and request.url.path == "/rest/v1/members":
            assert request.url.params["organization_id"] == f"eq.{ORG}"
            assert request.url.params["archived_at"] == "is.null"
            if "member_id" in request.url.params:
                assert request.url.params["member_id"] == f"eq.{MEMBER}"
                assert request.url.params["limit"] == "1"
                if state["status"] == "timeout":
                    raise httpx.ReadTimeout("private upstream details", request=request)
                return httpx.Response(state["status"], json=state.get("detail_rows", [row] if state["found"] else []))
            return httpx.Response(200, json=[row], headers={"Content-Range": "0-0/1"})
        assert request.method == "PATCH" and request.url.path == "/rest/v1/members"
        assert dict(request.url.params) == {"organization_id": f"eq.{ORG}", "member_id": f"eq.{MEMBER}", "archived_at": "is.null"}
        assert request.headers["prefer"] == "return=representation"
        if state["status"] == "timeout":
            raise httpx.ReadTimeout("private upstream details", request=request)
        if state["status"] != 200:
            return httpx.Response(state["status"], json={"message": "private upstream details"})
        return httpx.Response(200, json=[{**row, **json.loads(request.content)}] if state["found"] else [])

    real_client = httpx.AsyncClient
    monkeypatch.setattr(members.httpx, "AsyncClient", lambda **kwargs: real_client(transport=httpx.MockTransport(handle), **kwargs))
    return state


def patch(payload, headers=HEADERS):
    with TestClient(app) as client:
        return client.patch(URL, headers=headers, json=payload)


@pytest.mark.parametrize("role", ["owner", "admin"])
def test_partial_edit_preserves_omitted_fields(upstream, role):
    upstream["role"] = role
    response = patch({"name": " Updated name "})
    assert response.status_code == 200
    assert response.json()["name"] == "Updated name"
    assert response.json()["email"] == "alex@example.test"
    assert response.json()["member_id"] == MEMBER
    assert response.headers["cache-control"] == "no-store"
    assert json.loads(upstream["requests"][-1].content) == {"name": "Updated name"}


@pytest.mark.parametrize("field", ["email", "external_member_id", "date_joined", "class_year"])
@pytest.mark.parametrize("value", [None, "  "])
def test_clear_optional_field(upstream, field, value):
    response = patch({field: value})
    assert response.status_code == 200
    assert response.json()[field] is None
    assert json.loads(upstream["requests"][-1].content) == {field: None}


def test_normalization_and_leading_zeros(upstream):
    response = patch({"email": " Alex+Tag@Example.TEST ", "external_member_id": " 0012Aa "})
    assert response.status_code == 200
    assert response.json()["email"] == "alex+tag@example.test"
    assert response.json()["external_member_id"] == "0012Aa"


@pytest.mark.parametrize("payload", [
    {}, {"name": None}, {"name": "   "}, {"email": "invalid"},
    {"external_member_id": 123}, {"date_joined": "not-a-date"}, {"class_year": "freshmen"},
    {"organization_id": ORG}, {"member_id": MEMBER}, {"created_at": "2026-10-26"},
    {"archived_at": None}, {"status": "active"},
])
def test_invalid_or_protected_fields_rejected(upstream, payload):
    assert patch(payload).status_code == 422
    assert not upstream["requests"]


@pytest.mark.parametrize("role", [None, "attendee"])
def test_no_club_access_prevents_write(upstream, role):
    upstream["role"] = role
    assert patch({"name": "Alex"}).status_code == 404
    assert all(req.method != "PATCH" for req in upstream["requests"])


def test_missing_token(upstream):
    assert patch({"name": "Alex"}, headers={}).status_code == 401
    assert not upstream["requests"]


def test_expired_token(upstream):
    upstream["auth"] = 401
    assert patch({"name": "Alex"}).status_code == 401
    assert all(req.method != "PATCH" for req in upstream["requests"])


def test_unavailable_member(upstream):
    upstream["found"] = False
    assert patch({"name": "Alex"}).status_code == 404


@pytest.mark.parametrize("status, expected", [(409, 409), (401, 401), (403, 403), (500, 502), ("timeout", 502)])
def test_safe_upstream_errors_without_retry(upstream, status, expected):
    upstream["status"] = status
    response = patch({"name": "Alex"})
    assert response.status_code == expected
    assert "private upstream" not in response.text
    assert len([r for r in upstream["requests"] if r.method == "PATCH"]) == 1


@pytest.mark.parametrize("term", ["Alex", "ALEx", "0012", "alex+tag@example.test", "O'Neil", 'a,b).or("x', r"a\b", "_%*", "(?i).*", "Élodie"])
def test_search_uses_literal_quoted_filter_and_keeps_club_scope(upstream, term):
    with TestClient(app) as client:
        response = client.get(URL.rsplit("/", 1)[0], headers=HEADERS, params={"search": f" {term} "})
    assert response.status_code == 200
    assert response.json()["limit"] == 40
    params = upstream["requests"][-1].url.params
    # Decode PostgREST quoted values to verify punctuation stays inside each value.
    import re
    filters = re.findall(r'(name|email|external_member_id)\.imatch\.("(?:\\.|[^"\\])*")', params["or"])
    assert len(filters) == 3
    assert all(json.loads(value) == "(?iq)" + term for _, value in filters)
    assert params["organization_id"] == f"eq.{ORG}"
    assert params["archived_at"] == "is.null"


def test_blank_search_has_no_filter(upstream):
    with TestClient(app) as client:
        assert client.get(URL.rsplit("/", 1)[0], headers=HEADERS, params={"search": "   ", "offset": 40}).status_code == 200
    assert "or" not in upstream["requests"][-1].url.params
    assert upstream["requests"][-1].url.params["offset"] == "40"


@pytest.mark.parametrize("term", ["a" * 101, "bad\x00value"])
def test_invalid_search_rejected(upstream, term):
    with TestClient(app) as client:
        assert client.get(URL.rsplit("/", 1)[0], headers=HEADERS, params={"search": term}).status_code == 422
    assert not any(r.url.path == "/rest/v1/members" for r in upstream["requests"])


def test_search_denied_without_club_access(upstream):
    upstream["role"] = None
    with TestClient(app) as client:
        assert client.get(URL.rsplit("/", 1)[0], headers=HEADERS, params={"search": "Alex"}).status_code == 404
    assert not any(r.url.path == "/rest/v1/members" for r in upstream["requests"])


def detail(headers=HEADERS):
    with TestClient(app) as client:
        return client.get(URL, headers=headers)


@pytest.mark.parametrize("role", ["owner", "admin"])
def test_member_detail(upstream, role):
    upstream["role"] = role
    response = detail()
    assert response.status_code == 200
    assert response.json()["external_member_id"] == "001234"
    assert response.json()["member_id"] == MEMBER
    assert response.headers["cache-control"] == "no-store"


@pytest.mark.parametrize("role", [None, "attendee"])
def test_member_detail_denied(upstream, role):
    upstream["role"] = role
    assert detail().status_code == 404
    assert not any(r.url.path == "/rest/v1/members" for r in upstream["requests"])


def test_member_detail_not_found(upstream):
    upstream["found"] = False
    assert detail().status_code == 404


def test_member_detail_requires_session(upstream):
    assert detail({}).status_code == 401
    assert not upstream["requests"]
    upstream["auth"] = 401
    assert detail().status_code == 401


@pytest.mark.parametrize("status, expected", [(401, 401), (403, 403), (500, 502), ("timeout", 502)])
def test_member_detail_upstream_errors(upstream, status, expected):
    upstream["status"] = status
    response = detail()
    assert response.status_code == expected
    assert "private upstream" not in response.text


@pytest.mark.parametrize("rows", [{}, [{}], [{}, {}]])
def test_member_detail_malformed_response(upstream, rows):
    upstream["detail_rows"] = rows
    assert detail().status_code == 502
