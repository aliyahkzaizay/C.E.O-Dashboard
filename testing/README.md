# Testing

Manual testing guides and supporting files live here. Executable backend tests
live in [backend/tests](../backend/tests/).

- [Members and dashboard](members.md): adding, editing, search, profiles,
  navigation, permissions, and error handling.
- [Member imports](member-imports.md): CSV/XLSX upload, preview, and saving.
- [Sample import CSV](fixtures/member-import-demo.csv): fake data for local testing.

The member guide is a checklist, not a completed test report. Older member
reports remain in Git history; import verification notes describe their stated
run only, not the current release.

If recording a new test, include the date, tester, tested commit, steps, expected
result, and actual result. Distinguish live checks from simulated responses.
Never include passwords, tokens, API keys, or real member data.
