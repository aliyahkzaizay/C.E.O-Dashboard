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

The frontend dev server forwards `/api` requests here. Health needs no credentials and confirms only that the API runs. The invitation route verifies the caller with Supabase Auth and uses the owner-checked database function. Check-in and finance routes are not implemented.

`requirements.in` lists direct runtime dependencies; `requirements.txt` pins their resolved versions. `requirements-dev.in` adds test tools; `requirements-dev.txt` pins the full development environment. Install runtime requirements for deployment. When updating dependencies, resolve in a clean Python 3.13 environment, refresh both pinned files, and rerun tests. Never put backend secrets in frontend environment files.

Add feature routes, request/response schemas, and services as features are implemented; avoid empty layers before they have responsibilities.

## Test email with Resend

This standalone script sends one test email without creating a club invitation.

1. Activate your backend virtual environment and install dependencies:

   ```bash
   source .venv/bin/activate
   python -m pip install -r requirements-dev.txt
   ```

2. If `.env` does not exist, copy `.env.example` to `.env`. In your editor, fill in:
   - `RESEND_API_KEY`: your private Resend API key.
   - `RESEND_FROM_EMAIL`: keep `C.E.O. <onboarding@resend.dev>` for initial testing.
   - `RESEND_TEST_TO_EMAIL`: the email address associated with your Resend account.

   `.env` is ignored by Git. Never put the key in frontend files, commit it, or
   paste it into chat. `.env.example` must contain only empty/example values.
   Existing shell environment values take precedence over `.env`.

3. When ready to send one email, run from `backend/`:

   ```bash
   python scripts/send_test_email.py
   ```

Each run sends one email. The API server does not need to be running.
An accepted submission does not guarantee inbox delivery: check your inbox,
spam folder, and Resend dashboard. The test sender can only send to your
Resend account email; sending to other recipients requires a verified domain.

Reference: [Resend Python guide](https://resend.com/docs/send-with-python).

## Club invitation emails

In your private `backend/.env`, add the following settings from `.env.example`:

- `SUPABASE_URL`: the same project URL as the frontend.
- `SUPABASE_PUBLISHABLE_KEY`: the same publishable key as the frontend. Do not use a service-role key.
- `APP_URL`: the frontend address, such as `http://localhost:5173`. Use the exact host you use to sign in. For other people's devices, use the deployed public HTTPS address.

Keep your existing Resend key and sender. Restart the backend after changing settings.
Run both the backend and frontend, then open a club you own and create an invitation.
Vite forwards `/api/invitations` to Python. Production hosting must also route `/api` to Python.
The API receives only the club ID and email; its Bearer token identifies the signed-in officer.
Supabase validates that token, and the existing invitation RPC checks club ownership.
No new SQL migration is required; the four existing invitation migrations must be installed.

On email acceptance the UI says **Invitation sent.** This means Resend accepted the
submission, not that it reached the inbox. On rejection, missing email configuration,
or an uncertain result such as a timeout, the invitation remains usable and the UI
says **Invitation created. Copy the invite link to share.** Both outcomes show
**Copy invite link**. Cancelled invitations are hidden, but kept in the database.

Only the email matching the invitation can accept it. During Resend test-sender
setup, use your Resend account email; real recipients need a verified sending domain.
Keep click tracking disabled for invitation emails to avoid rewriting secret-bearing links.
Email submission uses the invitation ID as a Resend idempotency key. The endpoint does
not automatically retry creation: if the browser loses its response, refresh the list
before trying again. Existing tokens cannot be recovered from the database; cancel
an inaccessible invitation and create a new one if necessary.

A local safeguard limits each authenticated user to 10 creation attempts per minute
per Python process. This resets on restart and is not shared across workers. Before
public deployment, use a shared rate limiter and verify the domain/public app URL.
Tests mock Supabase and Resend and send no real invitations or emails.
