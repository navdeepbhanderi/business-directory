-- ===========================================================================
-- Service-role privileges.
--
-- Phase 1 established that a role reaches a table only if it holds a GRANT: RLS
-- narrows access, it never creates it. That was fixed for `anon` and
-- `authenticated` at the time — and `service_role` was left out, because nothing
-- had used it yet.
--
-- It does not have grants by default. Supabase's default-privilege setup does not
-- cover tables created by later migrations, so every service-role code path the
-- plan depends on — the Stripe webhook that writes subscriptions, the admin
-- tooling in Phase 9, any backfill — would have failed with
-- "permission denied for table" the first time it ran. Found because the Phase 6
-- end-to-end test uses the service role to set up its starting state.
--
-- Granting broadly here is correct rather than lax. `service_role` bypasses RLS
-- by design and its key is server-only; the boundary that protects it is that the
-- key never reaches a browser, not a narrow grant. Narrow grants are the right
-- tool for `anon` and `authenticated`, which are reachable from the client.
-- ===========================================================================

grant usage on schema public to service_role;

grant all privileges on all tables in schema public to service_role;
grant all privileges on all sequences in schema public to service_role;

-- Tables added by later migrations get the same treatment without another
-- migration having to remember.
alter default privileges in schema public grant all on tables to service_role;
alter default privileges in schema public grant all on sequences to service_role;
