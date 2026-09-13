-- ============================================================================
-- STAAD ERP — initial schema + Row Level Security policies
-- Run this once against your Supabase project (SQL Editor, or `supabase db push`)
-- ============================================================================

create extension if not exists "pgcrypto";

-- ----------------------------------------------------------------------------
-- TEAMS
-- ----------------------------------------------------------------------------
create table if not exists public.teams (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text,
  created_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- PROFILES  (one row per auth.users row; source of truth for role/team/status)
-- ----------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  email text not null,
  role text not null check (role in ('admin', 'intern', 'viewer')),
  team_id uuid references public.teams(id) on delete set null,
  status text not null default 'active' check (status in ('active', 'inactive')),
  joined_date date not null default current_date,
  -- viewer-only: 'all' sees every team, 'team' is restricted to rows in viewer_team_access
  viewer_scope text not null default 'all' check (viewer_scope in ('all', 'team')),
  created_at timestamptz not null default now()
);

create index if not exists profiles_role_idx on public.profiles(role);
create index if not exists profiles_team_idx on public.profiles(team_id);

-- Granular team access for viewers when viewer_scope = 'team'
create table if not exists public.viewer_team_access (
  viewer_id uuid not null references public.profiles(id) on delete cascade,
  team_id uuid not null references public.teams(id) on delete cascade,
  primary key (viewer_id, team_id)
);

-- ----------------------------------------------------------------------------
-- ATTENDANCE
-- ----------------------------------------------------------------------------
create table if not exists public.attendance (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  date date not null,
  check_in_time timestamptz,
  check_out_time timestamptz,
  status text not null default 'present' check (status in ('present', 'absent', 'leave')),
  marked_by text not null default 'self' check (marked_by in ('self', 'admin')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, date)
);

create index if not exists attendance_user_idx on public.attendance(user_id);
create index if not exists attendance_date_idx on public.attendance(date);

-- ----------------------------------------------------------------------------
-- WORK LOGS
-- ----------------------------------------------------------------------------
create table if not exists public.worklogs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  team_id uuid references public.teams(id) on delete set null,
  date date not null,
  description text not null,
  link text,
  time_spent_minutes int,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  admin_remark text,
  is_milestone boolean not null default false,
  reviewed_by uuid references public.profiles(id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists worklogs_user_idx on public.worklogs(user_id);
create index if not exists worklogs_team_idx on public.worklogs(team_id);
create index if not exists worklogs_date_idx on public.worklogs(date);
create index if not exists worklogs_status_idx on public.worklogs(status);

-- ----------------------------------------------------------------------------
-- ANNOUNCEMENTS
-- ----------------------------------------------------------------------------
create table if not exists public.announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null,
  created_by uuid references public.profiles(id),
  visible_to text not null default 'all' check (visible_to in ('all', 'interns', 'viewers', 'team')),
  team_id uuid references public.teams(id),
  created_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- AUDIT LOG  (manual attendance corrections & other admin overrides)
-- ----------------------------------------------------------------------------
create table if not exists public.audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id),
  action text not null,
  target_table text not null,
  target_id uuid,
  details jsonb,
  created_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- updated_at trigger helper
-- ----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists attendance_set_updated_at on public.attendance;
create trigger attendance_set_updated_at
  before update on public.attendance
  for each row execute function public.set_updated_at();

drop trigger if exists worklogs_set_updated_at on public.worklogs;
create trigger worklogs_set_updated_at
  before update on public.worklogs
  for each row execute function public.set_updated_at();

-- ----------------------------------------------------------------------------
-- Helper functions for RLS (security definer => no recursive-policy issues)
-- ----------------------------------------------------------------------------
create or replace function public.current_role_name()
returns text
language sql
security definer
stable
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

create or replace function public.is_viewer()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'viewer');
$$;

create or replace function public.viewer_can_see_team(p_team_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select
    case
      when p_team_id is null then true
      else (
        (select viewer_scope from public.profiles where id = auth.uid()) = 'all'
        or exists (
          select 1 from public.viewer_team_access vta
          where vta.viewer_id = auth.uid() and vta.team_id = p_team_id
        )
      )
    end;
$$;

-- ----------------------------------------------------------------------------
-- Enable RLS
-- ----------------------------------------------------------------------------
alter table public.teams enable row level security;
alter table public.profiles enable row level security;
alter table public.viewer_team_access enable row level security;
alter table public.attendance enable row level security;
alter table public.worklogs enable row level security;
alter table public.announcements enable row level security;
alter table public.audit_log enable row level security;

-- ----------------------------------------------------------------------------
-- TEAMS policies
-- ----------------------------------------------------------------------------
drop policy if exists "teams_select_all_authenticated" on public.teams;
create policy "teams_select_all_authenticated"
  on public.teams for select
  to authenticated
  using (true);

drop policy if exists "teams_write_admin_only" on public.teams;
create policy "teams_write_admin_only"
  on public.teams for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ----------------------------------------------------------------------------
-- PROFILES policies
-- Read: everyone authenticated can read all profiles (names/teams needed
--   everywhere — intern list, team rosters, viewer dashboards). No sensitive
--   data (no passwords) lives on this table.
-- Write: admin only. Accounts are provisioned via the Supabase Admin API
--   (service role key, server-side only) — see scripts/create-user.mjs.
-- ----------------------------------------------------------------------------
drop policy if exists "profiles_select_all_authenticated" on public.profiles;
create policy "profiles_select_all_authenticated"
  on public.profiles for select
  to authenticated
  using (true);

drop policy if exists "profiles_write_admin_only" on public.profiles;
create policy "profiles_write_admin_only"
  on public.profiles for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- allow a user to update a harmless subset of their own row (none exposed in UI
-- today, but kept narrow/explicit rather than open) — intentionally omitted;
-- all profile writes go through admin actions.

-- ----------------------------------------------------------------------------
-- VIEWER_TEAM_ACCESS policies
-- ----------------------------------------------------------------------------
drop policy if exists "viewer_team_access_select" on public.viewer_team_access;
create policy "viewer_team_access_select"
  on public.viewer_team_access for select
  to authenticated
  using (public.is_admin() or viewer_id = auth.uid());

drop policy if exists "viewer_team_access_write_admin" on public.viewer_team_access;
create policy "viewer_team_access_write_admin"
  on public.viewer_team_access for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ----------------------------------------------------------------------------
-- ATTENDANCE policies
-- ----------------------------------------------------------------------------
drop policy if exists "attendance_select" on public.attendance;
create policy "attendance_select"
  on public.attendance for select
  to authenticated
  using (
    user_id = auth.uid()
    or public.is_admin()
    or (
      public.is_viewer()
      and public.viewer_can_see_team((select team_id from public.profiles where id = user_id))
    )
  );

-- Intern can mark ONLY today's attendance for themselves (no backdating)
drop policy if exists "attendance_insert_self_today" on public.attendance;
create policy "attendance_insert_self_today"
  on public.attendance for insert
  to authenticated
  with check (
    (user_id = auth.uid() and date = current_date and marked_by = 'self')
    or public.is_admin()
  );

-- Intern can update ONLY their own today's row (e.g. add check-out time);
-- admin can update any row (manual corrections, logged separately by the app).
drop policy if exists "attendance_update" on public.attendance;
create policy "attendance_update"
  on public.attendance for update
  to authenticated
  using (
    (user_id = auth.uid() and date = current_date)
    or public.is_admin()
  )
  with check (
    (user_id = auth.uid() and date = current_date)
    or public.is_admin()
  );

drop policy if exists "attendance_delete_admin_only" on public.attendance;
create policy "attendance_delete_admin_only"
  on public.attendance for delete
  to authenticated
  using (public.is_admin());

-- ----------------------------------------------------------------------------
-- WORKLOGS policies
-- ----------------------------------------------------------------------------
-- Viewers may see rows (any status) for teams in their scope, so the
-- leadership org-wide dashboard can report pending-vs-approved counts.
-- The app UI itself only ever renders the *content* of approved/milestone
-- logs to viewers (see /viewer/individual and /viewer/team) — pending or
-- rejected work is surfaced only as an aggregate count, never its text.
drop policy if exists "worklogs_select" on public.worklogs;
create policy "worklogs_select"
  on public.worklogs for select
  to authenticated
  using (
    user_id = auth.uid()
    or public.is_admin()
    or (
      public.is_viewer()
      and public.viewer_can_see_team(team_id)
    )
  );

drop policy if exists "worklogs_insert_self" on public.worklogs;
create policy "worklogs_insert_self"
  on public.worklogs for insert
  to authenticated
  with check (
    (user_id = auth.uid() and status = 'pending')
    or public.is_admin()
  );

-- Intern may edit/resubmit their own log only while it is pending or rejected
-- (once approved it is locked). Admin may update any row (approve/reject/tag).
drop policy if exists "worklogs_update" on public.worklogs;
create policy "worklogs_update"
  on public.worklogs for update
  to authenticated
  using (
    (user_id = auth.uid() and status in ('pending', 'rejected'))
    or public.is_admin()
  )
  with check (
    (user_id = auth.uid() and status in ('pending', 'rejected'))
    or public.is_admin()
  );

drop policy if exists "worklogs_delete_admin_only" on public.worklogs;
create policy "worklogs_delete_admin_only"
  on public.worklogs for delete
  to authenticated
  using (public.is_admin());

-- ----------------------------------------------------------------------------
-- ANNOUNCEMENTS policies
-- ----------------------------------------------------------------------------
drop policy if exists "announcements_select" on public.announcements;
create policy "announcements_select"
  on public.announcements for select
  to authenticated
  using (
    visible_to = 'all'
    or public.is_admin()
    or (visible_to = 'interns' and public.current_role_name() = 'intern')
    or (visible_to = 'viewers' and public.is_viewer())
    or (visible_to = 'team' and team_id = (select team_id from public.profiles where id = auth.uid()))
  );

drop policy if exists "announcements_write_admin_only" on public.announcements;
create policy "announcements_write_admin_only"
  on public.announcements for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ----------------------------------------------------------------------------
-- AUDIT LOG policies (admin only, read + write)
-- ----------------------------------------------------------------------------
drop policy if exists "audit_log_admin_only" on public.audit_log;
create policy "audit_log_admin_only"
  on public.audit_log for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ============================================================================
-- End of migration
-- ============================================================================
