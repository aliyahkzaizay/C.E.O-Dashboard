# Development Best Practices — Draft

This document connects course requirements to evidence from C.E.O.

“Missing” means supporting evidence still needs to be added or verified. Having a plan or installed tool does not, by itself, prove the practice has been completed.

## Mandatory Practices

### 1. Project Management Website

We use GitHub to manage source code and pull requests.

Evidence:

- [GitHub repository](https://github.com/aliyahkzaizay/C.E.O-Dashboard)
- [Pull requests](https://github.com/aliyahkzaizay/C.E.O-Dashboard/pulls)
- [Team workflow](../CONTRIBUTING.md)

Missing:

- Specific examples of project/issue tracking in active use.


### 2. Project Task Tracking Website

Our documented workflow uses Jira to assign tasks and track sprint progress.

Evidence:

- [Task tracking workflow](../CONTRIBUTING.md#start-with-a-jira-task)
- [Sprint 4 assignments](sprints/sprint-4/README.md)
- [Jira Board link](https://madhavsworkspace-42715507.atlassian.net/jira/software/projects/KAN/boards/1?filter=assignee+IN+%28712020%3Aea2faf8f-7fe9-49ce-865c-bc11e7cb91a7%2C+712020%3Abbf50ce2-ac83-4db4-a7b7-74e9ddc0283f%29&groupBy=none&atlOrigin=eyJpIjoiMDNkNWE5YWQ3NzcxNGY2ZTk5ZDc5NWIzOWU1ZjYxMmQiLCJwIjoiaiJ9)


### 3. Code Repository

We use Git to record changes and GitHub to share and merge code.

Evidence:

- [Repository](https://github.com/aliyahkzaizay/C.E.O-Dashboard)
- [Authentication pull request](https://github.com/aliyahkzaizay/C.E.O-Dashboard/pull/1)
- [Member import pull request](https://github.com/aliyahkzaizay/C.E.O-Dashboard/pull/2)
- [Branch and review conventions](../CONTRIBUTING.md)


### 4. Documented Coding Standards

The contribution guide defines Python and TypeScript naming conventions, component filenames, and function/component documentation. It also covers branches, commits, reviews, and verification.

Evidence:

- [Coding standards](../CONTRIBUTING.md#coding-standards)
- [MemberDetails component and matching filename](../frontend/src/components/MemberDetails.tsx)
- [Python class names and docstrings](../backend/app/schemas/members.py): `MemberCreate` and `validate_email`.
- [TypeScript hook naming and documentation](../frontend/src/hooks/useClubs.ts): `useClubs`.

These examples show existing usage; they do not establish that every file follows the standards.


### 5. Object-Oriented Design

Confirmed example:

- Inheritance: MemberUpdate extends MemberCreate and reuses its fields and validation behavior while defining partial-edit rules.

Evidence:

- [Member schema classes](../backend/app/schemas/members.py)

Missing:

- Documented examples of abstraction.
- Documented examples of encapsulation.
- Documented examples of polymorphism.

Each example must identify the actual code and explain how the concept is used. Examples must not be claimed without verification.

## Selected Optional Practices

The course requires at least three optional practices. We are collecting evidence for the following three.

### 6. Build Tools

TypeScript checks and compiles the frontend, and Vite produces the application build.

Command: `npm run build`

Evidence:

- [Frontend build configuration](../frontend/package.json)
- [Recorded build verification](../testing/member-details.md)

Missing:

- Saved build output identifying the date and tested commit for the final release.

### 7. Unit Test Tools

We use pytest to test functions such as identifier cleanup, email validation, and date parsing.

Evidence:

- [Import cleaning unit tests](../backend/tests/test_import_cleaning.py)
- [Import validation tests](../backend/tests/test_import_validation.py)
- [Test dependencies](../backend/requirements-dev.in)
- [Testing records](../testing/README.md)

Missing:

- A dated test report covering these unit tests on the final-release commit, including failures or limitations.

### 8. Mock Objects in Tests

We use httpx.MockTransport and pytest monkeypatch to simulate Supabase and Resend responses.

This lets us test successful operations, permission failures, and email failures without sending real emails or depending on live database data.

Evidence:

- [Supabase and Resend invitation tests](../backend/tests/test_invitations.py)
- [Mocked member API tests](../backend/tests/test_members.py)
- [Recorded member test results](../testing/member-details.md)

Verification limit:

- Simulated responses do not prove that live Supabase policies or production email delivery work correctly.

Missing:

- A dated final-release run of the relevant tests.

## Final Submission Review

Before submitting:

- Replace missing evidence with actual links or documented results.
- Verify all links work on the submitted branch.
- Confirm instructor access to GitHub and Jira.
- Identify the commit used for final verification.
- Keep failed, blocked, and simulated checks clearly labeled.
