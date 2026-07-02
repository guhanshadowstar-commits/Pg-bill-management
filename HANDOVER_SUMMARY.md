# PG App Protocol V1 - Handover Summary

Last updated: 2026-06-19

## What This ZIP Contains

This ZIP is a clean source-code handover for the PG Electricity Bill Manager app.

It includes:

- Current updated Next.js app source code.
- UI pages and reusable components.
- Backend API routes.
- Billing calculation logic.
- Owner login/signup logic.
- Owner-wise private data isolation logic.
- Supabase database schema files.
- n8n reminder workflow scaffold.
- README setup guide.
- Full project report.
- This handover summary.

It does not include unwanted generated/heavy files:

- `node_modules/`
- `.next/`
- `.git/`
- old ZIP files
- temporary build caches

## What We Have Built

- PG Electricity Bill Management web app.
- Room management.
- Tenant management.
- Tenant occupancy logs.
- Check-in and check-out tracking.
- Fair EB bill calculation by actual stayed days.
- Bill split saving.
- Payment tracking.
- Dashboard stats.
- Active tenant count correction.
- Recent bills view.
- History page.
- AI Help page.
- Built-in user manual page.
- Owner login/signup.
- Multiple owner support.
- Owner-wise data separation.
- Supabase live database support.
- Local JSON fallback for local development.
- Vercel deployment support.
- n8n workflow scaffold for future reminders.

## Main Billing Formula

```text
Individual Bill = (Days Stayed / Total Person-Days) x Total Electricity Bill
```

The app calculates:

- Days stayed per tenant.
- Total person-days.
- Per-person-day cost.
- Individual amount payable.

## Active Tenant Dashboard Fix

The dashboard now counts active tenants like this:

```text
If occupancy logs exist:
  Count unique tenants whose check-in is before/today and checkout is empty or in the future.

If no occupancy logs exist:
  Count saved tenants for that owner instead of showing zero.
```

This fixes the issue where dashboard showed `0` even when tenants existed.

## Owner Account System

- Owners create accounts from the app login screen.
- No manual owner account entry in Vercel is needed.
- Each owner has a private owner ID.
- Rooms, tenants, bills, payments, history, and dashboard are filtered by owner ID.
- Owner A should not see Owner B's data.

## Current GitHub Details

Repository:

```text
https://github.com/guhanshadowstar-commits/Pg-bill-management.git
```

Latest commit included:

```text
0be17ac Improve dashboard tenant count and add project report
```

Recent commit history:

```text
0be17ac Improve dashboard tenant count and add project report
03d44b2 Fix active tenant dashboard count
a16a6b1 Use Supabase Auth for owner signup fallback
c10e2f1 add owner signup and private data isolation
7910b74 final clean pg bill app
```

## Main Files

Important app files:

```text
app/page.tsx
app/rooms/page.tsx
app/tenants/page.tsx
app/bills/page.tsx
app/history/page.tsx
app/ai/page.tsx
app/manual/page.tsx
app/auth/login/page.tsx
app/api/dashboard/route.ts
app/api/auth/signup/route.ts
app/api/auth/login/route.ts
app/api/rooms/route.ts
app/api/tenants/route.ts
app/api/occupancy/route.ts
app/api/bills/route.ts
app/api/bills/calculate/route.ts
app/api/payments/route.ts
lib/billing.ts
lib/owner-auth.ts
lib/owner-scope.ts
lib/supabase-admin.ts
lib/types.ts
supabase/schema.sql
README.md
PG_BILL_MANAGEMENT_PROJECT_REPORT.md
```

## Pros

- Core PG EB bill calculation works.
- Fair billing based on occupancy days.
- Multi-owner structure is added.
- App can run online through Vercel and Supabase.
- No demo data is forced into the app.
- Owner account creation happens from the app.
- UI is clean and simple.
- Supabase database structure is ready.
- Build has been tested successfully.
- Project is organized and deployable.

## Cons / Limitations

- Full enterprise-grade security is not complete yet.
- Supabase Row Level Security policies should be strengthened later.
- Password reset is not added yet.
- Email verification is not fully built into the user flow yet.
- WhatsApp/SMS sending is only prepared structurally, not connected to a live provider.
- App Store / Play Store packaging is not done yet.
- Advanced analytics can be improved.
- There is no manager/staff role system because the current model treats every login as an owner.

## Pending Tasks

High priority:

- Test all flows with real data after each Vercel deployment.
- Verify active tenant count on the live dashboard.
- Add stronger production security.
- Add password reset.
- Add email verification.
- Add full Supabase RLS policies.

Medium priority:

- Add WhatsApp/SMS provider integration.
- Add automatic reminders.
- Add better charts and analytics.
- Add data export/backup.
- Clean duplicate Vercel projects.
- Add custom domain.

Future app-store priority:

- Convert web app to mobile app using Capacitor or React Native.
- Create app icon.
- Create splash screen.
- Prepare Play Store listing.
- Prepare App Store listing.
- Create developer accounts.
- Add mobile push notifications.

## How To Run Locally

```bash
npm install
npm run dev
```

Open:

```text
http://localhost:3000
```

## How To Deploy Updates

```text
Code change -> commit -> push to GitHub -> Vercel auto deploys -> live app updates
```

Using GitHub Desktop:

1. Open GitHub Desktop.
2. Select `Pg-bill-management`.
3. Commit changes if needed.
4. Click `Push origin`.
5. Open Vercel.
6. Wait for deployment.
7. Visit live app.

## Important Environment Variables

Required for live mode:

```text
NEXT_PUBLIC_SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
OWNER_SESSION_SECRET
```

Optional:

```text
OPENAI_API_KEY
OPENAI_MODEL
PG_NAME
PG_LOGO_URL
PG_OWNER_ACCOUNTS
PG_OWNER_USERNAME
PG_OWNER_PASSWORD
```

Important:

- Do not expose `SUPABASE_SERVICE_ROLE_KEY` publicly.
- `OWNER_SESSION_SECRET` is not an account. It only secures login sessions.
- Owner accounts are created inside the app.

## Final Note

This ZIP is the current clean protocol V1 package for the PG Electricity Bill Manager. It is suitable for backup, handover, review, and future development.
