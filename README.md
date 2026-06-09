# PG Electricity Bill Management System

Professional PG electricity split manager with AI-assisted occupancy parsing and fair per-day billing.

## Core Formula
`individual_amount = (days_stayed / total_person_days) * total_bill`

## Current Build Status
- Production build: passing
- Type checks: passing
- Refined for live deployment with **Supabase live mode**
- Local fallback mode retained for offline usage

## What Was Refined
1. Added **live-safe database mode**:
- If Supabase env keys exist, APIs use Supabase (persistent, Vercel-safe).
- If keys do not exist, app falls back to local JSON (`data/db.json`) for offline/local demo.

2. Added stronger API validation:
- Required fields and numeric constraints on room creation, billing, and payments.
- Clean HTTP error responses for missing/invalid payloads.

3. Fixed production deployment risk:
- Previous file-write-only mode would fail persistence in serverless environments.
- Live mode now writes to Supabase tables.

4. Added Supabase admin helper and safer env model:
- `lib/supabase-admin.ts`
- Environment docs in `.env.example`

5. Build hygiene improvements:
- Updated Next.js tracing config in `next.config.mjs`

6. Added history-safe tenant flow:
- Normal tenant exit now updates `check_out` instead of deleting the occupancy row.
- New `/history` page shows incomers, outgoers, active stays, and checked-out stays for the last 3 years.

7. Added AI help assistant:
- New `/ai` page answers app usage doubts: bill calculation, tenant entry, checkout, payments, and database mode.
- Uses `OPENAI_API_KEY` if available, otherwise a built-in help fallback works locally.

8. Added embedded user manual:
- New `/manual` page explains every major action inside the app.

9. Added PG owner login and signup:
- Owner-only login protects pages and API routes.
- Owners can create accounts directly from the app login screen.
- `PG_OWNER_ACCOUNTS` is optional and kept only as an emergency fallback.
- Each logged-in owner has isolated rooms, tenants, occupancy logs, bills, bill splits, payments, dashboard totals, history, and pending reminders.

## Run Locally
```bash
npm install
npm run dev
```
Open `http://localhost:3000`

## Make It Live (Vercel + Supabase)

### 1) Create Supabase project
- In Supabase SQL Editor, run:
  - `supabase/schema.sql`
  - `supabase/seed.sql`
- If you entered real data before owner isolation and want that old data under a specific login username, edit and run:
  - `supabase/transfer-existing-data-to-owner.sql`

### 2) Set Vercel Environment Variables
In your Vercel project settings, add:
- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `OWNER_SESSION_SECRET` (recommended random long secret)
- `PG_OWNER_ACCOUNTS` (optional emergency fallback, example: `admin=StrongPassword1`; avoid commas inside passwords)
- `PG_OWNER_USERNAME` (optional one-owner emergency fallback)
- `PG_OWNER_PASSWORD` (optional one-owner emergency fallback)
- `OPENAI_API_KEY` (optional)
- `OPENAI_MODEL` (optional, default `gpt-4.1-mini`)

### 3) Deploy
- Push this project to GitHub
- Import repo into Vercel
- Deploy

## Important Notes
- For real production, use Supabase mode (do not rely on `data/db.json` persistence on serverless).
- AI parser works even without OpenAI key using local fallback parsing.
- No demo tenant/room data is preloaded. The app starts empty and stores only the data you enter.
- Owners should normally create accounts from the app login screen. Each owner account sees only its own PG data.
- There are no manager/staff roles yet because every login is treated as the owner of that account.
- Existing old rows created before owner isolation are assigned to owner_id `owner` by default. Create your owner account first, then edit and run the transfer SQL helper if you need old rows moved into that account.

## API Modules
- `/api/rooms`
- `/api/tenants`
- `/api/occupancy`
- `/api/history`
- `/api/bills`
- `/api/bills/calculate`
- `/api/payments`
- `/api/dashboard`
- `/api/ai/parse`
- `/api/ai/help`
- `/api/notifications/pending-bills`

## n8n
- Workflow scaffold: `n8n/workflows/bill-reminder-workflow.json`
- Local n8n compose: `n8n/docker-compose.yml`

## Final Outcome
You now have a refined build that is:
- Elegant and simple in UI
- Stable in build/runtime
- Ready for live deployment with persistent production storage
