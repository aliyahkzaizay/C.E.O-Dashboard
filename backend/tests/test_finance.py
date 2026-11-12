"""Finance contract/permission tests with simulated Supabase; no real records change."""
import json
import httpx
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.routers import members

ORG='00000000-0000-4000-8000-000000000001'
USER='00000000-0000-4000-8000-000000000002'
ID='00000000-0000-4000-8000-000000000003'
OTHER='00000000-0000-4000-8000-000000000004'
STAMP='2026-11-12T12:00:00+00:00'
HEADERS={'Authorization':'Bearer test-session','X-Org-Id':ORG}
SETTINGS={'opening_balance_cents':10000,'tracking_start_date':'2026-11-01','budget_cents':None,'budget_start_date':None,'budget_end_date':None}
TRANSACTION={'kind':'expense','amount_cents':1200,'transaction_date':'2026-11-12','description':'Supplies','category':'Supplies'}


@pytest.fixture
def upstream(monkeypatch):
    """Record all outgoing requests, preserving user credentials and org filters."""
    monkeypatch.setenv('SUPABASE_URL','https://example.supabase.co')
    monkeypatch.setenv('SUPABASE_PUBLISHABLE_KEY','sb_publishable_test')
    state={'role':'owner','edit':False,'calls':[],'settings':True,'event':True,'upload_failure':False,'delete_failure':False,'voided':False,'wrong_org':False,'missing_report':False}
    report={'report_id':ID,'organization_id':ORG,'title':'Receipt','event_id':None,'notes':None,'filename':'receipt.pdf','content_type':'application/pdf','file_size_bytes':12,'object_path':f'{ORG}/{ID}/file','uploaded_by':USER,'created_at':STAMP}
    def handle(req):
        state['calls'].append(req)
        assert req.headers['Authorization']=='Bearer test-session'
        assert req.headers['apikey']=='sb_publishable_test'
        path=req.url.path
        if path=='/auth/v1/user': return httpx.Response(200,json={'id':USER})
        if path=='/rest/v1/organization_users':
            assert req.url.params['organization_id']==f'eq.{ORG}'
            return httpx.Response(200,json=[{'access_role':state['role'],'can_edit_finances':state['edit']}] if state['role'] else [])
        if path.startswith('/rest/v1/'):
            if req.method=='POST': assert json.loads(req.content)['organization_id']==ORG
            else: assert req.url.params['organization_id']==f'eq.{ORG}'
        if path=='/rest/v1/events': return httpx.Response(200,json=[{'event_id':ID}] if state['event'] else [])
        if path=='/rest/v1/finance_settings':
            row=SETTINGS|{'organization_id':ORG,'currency':'USD','created_at':STAMP,'updated_at':STAMP}
            if req.method in ('POST','PATCH'): row.update(json.loads(req.content))
            return httpx.Response(200,json=[row] if state['settings'] or req.method=='POST' else [])
        if path=='/rest/v1/finance_transactions':
            row=TRANSACTION|{'transaction_id':ID,'organization_id':OTHER if state['wrong_org'] else ORG,'created_by':USER,'created_at':STAMP}
            if req.method=='POST': row.update(json.loads(req.content))
            if req.method=='PATCH':
                assert req.url.params['voided_at']=='is.null'
                if state['voided']: return httpx.Response(200,json=[])
                row.update(voided_at=STAMP,voided_by=USER,void_reason=json.loads(req.content)['void_reason'])
            return httpx.Response(200,json=[row],headers={'Content-Range':'0-0/1'})
        if path=='/rest/v1/purchase_reports':
            if req.method=='DELETE': return httpx.Response(204)
            if req.method=='POST': report.update(json.loads(req.content))
            return httpx.Response(200,json=[] if state['missing_report'] else [report],headers={'Content-Range':'0-0/1'})
        if '/object/sign/' in path:
            return httpx.Response(200,json={'signedURL':f'/object/sign/purchase-reports/{ORG}/{ID}/file?token=test'})
        if req.method=='DELETE':
            assert json.loads(req.content)=={'prefixes':[f'{ORG}/{ID}/file']}
            return httpx.Response(500 if state['delete_failure'] else 200,json=[])
        assert req.headers['x-upsert']=='false'
        return httpx.Response(500 if state['upload_failure'] else 200,json={})
    real=httpx.AsyncClient
    monkeypatch.setattr(members.httpx,'AsyncClient',lambda **kwargs:real(transport=httpx.MockTransport(handle),**kwargs))
    return state


def test_anonymous_denied():
    assert TestClient(app).get('/api/finance/settings',headers={'X-Org-Id':ORG}).status_code==401


@pytest.mark.parametrize('role,edit,status',[('owner',False,201),('admin',True,201),('admin',False,403),(None,False,404)])
def test_transaction_permissions(upstream,role,edit,status):
    upstream.update(role=role,edit=edit)
    assert TestClient(app).post('/api/finance/transactions',headers=HEADERS,json=TRANSACTION).status_code==status


def test_settings_and_budget_validation(upstream):
    client=TestClient(app)
    assert client.put('/api/finance/settings',headers=HEADERS,json=SETTINGS).status_code==200
    assert client.put('/api/finance/settings',headers=HEADERS,json=SETTINGS|{'budget_cents':100}).status_code==422
    upstream['settings']=False
    assert client.get('/api/finance/settings',headers=HEADERS).json() is None
    assert client.put('/api/finance/settings',headers=HEADERS,json=SETTINGS).status_code==200
    assert client.post('/api/finance/transactions',headers=HEADERS,json=TRANSACTION).status_code==409


@pytest.mark.parametrize('amount',[0,-1,1.5,True,1000000000])
def test_invalid_money(upstream,amount):
    assert TestClient(app).post('/api/finance/transactions',headers=HEADERS,json=TRANSACTION|{'amount_cents':amount}).status_code==422


def test_cross_club_event_rejected(upstream):
    upstream['event']=False
    assert TestClient(app).post('/api/finance/transactions',headers=HEADERS,json=TRANSACTION|{'event_id':ID}).status_code==422
    assert not any(r.method=='POST' and r.url.path.endswith('finance_transactions') for r in upstream['calls'])


def test_list_scope_and_bad_response(upstream):
    client=TestClient(app)
    result=client.get('/api/finance/transactions?limit=20&offset=0',headers=HEADERS)
    assert result.status_code==200 and result.json()['total']==1
    assert result.headers['cache-control']=='no-store'
    upstream['wrong_org']=True
    assert client.get('/api/finance/transactions',headers=HEADERS).status_code==502


def test_void_reason_and_repeat(upstream):
    client=TestClient(app);url=f'/api/finance/transactions/{ID}/void'
    assert client.post(url,headers=HEADERS,json={'reason':' '}).status_code==422
    assert client.post(url,headers=HEADERS,json={'reason':'Duplicate'}).json()['void_reason']=='Duplicate'
    upstream['voided']=True
    assert client.post(url,headers=HEADERS,json={'reason':'Duplicate'}).status_code==409


def upload(client,content=b'%PDF-1.7 test',**fields):
    return client.post('/api/finance/reports',headers=HEADERS,data={'title':'Receipt'}|fields,files={'file':('receipt.pdf',content,'application/pdf')})


def test_admin_upload_and_download(upstream):
    upstream['role']='admin'
    client=TestClient(app)
    assert upload(client).status_code==201
    result=client.get(f'/api/finance/reports/{ID}/download',headers=HEADERS)
    assert result.status_code==200 and result.json()['expires_in']==60
    assert result.json()['url'].startswith('https://example.supabase.co/storage/v1/object/sign/')
    assert client.get('/api/finance/reports',headers=HEADERS).status_code==200


def test_invalid_uploads(upstream):
    client=TestClient(app)
    assert upload(client,b'not pdf').status_code==422
    assert upload(client,b'%PDF-'+b'x'*(10*1024*1024)).status_code==422
    assert upload(client,title=' ').status_code==422
    assert not any(r.method=='POST' for r in upstream['calls'])


def test_upload_failure_retains_metadata(upstream):
    upstream['upload_failure']=True
    result=upload(TestClient(app))
    assert result.status_code==502 and result.json()['detail']['report_id']==ID
    assert not any(r.method=='DELETE' for r in upstream['calls'])


@pytest.mark.parametrize('role,edit,status',[('owner',False,204),('admin',True,403),('admin',False,403)])
def test_delete_owner_only(upstream,role,edit,status):
    upstream.update(role=role,edit=edit)
    assert TestClient(app).delete(f'/api/finance/reports/{ID}',headers=HEADERS).status_code==status
    deletes=[r.url.path for r in upstream['calls'] if r.method=='DELETE']
    assert deletes==(['/storage/v1/object/purchase-reports','/rest/v1/purchase_reports'] if status==204 else [])


def test_failed_file_delete_keeps_metadata(upstream):
    upstream['delete_failure']=True
    assert TestClient(app).delete(f'/api/finance/reports/{ID}',headers=HEADERS).status_code==502
    assert not any(r.method=='DELETE' and r.url.path.startswith('/rest/') for r in upstream['calls'])


def test_missing_or_other_club_report(upstream):
    upstream['missing_report']=True
    assert TestClient(app).get(f'/api/finance/reports/{OTHER}/download',headers=HEADERS).status_code==404
    assert not any('/storage/' in r.url.path for r in upstream['calls'])
