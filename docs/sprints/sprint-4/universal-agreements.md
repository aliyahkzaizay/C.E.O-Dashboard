# Team rules — read this first

**Agreed October 9, 2026.** Use these rules now. If we change something, update the docs and tell the affected teammates.

[Back to Sprint 4](README.md) · [Exact fields and API examples](api-data-reference.md)

## What we are building

Officers log in, manage a club, create events, and track attendance and basic finances. Attendees use our own check-in form without an account. Each event gets a reusable link and downloadable QR PNG.

React handles the screens. Python/FastAPI handles requests and rules. Supabase stores data and handles officer login. We run locally now; Vercel comes later. No Google Forms integration in this version.

## Rules everyone follows

| Rule | What it means |
| --- | --- |
| Keep each club's data separate | An officer from Club A cannot read or edit Club B's records. Check this in the backend, even if the UI hides those records. |
| Generate internal IDs | The system creates member/event/organization IDs. A RIN is a separate identifier, stored as text so leading zeros survive. |
| Use one matching rule per club | Match by email or external ID, such as RIN. That field is required and unique within the club. |
| Clean inputs the same way | Trim spaces around IDs; preserve their zeros and case. Trim/lowercase emails; keep dots and plus tags. Manual entry, imports, and check-in reuse the same code. |
| Count attendance once | A member gets one attendance record per event, even after repeated or simultaneous submissions. Member and event must belong to the same club. |
| Separate login from membership | Being listed on a roster does not give someone access to manage the app. |
| Keep history | Archive members/events instead of permanently deleting them. Correct attendance and finance entries by voiding them with who, when, and why. |
| Protect private data | Public check-in never shows the roster. Keep secret keys on the backend and use fake data in tests. |

## Who can do what?

- **Owner:** manage club settings, officer access, and all club records. A club must keep at least one owner.
- **Admin:** manage members, events, and attendance; view finances within their club. Financial changes need separate permission.
- **Attendee:** view the public form and submit check-in while it is open.

### Finance access — updated October 9

All authorized club officers can view the finance dashboard and transaction history. The Owner can edit finances and grant/revoke **can_edit_finances** for other officers. It defaults to false for non-owners. Grant it to the president and treasurer, plus anyone else the Owner chooses; titles do not automatically grant access.

The backend checks this before any financial change, including opening-balance changes, new entries, edits, and voids. Ordinary officers cannot grant themselves access. This replaces the earlier rule allowing all Admins to edit finances.

**Budget planning: decide later.** Viewing a planned budget is intended for all officers once that feature exists. Budget amounts, categories, and editing workflow are not defined yet and are not added to Sprint 4. A recorded balance is not a planned budget.

## Check-in rules

1. The link identifies the event and club; attendees enter only the requested member identifier.
2. Known member → record attendance. Unknown or archived member → officer review.
3. Officers can link an existing member, create one, or ignore an unmatched submission.
4. Only officers open/close check-in. The backend rejects submissions while closed, even from a page already open.
5. Closing/reopening keeps the same link and QR. A QR is a convenient link, not proof of identity or presence.
6. Use basic spam controls, but not “one submission per IP”—students on campus Wi-Fi may share an IP address.

**Finalize attendance** means review is finished and the event is ready for reporting. Close check-in and resolve the review queue first. Reopening clears finalization explicitly.

**Cancel** means an event did not happen: close check-in and exclude it from engagement calculations. **Archive** hides an old event from normal lists but keeps its reporting history. Restore a returning member instead of creating a duplicate profile.

## Dashboard and finance

- **Active member:** attended events ÷ eligible events × 100 meets the club's chosen percentage and reporting period. With no eligible events, show “Not enough data.”
- **Eligible event:** completed, not cancelled, attendance finalized, inside the period, and after that member joined.
- **Popular events:** rank by distinct attendees.
- **Monthly attendance:** average attendees per eligible event. Include events with zero attendees; show “No events” if there were none.
- **Finance:** one currency, opening balance, manual income/expenses, optional event links, and correction history. Use exact money values; exclude voided entries. Opening balance is not income. No bank connections/payments.

## Before connecting your work

Use the [API/data reference](api-data-reference.md) for exact field names, URLs, request/response examples, and error codes. Do not invent a different format in each feature.

Teammates still choose names/estimates for Jira and work out the remaining details: invitation flow (1), import limits/retry rules (2), finance storage (3 with 1), spam limits/data retention (4), and reporting date boundaries (2 with 3/4). These details do not put the agreed rules on hold.

Database changes go in reviewed SQL migration files. Inspect existing tables first. Never rewrite a migration already applied to the shared database.
