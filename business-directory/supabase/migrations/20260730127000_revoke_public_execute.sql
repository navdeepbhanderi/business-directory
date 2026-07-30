-- ===========================================================================
-- Close default PUBLIC execute grants on privileged functions.
--
-- Postgres grants EXECUTE on every new function to PUBLIC. Revoking from
-- `anon, authenticated` — which is what the earlier migrations did — does not
-- remove that, so the functions stayed callable by anyone.
--
-- Two of them were genuinely exploitable, because neither checks its caller:
--
--   consume_rate_limit()  A client could call it with a zero-length window,
--                         which resets the counter — lifting its own rate limit.
--   record_audit()        A client could write arbitrary rows into audit_log,
--                         forging the moderation trail that the admin console
--                         and the case study both rest on.
--
-- approve_claim, reject_claim and delete_own_account each verify the caller
-- internally, so they were defended — but a PUBLIC grant on them is still wrong,
-- and relying on the inner check alone is one edit away from a hole.
-- ===========================================================================

revoke execute on function public.consume_rate_limit(text, integer, interval) from public;
revoke execute on function public.record_audit(text, text, text, jsonb, jsonb) from public;
revoke execute on function public.approve_claim(uuid, text) from public;
revoke execute on function public.reject_claim(uuid, text) from public;
revoke execute on function public.delete_own_account() from public;

-- Re-grant only what the application actually needs. Note that
-- consume_rate_limit and record_audit are granted to NOBODY: they are called
-- exclusively from other SECURITY DEFINER functions and triggers, which execute
-- as the owner and therefore do not need a grant at all.
grant execute on function public.approve_claim(uuid, text) to authenticated;
grant execute on function public.reject_claim(uuid, text) to authenticated;
grant execute on function public.delete_own_account() to authenticated;

-- The read-only helpers stay public: they leak nothing a policy would not, and
-- policies themselves call them.
-- (auth_role, is_admin, owns_business, business_is_public, slugify)
