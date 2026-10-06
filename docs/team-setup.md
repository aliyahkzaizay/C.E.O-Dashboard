# C.E.O. — Teammate Setup

The frontend and Python backend run locally; Supabase database and authentication are remote. Vercel deployment comes later. See [architecture](architecture.md).

## 1. Install tools

- Install Python **3.13** for the backend.
- Install Git, Node.js **22.22.0** (includes npm), and an editor such as VS Code.

Check that your tools are installed:

```bash
git --version
node --version
npm --version
```

Node should show `v22.22.0`, the version pinned in `.nvmrc`. If you already use nvm, run `nvm install` and `nvm use` inside the repository instead of installing Node separately.

## 2. Clone the repo

Clone the repo and open the **C.E.O-Dashboard** folder in VS Code. 

Choose **Terminal → New Terminal**. Make sure the terminal is in the C.E.O-Dashboard folder—the folder containing `package.json`.


## 3. Install dependencies

In the VS Code terminal, type this and press **Enter**. Wait for installation to finish before continuing:

```bash
npm --prefix frontend ci
```

This installs React, Vite, Supabase's client, and the other packages at the versions the team uses. You do not need to install them individually. Leave several GB of free disk space for installation.

## 4. Add your local Supabase configuration

Copy `frontend/.env.example` to **`frontend/.env.local`**. Keep frontend configuration in `frontend/`.

macOS/Linux terminal:

```bash
cp frontend/.env.example frontend/.env.local
```

Windows PowerShell:

```powershell
Copy-Item frontend/.env.example frontend/.env.local
```

Only do this if `frontend/.env.local` does not already exist; otherwise edit your existing file.

Open `frontend/.env.local` **in the editor**, replace the placeholders below with your project values, and save the file. These two lines belong in the file, not in the terminal:

```env
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_your_key_here
```

Get both values from the **shared development project** in Supabase's Connect dialog, or ask the project owner. Everyone uses the same project's values but keeps their own local file.

- Use the **publishable key**, beginning with `sb_publishable_`.
- Do not use a database password, secret key, or service-role key.
- Do not put real values into `.env.example`.
- `frontend/.env.local` is ignored by Git, so it will not arrive when you clone or pull the repo.
- Browser configuration is visible to app users; database access must be protected by Supabase access policies.

## 5. Start the app

Back in the terminal, type this and press **Enter**:

```bash
npm run dev
```

Open the local URL printed in the terminal. Keep that terminal running while using the app. Press **Ctrl+C** to stop it.

The development page should say **Supabase client configured**. This means the configuration was accepted; it does not yet prove that a database request works. No tables or records are created by starting the app.

Restart the dev server whenever you change `frontend/.env.local`.

## 6. Check your setup

Leave the app running in its terminal. Choose **Terminal → New Terminal** to open a second terminal in the project folder. Type the following commands one at a time, pressing **Enter** and waiting for each to finish:

```bash
npm run typecheck
npm run lint
npm run build
```

All three should finish without errors. You are ready for local development when:

- [ ] The starter page opens in your browser.
- [ ] It reports that the Supabase client is configured.
- [ ] Type checking, linting, and the build pass.
- [ ] Your `frontend/.env.local` is ignored by Git. Check with `git check-ignore frontend/.env.local`; it should print `frontend/.env.local`.

## 7. Run the Python backend

In a separate terminal from the repository root:

```bash
cd backend
python3.13 -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements-dev.txt
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Windows: create the environment with `py -3.13 -m venv .venv`, then activate with `.venv\Scripts\Activate.ps1`. You only need to create the environment once. React and Python use separate terminals. Stop each with Ctrl+C.

Open http://127.0.0.1:8000/docs for interactive API documentation. With Vite running, http://localhost:5173/api/health returns `{"status":"ok"}` through the local proxy. This proves local API routing, not Supabase access. Backend tests: run `python -m pytest` from `backend/` in the activated environment.

No backend credentials, local PostgreSQL, Docker, or hosting account are required for this scaffold. The backend currently serves health only. Database migrations, authentication, native check-in, and finance are upcoming features.

## Each time you work

1. Open the project folder.
2. Update your branch as needed using the [team Git workflow](../CONTRIBUTING.md). Commit or stash your work before switching branches.
3. Run `npm --prefix frontend ci` if `frontend/package-lock.json` changed.
4. Run `npm run dev` at the root.
5. In another terminal, activate `backend/.venv` and start Uvicorn from `backend/` as above. Reinstall pinned Python dependencies when their files change.

## Quick fixes

| Problem | What to do |
| --- | --- |
| `node` or `npm` not found | Install Node and reopen your terminal. |
| Missing `package.json` | Open a terminal in `C.E.O-Dashboard`, not its parent folder. |
| Supabase configuration warning | Check `frontend/.env.local`, use the exact variable names above, and restart Vite. |
| You cannot see the Supabase project | Accept the team invitation or ask the owner to resend it. |
| Port is already in use | Open the different URL Vite prints, or stop your earlier dev server with Ctrl+C. |
| `ENOSPC` / no space left | Free disk space, then retry `npm --prefix frontend ci`. |
| Files stall or disappear locally | Download the complete folder and keep your working repository outside cloud-synced folders. |
| Installation was interrupted | Run `npm --prefix frontend ci` again after fixing the cause. It replaces installed dependencies, not your source files. |

