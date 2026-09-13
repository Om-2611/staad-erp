-- ============================================================================
-- Demo seed data — teams + a welcome announcement.
-- Demo USERS (admin/intern/viewer accounts) are created separately with
-- `npm run seed:users`, because auth.users must be created through Supabase's
-- Admin API (a service-role script), not plain SQL. Run this file first,
-- then run the seed:users script.
-- ============================================================================

insert into public.teams (name, description) values
  ('AI', 'Machine learning & applied AI projects'),
  ('Full Stack', 'Web application development'),
  ('Sales', 'Outreach, partnerships & growth'),
  ('Design', 'Product & brand design')
on conflict (name) do nothing;
