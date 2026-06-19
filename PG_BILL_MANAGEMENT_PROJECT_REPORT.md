# PG Bill Management App - Complete Project Report

Last updated: 2026-06-19
Project folder: `/Users/guhan/Documents/Codex/2026-05-22/so-i-have-an-idea-you`
GitHub repository: `https://github.com/guhanshadowstar-commits/Pg-bill-management.git`

## 1. Project Goal

Build a PG Electricity Bill Management System that calculates electricity bills fairly based on actual tenant stay days, not equal sharing.

Core formula:

```text
Individual Bill = (Days Stayed / Total Person-Days) x Total Electricity Bill
```

Example:

```text
Room bill: Rs. 4000
Arun: 30 days
Ravi: 30 days
Kiran: 15 days
Ajay: 10 days
Total person-days = 85
Arun payable = (30 / 85) x 4000
```

## 2. What Has Been Built

### Main Web App

- Next.js app with Tailwind CSS.
- Dashboard.
- Room management.
- Tenant management.
- Occupancy logs.
- Electricity bill calculation.
- Bill split saving.
- Payment tracking.
- History page for previous stays.
- AI Help page.
- Embedded user manual.
- Light/dark theme toggle.
- PG owner login/signup.
- Multiple owner separation using `owner_id`.
- Supabase live database support.
- Local JSON fallback for local/offline mode.
- n8n workflow scaffold for future reminders.

### Owner Login System

Owner accounts are created from the app login screen.

Important:

- Owners do not need to be manually added in Vercel.
- Each owner account receives a private `owner_id`.
- Rooms, tenants, occupancy logs, bills, bill splits, payments, dashboard data, and history are filtered by `owner_id`.
- Owner A should not see Owner B's PG data.
- `PG_OWNER_ACCOUNTS` is only an optional emergency fallback.

### Latest Active Tenant Dashboard Fix

The dashboard Active Tenants logic has been changed.

Old behavior:

- Dashboard counted only current occupancy logs.
- If tenants existed but occupancy logs were not created correctly, dashboard showed `0`.

New behavior:

- If occupancy logs exist, dashboard counts tenants whose occupancy is active today.
- If no occupancy logs exist yet, dashboard counts saved tenants for that owner instead of showing `0`.

Changed file:

```text
app/api/dashboard/route.ts
```

## 3. Current Git Status

Latest pushed commit before latest dashboard change:

```text
03d44b2 Fix active tenant dashboard count
```

Recent commit history checked:

```text
03d44b2 Fix active tenant dashboard count
a16a6b1 Use Supabase Auth for owner signup fallback
c10e2f1 add owner signup and private data isolation
7910b74 final clean pg bill app
0e40191 deploy full pg bill app
```

Git remote:

```text
origin https://github.com/guhanshadowstar-commits/Pg-bill-management.git
```

Important:

- After this report and latest dashboard-count code change, you must commit and push again to make the newest change live.
- Vercel deploys only after GitHub receives the latest commit.

## 4. Main Folder Structure

```text
app/
  Main Next.js app pages and API routes.

components/
  Reusable UI and auth components.

lib/
  Billing logic, database helpers, owner auth, owner scoping, AI helpers.

data/
  Local fallback JSON database.

supabase/
  SQL schema and setup scripts.

n8n/
  Future workflow/reminder setup files.
```

## 5. Important Files and Purpose

### App Pages

```text
app/page.tsx
```

Dashboard page. Shows total rooms, active tenants, monthly revenue, pending payments, recent bills, and calculation explanation.

```text
app/rooms/page.tsx
```

Room management UI. Used to add and view PG rooms.

```text
app/tenants/page.tsx
```

Tenant management and occupancy assignment UI. This is where tenants are added and assigned to rooms with check-in/check-out dates.

```text
app/bills/page.tsx
```

Bill generation UI. Admin enters room, month, and total EB bill amount. App calculates individual splits.

```text
app/history/page.tsx
```

History page for past occupancy. Useful for incomers/outgoers and previous stays.

```text
app/ai/page.tsx
```

AI Help page for app usage doubts and guidance.

```text
app/manual/page.tsx
```

Embedded user manual inside the app.

```text
app/auth/login/page.tsx
```

Owner login/signup page.

```text
app/layout.tsx
```

Main layout, navigation, theme toggle, logout button.

```text
app/globals.css
```

Global styling.

### API Routes

```text
app/api/dashboard/route.ts
```

Dashboard data API. Counts rooms, active tenants, pending payments, revenue, recent bills.

Latest change:

```ts
const activeTenants = occupancyRows.length > 0 ? activeOccupancyTenants : tenantsRes.count || 0;
```

This prevents active tenants from showing `0` when tenants exist but no occupancy logs are present.

```text
app/api/rooms/route.ts
app/api/rooms/[id]/route.ts
```

Room create/read/update logic.

```text
app/api/tenants/route.ts
app/api/tenants/[id]/route.ts
```

Tenant create/read/update logic.

```text
app/api/occupancy/route.ts
app/api/occupancy/[id]/route.ts
```

Occupancy assignment and checkout logic.

```text
app/api/bills/route.ts
app/api/bills/calculate/route.ts
app/api/bills/pdf/route.ts
```

Bill saving, bill calculation, and PDF-ready bill logic.

```text
app/api/payments/route.ts
```

Payment status and payment record handling.

```text
app/api/history/route.ts
```

History data for past stays.

```text
app/api/auth/signup/route.ts
app/api/auth/login/route.ts
app/api/auth/logout/route.ts
```

Owner signup/login/logout.

Signup/login behavior:

- First tries custom `owner_accounts` table if available.
- If that table is missing, falls back to Supabase Auth.
- This avoids manual account creation.

```text
app/api/ai/parse/route.ts
app/api/ai/help/route.ts
```

AI parser and help assistant APIs.

```text
app/api/notifications/pending-bills/route.ts
```

Pending bill notification data for future WhatsApp/SMS/n8n use.

### Components

```text
components/auth/logout-button.tsx
```

Logout button.

```text
components/dashboard/stat-card.tsx
```

Dashboard stat card.

```text
components/ui/button.tsx
components/ui/card.tsx
components/ui/input.tsx
components/ui/select.tsx
components/ui/theme-toggle.tsx
```

Reusable UI components.

### Library Files

```text
lib/billing.ts
```

Core EB bill calculation logic.

Main formula:

```text
individual_amount = (days_stayed / total_person_days) x total_bill
```

Handles:

- Month boundaries.
- Mid-month joining.
- Early checkout.
- Empty beds not being charged.
- Per-person-day cost.

```text
lib/ai-parser.ts
```

Parses natural language occupancy descriptions.

```text
lib/help-assistant.ts
```

Built-in AI/help assistant fallback guidance.

```text
lib/db.ts
```

Local JSON database read/write helper.

```text
lib/supabase-admin.ts
```

Supabase admin client helper.

```text
lib/owner-auth.ts
```

Owner session, password hashing, fallback login, cookie/session logic.

```text
lib/owner-scope.ts
```

Owner isolation helper. Makes sure data is scoped by the logged-in owner.

```text
lib/types.ts
```

Main TypeScript types for rooms, tenants, occupancy logs, bills, bill splits, payments, owner accounts.

```text
lib/utils.ts
```

General utility helpers.

### Database Files

```text
supabase/schema.sql
```

Creates/updates Supabase tables:

- `owner_accounts`
- `rooms`
- `tenants`
- `occupancy_logs`
- `electricity_bills`
- `bill_splits`
- `payments`

Also adds `owner_id` columns and indexes.

```text
supabase/seed.sql
```

No demo data is inserted. This was intentionally kept empty/comment-only because you asked for no predetermined/demo data.

```text
supabase/transfer-existing-data-to-owner.sql
```

Optional helper to move old data from default owner to a created owner account.

### Local Data

```text
data/db.json
```

Local fallback database for offline/local mode.

### n8n Files

```text
n8n/docker-compose.yml
n8n/workflows/bill-reminder-workflow.json
```

Prepared for future reminder automation. Not required for the current core app to work.

## 6. Dependencies Installed

From `package.json`:

```json
{
  "@supabase/supabase-js": "^2.49.8",
  "clsx": "^2.1.1",
  "date-fns": "^4.1.0",
  "lucide-react": "^0.511",
  "next": "^16.2.6",
  "openai": "^4.104.0",
  "react": "^19.1.0",
  "react-dom": "^19.1.0",
  "tailwind-merge": "^3.3.0"
}
```

Dev dependencies:

```json
{
  "@types/node": "^22.15.29",
  "@types/react": "^19.1.6",
  "@types/react-dom": "^19.1.5",
  "autoprefixer": "^10.4.21",
  "postcss": "^8.5.4",
  "tailwindcss": "^3.4.17",
  "typescript": "^5.8.3"
}
```

## 7. Environment Variables

From `.env.example`:

```text
NEXT_PUBLIC_SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
PG_OWNER_ACCOUNTS=
PG_OWNER_USERNAME=owner
PG_OWNER_PASSWORD=
OWNER_SESSION_SECRET=
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4.1-mini
PG_NAME=Royal Stay PG
PG_LOGO_URL=
```

Required for live Vercel/Supabase mode:

```text
NEXT_PUBLIC_SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
OWNER_SESSION_SECRET
```

Optional:

```text
OPENAI_API_KEY
OPENAI_MODEL
PG_OWNER_ACCOUNTS
PG_OWNER_USERNAME
PG_OWNER_PASSWORD
PG_NAME
PG_LOGO_URL
```

Important:

- Owner accounts are created inside the app.
- `PG_OWNER_ACCOUNTS` is not needed for normal usage.
- `OWNER_SESSION_SECRET` is not an account. It only secures login sessions.
- Never expose `SUPABASE_SERVICE_ROLE_KEY` publicly.

## 8. Supabase Setup Summary

Project URL used earlier:

```text
https://stdeeslkqavtkoiijylt.supabase.co/
```

Supabase must contain the app tables. Run:

```text
supabase/schema.sql
```

Do not paste JSON into SQL Editor.

Do not run demo insert data if you want the app empty.

## 9. Vercel / Live Deployment Summary

Vercel deploys from GitHub.

Flow:

```text
Local code -> GitHub Desktop Push origin -> GitHub -> Vercel auto deployment -> Live app
```

If the live site does not show latest changes:

1. Check GitHub Desktop has pushed latest commit.
2. Open Vercel project.
3. Go to Deployments.
4. Confirm newest commit is deployed.
5. Visit latest deployment URL.
6. Refresh browser.

## 10. GitHub Desktop Steps After Code Changes

Whenever code is changed:

1. Open GitHub Desktop.
2. Select repository `Pg-bill-management`.
3. If files are changed, enter a short summary.
4. Click `Commit to main`.
5. Click `Push origin`.
6. Open Vercel and wait for deployment.

## 11. Files Accessed During This Work

Main files inspected or changed:

```text
app/api/dashboard/route.ts
app/api/auth/signup/route.ts
app/api/auth/login/route.ts
app/auth/login/page.tsx
app/manual/page.tsx
app/page.tsx
app/tenants/page.tsx
app/api/tenants/route.ts
lib/owner-auth.ts
lib/owner-scope.ts
lib/supabase-admin.ts
lib/types.ts
README.md
.env.example
supabase/schema.sql
supabase/seed.sql
package.json
```

Generated/maintained report file:

```text
PG_BILL_MANAGEMENT_PROJECT_REPORT.md
```

Build output folder created by Next.js:

```text
.next/
```

Installed package folder:

```text
node_modules/
```

## 12. Files Downloaded / Installed

No separate manual files were downloaded by me during the latest fixes.

Installed/generated project dependencies exist in:

```text
node_modules/
```

Build artifacts exist in:

```text
.next/
```

Previous zip artifacts may exist in the folder from earlier packaging work:

```text
pg-bill-management-app.zip
pg-electricity-bill-manager-complete.zip
pg-electricity-bill-manager-refined-live.zip
```

These zip files are not required for Vercel deployment if GitHub is connected.

## 13. Current App Capabilities

The app can:

- Create PG owner accounts from the app.
- Login/logout PG owners.
- Keep each owner data separate.
- Add rooms.
- Add tenants.
- Assign tenants to rooms.
- Record check-in and check-out dates.
- Calculate fair EB bill splits by actual stay days.
- Save bills.
- Track pending/paid payment status.
- Show dashboard stats.
- Show history.
- Provide AI/help guidance.
- Work with Supabase live database.
- Fall back to local JSON when Supabase env variables are missing.

## 14. Active Tenant Count Rule

Dashboard Active Tenants now works like this:

```text
If occupancy logs exist:
  Count unique tenants where check_in <= today and check_out is empty or check_out >= today.

If no occupancy logs exist:
  Count saved tenants for that owner.
```

This was changed because you reported dashboard active tenants showing `0` even when tenants exist.

## 15. Pending Tasks

Important pending items:

- Push the latest dashboard active-tenant fix to GitHub.
- Let Vercel deploy the latest commit.
- Test dashboard after deployment.
- Clean duplicate Vercel projects later.
- Add custom domain if needed.
- Add password reset.
- Add email verification.
- Add stronger rate limiting.
- Add full Supabase Row Level Security policies later.
- Add WhatsApp/SMS sending integration.
- Add automatic reminders.
- Package as mobile app later using Capacitor or React Native.
- Prepare Play Store / App Store accounts and assets.

## 16. Next Immediate Steps

After this report is saved and latest code is committed:

1. Commit latest changes.
2. Push to GitHub from GitHub Desktop if terminal push is unavailable.
3. Wait for Vercel deployment.
4. Open live app.
5. Login as owner.
6. Check dashboard Active Tenants.

