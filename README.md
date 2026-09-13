# STAAD ERP

A free-tier, full-stack internal tool for managing onboarded interns: daily
attendance, daily work-log submissions with an admin approval workflow, team
management, announcements, and a read-only dashboard for college leadership.

Built with **Next.js (App Router) + Tailwind CSS** on the frontend/backend and
**Supabase** (Postgres + Auth + Row Level Security) for data and
authentication. Everything below runs on genuinely free tiers — no credit
card required.

---

## 1. Roles

| Role | Portal | Can do |
|---|---|---|
| **Intern** | `/intern/*` | Mark today's attendance, submit/resubmit daily work logs, view own history |
| **Admin** | `/admin/*` | Approve/reject work logs, manage interns/teams/announcements/viewers, manually correct attendance |
| **Viewer** (leadership) | `/viewer/*` | Read-only org/team/individual dashboards, weekly milestone rollup |

Access control is enforced in **two layers**:
1. Next.js middleware (`src/proxy.ts` + `src/lib/supabase/middleware.ts`) redirects users away from portals that don't match their role.
2. **Postgres Row Level Security** (`supabase/migrations/0001_init.sql`) enforces the same rules at the database level, so even a bug in the frontend can't leak or corrupt data across roles.

---

## 2. Tech stack (all free tier)

| Layer | Choice | Free tier |
|---|---|---|
| Frontend + backend | Next.js 16 (App Router, Server Actions) + Tailwind CSS | Hosted free on Vercel Hobby |
| Database | Supabase Postgres | 500MB DB, free forever on one active project |
| Auth | Supabase Auth (email + password) | 50,000 monthly active users free |
| File storage | Supabase Storage (not wired up yet — see §7) | 1GB free |
| Hosting | Vercel Hobby plan | Free, no credit card |

No paid add-ons are used anywhere. See **§8 Free-tier limits to watch** for
where this could eventually become a bottleneck.

---

## 3. Project structure

```
src/
  proxy.ts                    # Next 16 "proxy" (formerly middleware) — session refresh + role routing
  lib/
    supabase/
      client.ts               # browser Supabase client (anon key)
      server.ts                # server Supabase client (Server Components/Actions, anon key + user session)
      admin.ts                 # SERVICE ROLE client — server-only, used to create accounts
      middleware.ts            # session refresh + role-based redirects, used by proxy.ts
    auth.ts                    # requireRole() / getCurrentProfile() server helpers
    database.types.ts          # hand-written TS types matching the schema
    dates.ts                   # date helpers (today, week/month ranges, formatting)
    viewerScope.ts              # resolves which teams a scoped viewer can see
  app/
    (auth)/login, unauthorized  # public auth pages
    intern/...                  # intern portal (layout enforces role=intern)
    admin/...                   # admin portal (layout enforces role=admin)
    viewer/...                   # viewer portal (layout enforces role=viewer)
supabase/
  migrations/0001_init.sql     # full schema + RLS policies — run this first
  seed.sql                     # demo teams + announcement seed data
scripts/
  seed-users.mjs               # creates demo admin/intern/viewer AUTH accounts
```

---

## 4. Set up your Supabase project

1. Go to **[supabase.com](https://supabase.com)** → sign up (free, no card) → **New project**.
   - Pick any name/region, set a database password (save it somewhere safe — you won't need it day-to-day, Supabase manages the connection).
   - Wait ~2 minutes for provisioning.
2. In the dashboard, go to **Project Settings → API**. You'll need three values:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon / public key** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role key** (click "reveal") → `SUPABASE_SERVICE_ROLE_KEY` — **keep this secret**, never put it in a `NEXT_PUBLIC_` variable or commit it.
3. Copy `.env.local.example` to `.env.local` in the project root and fill in the three values above.
4. Run the schema migration: open **SQL Editor** in the Supabase dashboard, paste the entire contents of `supabase/migrations/0001_init.sql`, and run it. This creates every table, the RLS policies, and helper functions.
5. Run the demo teams seed: paste and run `supabase/seed.sql` in the SQL Editor (creates AI / Full Stack / Sales / Design teams).
6. (Optional, alternative to step 4/5) If you prefer the CLI: `npx supabase link --project-ref <ref>` then `npx supabase db push`.

---

## 5. Run locally

```bash
npm install
npm run dev
```

Visit `http://localhost:3000` — you'll be redirected to `/login`.

### Create demo accounts to test with

```bash
npm run seed:users
```

This uses your service role key to create 5 demo accounts and print their
temporary password to the terminal:

| Email | Role |
|---|---|
| admin@demo.internerp.local | Admin |
| ravi.intern@demo.internerp.local | Intern (AI team) |
| priya.intern@demo.internerp.local | Intern (Full Stack team) |
| karan.intern@demo.internerp.local | Intern (Sales team) |
| viewer@demo.internerp.local | Viewer (all teams) |

Log in as any of them at `/login`. **Delete or change these before inviting
real users** — they're for local testing only. The live project this repo is
currently connected to has been reset to just the admin account (all demo
intern/viewer accounts removed) — re-run `npm run seed:users` any time you
want the other four back for testing.

Every signed-in user (any role) can also update their own display name and
change their password from **Profile Settings** (`/settings`, linked from
their name/avatar in the top-right of any portal).

---

## 6. Deploy — Vercel + Supabase, both free

1. Push this repo to GitHub (if you haven't already):
   ```bash
   git add -A
   git commit -m "Initial commit"
   git remote add origin https://github.com/Om-2611/staad-erp.git
   git push -u origin main
   ```
2. Go to **[vercel.com](https://vercel.com)** → sign up free with GitHub → **Add New Project** → import this repo.
3. In the **Environment Variables** step (or later under Project Settings → Environment Variables), add exactly these three:
   | Key | Value | Notes |
   |---|---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | your Supabase project URL | Production + Preview + Development |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | your anon key | Production + Preview + Development |
   | `SUPABASE_SERVICE_ROLE_KEY` | your service role key | Production + Preview + Development — **never expose this in client code** |
4. Deploy. Vercel builds with `next build` automatically — no extra config needed.
5. Once deployed, run the schema migration and `npm run seed:users` (or create your real admin manually — see §7) against the **same** Supabase project. Your Vercel deployment and local dev can point at the same Supabase project, or you can create a separate Supabase project for production if you want isolated data — just swap the three env vars.

Both Vercel's Hobby plan and Supabase's free plan require no credit card.

---

## 7. Creating your first real admin account

The seed script is for demo/testing. For your real admin account, run this
once (with your `.env.local` filled in with real production values if
seeding production):

```bash
node -e "
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
(async () => {
  const { data, error } = await supabase.auth.admin.createUser({
    email: 'you@yourcollege.edu',
    password: 'ChangeThisImmediately!23',
    email_confirm: true,
  });
  if (error) return console.error(error);
  await supabase.from('profiles').insert({
    id: data.user.id,
    name: 'Your Name',
    email: 'you@yourcollege.edu',
    role: 'admin',
    status: 'active',
  });
  console.log('Admin created:', data.user.id);
})();
"
```

After that, log in as this admin and use **Admin → Interns** and
**Admin → Viewers** to create every other account from the UI — each
creation shows a one-time temporary password to share with that person.
Interns/viewers cannot self-register; this keeps account creation entirely
under admin control, which is the simplest secure flow for a cohort of a
known size.

---

## 8. How approvals work

1. An intern submits a work log from `/intern/submit` (or edits one from
   `/intern/worklogs`). It starts as **Pending**.
2. It appears in `/admin/approvals`. The admin can **Approve** (optionally
   tagging it as a **Milestone** and leaving a remark) or **Reject** (a
   remark is required so the intern knows what to fix).
3. A rejected log can be edited and resubmitted by the intern from
   `/intern/worklogs` — it goes back to Pending.
4. Once **Approved**, a work log is locked (the intern can no longer edit
   it) and becomes visible to leadership viewers in the individual/team/
   milestone views.

Attendance works similarly but is simpler: interns can only mark **today's**
attendance (no backdating) via check-in/leave, with an optional check-out.
Admins can manually add or correct any date's attendance from
`/admin/attendance` — every manual correction is written to the
`audit_log` table with the admin's ID, the old/new values, and a timestamp.

---

## 9. Free-tier limits to watch as you grow

| Limit | Supabase free tier | Impact here |
|---|---|---|
| Database size | 500 MB | Attendance + work log rows are tiny (a few hundred bytes each). At 100 interns × 1 attendance + 1 work log/day, that's ~200 rows/day — you'd need **years** of continuous use to approach this. Not a near-term concern. |
| Monthly Active Users (Auth) | 50,000 MAU | Each intern/admin/viewer who logs in in a given month counts once. Utterly irrelevant at 10–100 interns. |
| File storage | 1 GB | Only matters once you wire up Supabase Storage for screenshot attachments (not implemented yet — the app currently accepts a **link** instead of a file upload, e.g. a Google Drive/Imgur link, which sidesteps this entirely). If you add file uploads later, 1GB is still generous for text/screenshot proof at this scale. |
| **Project pausing** | Free projects pause after **7 days with zero API requests** | This is the one real risk: if nobody uses the app for a week (e.g., between internship cohorts), Supabase auto-pauses the project. Un-pausing takes one click in the dashboard and a minute of wait — no data loss — but logins will fail until you do. Set a calendar reminder during long gaps, or ping the project (any authenticated request) periodically. |
| Vercel Hobby bandwidth | 100 GB/month | An internal tool with under 100 users won't come close. |
| Vercel Hobby function executions | Generous (effectively unlimited for this scale) | Fine. |
| Concurrent Supabase connections | Pooled via Supavisor, generally fine for this traffic pattern | Not a concern at this scale; would only matter with heavy concurrent server-side load. |

**Bottom line:** at 10–100 interns, none of these limits bind. The only
operational thing to actually remember is the **7-day pause** — don't let
the project sit completely idle across an internship gap without checking it.

---

## 10. Things intentionally left as documented assumptions

- **Account creation**: admin creates every intern/viewer account (no public
  self-signup). This is the simplest secure flow for a bounded, known cohort.
- **Attachments**: work logs accept an optional **link** (Drive, GitHub,
  Imgur, etc.) rather than a direct file upload, to avoid wiring up Supabase
  Storage + signed URLs for an MVP. Swapping in real uploads later is a
  contained change (a Storage bucket + an `<input type="file">` in
  `intern/submit` and `intern/worklogs`).
- **CSV/PDF export** for the viewer portal was called out as a nice-to-have
  in the brief and was not built in this pass — the data displayed there is
  all queryable directly from Supabase if you need bulk export sooner.
- **Password reset / "must change password on first login"** isn't wired up;
  new users are given a temporary password by the admin out-of-band. Adding
  Supabase's built-in password-reset email flow is a small follow-up if
  needed.
