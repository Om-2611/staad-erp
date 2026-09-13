-- ============================================================================
-- STAAD ERP — migration 2: intern academic profile fields + task assignment
-- Run this once against your Supabase project (SQL Editor, or `supabase db push`)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Academic profile fields — all optional (nullable, no default), self-editable
-- by the intern from /settings. Not used for access control, so no RLS impact.
-- ----------------------------------------------------------------------------
alter table public.profiles add column if not exists roll_number text;
alter table public.profiles add column if not exists year text;
alter table public.profiles add column if not exists spf_band text check (spf_band in ('A', 'B', 'C', 'D'));
alter table public.profiles add column if not exists cdc_band text check (cdc_band in ('A', 'B', 'C', 'D'));
alter table public.profiles add column if not exists branch text;
alter table public.profiles add column if not exists section text;
alter table public.profiles add column if not exists backlog text;

-- ----------------------------------------------------------------------------
-- TASKS — admin-assigned day-to-day / weekly / monthly tasks.
-- Targeting: assigned_to set = one specific intern; assigned_to null +
-- team_id set = whole team; both null = everyone. When assigned_to is set,
-- team_id is also set (to that intern's team) so viewer scoping — which is
-- always team-based elsewhere in this schema — works the same way here.
-- ----------------------------------------------------------------------------
create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  frequency text not null check (frequency in ('daily', 'weekly', 'monthly')),
  team_id uuid references public.teams(id) on delete set null,
  assigned_to uuid references public.profiles(id) on delete cascade,
  created_by uuid references public.profiles(id),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists tasks_team_idx on public.tasks(team_id);
create index if not exists tasks_assigned_to_idx on public.tasks(assigned_to);
create index if not exists tasks_frequency_idx on public.tasks(frequency);

drop trigger if exists tasks_set_updated_at on public.tasks;
create trigger tasks_set_updated_at
  before update on public.tasks
  for each row execute function public.set_updated_at();

alter table public.tasks enable row level security;

-- Select: admin sees everything; an intern sees tasks assigned directly to
-- them, to their team, or to everyone; a viewer sees team/org tasks within
-- their scope (individual-assignment tasks carry the assignee's team_id, so
-- the same team-scope check covers those too).
drop policy if exists "tasks_select" on public.tasks;
create policy "tasks_select"
  on public.tasks for select
  to authenticated
  using (
    public.is_admin()
    or assigned_to = auth.uid()
    or (assigned_to is null and team_id is null)
    or (assigned_to is null and team_id = (select team_id from public.profiles where id = auth.uid()))
    or (public.is_viewer() and (team_id is null or public.viewer_can_see_team(team_id)))
  );

drop policy if exists "tasks_write_admin_only" on public.tasks;
create policy "tasks_write_admin_only"
  on public.tasks for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ============================================================================
-- End of migration
-- ============================================================================
