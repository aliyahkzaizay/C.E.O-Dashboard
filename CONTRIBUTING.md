# C.E.O. Team Development Workflow

This guide defines how the team names branches, tracks work, reviews changes, and merges code. These are team conventions; this document does not configure GitHub branch protection.

## Current Project Decisions

- React, TypeScript, and Vite for the frontend; Supabase for authentication and PostgreSQL data storage.
- Supabase Edge Functions for private integration logic. A separate Python/FastAPI backend is not part of the current plan.
- Retrieve attendance responses directly from Google Forms; Google Sheets is not required.
- Basic manual finance tracking is included in the MVP.
- Netlify hosts the frontend, GitHub holds code and reviews, and Jira tracks tasks and sprints.
- Integrate small frontend/backend workflows early instead of waiting until the backend is complete.

See [Sprint 1 Deliverables](docs/sprint-1-deliverables.md) for scope and the schedule. Older planning notes are background, not the current requirements. The active-member definition still needs team agreement.

## Start With a Jira Task

Before starting work, choose or create a Jira task with an owner and clear acceptance criteria. Acceptance criteria describe observable results, such as “syncing the same form twice creates no duplicate attendance.”

Use **To Do → In Progress → In Review → Done**. Keep technical discussion and code review on the pull request; link it from Jira so the task and implementation can be found together.

## Branch Naming

Use one short-lived branch per task, starting from the latest `main`. The initial scaffold and setup may go directly on `main`; subsequent work uses task branches.

Branch format:

```text
<type>/<JIRA-KEY>-<short-description>
```

Use lowercase, hyphen-separated descriptions and preserve the uppercase Jira issue key. The examples below assume `CEO` is the Jira project key; replace it with the actual key after Jira is created. These numbers are examples, not existing tasks.

| Type | Use | Example |
| --- | --- | --- |
| `feat` | New functionality | `feat/CEO-12-add-member-form` |
| `fix` | Correct a defect | `fix/CEO-24-prevent-duplicate-attendance` |
| `docs` | Documentation | `docs/CEO-5-local-setup-guide` |
| `chore` | Tooling, configuration, or dependencies | `chore/CEO-8-configure-netlify` |
| `refactor` | Restructure code without changing behavior | `refactor/CEO-31-extract-member-validation` |
| `test` | Add or improve tests | `test/CEO-35-finance-balance-cases` |

Before Jira is available, omit the issue key, for example `docs/team-workflow`. Codex-created branches use the `codex/` prefix, for example `codex/CEO-12-add-member-form`, and follow the same review process.

Avoid permanent branches per teammate or subsystem such as `aliyah` or `memberSystem`. Task branches make the purpose clear and keep reviews focused.

## Everyday Git Workflow

Check your current branch and working tree first. Commit your task changes or stash unfinished work before switching branches; do not discard changes just to follow these commands.

```bash
git status
git switch main
git pull --ff-only origin main
git switch -c feat/CEO-12-add-member-form
```

Implement the task, inspect the diff, and run relevant checks. Stage only the files belonging to the task:

```bash
git diff
git add path/to/changed-file
git diff --cached
git commit -m "feat(members): add member form"
git push -u origin feat/CEO-12-add-member-form
```

Replace example branch names and paths with your task's values. `--ff-only` stops a pull if your local history has diverged, so investigate rather than forcing it through.

If `main` changes while your task is in progress, commit your work first, then update your task branch:

```bash
git fetch origin
git merge origin/main
```

Resolve any conflicts with the affected teammate and rerun relevant checks. Do not force-push shared branches or overwrite another teammate's work.

## Commit Messages

Use this format:

```text
<type>(<area>): <specific change>
```

Examples:

```text
feat(finance): add expense entry validation
fix(attendance): ignore already processed responses
docs(setup): explain environment variables
```

Use the same types as branch names. Jira keys are not required in commit messages; task tracking belongs in branch names and pull requests. Keep commits focused and explain what changed; avoid messages such as “updates” or “fixed stuff.”

## Pull Requests and Reviews

1. Push your task branch and open a pull request into `main`. Open a draft early when you need feedback.
2. Use a title such as `CEO-12: Add member form` and link the Jira task.
3. Explain the problem, what changed, and how you verified it. Include screenshots for visible UI changes and note database migrations or configuration changes.
4. Move the Jira task to **In Review** and request a review from one teammate.
5. Address feedback and request another review if substantive changes were made after approval.
6. Merge only after at least one other teammate approves, review concerns are resolved, and applicable checks pass.

The author must not count their own approval. Everyone, including repository maintainers, follows this convention. Keep unrelated cleanup out of the PR so reviewers can evaluate one task at a time.

Suggested PR body:

```markdown
## Jira
Issue key and link

## Changes
What problem does this solve, and what now happens?

## Verification
Checks run, outcomes, and any limitations

## Screenshots
For visible UI changes, if applicable

## Database or configuration
Migration and environment setup notes, if applicable; never include secrets
```

Reviewers should check the acceptance criteria, understandable code, relevant edge cases, organization access boundaries, and test evidence. Pay particular attention to duplicate attendance, member matching, and finance calculations when those areas change.

## Checks Before Merging

- Run `npm run lint`, `npm run typecheck`, and `npm run build` for application changes, plus relevant tests once configured.
- Verify the affected user flow, including error and empty states where relevant.
- For database or permission changes, verify that one organization cannot access another organization's records.
- For UI changes, inspect the page at desktop and mobile widths.
- Ensure configuration requirements and setup instructions are documented.

Documentation-only changes need a content and link review rather than an application test run. Report checks honestly; do not mark a check as passed if it was not run.

## Database, Dependencies, and Secrets

- Coordinate shared schema changes before implementing them. Keep database changes in reviewed SQL migrations, not only in the Supabase dashboard.
- Do not edit a migration already applied to a shared environment; add a new migration.
- Commit `package-lock.json` with dependency changes. Teammates use `npm ci` to install the recorded versions.
- Keep local environment values in ignored files and commit only placeholder examples.
- Never commit passwords, private API keys, Google authorization tokens, or real member/financial data. Use synthetic fixtures.
- Supabase publishable configuration can be used by the frontend; Supabase secret keys and Google integration secrets belong only on the server.
- A frontend deployment and a database migration are separate changes; document and coordinate any required rollout order in the PR.

## Merge and Finish

Prefer **Squash and merge** so a task becomes one clear commit on `main`. Use the commit message format above for the resulting commit title; no Jira key is required. Delete the merged remote task branch after confirming it is no longer needed.

Move the Jira task to **Done** when its acceptance criteria are satisfied, the change has been reviewed and verified, and the PR has merged. For tasks that require deployment, confirm the deployed behavior before marking them done.

Update your local checkout before beginning the next task:

```bash
git switch main
git pull --ff-only origin main
```

Actual GitHub enforcement of pull requests and approval requirements can be configured separately. Until then, this guide is the team's agreed workflow.
