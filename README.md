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

### 2) Set Vercel Environment Variables
In your Vercel project settings, add:
- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `OPENAI_API_KEY` (optional)
- `OPENAI_MODEL` (optional, default `gpt-4.1-mini`)

### 3) Deploy
- Push this project to GitHub
- Import repo into Vercel
- Deploy

## Important Notes
- For real production, use Supabase mode (do not rely on `data/db.json` persistence on serverless).
- AI parser works even without OpenAI key using local fallback parsing.

## API Modules
- `/api/rooms`
- `/api/tenants`
- `/api/occupancy`
- `/api/bills`
- `/api/bills/calculate`
- `/api/payments`
- `/api/dashboard`
- `/api/ai/parse`
- `/api/notifications/pending-bills`

## n8n
- Workflow scaffold: `n8n/workflows/bill-reminder-workflow.json`
- Local n8n compose: `n8n/docker-compose.yml`

## Final Outcome
You now have a refined build that is:
- Elegant and simple in UI
- Stable in build/runtime
- Ready for live deployment with persistent production storage
