-- ===========================================================================
-- Table privileges.
--
-- RLS narrows what a role may reach; it does not grant access in the first
-- place. Without the GRANTs below every policy is unreachable and PostgREST
-- answers "permission denied for table" regardless of how permissive the
-- policy is.
--
-- These are deliberately explicit rather than a blanket
-- `grant all on all tables`: the grant is the outer boundary and the policy is
-- the inner one, so a mistake in a policy is contained by a narrow grant.
-- ===========================================================================

grant usage on schema public to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Reference data — world-readable, admin-writable (enforced by policy).
-- ---------------------------------------------------------------------------

grant select on
  public.markets,
  public.cities,
  public.localities,
  public.categories,
  public.plans,
  public.promoted_placements
to anon, authenticated;

grant insert, update, delete on
  public.markets,
  public.cities,
  public.localities,
  public.categories,
  public.plans,
  public.promoted_placements
to authenticated;   -- policies restrict these to admins

-- ---------------------------------------------------------------------------
-- Listings — readable by everyone, writable by owners and admins.
-- ---------------------------------------------------------------------------

grant select on
  public.businesses,
  public.business_categories,
  public.business_hours,
  public.hours_overrides,
  public.business_photos,
  public.services,
  public.offers
to anon, authenticated;

grant insert, update, delete on
  public.businesses,
  public.business_categories,
  public.business_hours,
  public.hours_overrides,
  public.business_photos,
  public.services,
  public.offers
to authenticated;

-- ---------------------------------------------------------------------------
-- Reviews and trust signals.
-- ---------------------------------------------------------------------------

grant select on
  public.profiles,
  public.reviews,
  public.review_photos,
  public.review_replies,
  public.review_votes
to anon, authenticated;

grant insert, update, delete on
  public.profiles,
  public.reviews,
  public.review_photos,
  public.review_replies,
  public.review_votes,
  public.review_reports
to authenticated;

grant select on public.review_reports to authenticated;

-- ---------------------------------------------------------------------------
-- Saved content — signed-in only. Anon gets SELECT on lists and list_items so
-- a shared link works when signed out; the policy still limits that to lists
-- whose visibility is unlisted or public.
-- ---------------------------------------------------------------------------

grant select on public.lists, public.list_items to anon;

grant select, insert, update, delete on
  public.favorites,
  public.lists,
  public.list_items,
  public.saved_searches,
  public.notification_preferences,
  public.claims
to authenticated;

-- ---------------------------------------------------------------------------
-- Billing — read-only to the app. Writes arrive from the Stripe webhook via
-- the service role, which bypasses RLS.
-- ---------------------------------------------------------------------------

grant select on public.subscriptions to authenticated;

-- ---------------------------------------------------------------------------
-- Analytics — insert-only from the client. Deliberately NO select for anon or
-- authenticated: raw event rows are never exposed, and owners receive
-- aggregates through a SECURITY DEFINER function in Phase 8.
-- ---------------------------------------------------------------------------

grant insert on public.business_events to anon, authenticated;
grant select on public.business_events to authenticated;   -- policy: admin only

-- ---------------------------------------------------------------------------
-- Audit log — SELECT only, and the policy narrows that to admins. There is no
-- INSERT grant at all: writes go exclusively through record_audit().
-- ---------------------------------------------------------------------------

grant select on public.audit_log to authenticated;

-- ---------------------------------------------------------------------------
-- Helper functions used inside policies must be executable by the roles those
-- policies apply to.
-- ---------------------------------------------------------------------------

grant execute on function public.auth_role() to anon, authenticated;
grant execute on function public.is_admin() to anon, authenticated;
grant execute on function public.owns_business(uuid) to anon, authenticated;
grant execute on function public.business_is_public(uuid) to anon, authenticated;
grant execute on function public.slugify(text) to anon, authenticated;
grant execute on function public.approve_claim(uuid, text) to authenticated;
grant execute on function public.reject_claim(uuid, text) to authenticated;
