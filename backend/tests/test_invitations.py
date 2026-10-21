"""Exercise the real route and email service with all upstream HTTP mocked."""
import httpx
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.routers import invitations

ORG = "00000000-0000-4000-8000-000000000001"
USER = "00000000-0000-4000-8000-000000000002"
INVITE = "00000000-0000-4000-8000-000000000003"
TOKEN = "a" * 64


@pytest.fixture
def upstream(monkeypatch):
    settings = {
        "SUPABASE_URL": "https://example.supabase.co",
        "SUPABASE_PUBLISHABLE_KEY": "sb_publishable_test",
        "APP_URL": "https://ceo.example/app/",
        "RESEND_API_KEY": "fake-key",
        "RESEND_FROM_EMAIL": "C.E.O. <onboarding@resend.dev>",
    }
    for key, value in settings.items():
        monkeypatch.setenv(key, value)
    invitations._attempts.clear()
    state = {"auth": 200, "rpc": 200, "email": 200, "requests": []}

    def handle(request):
        state["requests"].append(request)
        if request.url.host == "api.resend.com":
            assert request.headers["authorization"] == "Bearer fake-key"
            assert request.headers["idempotency-key"] == f"club-invitation/{INVITE}"
            if state["email"] == "timeout":
                raise httpx.ReadTimeout("private provider details", request=request)
            return httpx.Response(state["email"], json={"id": "email-id"})
        assert request.headers["authorization"] == "Bearer user-session"
        assert request.headers["apikey"] == "sb_publishable_test"
        if request.url.path == "/auth/v1/user":
            return httpx.Response(state["auth"], json={"id": USER})
        if request.url.path == "/rest/v1/organizations":
            return httpx.Response(200, json=[{"organization_name": '<Club & "friends">'}])
        if request.url.path.endswith("/rpc/create_organization_invitation"):
            if state["rpc"] != 200:
                return httpx.Response(state["rpc"], json={"message": "Only the club owner can create invitations."})
            return httpx.Response(200, json=[{
                "invitation_id": INVITE, "invitation_token": TOKEN,
                "expires_at": "2026-12-01T00:00:00Z",
            }])
        raise AssertionError(f"Unexpected request: {request.url.path}")

    real_client = httpx.AsyncClient
    monkeypatch.setattr(invitations.httpx, "AsyncClient", lambda **kwargs: real_client(transport=httpx.MockTransport(handle), **kwargs))
    return state


def create(client, **fields):
    return client.post('/api/invitations', headers={"Authorization": "Bearer user-session"}, json={"organization_id": ORG, "email": " Officer@Example.com ", **fields})


def test_owner_email_success_and_safe_template(upstream):
    import json
    response = create(TestClient(app))
    assert response.status_code == 201
    assert response.headers['cache-control'] == 'no-store'
    assert response.json()['email_sent'] is True
    assert response.json()['link'] == f'https://ceo.example/app#invite={TOKEN}'
    assert response.json()['email'] == 'officer@example.com'
    payload = json.loads(upstream['requests'][-1].content)
    assert payload['to'] == ['officer@example.com']
    assert '&lt;Club &amp; &quot;friends&quot;&gt;' in payload['html']
    assert '<Club' not in payload['html']
    assert TOKEN in payload['text']


@pytest.mark.parametrize('email_status', [403, 429, 500, 'timeout'])
def test_email_failure_preserves_invitation(upstream, email_status):
    upstream['email'] = email_status
    response = create(TestClient(app))
    assert response.status_code == 201
    assert response.json()['email_sent'] is False
    assert TOKEN in response.json()['link']
    assert len([r for r in upstream['requests'] if '/rpc/' in r.url.path]) == 1


def test_missing_email_key_still_returns_link(upstream, monkeypatch):
    monkeypatch.delenv('RESEND_API_KEY')
    response = create(TestClient(app))
    assert response.status_code == 201
    assert response.json()['email_sent'] is False
    assert not any(r.url.host == 'api.resend.com' for r in upstream['requests'])


def test_unsigned_request_does_not_contact_upstream(upstream):
    response = TestClient(app).post('/api/invitations', json={'organization_id': ORG, 'email': 'a@example.com'})
    assert response.status_code == 401
    assert not upstream['requests']


def test_expired_session_does_not_create_or_email(upstream):
    upstream['auth'] = 401
    assert create(TestClient(app)).status_code == 401
    assert len(upstream['requests']) == 1


def test_non_owner_cannot_send(upstream):
    upstream['rpc'] = 400
    assert create(TestClient(app)).status_code == 403
    assert not any(r.url.host == 'api.resend.com' for r in upstream['requests'])


@pytest.mark.parametrize('fields', [{'email': 'not-email'}, {'link': 'https://attacker.example'}, {'organization_id': 'bad-id'}])
def test_bad_request_rejected_before_upstream(upstream, fields):
    assert create(TestClient(app), **fields).status_code == 422
    assert not upstream['requests']


def test_bad_app_configuration_blocks_creation(upstream, monkeypatch):
    monkeypatch.setenv('APP_URL', 'javascript:alert(1)')
    assert create(TestClient(app)).status_code == 503
    assert not upstream['requests']


def test_creation_failure_does_not_send(upstream):
    upstream['rpc'] = 500
    response = create(TestClient(app))
    assert response.status_code == 502
    assert not any(r.url.host == 'api.resend.com' for r in upstream['requests'])


def test_rate_limit_blocks_extra_creation(upstream):
    client = TestClient(app)
    for _ in range(10):
        assert create(client).status_code == 201
    assert create(client).status_code == 429
    assert len([r for r in upstream['requests'] if '/rpc/' in r.url.path]) == 10
