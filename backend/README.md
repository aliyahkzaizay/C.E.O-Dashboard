# Python backend

Python 3.13 + FastAPI. Run commands from this directory.

```bash
python3.13 -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements-dev.txt
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

On Windows use `py -3.13 -m venv .venv` and `.venv\Scripts\Activate.ps1`.

- API docs: http://127.0.0.1:8000/docs
- Health: http://127.0.0.1:8000/api/health
- Tests: `python -m pytest`

The frontend dev server forwards `/api` requests here. No database credentials are needed for this scaffold. Health confirms only that the API runs. Auth, organization authorization, check-in, and finance routes are not implemented.

`requirements.in` lists direct runtime dependencies; `requirements.txt` pins their resolved versions. `requirements-dev.in` adds test tools; `requirements-dev.txt` pins the full development environment. Install runtime requirements for deployment. When updating dependencies, resolve in a clean Python 3.13 environment, refresh both pinned files, and rerun tests. Never put backend secrets in frontend environment files.

Add feature routes, request/response schemas, and services as features are implemented; avoid empty layers before they have responsibilities.
