# PROJECT STATUS AND HANDOFF

Last updated: 2026-05-19 15:09 +01:00

## 1. Current Project Goal

Continue the SBC Report App updates without rebuilding or changing business logic unnecessarily. The active work is:

- Apply the latest supplied logo file, `C:\Users\Delluser\Documents\SBC Logo\New_logo.png`, to the app UI.
- Preserve the existing theme system, auth, report, review, and admin workflows.
- Continue from the role/dashboard/logo changes already made in this working tree.

## 2. Current State Of The Work

The app is a Next.js 16.2.6 / React 19 dashboard app with Prisma 7 + MariaDB and NextAuth v5 credentials auth.

Current visible route in browser: `http://localhost:3000/admin/users`.

Recent work completed in this session:

- Admin dashboard was restyled to match light/dark reference images using the existing `next-themes` class-based dark mode.
- `Score Trend` was moved above `Activity` on the admin dashboard.
- Edit User PATCH 400 was fixed by matching the client payload to the API schema.
- Role display labels were updated:
  - `HEAD_OF_SUPERVISOR` displays as `Committee`.
  - `SUPERVISOR_PASTOR` displays as `Supervising Pastor`.
  - `HOD` displays as `HOSTs`.
- New role ID `PASTOR` was added and mapped to Committee-style read-only access.
- `/login` was wrapped in Suspense to satisfy Next.js 16 build requirements for `useSearchParams`.

Latest logo correction completed: `C:\Users\Delluser\Documents\SBC Logo\New_logo.png` was copied into `public/images/logo.png`. The login preview initially showed a missing logo because `proxy.ts` intercepted `/images/logo.png` and returned app HTML; the matcher now excludes `/images/*`.

Latest HOD dashboard update completed: the `/hod` dashboard `MY REPORTS` table now uses columns `TEAM`, `PERIOD`, `STATUS`, `VIEW`. Each row has a `View` link to the existing read-only `/hod/reports/[id]` report detail page. Dashboard status displays `Reviewed` when a submitted Committee review exists; otherwise it preserves the existing Draft/submitted status behavior.

Latest Supervising Pastor data-scope fix completed: pastor dashboards/reports/teams now derive assigned HOSTs through `HodProfile.supervisorId` / `PastorProfile.hods`, then use those HOSTs' `serviceTeams` and `hodReports`. This fixes blank `TEAM REPORTS` and `MY SERVICE TEAMS` views when Add/Edit User assigns a Supervising Pastor to HOSTs but does not populate legacy `ServiceTeam.pastorId`.

Latest HOD draft persistence fix completed: `/hod/report` now restores saved drafts for the selected team/month/year, and draft Edit links from `/hod/reports` open the report form with `teamId`, `month`, and `year` query parameters so the saved draft loads directly.

Latest SMTP test endpoint fix completed: `POST /api/settings/smtp/test` now loads SMTP settings from the database, validates common port/secure mismatches before connecting, no longer disables TLS certificate verification, and returns structured safe JSON for expected SMTP provider failures instead of surfacing them as a generic HTTP 500. Safe logs/responses include host, port, secure, masked username, code, and sanitized message only.

Latest Supervising Pastor dashboard/analytics follow-up completed: `/pastor` no longer shows Activity because Activity is admin-only, and `/pastor/analytics` now uses `getSupervisedPastorScope()` so analytics derive assigned HOSTs through `HodProfile.supervisorId` / `PastorProfile.hods` instead of the legacy `PastorProfile.serviceTeams` relation. The related analytics API filters were also updated to use the same scope.

Latest Supervising Pastor dashboard table follow-up completed: `/pastor` now shows a `MEMBER PERFORMANCE - SUBMITTED REPORTS` table immediately after `TEAM REPORTS`, matching the HOD analytics member performance table pattern but expanded to all non-draft HOST-submitted reports in the Supervising Pastor's assigned HOST/team scope. It includes `SUBMITTED`, `PASTOR_REVIEWED`, `HEAD_REVIEWED`, and any other non-draft status, and displays member name, team, period, status, grade columns, and average score. No schema change was needed.

Latest Supervising Pastor analytics follow-up completed: `/pastor/analytics` now treats analytics summary and team average score chart data as all non-draft HOST-submitted reports in the Supervising Pastor's assigned HOST/team scope, not only the current month. The visible stat changed from `Submitted This Month` to `Submitted Reports`, and the chart title changed from `TEAM AVERAGE SCORES - CURRENT MONTH` to `TEAM AVERAGE SCORES - SUBMITTED REPORTS`. Drafts are excluded; `SUBMITTED`, `PASTOR_REVIEWED`, `HEAD_REVIEWED`, and other non-draft statuses are included.

Latest Supervising Pastor dashboard member performance correction completed: `/pastor` member performance now mirrors the HOSTs member performance table. It shows only the grading values from the latest non-draft HOST-submitted report in the Supervising Pastor's assigned HOST/team scope within the same rolling 12-month analytics window used by `/hod/analytics`. Review statuses are ignored for this section except that drafts are excluded; the table has no `Status` or `Period` columns and uses the HOSTs-style columns `Name`, `Team`, `Gen. Attitude`, `Teamwork`, `Punctuality`, `Appearance`, `Attendance`, and `Avg`.

Latest Supervising Pastor analytics layout follow-up completed: `/pastor/analytics` now places `TEAM AVERAGE SCORES - SUBMITTED REPORTS` and `SUBMISSION STATUS — MY TEAMS` side by side at the dashboard's current content width by switching the chart grids from `xl:grid-cols-2` to `lg:grid-cols-2`.

Latest Supervising Pastor analytics cleanup completed: `/pastor/analytics` no longer renders the `SCORE TREND — 6 MONTHS` card. The remaining chart headings are `TEAM AVERAGE SCORES - SUBMITTED REPORTS`, `SUBMISSION STATUS — MY TEAMS`, and `TOP MEMBERS — MY TEAMS`.

Latest Supervising Pastor/Committee review field visibility update completed: the existing `PastorReview.comments` field is now presented as `Review` instead of `Comments`, the Supervising Pastor review form says `Visible to HOSTs`, and the placeholder is `Your Review on this HOSTs Performance`. Submitted Supervising Pastor reviews are now passed into HOD and Supervising Pastor report detail pages so the review content can be visible across the intended report views without a schema change. Committee review entry/display copy now uses `Review` instead of `Overall Comments`.

Latest Supervising Pastor review form label follow-up completed: `/pastor/review` Section A now labels the HOST field as `HOSTs Name`, and the Report Summary no longer displays `Present` or `Absent`; it only shows `Enrolled` and `Avg Score`.

Latest Supervising Pastor review visibility copy follow-up completed: `/pastor/review` Section C now describes the Review field as `Visible to Pastor, committee & HOSTs`.

Latest HOD report form restructure completed: `/hod/report` was rebuilt from Section B onward into the requested two-step report workflow. Section A remains in place and now uses a wider desktop content width. Step 1 contains Section B `GOALS FOR THE MONTH` with 1-5 dynamic goals, Section C challenges, Section D next-month goals, and Section E service team needs/budget/budget financing. Step 2 contains Section F `SERVICE TEAM MEMBERS PERFORMANCE ASSESSMENT` using the existing member grading logic, plus an Add Member modal and conditional N/A explanation field, followed by Section G `COMMENTS BY SERVICE TEAM LEADER` with confirmation/signature/date. Draft save, final submit, edit reload, report API validation, and report detail display pages were updated to carry the new fields.

Latest HOD report form responsive width fix completed: Section A and the new report sections now use a wider `max-w-[1024px]` content area on desktop while preserving stacked mobile layout. The HOSTs field no longer has its own smaller desktop cap, so Month/Year and Assistant I/II align more closely with the provided desktop sample.

## 3. Files Changed So Far

Git currently reports 58 modified tracked files plus untracked files/folders. Major changed areas:

- Auth/login:
  - `app/(auth)/login/page.tsx`
  - `app/(auth)/change-password/page.tsx`
- Dashboard shell and admin dashboard:
  - `components/ui/DashboardShell.tsx` (untracked new file)
  - `components/ui/Sidebar.tsx`
  - `components/ui/Topbar.tsx`
  - `components/ui/DarkModeToggle.tsx`
  - `components/ui/StatCard.tsx`
  - `components/ui/StatusBadge.tsx`
  - `app/(dashboard)/admin/page.tsx`
- Role/routing/permissions:
  - `lib/roles.ts`
  - `lib/nav-config.ts`
  - `lib/auth.ts`
  - `prisma/schema.prisma`
  - `app/(dashboard)/dashboard/page.tsx`
  - `app/(dashboard)/layout.tsx`
- Admin users/settings/teams/reports:
  - `components/admin/UsersClient.tsx`
  - `components/admin/SettingsClient.tsx`
  - `components/admin/TeamsClient.tsx`
  - `components/admin/ReportsAdminClient.tsx`
  - `components/admin/BackupClient.tsx`
  - `app/api/users/route.ts`
  - `app/api/users/[id]/route.ts`
  - `app/api/settings/fields/route.ts`
- Committee/Pastor read-only surfaces:
  - `app/(dashboard)/head/page.tsx`
  - `app/(dashboard)/head/reports/page.tsx`
  - `app/(dashboard)/head/reports/[id]/page.tsx`
  - `app/(dashboard)/head/analytics/page.tsx`
  - `app/(dashboard)/head/teams/page.tsx`
  - `app/(dashboard)/head/review/page.tsx`
- Report/review display labels:
  - `components/report/ReportDetail.tsx`
  - `components/head/HeadReviewForm.tsx`
  - `components/pastor/ReviewForm.tsx`
  - `components/hod/ReportForm.tsx`
  - `components/analytics/HeadAnalyticsClient.tsx`
  - `components/charts/SubmissionPie.tsx`
  - `lib/mailer.ts`
- Other changed API/client files existed from earlier session work:
  - `components/admin/MembersAdminClient.tsx`
  - `components/hod/MembersClient.tsx`
  - `app/api/members/*`
  - `app/api/reports/route.ts`
  - settings/SMTP/notifications/period APIs
  - `prisma/seed.ts`

Untracked:

- `.claude/`
- `PROJECT-MEMORY.txt`
- `components/ui/DashboardShell.tsx`
- `public/images/`
- `PROJECT_STATUS_AND_HANDOFF.md` (this file)

## 4. Important Files/Folders

- `PROJECT-MEMORY.txt` - prior project memory and session history.
- `PROJECT_STATUS_AND_HANDOFF.md` - current continuation file for future Codex sessions.
- `prisma/schema.prisma` - added `PASTOR` enum value.
- `lib/roles.ts` - central roles, permissions, route prefixes, primary role order.
- `lib/nav-config.ts` - role-based sidebar menu.
- `lib/auth.ts` - NextAuth config and route gating.
- `components/ui/Sidebar.tsx` - sidebar logo and displayed role labels.
- `components/admin/UsersClient.tsx` - admin user filters and role assignment UI.
- `app/api/users/route.ts`, `app/api/users/[id]/route.ts` - allowed role validation.
- `app/(dashboard)/head/*` - reused for both `HEAD_OF_SUPERVISOR` and `PASTOR`.
- `public/images/logo.png` - current app logo asset, replaced with `New_logo.png` on 2026-05-16.
- `public/images/logo.backup-20260516-before-new-logo.png` - backup of the previous app logo before replacement.
- New supplied logo source: `C:\Users\Delluser\Documents\SBC Logo\New_logo.png`.
- `proxy.ts` - matcher excludes `/images/*` so public image assets are served as files instead of routed through auth proxy handling.
- `app/(dashboard)/hod/page.tsx` - HOD dashboard `MY REPORTS` table now includes the `VIEW` column and Committee-reviewed display logic.
- `lib/pastor-scope.ts` - shared helper for resolving a logged-in Supervising Pastor's assigned HOSTs and service teams.
- `app/(dashboard)/pastor/page.tsx` - dashboard stats/reports/activity now use assigned HOST scope.
- `app/(dashboard)/pastor/page.tsx` - now also renders `MEMBER PERFORMANCE` after `TEAM REPORTS`, mirroring the HOSTs latest-report member grading table with no `Status` or `Period` columns; latest report selection uses the same rolling 12-month window as `/hod/analytics`.
- `app/(dashboard)/pastor/analytics/page.tsx` - analytics now use assigned HOST scope and exclude draft reports from score/member calculations; summary and team average score chart now aggregate all non-draft HOST-submitted reports rather than only the current month.
- `components/analytics/PastorAnalyticsClient.tsx` - Pastor analytics labels now say `Submitted Reports` and `TEAM AVERAGE SCORES - SUBMITTED REPORTS`; chart cards switch to side-by-side layout at `lg`; `SCORE TREND — 6 MONTHS` was removed from Pastor analytics.
- `app/(dashboard)/pastor/reports/page.tsx` - team report listing now uses assigned HOST scope.
- `app/(dashboard)/pastor/teams/page.tsx` - my service teams now come from assigned HOSTs' service teams, deduped by team id.
- `app/(dashboard)/pastor/reports/[id]/page.tsx` - report detail/review authorization now uses assigned HOST scope.
- `app/(dashboard)/pastor/review/page.tsx` - review page authorization now uses assigned HOST scope.
- `app/api/reviews/pastor/route.ts` - pastor review POST authorization now uses assigned HOST scope.
- `app/api/analytics/members/route.ts`, `app/api/analytics/summary/route.ts`, `app/api/analytics/trend/route.ts` - Supervising Pastor analytics API scope now matches assigned HOST scope.
- `app/(dashboard)/hod/report/page.tsx` - accepts draft query parameters and passes initial team/month/year into the report form.
- `app/(dashboard)/hod/reports/page.tsx` - draft Edit links now include team/month/year for restoring the selected draft.
- `components/hod/ReportForm.tsx` - fetches existing draft data with `full=true`, calls `reset()` with saved values, restores member grades, and skips the team-change blank-grade overwrite while restoring.
- `components/hod/ReportForm.tsx` - report form now has the two-step Section B-G structure: dynamic goals, challenges, next-month goals, service team needs, existing member grading moved to Section F, Add Member modal, conditional N/A explanation, and Section G confirmation/signature/date.
- `app/api/reports/route.ts` - report POST validation/save now accepts the new Section B-G payload fields, stores draft `currentStep`, stores goals as JSON, validates required final-submit fields, and preserves existing member grading persistence.
- `components/report/ReportDetail.tsx` - report detail now displays goals, planning notes, N/A explanation, and service team leader comments/confirmation/signature/date while preserving old observations/challenges for backwards compatibility.
- `lib/report-goals.ts` - normalizes stored `goalsForMonth` JSON into display-safe report goal rows.
- `app/(dashboard)/admin/reports/[id]/page.tsx`, `app/(dashboard)/hod/reports/[id]/page.tsx`, `app/(dashboard)/pastor/reports/[id]/page.tsx`, `app/(dashboard)/head/reports/[id]/page.tsx` - report detail loaders now pass the new report fields into the shared report display.
- `app/api/settings/smtp/test/route.ts` - SMTP test now returns structured safe errors, checks port/secure mismatches, removes `tls.rejectUnauthorized: false`, and avoids logging raw Nodemailer errors.
- `components/pastor/ReviewForm.tsx` - Supervising Pastor comments field is now labeled `Review`, marked `Visible to HOSTs`, and uses the requested placeholder.
- `components/pastor/ReviewForm.tsx` - Section A now labels the HOST field as `HOSTs Name`; Report Summary no longer renders `Present` or `Absent`.
- `components/pastor/ReviewForm.tsx` - Section C visibility copy now says `Visible to Pastor, committee & HOSTs`.
- `components/head/HeadReviewForm.tsx` - Committee review form now labels the review textarea as `Review`; the read-only Supervising Pastor review text is also labeled `Review`.
- `components/report/ReportDetail.tsx` - shared report detail displays Supervising Pastor and Committee review text under `Review`.
- `app/(dashboard)/hod/reports/[id]/page.tsx` - HOD report detail now loads and displays submitted Supervising Pastor review content.
- `app/(dashboard)/pastor/reports/[id]/page.tsx` - Supervising Pastor report detail now passes submitted review content into the shared detail display while preserving the review form below.

## 5. Role, Logo, And Dashboard Decisions Made

Role decisions:

- Existing stored role IDs were preserved:
  - `HEAD_OF_SUPERVISOR` remains the stored ID, displays as `Committee`.
  - `SUPERVISOR_PASTOR` remains the stored ID, displays as `Supervising Pastor`.
  - `HOD` remains the stored ID, displays as `HOSTs`.
- New role ID `PASTOR` was added.
- `PASTOR` has the same permission flags and route access pattern as `HEAD_OF_SUPERVISOR`.
- `PASTOR` redirects to and uses `/head` screens.
- `PASTOR` is read-only and should not submit Committee reviews, edit, delete, or approve.
- `PASTOR` can view all submitted reports and submitted Committee reviews through shared head report detail surfaces.

Logo decisions:

- Current code references `/images/logo.png` in `Sidebar.tsx` and `login/page.tsx`.
- Sidebar currently uses a 48px square image container with `object-contain` and soft white/light shadow.
- Login page uses the logo in desktop and mobile badge areas.
- User later supplied `New_logo.png`; it has now been copied into `public/images/logo.png`.
- Previous `public/images/logo.png` was backed up to `public/images/logo.backup-20260516-before-new-logo.png` before replacement.
- `/images/logo.png` must bypass `proxy.ts`; otherwise Next receives HTML when optimizing the logo and reports `The requested resource isn't a valid image.`

Dashboard decisions:

- Existing `next-themes` + Tailwind `dark:` class system is preserved.
- No new theme system was introduced.
- Admin dashboard visuals were updated with modern card/table/chart/activity styling for light and dark modes.
- `Score Trend` appears above `Activity`.
- HOD dashboard `MY REPORTS` row View actions use the existing read-only report detail route rather than adding edit or modal behavior.
- Supervising Pastor report/team views should use HOST assignment via `HodProfile.supervisorId`; `ServiceTeam.pastorId` is older/legacy team assignment data and may be empty or broader than the current HOST assignment.
- HOD report draft editing uses existing `HodReport` and `ReportMemberGrade` tables. No schema change was needed.

## 6. Commands Already Run

Successful:

```powershell
npx tsc --noEmit --pretty false
npm run lint
npm run build
npx prisma validate
Invoke-WebRequest -Uri http://localhost:3000/admin/users -UseBasicParsing -TimeoutSec 15
Invoke-WebRequest -Uri http://localhost:3000/admin -UseBasicParsing -TimeoutSec 15
Get-FileHash -Algorithm SHA256 -LiteralPath public\images\logo.png
npm run lint
npm run build
npx prisma validate
Invoke-WebRequest -Uri http://localhost:3000/images/logo.png -UseBasicParsing -TimeoutSec 15
Invoke-WebRequest -Uri "http://localhost:3000/_next/image?url=%2Fimages%2Flogo.png&w=128&q=75" -UseBasicParsing -TimeoutSec 15
node -e "const p=require('./package.json'); console.log(p.scripts && p.scripts.typecheck ? 'typecheck available' : 'typecheck unavailable')"
npm run lint
npm run build
npx prisma validate
Invoke-WebRequest -Uri http://localhost:3000/hod -UseBasicParsing -TimeoutSec 20
node -e "const p=require('./package.json'); console.log(p.scripts && p.scripts.typecheck ? 'typecheck available' : 'typecheck unavailable')"
npm run lint
npm run build
npx prisma validate
node -e "const p=require('./package.json'); console.log(p.scripts && p.scripts.typecheck ? 'typecheck available' : 'typecheck unavailable')"
npm run lint
npm run build
npx prisma validate
node -e "const p=require('./package.json'); console.log(p.scripts && p.scripts.typecheck ? 'typecheck available' : 'typecheck unavailable')"
npm run lint
npm run build
npx prisma validate
node -e "<authenticated NextAuth credentials POST, then POST /api/settings/smtp/test>"
npx tsc --noEmit --pretty false
npm run lint -- "app/(dashboard)/pastor/analytics/page.tsx"
npm run lint -- "app/(dashboard)/pastor/analytics/page.tsx" "app/api/analytics/members/route.ts" "app/api/analytics/summary/route.ts" "app/api/analytics/trend/route.ts"
Start-Process -FilePath powershell -ArgumentList @('-NoProfile','-Command','npm run dev') -WorkingDirectory "C:\Users\Delluser\Documents\Application Folder\sbc-report-app\sbc-report-app" -WindowStyle Hidden
npx tsc --noEmit --pretty false
npm run lint -- "app/(dashboard)/pastor/page.tsx"
npm run build
npx prisma validate
npx tsc --noEmit --pretty false
npm run lint -- "app/(dashboard)/pastor/page.tsx"
npm run build
npx prisma validate
npx tsc --noEmit --pretty false
npm run lint -- "app/(dashboard)/pastor/analytics/page.tsx" "components/analytics/PastorAnalyticsClient.tsx"
npm run build
npx prisma validate
npx tsc --noEmit --pretty false
npm run lint -- "app/(dashboard)/pastor/page.tsx"
npm run build
npx prisma validate
npx tsc --noEmit --pretty false
npm run lint -- "app/(dashboard)/pastor/page.tsx"
npm run build
npx prisma validate
npx tsc --noEmit --pretty false
npm run lint -- "app/(dashboard)/pastor/page.tsx"
npm run build
npx prisma validate
npx tsc --noEmit --pretty false
npm run lint -- "components/analytics/PastorAnalyticsClient.tsx"
npm run build
npx prisma validate
npx tsc --noEmit --pretty false
npm run lint -- "components/analytics/PastorAnalyticsClient.tsx"
npm run build
npx prisma validate
npx tsc --noEmit --pretty false
npm run lint -- "components/pastor/ReviewForm.tsx" "components/head/HeadReviewForm.tsx" "components/report/ReportDetail.tsx" "app/(dashboard)/hod/reports/[id]/page.tsx" "app/(dashboard)/pastor/reports/[id]/page.tsx"
node -e "const p=require('./package.json'); console.log(p.scripts && p.scripts.typecheck ? 'typecheck available' : 'typecheck unavailable')"
npm run build
npx prisma validate
npm run lint
npx tsc --noEmit --pretty false
npm run lint -- "components/pastor/ReviewForm.tsx"
npx tsc --noEmit --pretty false
npm run lint -- "components/pastor/ReviewForm.tsx"
npx prisma validate
npx prisma generate
npm run lint
npm run build
npm run lint -- --quiet
node -e "<mysql2 script to add missing hod_reports columns for the new Section B-G report fields>"
```

There is no `npm run typecheck` script in `package.json`; `npm run build` ran the Next.js TypeScript phase successfully.

Observed `npm run lint` result:

- Exit code 0.
- Warnings only, no errors.
- Warnings include existing unused vars and React Compiler warnings around React Hook Form `watch()`.

Latest required git commands run:

```powershell
git status --short
git diff --stat
```

## 7. Bugs/Errors Encountered

- Edit User PATCH 400:
  - Error: `Invalid request body`.
  - Cause: `UsersClient.tsx` edit submit sent `null` for optional fields while zod schema accepted optional strings or `''`.
  - Fix: edit payload sends `''` for blank optional fields.
- Auth DB error:
  - Hostinger MariaDB exceeded `max_connections_per_hour = 500`.
  - Not an app validation/auth password issue.
- Build error:
  - `/login` used `useSearchParams()` without Suspense.
  - Fixed with a Suspense wrapper around `LoginContent`.
- TypeScript error:
  - `session` possibly null in `app/(dashboard)/head/page.tsx`.
  - Fixed with explicit guard.
- ESLint error:
  - Unescaped apostrophes in `HeadReviewForm.tsx`.
  - Fixed with `&apos;`.
- Build currently passes after fixes.
- Supervising Pastor blank dashboard sections:
  - Root cause: pastor pages queried `PastorProfile.serviceTeams` / `ServiceTeam.pastorId`, but Add/Edit User saves HOST assignment in `HodProfile.supervisorId`.
  - Fix: pastor dashboard, reports, teams, detail/review pages, and review API now resolve scope through `PastorProfile.hods` and the assigned HOSTs' service teams.
- Supervising Pastor analytics zeros/blanks:
  - Root cause: `/pastor/analytics` and related analytics APIs still queried legacy `PastorProfile.serviceTeams`, while current Add/Edit User assignments save Supervising Pastor scope through assigned HOSTs in `HodProfile.supervisorId`.
  - Fix: `/pastor/analytics`, `/api/analytics/members`, `/api/analytics/summary`, and `/api/analytics/trend` now resolve scope with `getSupervisedPastorScope()`. Performance/member analytics exclude draft reports.
- HOD Save Draft reset:
  - Root cause: the form only checked for a draft status and never loaded full draft data back into React Hook Form. The team-change effect also replaced member grade rows with blank defaults, which would overwrite restored grade values.
  - Fix: `/api/reports?full=true` is used for draft lookup, `ReportForm` calls `reset()` with saved assistants, remarks, team, period, and member grades, and the grade replacement effect is skipped while restoring a draft.
- SMTP Test HTTP 500:
  - Root cause: the SMTP test route treated expected Nodemailer/provider failures as server errors and returned HTTP 500. The live provider response is `EENVELOPE`: Hostinger rejected the configured sender address because the `fromDisplay` mailbox is not owned by the authenticated SMTP username.
  - Fix: the route now returns `success: false`, a safe `message`, provider `code`, and safe diagnostics with HTTP 200 for SMTP test failures. It sanitizes passwords/usernames from messages and logs, masks usernames/emails, checks 465/587 secure-mode mismatches, and keeps TLS certificate validation enabled.
- Supervising Pastor dashboard missing HOD analytics member performance table:
  - Root cause: `/pastor` only rendered summary cards and `TEAM REPORTS`; the member performance grading table existed on HOD analytics but had not been added to the Supervising Pastor dashboard.
  - Fix: `/pastor` now queries the latest non-draft report in the assigned HOST/team scope and renders the member grading table immediately after `TEAM REPORTS`.
- Supervising Pastor dashboard member performance table only reflected one latest report:
  - Root cause: the first `/pastor` member performance implementation queried `findFirst()` for the latest non-draft report only, so older HOST-submitted reports were not reflected in that table even when they were `SUBMITTED`, `PASTOR_REVIEWED`, or `HEAD_REVIEWED`.
  - Fix: `/pastor` now queries all non-draft reports in the assigned HOST/team scope for the member performance table and shows period/status per row so submitted, Supervising Pastor reviewed, and Committee reviewed reports are all included.
- Supervising Pastor analytics team average score only reflected the current month:
  - Root cause: `/pastor/analytics` calculated the team average score chart from `currentReports`, which filtered to the current month/year even though the user expects every HOST-submitted report under the Supervising Pastor to count unless it is a draft.
  - Fix: `/pastor/analytics` now builds the summary count, average score, and team average chart from all non-draft reports in the assigned HOST/team scope. `Pending Reviews` remains intentionally limited to `SUBMITTED` reports because those are the reports awaiting Supervising Pastor review.
- Supervising Pastor dashboard member performance table showed an unwanted `Status` column:
  - Root cause: the multi-report Pastor dashboard table added `Status` for row context, but the requested design should mirror the HOSTs member performance table more closely.
  - Fix: `/pastor` member performance table now removes the `Status` column and uses the simpler `MEMBER PERFORMANCE` heading. `Period` remains for distinguishing multiple submitted reports.
- Supervising Pastor dashboard member performance still behaved like a history table:
  - Root cause: `/pastor` was flattening all non-draft report grades and showing `Period`, which still did not match the HOSTs member performance table. The user clarified that this section should show only HOST grading from the submitted report, ignoring Supervising Pastor and Committee review status in the table.
  - Fix: `/pastor` now uses `findFirst()` for the latest non-draft HOST-submitted report in the assigned HOST/team scope and renders only that report's `ReportMemberGrade` rows, matching the HOSTs table columns exactly apart from the surrounding page location.
- Supervising Pastor dashboard grades differed from HOSTs analytics grades:
  - Root cause: `/hod/analytics` builds its latest report from reports inside a rolling 12-month analytics window, but `/pastor` was selecting the latest non-draft report across all time. A future/local December 2028 submitted test report was therefore selected on `/pastor`, while `/hod/analytics` selected the May 2026 report.
  - Fix: `/pastor` member performance now applies the same rolling 12-month window before selecting the latest non-draft HOST-submitted report, so the grading matches the HOSTs page for the same HOST/team.
- Supervising Pastor analytics score/status charts stacked instead of sitting side by side:
  - Root cause: `PastorAnalyticsClient` used `xl:grid-cols-2`, but the dashboard content area is narrower because of the sidebar, so the breakpoint was too late for the current desktop layout.
  - Fix: changed the Pastor analytics chart grids to `lg:grid-cols-2`.
- Supervising Pastor analytics still showed unwanted score trend:
  - Root cause: `PastorAnalyticsClient` still rendered the shared `ScoreTrendChart` card for `SCORE TREND — 6 MONTHS`.
  - Fix: removed the Score Trend import, props usage, and card from Pastor analytics; `TOP MEMBERS — MY TEAMS` remains below the score/status chart row.
- Supervising Pastor review content was still presented as private comments:
  - Root cause: the app already stored the text in `PastorReview.comments`, but the UI labels still called it `Comments`, the form text said it was private/not visible to HOSTs, and HOD/Supervising Pastor report detail pages were not passing submitted pastor review data into `ReportDetail`.
  - Fix: reused the existing field without changing schema, relabeled it as `Review`, changed the visibility text to `Visible to HOSTs`, updated the requested placeholder, relabeled Committee review copy to `Review`, and loaded submitted Supervising Pastor reviews into HOD and Supervising Pastor report detail pages.
- Supervising Pastor review Section A still had old HOST summary wording:
  - Root cause: the earlier review-form update did not include the two later diff comments for the Section A HOST label and attendance summary.
  - Fix: changed `Name of Head of Service Team` to `HOSTs Name` and removed `Present`/`Absent` from the review form Report Summary.
- Supervising Pastor review Section C visibility copy needed the full audience:
  - Root cause: the previous wording only said `Visible to HOSTs`.
  - Fix: changed it to `Visible to Pastor, committee & HOSTs`.

## 8. What Is Complete

- Admin dashboard visual restyle and order change.
- Role label display updates across many UI surfaces.
- New `PASTOR` role added to schema and role system.
- Admin user role filters include `All`, `Admin`, `Pastor`, `Committee`, `Supervising Pastor`, `HOSTs`.
- User create/edit API validation accepts `PASTOR`.
- `PASTOR` uses Committee-style `/head` nav and read-only pages.
- TypeScript, lint, build, and Prisma validation were run and passed.
- Current `/admin/users` route returns HTTP 200.
- This handoff file was created.
- Latest supplied logo was applied to `public/images/logo.png`.
- Previous logo was backed up to `public/images/logo.backup-20260516-before-new-logo.png`.
- Login preview logo rendering was fixed by excluding `/images/*` from `proxy.ts`.
- Verified `/images/logo.png` returns `image/png` and the Next optimized image URL returns `image/png`.
- HOD dashboard `MY REPORTS` table now has `TEAM`, `PERIOD`, `STATUS`, `VIEW`.
- HOD dashboard row `View` actions open the existing read-only report detail page.
- HOD dashboard status displays `Reviewed` when a submitted Committee review exists.
- Supervising Pastor `TEAM REPORTS` now shows reports from assigned HOSTs only.
- Supervising Pastor `MY SERVICE TEAMS` now shows service teams belonging to assigned HOSTs, avoiding duplicate team rows by querying unique service teams.
- Supervising Pastor analytics now shows assigned-team data instead of zeros/blanks. Browser verification showed `My Teams 3`, `Submitted This Month 1`, `Avg Score 3.85`, and `Pending Reviews 1` on `/pastor/analytics`.
- Activity panels were removed from non-admin dashboards (`/pastor`, `/hod`, `/head`); admin Activity remains available.
- HOD Save Draft now persists and restores assistant fields, remarks, team/period, and member grading rows.
- HOD draft Edit links now reopen the selected draft instead of blank `/hod/report`.
- Manual browser verification created a local test report for December 2028, saved it as draft, restored it through `/hod/reports` Edit, saved again without duplicate rows, and submitted the same report successfully.
- SMTP Test no longer returns HTTP 500 for expected SMTP provider failures. Authenticated endpoint verification returned HTTP 200 with:
  - `success: false`
  - `code: "EENVELOPE"`
  - safe message: `SMTP test failed: Can't send mail - all recipients were rejected: 553 5.7.1 <re***s@summitdata.one>: Sender address rejected: not owned by user [redacted]`
- Supervising Pastor dashboard now includes the latest-report member performance table after `TEAM REPORTS`.
- Latest verification for the Supervising Pastor dashboard table change:
  - `npx tsc --noEmit --pretty false` passed.
  - `npm run lint -- "app/(dashboard)/pastor/page.tsx"` passed.
  - `npm run build` passed.
  - `npx prisma validate` passed.
  - Browser verification of `/pastor` could not visually confirm the Supervising Pastor view because the active in-app browser session is logged in as an HOD and shows the HOD dashboard for `/pastor`.
- Supervising Pastor dashboard member performance now includes all non-draft HOST-submitted reports, not just the latest report. Browser verification of `/pastor` showed:
  - `MEMBER PERFORMANCE - SUBMITTED REPORTS`
  - submitted report rows such as December 2028 `Submitted`
  - reviewed report rows such as May 2026 `Supervising Pastor Reviewed`
  - period and status columns visible in the member performance table
- Latest verification after expanding the table:
  - `npx tsc --noEmit --pretty false` passed.
  - `npm run lint -- "app/(dashboard)/pastor/page.tsx"` passed.
  - `npm run build` passed.
  - `npx prisma validate` passed.
- Supervising Pastor analytics now uses all non-draft HOST-submitted reports for summary and team average scores. Browser verification of `/pastor/analytics` showed:
  - `SUBMITTED REPORTS` stat with count `2`
  - `AVG SCORE` updated to `4.08`
  - `TEAM AVERAGE SCORES - SUBMITTED REPORTS`
  - status chart including both `Submitted` and `Supervising Pastor Reviewed`
- Latest verification after expanding Pastor analytics:
  - `npx tsc --noEmit --pretty false` passed.
  - `npm run lint -- "app/(dashboard)/pastor/analytics/page.tsx" "components/analytics/PastorAnalyticsClient.tsx"` passed.
  - `npm run build` passed.
  - `npx prisma validate` passed.
- Supervising Pastor dashboard member performance UI now matches the HOSTs table more closely by removing `Status`. Browser verification of `/pastor` showed:
  - `MEMBER PERFORMANCE`
  - columns `NAME`, `TEAM`, `PERIOD`, `GEN. ATTITUDE`, `TEAMWORK`, `PUNCTUALITY`, `APPEARANCE`, `ATTENDANCE`, `AVG`
  - no `STATUS` header in the member performance table
- Latest verification after removing the member performance `Status` column:
  - `npx tsc --noEmit --pretty false` passed.
  - `npm run lint -- "app/(dashboard)/pastor/page.tsx"` passed.
  - `npm run build` passed.
  - `npx prisma validate` passed.
- Supervising Pastor dashboard member performance now mirrors the HOSTs table. Browser verification of `/pastor` showed:
  - `MEMBER PERFORMANCE`
  - columns `NAME`, `TEAM`, `GEN. ATTITUDE`, `TEAMWORK`, `PUNCTUALITY`, `APPEARANCE`, `ATTENDANCE`, `AVG`
  - no `STATUS` header
  - no `PERIOD` header
  - rows only from the latest non-draft HOST-submitted report
- Latest verification after correcting the member performance table to HOSTs behavior:
  - `npx tsc --noEmit --pretty false` passed.
  - `npm run lint -- "app/(dashboard)/pastor/page.tsx"` passed.
  - `npm run build` passed.
  - `npx prisma validate` passed.
- Supervising Pastor dashboard member performance now matches the HOSTs analytics grading values for the same latest in-window HOST report. Browser verification of `/pastor` showed:
  - `Moses Lafia` grades `4`, `3`, `5`, `4`, `3`, avg `3.80`
  - `Marke Donjo` grades `2`, `4`, `4`, `2`, `5`, avg `3.40`
  - no December 2028 test grading in the member performance section
- Latest verification after aligning latest-report selection with HOSTs analytics:
  - `npx tsc --noEmit --pretty false` passed.
  - `npm run lint -- "app/(dashboard)/pastor/page.tsx"` passed.
  - `npm run build` passed.
  - `npx prisma validate` passed.
- Supervising Pastor analytics now places `TEAM AVERAGE SCORES - SUBMITTED REPORTS` and `SUBMISSION STATUS — MY TEAMS` side by side. Browser verification measured both cards on the same row.
- Latest verification after Pastor analytics layout update:
  - `npx tsc --noEmit --pretty false` passed.
  - `npm run lint -- "components/analytics/PastorAnalyticsClient.tsx"` passed.
  - `npm run build` passed.
  - `npx prisma validate` passed.
- Supervising Pastor analytics no longer shows `SCORE TREND — 6 MONTHS`. Browser verification found only these chart headings:
  - `TEAM AVERAGE SCORES - SUBMITTED REPORTS`
  - `SUBMISSION STATUS — MY TEAMS`
  - `TOP MEMBERS — MY TEAMS`
- Latest verification after removing Pastor analytics Score Trend:
  - `npx tsc --noEmit --pretty false` passed.
  - `npm run lint -- "components/analytics/PastorAnalyticsClient.tsx"` passed.
  - `npm run build` passed.
  - `npx prisma validate` passed.
- Supervising Pastor review entry/display copy now uses `Review` and is no longer described as private. Browser verification of `/pastor/review?reportId=cmp9ln8g90009ckvvv665qejj` confirmed:
  - `SECTION C` includes `REVIEW BY SUPERVISING PASTOR`
  - `Visible to HOSTs`
  - placeholder `Your Review on this HOSTs Performance`
  - old `COMMENTS BY SUPERVISING PASTOR` and `Private/not visible` text no longer appears on that form
- Submitted Supervising Pastor review content is now visible through shared report detail surfaces for HOD and Supervising Pastor report detail pages.
- Latest verification after the review visibility update:
  - `npx tsc --noEmit --pretty false` passed.
  - targeted `npm run lint -- ...` passed with one existing React Hook Form `watch()` compiler warning in `components/pastor/ReviewForm.tsx`.
  - full `npm run lint` passed with 16 existing warnings and 0 errors.
  - `npm run build` passed.
  - `npx prisma validate` passed.
- Supervising Pastor review Section A follow-up is complete. Browser verification of `/pastor/review?reportId=cmp9ln8g90009ckvvv665qejj` confirmed:
  - `HOSTs Name` appears.
  - `Name of Head of Service Team` no longer appears.
  - `Present` and `Absent` no longer appear in the form summary.
  - The visible summary includes `Enrolled` and `Avg Score`.
- Latest verification after the review Section A follow-up:
  - `npx tsc --noEmit --pretty false` passed.
  - `npm run lint -- "components/pastor/ReviewForm.tsx"` passed with the existing React Hook Form `watch()` compiler warning and 0 errors.
- Supervising Pastor review visibility copy follow-up is complete. Browser verification of `/pastor/review?reportId=cmp9ln8g90009ckvvv665qejj` confirmed:
  - `Visible to Pastor, committee & HOSTs` appears.
  - `Visible to HOSTs` no longer appears.
- Latest verification after the visibility copy follow-up:
  - `npx tsc --noEmit --pretty false` passed.
  - `npm run lint -- "components/pastor/ReviewForm.tsx"` passed with the existing React Hook Form `watch()` compiler warning and 0 errors.
- HOD report form Section B-G restructure is complete. Browser verification of `/hod/report` confirmed:
  - Step 1 renders `SECTION B: GOALS FOR THE MONTH`, `SECTION C: CHALLENGES FOR THE MONTH (IF ANY)`, `SECTION D: WHAT ARE YOUR GOALS FOR NEXT MONTH?`, and `SECTION E: WHAT ARE YOUR SERVICE TEAM'S NEEDS FOR NEXT MONTH?`.
  - First-step validation blocks Next when Section A team is missing.
  - With valid first-step data and an open report period, Next advances to `SECTION F: SERVICE TEAM MEMBERS PERFORMANCE ASSESSMENT` and `SECTION G: COMMENTS BY SERVICE TEAM LEADER`.
  - `Add Member` appears under Section F.
  - Section A and the new sections now use a wider desktop content width to better match the provided desktop sample.
- The local MySQL `hod_reports` table was updated with the new report columns:
  - `goalsForMonth`, `challengesForMonth`, `goalsNextMonth`, `serviceTeamNeeds`, `budget`, `budgetFinancing`, `serviceTeamLeaderComments`, `confirmation`, `signature`, `confirmationDate`, `currentStep`, `naExplanation`.
- Latest verification after the report form restructure and responsive width fix:
  - `npx tsc --noEmit --pretty false` passed.
  - `npx prisma validate` passed.
  - `npx prisma generate` passed.
  - `npm run lint` passed with warnings only.
  - `npm run lint -- --quiet` passed.
  - `npm run build` passed.

### Latest Committee Review Action Update

- `app/(dashboard)/head/page.tsx`
  - Added an `Action` column to `ALL SUBMISSIONS`.
  - Each submission now has a red `Review` button linking to `/head/reports/[id]`.
- `app/(dashboard)/head/reports/[id]/page.tsx`
  - Restored the inline Committee review workflow below the report detail for users with `HEAD_OF_SUPERVISOR`.
  - The page now passes the report summary, Supervising Pastor review summary, and any existing Committee draft/submitted review into `HeadReviewForm`.
- `components/head/HeadReviewForm.tsx`
  - Refreshes the route after a submitted Committee review so the report detail can show the submitted review data.
- `app/(dashboard)/hod/reports/[id]/page.tsx`
  - Loads submitted Committee review data and displays it to HOSTs while keeping the Supervising Pastor grading assessment hidden on the HOST side.
- `app/(dashboard)/pastor/reports/[id]/page.tsx`
  - Loads submitted Committee review data and displays it to the Supervising Pastor in report detail.
- Verification:
  - `npx tsc --noEmit --pretty false` passed.
  - `npm run lint -- --quiet "app/(dashboard)/head/page.tsx" "app/(dashboard)/head/reports/[id]/page.tsx" "app/(dashboard)/hod/reports/[id]/page.tsx" "app/(dashboard)/pastor/reports/[id]/page.tsx" "components/head/HeadReviewForm.tsx"` passed.
  - Browser verification confirmed `/head` renders `Review` links and `/head/reports/cmpcpbv9p0005i8vv7ki1jiq6` renders the report plus the Committee review form.

### Latest Committee Review Form Trim

- `components/head/HeadReviewForm.tsx`
  - Kept `SECTION A — REPORT REFERENCE`.
  - Removed the Committee form `SECTION B — SUPERVISING PASTOR REVIEW` and `SECTION D — CONFIRMATION` sections.
  - Kept `SECTION C — REVIEW` as the only editable review form section.
  - Submit/save still sends required backend payload values by filling removed confirmation/signature fields internally.
- Verification:
  - `npx tsc --noEmit --pretty false` passed.
  - `npm run lint -- --quiet "components/head/HeadReviewForm.tsx"` passed.
  - Browser verification confirmed the Committee form page shows `SECTION A — REPORT REFERENCE` and `SECTION C — REVIEW`, with no `SECTION B` or `SECTION D`.

### Latest Present/Absent Removal

- Removed `Present` and `Absent` from report UI surfaces:
  - Shared report detail header summary.
  - Committee review form report summary.
  - HOST reports list table.
  - Pastor review and Committee review report summary types/payloads.
  - Admin report client type.
  - Backup report summary export.
- Removed `totalMembersPresent` / `totalMembersAbsent` from report API payload handling and hardcoded save data.
- Left old optional Prisma columns in place to avoid a destructive DB migration; the app no longer displays or uses them.
- Verification:
  - `npx tsc --noEmit --pretty false` passed.
  - Targeted `npm run lint -- --quiet ...` passed for touched files.
  - Browser verification confirmed the Committee report page no longer contains `Present` or `Absent` labels.

### Latest Committee Review Section C Cleanup

- `components/head/HeadReviewForm.tsx`
  - Removed the `Supervising Pastor Assessment` input/dropdown block from `SECTION C — REVIEW`.
  - Kept the review textarea and Save Draft / Submit Review actions.
- Verification:
  - `npx tsc --noEmit --pretty false` passed.
  - `npm run lint -- --quiet "components/head/HeadReviewForm.tsx"` passed.
  - Browser verification confirmed the Committee detail page still renders `SECTION C — REVIEW` and no longer includes the assessment block.

### Latest Admin Service Teams Menu/Table

- `lib/nav-config.ts`
  - Added `Service Teams` to the Admin `Management` sidebar section, linking to `/admin/teams`.
- `app/(dashboard)/admin/teams/page.tsx`
  - Added submitted report counts per service team.
- `components/admin/TeamsClient.tsx`
  - Restored the previous richer Service Teams display: stat cards, `Team Name`, `HOSTs`, `Supervising Pastor`, `Members`, `Last Report`, `Status`, and `Actions`.
  - Kept `Add Team` visible at the top of the table.
  - Restored `Edit` and `Deactivate` actions.
- Verification:
  - `npx tsc --noEmit --pretty false` passed.
  - Targeted lint passed for Admin Service Teams files.
  - Browser verification confirmed `/admin/teams` shows the restored previous Team display, Add Team, Edit, and Deactivate.

### Latest Excel Reports Export Update

- `app/api/backup/reports/route.ts`
  - The Excel export now includes Committee review data in the same workbook.
  - Renamed/enriched the Supervising Pastor review sheet to `Supervising Pastor Reviews`.
  - Added a new `Committee Reviews` sheet with reviewer, review text, supervising pastor reviewed, performance grade, signature, review date, and submitted date.
- Verification:
  - `npx tsc --noEmit --pretty false` passed.
  - `npm run lint -- --quiet "app/api/backup/reports/route.ts"` passed.

## 8.1 Backup & Restore Full Report CSV Import Update

- `app/api/backup/reports-csv/route.ts`
  - Added/finished admin-only CSV template download and CSV import support for full reports.
  - Template now supports report header data, up to five monthly goals, challenges, next-month goals, service-team needs, budget fields, HOST leader comments/signature, member grading rows, Supervising Pastor review fields, and Committee review fields.
  - Import groups rows by Team + HOSTs + Month + Year, so one report can contain multiple member-grade rows.
  - Existing reports are updated by the report uniqueness key; new reports are created when no match exists.
  - Imported member rows are linked to the service team and written as report member grades.
  - Supervising Pastor and Committee reviews are imported into their existing review tables when the matching review columns are present.
- `components/admin/BackupClient.tsx`
  - Added `REPORTS CSV IMPORT` card to `/admin/backup`.
  - Added CSV template download button, CSV file picker, import action, and import result summary.
- Verification:
  - `npx tsc --noEmit --pretty false` passed.
  - `npm run lint -- components/admin/BackupClient.tsx app/api/backup/reports-csv/route.ts` passed.
  - `npm run build` passed after allowing Next.js to fetch Google font assets during build.

## 9. What Is Not Complete

- The DB has not been updated with `PASTOR` enum via `prisma db push` or migration.
- `npx prisma db push --accept-data-loss` was attempted for the report-form schema update, but Prisma tried to drop/recreate existing MySQL FK indexes and failed on `Cannot drop index 'head_reviews_headProfileId_fkey': needed in a foreign key constraint`. To avoid unrelated destructive FK/index churn, only the additive `hod_reports` columns were applied directly with a guarded `mysql2` script.
- No git commit has been created.
- Many modified/untracked files remain in the working tree.
- Some lint warnings remain, but no lint errors.

## 10. Exact Next Steps For The Next Codex Session

1. Read this file first.
2. For HOD dashboard follow-up, verify `/hod` still shows `TEAM`, `PERIOD`, `STATUS`, `VIEW`, and that `View` opens `/hod/reports/[id]` without edit controls.
3. For Supervising Pastor follow-up, log in as a Supervising Pastor with assigned HOSTs and verify `/pastor`, `/pastor/reports`, `/pastor/teams`, `/pastor/reports/[id]`, and `/pastor/review?reportId=...` all show only reports/teams from HOSTs whose `supervisorId` matches that pastor profile.
4. For the latest Supervising Pastor dashboard table follow-up, log in as a Supervising Pastor and verify `/pastor` shows `MEMBER PERFORMANCE` immediately after `TEAM REPORTS`, matching the HOSTs latest-report member grading table: no `Status` column, no `Period` column, and only grading rows from the latest non-draft HOST-submitted report inside the same rolling 12-month analytics window used by `/hod/analytics`.
5. For the latest Supervising Pastor analytics follow-up, verify `/pastor/analytics` shows `Submitted Reports` and `TEAM AVERAGE SCORES - SUBMITTED REPORTS`, that reviewed statuses still count anywhere non-draft HOST-submitted report data is expected, that `TEAM AVERAGE SCORES - SUBMITTED REPORTS` sits beside `SUBMISSION STATUS — MY TEAMS` on desktop, and that `SCORE TREND — 6 MONTHS` is not rendered.
6. For the latest review visibility follow-up, verify as each role that submitted Supervising Pastor review text appears under report details as `Review` for Admin, HOD/HOSTs, Committee, and Supervising Pastor. The implementation intentionally reuses `PastorReview.comments`; no DB schema change was made.
7. For HOD draft follow-up, use a real draft from `/hod/reports`, click Edit, and confirm `/hod/report?teamId=...&month=...&year=...` restores all saved fields and grades. Note: manual verification submitted a local December 2028 test report for one HOD team.
8. For the latest HOD report form follow-up, verify a full save-draft/edit-submit cycle using the new two-step form:
   - Step 1 Sections B-E save/reload dynamic goals, challenges, next-month goals, needs, budget, and budget financing.
   - Step 2 Section F preserves member grades and Add Member inserts a new missing member into the assessment list.
   - N/A explanation stays hidden unless at least one grade is `N/A`.
   - Section G comments/confirmation/signature/date save and display on report detail pages.
9. If further UI work is requested, check/adjust logo display only if needed:
   - `components/ui/Sidebar.tsx`
   - `app/(auth)/login/page.tsx`
10. For SMTP follow-up, update SMTP settings so the From Display address belongs to the authenticated SMTP mailbox, or change the SMTP username/password to match the From mailbox. Keep `smtp.hostinger.com`, port `465`, `secure: true` for Hostinger SSL unless the provider gives different mailbox-specific settings.
11. Re-run:
   ```powershell
   npx tsc --noEmit --pretty false
   npm run lint
   npm run build
   npx prisma validate
   ```
12. If user wants the new `PASTOR` role usable in the live DB, ask before running:
   ```powershell
   npx prisma db push
   ```
13. Review `git status --short` before any commit because there are many pre-existing changes.
14. If committing, decide whether to commit all changes together or split into logical commits.

## 11. Git Status Summary

Current `git status --short` summary:

- 58 tracked files modified.
- Untracked:
  - `.claude/`
  - `PROJECT-MEMORY.txt`
  - `components/ui/DashboardShell.tsx`
  - `public/images/`
  - `PROJECT_STATUS_AND_HANDOFF.md`

Current `git diff --stat` summary:

- 58 tracked files changed.
- 1207 insertions.
- 658 deletions.
- Main diff areas: dashboard UI, roles/nav/auth, admin users/settings/reports, head/pastor/hod report labels, APIs, Prisma schema/seed.

No commit has been created in this session.

## 12. Warnings About Uncommitted Or Pre-Existing Changes

- The working tree is dirty and includes changes from multiple prior tasks/sessions.
- Do not run destructive commands such as `git reset --hard` or `git checkout --` unless the user explicitly requests it.
- Do not assume every modified file was changed by the current session.
- `public/images/` is untracked; current `logo.png` may not be committed yet.
- `components/ui/DashboardShell.tsx` is untracked but required by `app/(dashboard)/layout.tsx`.
- The `PASTOR` enum exists in `schema.prisma`, but the live database may not know about it until `npx prisma db push` or a migration is run.
- `npm run lint` passes but emits warnings; do not treat warnings as blocking unless user asks to clean them.
- `git diff --stat` emits CRLF/LF warnings on many files; avoid unrelated formatting churn.
