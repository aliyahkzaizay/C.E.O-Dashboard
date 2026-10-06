# C.E.O. — Club Engagement Operations

A dashboard for organization membership, events, attendance, engagement, and basic finance tracking.

## Current Status

The repository now has separate `frontend/`, `backend/`, and `supabase/` directories. The React + TypeScript + Vite starter includes Tailwind, React Router, and a shared Supabase browser client at `frontend/src/lib/supabase.ts`. The Python 3.13/FastAPI backend exposes `/api/health` and interactive API documentation.

Feature pages, officer login flows, native check-in, finance, and database migrations are not implemented yet. The scaffold runs without Supabase credentials; inspect the remote database before creating the migration baseline.

**New teammate? Start with the [simple setup guide](docs/team-setup.md).**

## Agreed Architecture

| Part | Direction |
| --- | --- |
| Frontend | React, TypeScript, Vite, and Tailwind CSS. Tailwind is configured through the Vite plugin. |
| Backend | Python 3.13 and FastAPI. |
| Database and officer login | Remote Supabase PostgreSQL and Supabase Auth. |
| Development | Frontend and Python backend run locally; Vite proxies `/api` to the local Python server. |
| Future hosting | Vercel for frontend and Python backend when deployment begins. |

```text
frontend/             React app, assets, npm dependencies, Vite/TS configuration
backend/              FastAPI app, Python dependencies, tests
supabase/migrations/  Reserved for reviewed database migrations
docs/                Design and team documentation
```

The root `package.json` forwards frontend commands for convenience. Install frontend dependencies in `frontend/`; install Python dependencies separately in `backend/`. SQL migrations define database structure; Python schemas validate API inputs and outputs.

See [Architecture and MVP decisions](docs/architecture.md) for data-model responsibilities, permissions, metrics, and remaining decisions.

## MVP Scope

- Individual officer accounts and organization access; roster members do not need accounts.
- Member roster, manual entry, CSV/XLSX import, search, and individual details.
- Events with a native C.E.O. check-in form, stable public link, downloadable QR PNG for existing slides, preview, and officer open/close controls.
- Backend identifier validation and matching, one attendance record per member/event, basic spam protection, and officer review of unmatched submissions. Officers can link an existing member, create a member, or ignore a submission.
- Engagement metrics: club-configured attendance percentage and reporting period for active status, events ranked by distinct attendees, monthly average attendees per event, and individual histories. See the architecture document for eligible-event and zero-event rules.
- Basic finance: one currency per organization, opening balance, manual income/expenses, categories, optional event links, summaries, and corrections that preserve history.

Google Forms/Sheets integration is deferred. Native check-in sends submissions to the Python API without a Google synchronization step. Public check-in must not expose the roster; a submitted identifier or shared QR link does not prove identity or physical presence.

## Local Setup

Keep your checkout outside iCloud-managed Desktop and Documents folders, for example `~/Code/C.E.O-Dashboard`.

1. Install Node.js 22.22.0 with npm. If you use nvm, run `nvm install` followed by `nvm use` in the repository; `.nvmrc` selects the shared version.
2. Clone the repository if you do not already have it:

   ```bash
   git clone https://github.com/aliyahkzaizay/C.E.O-Dashboard.git
   cd C.E.O-Dashboard
   ```

3. Install the recorded dependency versions:

   ```bash
   npm --prefix frontend ci
   ```

4. Prepare local configuration for the upcoming Supabase integration:

   ```bash
   cp frontend/.env.example frontend/.env.local
   ```

   Replace the placeholders with the shared development project's URL and publishable key. These belong to the same Supabase project. The template is committed; `frontend/.env.local` is ignored. Do not overwrite an existing configured `frontend/.env.local` when updating your checkout.

   Any variable beginning with `VITE_` is browser-visible. Never use a Supabase secret/service-role key or other private backend credentials here. The client initializes when valid configuration is present. The development starter displays missing configuration; a configured client alone does not verify network access or database permissions.

5. Start the app:

   ```bash
   npm run dev
   ```

   Open the URL printed in the terminal. Press Ctrl+C to stop the server. Restart it after changing environment variables.

6. In a second terminal, set up and start the backend:

   ```bash
   cd backend
   python3.13 -m venv .venv
   source .venv/bin/activate
   python -m pip install -r requirements-dev.txt
   python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
   ```

   Install Python 3.13 if it is not available. For Windows activation, see [backend setup](backend/README.md). API docs are at http://127.0.0.1:8000/docs. With both servers running, http://localhost:5173/api/health should return `{"status":"ok"}` through the frontend proxy. This does not check the database.

## Commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the local development server. |
| `npm run typecheck` | Check TypeScript types. |
| `npm run lint` | Check code with the starter's Oxlint configuration. |
| `npm run build` | Type-check and create production files in `frontend/dist/`. |
| `npm run preview` | Preview a completed build locally. |

Run type checking, linting, and the build before submitting application changes. Backend scaffold tests run from `backend/` with the virtual environment activated: `python -m pytest`. Product feature tests remain to be added.

## Deployment — Planned

Vercel is the selected future host for the frontend and Python backend. Hosting configuration and deployment verification are deferred until the local workflow is ready. No Vercel configuration or deployment is established by this README update.

When deployment begins, configure the final repository layout, frontend build, Python runtime, API routing, environment variables, and Supabase authentication URLs. Verify function limits and the complete deployed workflow separately from local checks. Keep privileged credentials server-side and use synthetic development data until access controls have been tested.

## Team Workflow

The initial scaffold and setup may go directly on `main`. Subsequent tasks use branches and pull requests with one teammate's approval. Jira keys are not required in commit messages.

- [Development workflow: branches, commits, and pull requests](CONTRIBUTING.md)
- [Sprint 1 Deliverables](docs/sprint-1-deliverables.md)

## Using Supabase in Features

The current browser client exports `getSupabase` from `frontend/src/lib/supabase.ts`. It returns the shared client or throws a clear setup error if configuration is missing. Reuse this client for officer authentication when implemented. The planned application data and public check-in requests go through the Python API, which validates input and enforces organization access. Do not create a new client for every component.

This setup uses the current `sb_publishable_` key format. Add the project URL and publishable key to your ignored `frontend/.env.local`, then restart Vite. No tables are assumed and no database records are created by the starter. Before adding real data, implement and test organization-specific Row Level Security policies. The Python API must also enforce organization authorization, especially when using credentials that bypass Row Level Security. Database types can be generated after the schema is established.

Reference: [Supabase JavaScript client initialization](https://supabase.com/docs/reference/javascript/initializing).
