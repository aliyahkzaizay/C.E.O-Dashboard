# Member import integration — November 3, 2026

Branch: `feat/member-import-integration`, based on teammate branch `feat/import-save` at `8a13467`. The teammate branch is preserved. Integration changes are not yet committed.

## Agreed behavior

- Imports require a name and at least one identifier: email or external ID. Manual member creation still allows name-only records.
- A missing club-selected check-in identifier produces a warning; it does not prevent an import when the other identifier is present.
- CSV and XLSX are supported. Limits: 2 MB, 2,000 data rows; XLSX uses the first sheet.
- Officers confirm column mappings. Preview returns at most 100 cleaned rows plus counts and issues for the full file.
- Duplicates are checked on both identifiers, within the file and against the club roster, including archived members. Conflicts are skipped, never overwritten.
- Saving revalidates the file. Repeated imports with identifiers are skipped; uncertain writes require roster refresh and a new preview, never automatic retry.
- Changing the file or mapping invalidates confirmation. Successful or uncertain saves refresh the roster. Results distinguish created, skipped, and failed/unconfirmed rows.

## Abstraction and documentation

- `frontend/src/lib/memberImports.ts` exposes preview/save operations; session lookup, multipart encoding, and request errors remain private to the module.
- `MemberImport.tsx` manages the officer workflow without parsing spreadsheets or directly writing to the database.
- Backend parsing, row validation, and roster storage remain separate responsibilities. Saving reuses `MemberCreate` validation.
- The component filename matches its component. Public operations include purpose/behavior documentation.

## Verification

- All 181 backend tests passed using `backend/.venv/bin/python -m pytest backend/tests -q -p no:cacheprovider` from the repository root.
- Coverage includes CSV/XLSX parsing and saves, alternate identifiers, missing identifiers, secondary-identifier duplicates, archived duplicates, cross-club denial, preview sample bounds, repeated uploads, and interrupted saves.
- Frontend production build passed. Lint reported only the existing App.tsx and useClubs.ts warnings.
- Temporary Chrome/Playwright checks exercised the real import API with simulated Supabase responses: custom mapping, preview invalidation, partial save, repeated upload, invalid files, service errors, and roster refresh.
- Desktop and 390px mobile screenshots were visually inspected. The preview table scrolls horizontally on narrow screens.

## Limits and remaining manual checks

No live Supabase writes or real emails were made. Browser test fixtures/scripts were temporary and are not a committed regression suite. Tests emitted an existing Starlette/httpx deprecation warning.

With a development club and synthetic members:
1. Import CSV and XLSX; verify created members persist after refresh.
2. Confirm only authorized officers can preview/save into that club.
3. Re-upload and verify no duplicate records are created.
4. Review rows missing the club check-in identifier and complete those fields before matching attendance.

Install the branch's dependencies before running the backend: `backend/.venv/bin/python -m pip install -r backend/requirements-dev.txt`.
