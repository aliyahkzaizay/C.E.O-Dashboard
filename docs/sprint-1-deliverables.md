# Sprint 1 Deliverables

> Living planning document updated October 6, 2026: native check-in, Python backend, and planned Vercel hosting replace the earlier Google integration/Edge Functions/Netlify direction. Features and revised schedule entries are plans, not implementation claims.

**Aliyah Zaizay, Isabel Gilchrest, Ben Joffe, Madhav Kulkarni, and Olakiite Fatuaksi**  
Software Design & Documentation F26

## Vision Statement

### Executive Summary

C.E.O. (Club Engagement Operations) is a full-stack group management and engagement dashboard designed to help leaders organize membership information, track event attendance, understand participant engagement, and manage basic organizational finances. The project was inspired by student organizations that distribute their records across forms and spreadsheets, but is intended to support other groups, including instructors, educators, and program coordinators.

The Minimum Viable Product (MVP) will bring members, events, attendance, engagement analytics, and manual income and expense tracking into one system. Native C.E.O. check-in forms will submit directly to the Python backend. Each event will have a stable public check-in link and downloadable QR PNG. Leaders will control whether check-in is open, review unmatched participants, and see participation summaries based on confirmed attendance.

The planned application uses React, TypeScript, Vite, and Tailwind CSS for the frontend, Python for the backend, and Supabase for authentication and PostgreSQL storage. Frontend and backend development will run locally against the remote development database. Vercel is the planned deployment provider for both frontend and Python backend when the team reaches deployment. GitHub will hold code and reviews; Jira will hold the backlog and sprint work.

### Project Description

Leaders will create individual accounts and create or join an organization through an authorized access process. Organization access will be associated with each leader's account rather than a shared club password. This supports collaboration and continuity when leadership changes. Roster members will not need application accounts simply to appear in the roster or attendance history.

Leaders will establish a roster by adding members individually or importing CSV or XLSX files. Each member will receive an internal identifier. Organizations will also select an external identifier, such as RIN, email, student ID, or employee ID, for matching check-ins. The MVP will use standard member fields and one organization-defined identifier rather than a general-purpose custom-field builder. Identifiers will be stored as text to preserve values such as leading zeros and must be unique within the organization.

Leaders will create events with a name, date/time, type, and description. Each event will belong to an organization and receive a native check-in link. Leaders can copy the link, download its QR code as a PNG for their own slides, preview the form, and open or close check-in. The link and QR code stay the same when check-in closes or reopens. Attendees will submit the organization-selected identifier without creating an account.

C.E.O. will validate submissions on the backend and match identifiers against the event organization’s roster. A successful match creates one attendance record per member/event. Invalid inputs receive validation feedback; valid but unmatched submissions are queued for officer review. Officers can link a submission to an existing member, create a member and record attendance, or ignore it. Repeated or concurrent submissions must not create duplicate attendance. Members and events from different organizations must never be linked.

Native check-in replaces Google Forms creation and synchronization in the MVP. Basic abuse protection will combine submission limits and bot detection without treating a shared campus IP address as one attendee. Check-in tokens must be unguessable and contain no member information. Every submission must verify that check-in is open. An identifier or QR scan does not prove identity or physical presence; stronger verification is outside the initial MVP.

Engagement summaries will include total membership, active and inactive members, attendance by event, average attendees per event by month, event popularity, and individual attendance histories. Active status is calculated as events attended divided by eligible events, compared with a club-configured percentage threshold over a club-configured reporting period. Eligible events are completed, non-cancelled events with finalized attendance in the period after the member joined. Members with no eligible events show “Not enough data.” Monthly averages include finalized zero-attendance events; months with no eligible events show “No events.” Event popularity ranks events by distinct attendee count. Engagement status remains separate from stored membership status.

Basic finance tracking will allow authorized leaders to manually record income and expenses, including amount, date, category, description, and an optional event association. Each organization will use one currency in the MVP. An opening balance and recorded transactions will determine the displayed balance; the application will also show total income and total expenses for the selected reporting period. This balance represents recorded information, not a verified bank balance. Financial corrections should preserve history, such as by voiding a transaction with a reason. Bank connections, payment processing, and automated accounting are outside the MVP.

The primary workflows are:

**Create organization → Add or import members → Create event → Share link or QR → Open check-in → Match submissions and record attendance → Review unmatched submissions → Close and finalize attendance → View analytics**

**Set opening balance → Record income and expenses → Review transactions → View financial summaries**

The goal is to make these workflows reliable before expanding the product. Future extensions may include Google Forms integration, custom branding, raffles, notifications, advanced analytics, bank integrations, and a mobile application.

## Business Case and Market Analysis

### Niche

C.E.O. targets student organization officers and other group leaders who need a shared view of membership, participation, and basic finances. Its intended value is reducing manual reconciliation between separate records and making participation and financial activity easier to understand during day-to-day operations and leadership handoffs.

### Competition

**Research pending:** Identify competing group-management products and spreadsheet-based workflows, include product descriptions and source URLs, and compare their membership, attendance, finance, and pricing capabilities. Do not treat proposed differentiation as a verified competitive advantage until this research is complete.

The proposed differentiation to evaluate is a focused workflow that combines roster matching, event attendance, engagement summaries, and simple financial records for small organizations.

### Value for the Effort

- **Social and community value:** Help leaders identify participation patterns and make better-informed decisions about activities and resources.
- **Operational value:** Maintain shared records and reduce information loss during officer transitions.
- **Financial value:** Make recorded income, expenses, and available balances easier to inspect.
- **Potential commercial value:** Monetization is not an MVP requirement. Willingness to pay and any pricing model require further research.

### Risks of Product Success

Adoption may be limited by existing spreadsheet habits, the effort required to clean and import data, check-in usability, and concerns about storing member and financial records. The team will seek feedback on the complete workflow and use demonstration data before introducing real organization records.

## Project Stakeholders

| Stakeholder | Stake in the project |
| --- | --- |
| Isabel Gilchrest | Team member and developer contributing to design, implementation, integration, testing, and documentation. |
| Aliyah Zaizay | Team member and developer who also brings the perspective of a student organization leader and its operational needs. |
| Ben Joffe | Team member and developer contributing to technical development and completion of project requirements. |
| Madhav Kulkarni | Team member and developer contributing to technical components and their integration into the application. |
| Olakiite Fatuaksi | Team member and developer contributing to design, implementation, testing, and delivery. |
| Professor Sturman | Provides project guidance and evaluates progress and course deliverables. |
| Mentor Jamie | Meets with the team weekly, provides feedback, and helps identify challenges and next steps. |
| Student organization officers and other group leaders | Primary users who manage members, events, attendance, and organizational finances. |
| Organization members | Participants whose records are maintained and who may benefit from better-informed activity planning. |

## Major Project Features

The MVP includes six major functional areas:

1. **Authentication and organization access:** Individual leader accounts, login, basic organization information, and authorized access to organization records.
2. **Member management:** Roster browsing and search, manual entry, CSV/XLSX import, and individual member details.
3. **Event management:** Event creation and viewing, native check-in link, downloadable QR PNG, form preview, officer open/close controls, and event attendance views.
4. **Native attendance processing:** Public check-in without attendee accounts, server-side validation, identifier matching, unmatched-submission review, duplicate prevention, and basic abuse protection. No Google account connection or synchronization is required.
5. **Engagement dashboard:** Membership counts, active and inactive members, event attendance, monthly trends, event popularity, and member attendance histories.
6. **Basic finance tracking:** Opening balance, manual income and expense entries, categories, optional event links, transaction history, and income, expense, and balance summaries.

Google Forms integration, raffles, custom branding, finance notifications, bank connections, and payment processing are future extensions.

## Technical Setup and Team Planning

These are planned activities, not claims that setup has already been completed.

### 1. Confirm Scope and Acceptance Criteria

Finalize member fields, identifier normalization, leader access rules, finance reporting rules, and native check-in acceptance criteria. Apply the agreed engagement metric definitions consistently across views. See [Architecture and MVP decisions](architecture.md) for the current design and remaining decisions.

### 2. Confirm the Architecture

| Component | Planned technology and responsibility |
| --- | --- |
| Frontend | React, TypeScript, Vite, and Tailwind CSS; React Router for navigation. |
| Database and authentication | Supabase PostgreSQL and Supabase Auth. |
| Backend | Python 3.13/FastAPI API for authorization, validation, check-in processing, and application logic; only the health scaffold exists so far. |
| Attendance source | Native public C.E.O. form posting to the Python API. |
| Hosting | Local frontend and Python backend during development; Vercel planned for both at deployment. Supabase development database is remote. |
| Source control and reviews | GitHub. |
| Tasks and sprint planning | Jira. |

### 3. Prepare the Repository

Grant all team members access to the shared GitHub repository, identify primary and backup maintainers, and establish feature branches and pull requests with teammate review. Document setup instructions and configuration placeholders. Commit the dependency lockfile and keep secrets out of version control.

### 4. Set Up Jira

Create the shared Jira project, invite the team, and establish a backlog and sprint board using **To Do → In Progress → In Review → Done**. Create epics for Setup, Authentication/Organizations, Members, Events, Attendance, Finance, and Dashboard. Break work into tasks with an owner and acceptance criteria, estimate during planning poker, and include Jira issue keys in branches and pull-request titles. A task is done when it is implemented, reviewed, verified, and merged. Jira will be the task source of truth; GitHub will hold code and reviews.

### 5. Prepare Local Development

Agree on a supported Node.js LTS version and npm, install Git and an editor, and scaffold the application once for the team. Install the initial application dependencies and configure linting, formatting, and an environment-variable example. Team members will install locked dependencies with `npm --prefix frontend ci`; Python dependencies are installed separately using backend/requirements-dev.txt.

### 6. Configure Supabase and Design the Database

Create a shared development project, configure authentication, and design organizations, organization-user access, members, events, attendance, incoming submissions, and financial transactions. Record schema changes in SQL migrations. Enable and test Row Level Security so users can access only authorized organization records. Use precise monetary storage and database constraints to prevent duplicate attendance and invalid cross-organization relationships. Start with synthetic data and plan a separate production environment before handling real records.

### 7. Build Native Check-in

Implement an event-specific public form, stable unguessable link, downloadable QR PNG, preview, and officer-controlled open/close setting. Validate submissions on the backend, enforce database uniqueness, and implement unmatched review. Test shared-network submissions, repeated and concurrent requests, invalid inputs, closed check-in, unauthorized officer actions, and cross-organization isolation.

### 8. Prepare Deployment When the Local Workflow Is Ready

Plan Vercel deployment for the frontend and Python backend after the local connected workflow works. Configure build roots, API routing, environment variables, authentication URLs, and applicable function limits; verify the deployed workflow separately. Supabase secret keys remain server-side. The earlier Netlify configuration has been removed; Vercel configuration remains an upcoming deployment task.

## Major Project Risks and Impact

| Risk | Potential impact | Planned mitigation |
| --- | --- | --- |
| Public check-in abuse or impersonation | Spam or false attendance could affect records. | Validate inputs, use layered submission limits, restrict check-in windows, and preserve officer review; a shared IP is not a person and a typed identifier is not identity proof. |
| Inconsistent member identifiers | Submissions may be unmatched or assigned incorrectly. | Define normalization, retain necessary submission details for review, and never guess ambiguous matches. |
| Duplicate submissions or retries | Participation totals may be overstated. | Enforce one attendance record per member/event at database level and make processing safe to retry. |
| Incorrect financial records or calculations | Leaders may rely on an inaccurate recorded balance. | Use precise amounts, consistent reporting rules, visible transaction history, and tests for opening balances and voided entries. |
| Unauthorized access | Member or financial information could be exposed or changed. | Use organization-scoped policies, server-side secrets, and tests with users from separate organizations. |
| Late integration | Components may work independently but fail as a complete application. | Deliver a small connected frontend/backend workflow early and expand it incrementally. |
| Team configuration or schema drift | Developers may work against incompatible environments. | Use shared setup instructions, a lockfile, reviewed migrations, and coordinated database changes. |
| Expanded MVP scope | Finance and check-in work may threaten the release schedule. | Limit finance to manual tracking, defer Google integration, and review progress in Jira each sprint. |

## User Scenarios

### Scenario 1: Jane Reed — Student Organization President

Jane Reed is a 20-year-old Civil Engineering student in Boston, a soccer player, and the president of SWE. She wants to organize membership and understand how the club's recorded finances affect its fundraising needs.

Jane creates her own account and an organization for SWE. She imports the roster, enters the club's opening balance, and records income and expenses. She can complete these steps gradually after account creation. On the Finance page, she reviews the recorded balance, income and expense totals, and categorized transaction history. She associates fundraising income with its event and compares the available balance with the club's planned activities outside the system. This helps her discuss upcoming fundraising needs with the Fundraising Chair. Other authorized officers use their own accounts to access the organization, and access can be updated during a leadership handoff.

### Scenario 2: Jacob Thomas — Cub Scout Pack Leader

Jacob Thomas is a 40-year-old Cub Scout Pack leader who enjoys the outdoors but finds it time-consuming to maintain membership, participation, and financial records in separate spreadsheets.

Jacob creates an account and organization, imports his member roster, and records the opening balance and income/expenses. He creates an event, downloads its QR PNG into his own slides, and opens check-in. Attendees submit the native C.E.O. form without accounts. C.E.O. matches known members and queues unmatched submissions for review. Jacob can link an existing member, create a new member, or ignore an unmatched submission. He closes check-in and finalizes attendance after review.

Jacob reviews the attendance dashboard and recorded financial balance. He searches a member’s attendance history when participation declines and uses existing authorized contact records outside C.E.O. to follow up. Repeated submissions do not increase attendance counts for the same member/event.

## Project Schedule

The revised schedule integrates frontend and backend work early rather than postponing integration until November. Sprint dates and course release milestones are retained. Activities below describe planned work rather than completed results.

| Sprint | Dates | Planned work and milestone |
| --- | --- | --- |
| 0 | 9/14–9/20 | Establish the product idea, initial scenarios and stories, and preliminary implementation options. |
| 1 | 9/21–9/27 | Original planning period: establish the vision, scenarios, UI blueprint, and initial setup tasks. October 6 architecture decisions below supersede the earlier Google Forms/Netlify direction; this is not a completion report. |
| 2 | 9/28–10/4 | Original setup period: team/local setup, app scaffold, migrations, and access rules. Reconcile unfinished setup work in Jira; no deployment or backend completion is claimed. |
| 3 | 10/5–10/11 | Target: establish the local Python API and migration baseline; connect login, organization access, manual member entry, event creation, and attendance recording with a count. Begin opening balance/basic finance. Re-estimate remaining work with the team. |
| 4 | 10/12–10/18 | Build native check-in, stable link/QR download, open/close controls, matching, duplicate prevention, unmatched review, and abuse protection; verify organization boundaries. |
| 5 | 10/19–10/25 | Add CSV/XLSX roster import with validation; complete income/expense categories, optional event links, financial summaries, and correction history. |
| 6 | 10/26–11/1 | Complete engagement metrics and histories; refine finance/layouts; target Vercel deployment after local integration and verify the deployed workflow. |
| 7 | 11/2–11/8 | Prepare the interim release and documentation; test the integrated MVP, capture feedback, and prioritize defects in Jira. |
| 8 | 11/9–11/15 | Address import, check-in, authorization, and finance edge cases; improve usability, reliability, and performance. |
| 9 | 11/16–11/22 | Run full regression and acceptance testing; verify all MVP requirements and finalize the beta release. |
| 10 | 11/30–12/6 | Resolve remaining release defects, validate deployment and setup documentation, and prepare presentations. |
| 11 | 12/7–12/11 | Submit the final release, Best Practices, and other required Submitty deliverables; present the completed project. |

## Project Status Report

Maintained in a separate document. Jira will support task and sprint tracking; this does not replace the course-required status report.

## Contribution Summary

| Team member | Reported contribution |
| --- | --- |
| Isabel Gilchrest | Completed the project schedule, helped create the status report, and worked on the business case and market analysis. |

Other individual contributions remain to be supplied by the team. No additional contributions are attributed in this revision.
