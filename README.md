# C.E.O. — Club Engagement Operations

A dashboard for organization membership, events, attendance, engagement, and basic finance tracking.

## Current Status

The React + TypeScript + Vite starter is installed, along with React Router and the Supabase client. A shared Supabase browser client is available in `src/lib/supabase.ts`. Feature pages, login flows, and database tables are not implemented yet. The starter runs without Supabase credentials.

**New teammate? Start with the [simple setup guide](docs/team-setup.md).**

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

   Any variable beginning with `VITE_` is browser-visible. Never use a Supabase secret/service-role key or Google OAuth secret here. The client initializes when valid configuration is present. The development starter displays missing configuration; a configured client alone does not verify network access or database permissions.

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

## Using Supabase in Features

Import `getSupabase` from `src/lib/supabase.ts` and call it when a feature needs database or authentication access. It returns the shared client, or throws a clear setup error if configuration is missing. Do not create a new client for every component.

This setup uses the current `sb_publishable_` key format. Add the project URL and publishable key to your ignored `.env.local`, then restart Vite. No tables are assumed and no database records are created by the starter. Before adding real data, implement and test organization-specific Row Level Security policies. Database types can be generated after the schema is established.

Reference: [Supabase JavaScript client initialization](https://supabase.com/docs/reference/javascript/initializing).
