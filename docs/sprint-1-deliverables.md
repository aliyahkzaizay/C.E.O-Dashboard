# Sprint 1 Deliverables

**Aliyah Zaizay, Isabel Gilchrest, Ben Joffe, Madhav Kulkarni, and Olakiite Fatuaksi**  
Software Design & Documentation F26

## Vision Statement

### Executive Summary

C.E.O. (Club Engagement Operations) is a full-stack group management and engagement dashboard designed to help leaders organize membership information, track event attendance, understand participant engagement, and manage basic organizational finances. The project was inspired by student organizations that distribute their records across forms and spreadsheets, but is intended to support other groups, including instructors, educators, and program coordinators.

The Minimum Viable Product (MVP) will bring members, events, attendance, engagement analytics, and manual income and expense tracking into one system. Event check-in responses will be retrieved directly through the Google Forms API; Google Sheets will not be a required part of the workflow. Leaders will initiate attendance synchronization, review unmatched participants, and see participation summaries based on stored attendance records.

The planned application uses React, TypeScript, and Vite for the frontend, Supabase for authentication and data storage, and Supabase Edge Functions for private integration logic. Netlify will host the frontend. The team will use GitHub for source control and code review and Jira for the backlog, task assignments, and sprint planning.

### Project Description

Leaders will create individual accounts and create or join an organization through an authorized access process. Organization access will be associated with each leader's account rather than a shared club password. This supports collaboration and continuity when leadership changes. Roster members will not need application accounts simply to appear in the roster or attendance history.

Leaders will establish a roster by adding members individually or importing CSV or XLSX files. Each member will receive an internal identifier. Organizations will also select an external identifier, such as RIN, email, student ID, or employee ID, for matching check-ins. The MVP will use standard member fields and one organization-defined identifier rather than a general-purpose custom-field builder. Identifiers will be stored as text to preserve values such as leading zeros and must be unique within the organization.

Leaders will create events with a name, date, type, and description. Each event will belong to an organization and may be associated with an existing Google Form. Leaders will authorize access to the form and identify the response field used to match roster members. Attendees will submit the form, and a leader will select **Sync attendance** to retrieve responses directly from Google Forms.

C.E.O. will match each submitted identifier against the organization's roster. A successful match will create an attendance record linking the member to the event. Missing, invalid, or unmatched identifiers will be flagged for leader review rather than silently discarded or automatically added to the roster. Repeated submissions and repeated synchronization must not produce duplicate attendance records. Members and events from different organizations must never be linked.

The first Google integration milestone will validate authorized access to responses from an existing form. Automatic form creation will be evaluated separately and is not required for the initial MVP. If the integration proves infeasible within the schedule, the team will review a CSV attendance-import fallback with the instructor before changing the agreed scope.

Engagement summaries will include total membership, active and inactive members, attendance by event, monthly attendance trends, event popularity, and individual attendance histories. The team will document the definition of an active member before implementing this calculation so all views use the same rule.

Basic finance tracking will allow authorized leaders to manually record income and expenses, including amount, date, category, description, and an optional event association. Each organization will use one currency in the MVP. An opening balance and recorded transactions will determine the displayed balance; the application will also show total income and total expenses for the selected reporting period. This balance represents recorded information, not a verified bank balance. Financial corrections should preserve history, such as by voiding a transaction with a reason. Bank connections, payment processing, and automated accounting are outside the MVP.

The primary workflows are:

**Create organization → Add or import members → Create event → Connect Google Form → Collect responses → Sync and match participants → Review unmatched responses → Update attendance analytics**

**Set opening balance → Record income and expenses → Review transactions → View financial summaries**

The goal is to make these workflows reliable before expanding the product. Future extensions may include automatic form creation, native or QR-code check-in, scheduled attendance synchronization, custom branding, raffles, notifications, advanced analytics, bank integrations, and a mobile application.

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

Adoption may be limited by existing spreadsheet habits, the effort required to clean and import data, reluctance to authorize Google access, and concerns about storing member and financial records. The team will seek feedback on the complete workflow and use demonstration data before introducing real organization records.

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
3. **Event management:** Event creation and viewing, association with a Google Form, and event attendance views.
4. **Attendance processing and Google Forms integration:** Direct response retrieval, leader-triggered synchronization, identifier matching, unmatched-response review, and duplicate prevention. Google Sheets is not required.
5. **Engagement dashboard:** Membership counts, active and inactive members, event attendance, monthly trends, event popularity, and member attendance histories.
6. **Basic finance tracking:** Opening balance, manual income and expense entries, categories, optional event links, transaction history, and income, expense, and balance summaries.

Native check-in, QR codes, automatic form generation, scheduled synchronization, raffles, custom branding, finance notifications, bank connections, and payment processing are future extensions.

## Technical Setup and Team Planning

These are planned activities, not claims that setup has already been completed.

### 1. Confirm Scope and Acceptance Criteria

Finalize member fields, identifier handling, the active-member definition, leader access rules, finance reporting rules, and the Google Forms response mapping. Review the UI blueprint against the six MVP feature areas.

### 2. Confirm the Architecture

| Component | Planned technology and responsibility |
| --- | --- |
| Frontend | React, TypeScript, and Vite for application pages; React Router for navigation. |
| Database and authentication | Supabase PostgreSQL and Supabase Auth. |
| Private integration logic | Supabase Edge Functions for Google authorization and response processing requiring server-side credentials. |
| Attendance source | Google Forms API, without a required Google Sheets integration. |
| Frontend hosting | Netlify. |
| Source control and reviews | GitHub. |
| Tasks and sprint planning | Jira. |

### 3. Prepare the Repository

Grant all team members access to the shared GitHub repository, identify primary and backup maintainers, and establish feature branches and pull requests with teammate review. Document setup instructions and configuration placeholders. Commit the dependency lockfile and keep secrets out of version control.

### 4. Set Up Jira

Create the shared Jira project, invite the team, and establish a backlog and sprint board using **To Do → In Progress → In Review → Done**. Create epics for Setup, Authentication/Organizations, Members, Events, Attendance, Finance, and Dashboard. Break work into tasks with an owner and acceptance criteria, estimate during planning poker, and include Jira issue keys in branches and pull-request titles. A task is done when it is implemented, reviewed, verified, and merged. Jira will be the task source of truth; GitHub will hold code and reviews.

### 5. Prepare Local Development

Agree on a supported Node.js LTS version and npm, install Git and an editor, and scaffold the application once for the team. Install the initial application dependencies and configure linting, formatting, and an environment-variable example. Team members will install locked dependencies with `npm ci`.

### 6. Configure Supabase and Design the Database

Create a shared development project, configure authentication, and design organizations, organization-user access, members, events, attendance, incoming submissions, and financial transactions. Record schema changes in SQL migrations. Enable and test Row Level Security so users can access only authorized organization records. Use precise monetary storage and database constraints to prevent duplicate attendance and invalid cross-organization relationships. Start with synthetic data and plan a separate production environment before handling real records.

### 7. Prepare Google Forms Access

Create a team-managed Google Cloud project, enable the Forms API, configure OAuth test access, and prepare a sample form and responses. Determine required permissions, response-field mapping, and secure server-side token storage. Time-box an initial feasibility test before expanding the integration.

### 8. Configure Netlify

Connect the repository, configure the frontend build and output directory, add frontend environment variables, and configure application-route handling. Add the deployment URL to the authentication configuration and verify a shared development deployment early. Google credentials and Supabase secret keys must remain server-side.

## Major Project Risks and Impact

| Risk | Potential impact | Planned mitigation |
| --- | --- | --- |
| Google authorization and API complexity | Attendance integration may take longer than expected or fail for intended accounts. | Validate an existing form early, minimize permissions, handle expired access, and review a fallback if needed. |
| Inconsistent form fields or member identifiers | Responses may be unmatched or assigned incorrectly. | Document field mapping and normalization; preserve raw submissions for review; never guess ambiguous matches. |
| Duplicate submissions or repeated sync | Participation totals may be overstated. | Enforce one attendance record per member and event and make reprocessing safe. |
| Incorrect financial records or calculations | Leaders may rely on an inaccurate recorded balance. | Use precise amounts, consistent reporting rules, visible transaction history, and tests for opening balances and voided entries. |
| Unauthorized access | Member or financial information could be exposed or changed. | Use organization-scoped policies, server-side secrets, and tests with users from separate organizations. |
| Late integration | Components may work independently but fail as a complete application. | Deliver a small connected frontend/backend workflow early and expand it incrementally. |
| Team configuration or schema drift | Developers may work against incompatible environments. | Use shared setup instructions, a lockfile, reviewed migrations, and coordinated database changes. |
| Expanded MVP scope | Finance and Google integration may threaten the release schedule. | Limit finance to manual tracking, keep optional features in the backlog, and review progress in Jira each sprint. |

## User Scenarios

### Scenario 1: Jane Reed — Student Organization President

Jane Reed is a 20-year-old Civil Engineering student in Boston, a soccer player, and the president of SWE. She wants to organize membership and understand how the club's recorded finances affect its fundraising needs.

Jane creates her own account and an organization for SWE. She imports the roster, enters the club's opening balance, and records income and expenses. She can complete these steps gradually after account creation. On the Finance page, she reviews the recorded balance, income and expense totals, and categorized transaction history. She associates fundraising income with its event and compares the available balance with the club's planned activities outside the system. This helps her discuss upcoming fundraising needs with the Fundraising Chair. Other authorized officers use their own accounts to access the organization, and access can be updated during a leadership handoff.

### Scenario 2: Jacob Thomas — Cub Scout Pack Leader

Jacob Thomas is a 40-year-old Cub Scout Pack leader who enjoys the outdoors but finds it time-consuming to maintain membership, participation, and financial records in separate spreadsheets.

Jacob creates an account and organization, imports his member roster, and manually records the opening balance and relevant income and expenses. He creates an event and connects an existing Google Form containing the member identifier needed for check-in. After attendees submit the form, he selects Sync attendance. C.E.O. retrieves the responses directly from Google Forms, matches known members, and flags unmatched entries for review.

Jacob reviews the updated attendance dashboard and recorded financial balance. When he notices a member has attended fewer recent activities, he searches the roster and opens the member's attendance history. He uses the pack's existing authorized contact records outside C.E.O. to follow up. Repeating the synchronization does not increase attendance counts for responses already processed.

## Project Schedule

The revised schedule integrates frontend and backend work early rather than postponing integration until November. Sprint dates and course release milestones are retained. Activities below describe planned work rather than completed results.

| Sprint | Dates | Planned work and milestone |
| --- | --- | --- |
| 0 | 9/14–9/20 | Establish the product idea, initial scenarios and stories, and preliminary implementation options. |
| 1 | 9/21–9/27 | Finalize the vision and six-area MVP; update scenarios; create the UI blueprint; plan repository, Jira, Supabase, Google, and Netlify setup; estimate initial tasks through planning poker. |
| 2 | 9/28–10/4 | Complete team and local setup; scaffold the app; establish migrations and access rules; deploy an initial Netlify build; prove authorized Google Forms response retrieval using test data. |
| 3 | 10/5–10/11 | Deliver an initial connected workflow: login, organization access, manual member entry, event creation, and manual attendance recording with a displayed count. Begin the finance workflow with opening balance and basic transaction entry. |
| 4 | 10/12–10/18 | Connect Google Forms responses to events; implement matching, duplicate prevention, and unmatched-response review; verify cross-organization access restrictions. |
| 5 | 10/19–10/25 | Add CSV/XLSX roster import with validation; complete income/expense categories, optional event links, financial summaries, and correction history. |
| 6 | 10/26–11/1 | Complete engagement views and member histories; refine finance views and page layouts; verify core workflows across the deployed application. |
| 7 | 11/2–11/8 | Prepare the interim release and documentation; test the integrated MVP, capture feedback, and prioritize defects in Jira. |
| 8 | 11/9–11/15 | Address import, synchronization, authorization, and finance edge cases; improve usability, reliability, and performance. |
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
