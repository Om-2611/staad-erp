-- ============================================================================
-- STAAD ERP — migration 3: dual-capability admin accounts
-- Lets an admin account (e.g. a co-founder) also use the intern self-service
-- tools (attendance, work logs, tasks, academic details) without losing any
-- admin access. Purely additive — RLS already allowed admins to write their
-- own attendance/worklogs rows (the `public.is_admin()` clause in migration
-- 1's policies); this flag only gates the *application-level* routing and UI.
-- ============================================================================

alter table public.profiles add column if not exists has_intern_access boolean not null default false;
