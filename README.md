# C.E.O. — Club Engagement Operations

A dashboard for organization membership, events, attendance, engagement, and basic finance tracking.

## Current Status

The React + TypeScript + Vite starter is installed, along with React Router and the Supabase client. Feature pages, authentication, and database integration are not implemented yet. The starter runs without Supabase credentials.

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
   npm ci
   ```

4. Prepare local configuration for the upcoming Supabase integration:

   ```bash
   cp .env.example .env.local
   ```

   Replace the placeholders with the shared development project's URL and publishable key. These belong to the same Supabase project. The template is committed; `.env.local` is ignored. Do not overwrite an existing configured `.env.local` when updating your checkout.

   Any variable beginning with `VITE_` is browser-visible. Never use a Supabase secret/service-role key or Google OAuth secret here. Adding these values prepares configuration; it does not implement the database connection.

5. Start the app:

   ```bash
   npm run dev
   ```

   Open the URL printed in the terminal. Press Ctrl+C to stop the server. Restart it after changing environment variables.

## Commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the local development server. |
| `npm run typecheck` | Check TypeScript types. |
| `npm run lint` | Check code with the starter's Oxlint configuration. |
| `npm run build` | Type-check and create production files in `dist/`. |
| `npm run preview` | Preview a completed build locally. |

Run type checking, linting, and the build before submitting application changes. Automated feature tests have not been configured yet.

## Netlify Setup

The repository includes `netlify.toml` with the build command, output directory, Node version, and routing fallback. Hosting has not been connected by this configuration alone.

After the repository changes are pushed, import the repository in Netlify, choose `main` as the deployment branch, and leave the base directory at the repository root. Netlify should use `npm run build` and publish `dist` from the configuration file.

For the upcoming integration, add `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` in Netlify's environment settings. Changes to these build-time values require a new deployment. Initially use the development Supabase project and synthetic data. Configure Supabase's allowed authentication URLs when authentication is implemented.

## Team Workflow

The initial scaffold and setup may go directly on `main`. Subsequent tasks use branches and pull requests with one teammate's approval. Jira keys are not required in commit messages.

- [Development workflow: branches, commits, and pull requests](CONTRIBUTING.md)
- [Sprint 1 Deliverables](docs/sprint-1-deliverables.md)
