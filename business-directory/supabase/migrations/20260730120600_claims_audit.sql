-- ===========================================================================
-- Ownership claims and the audit trail.
--
-- This is the part of the schema that makes the product trustworthy: a claim is
-- a request, an admin decision is a recorded act, and approval is atomic.
-- ===========================================================================

create table public.claims (
  id               uuid primary key default gen_random_uuid(),
  business_id      uuid not null references public.businesses (id) on delete cascade,
  claimant_id      uuid not null references public.profiles (id) on delete cascade,
  role_at_business text not null,
  contact_phone    text,
  evidence         jsonb not null default '{}'::jsonb,
  document_paths   text[] not null default '{}',
  status           public.claim_status not null default 'pending',
  reviewed_by      uuid references public.profiles (id) on delete set null,
  reviewed_at      timestamptz,
  decision_note    text,
  created_at       timestamptz not null default now(),

  constraint claims_decision_shape check (
    (status in ('pending', 'withdrawn')) = (reviewed_at is null)
  ),
  constraint claims_rejection_needs_reason check (
    status <> 'rejected' or nullif(btrim(coalesce(decision_note, '')), '') is not null
  )
);

-- One live claim per person per business; resolved ones may repeat.
create unique index claims_one_open_per_claimant_idx
  on public.claims (business_id, claimant_id)
  where status = 'pending';

create index claims_status_idx on public.claims (status, created_at);
create index claims_business_idx on public.claims (business_id);

-- ---------------------------------------------------------------------------

create table public.audit_log (
  id          bigint generated always as identity primary key,
  actor_id    uuid references public.profiles (id) on delete set null,
  action      text not null,
  entity_type text not null,
  entity_id   text not null,
  before      jsonb,
  after       jsonb,
  ip_hash     text,
  created_at  timestamptz not null default now()
);

create index audit_log_entity_idx on public.audit_log (entity_type, entity_id, created_at desc);
create index audit_log_actor_idx on public.audit_log (actor_id, created_at desc);

comment on table public.audit_log is
  'Append-only. Writable only through record_audit(), which is SECURITY DEFINER; '
  'no role holds a direct INSERT policy.';

create or replace function public.record_audit(
  p_action      text,
  p_entity_type text,
  p_entity_id   text,
  p_before      jsonb default null,
  p_after       jsonb default null
)
returns bigint
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  new_id bigint;
begin
  insert into public.audit_log (actor_id, action, entity_type, entity_id, before, after)
  values (auth.uid(), p_action, p_entity_type, p_entity_id, p_before, p_after)
  returning id into new_id;
  return new_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Claim decisions
--
-- Approval must be atomic: assign the owner, mark the listing verified, close
-- any competing claims, and write the audit entry — all or nothing. Doing this
-- from application code would leave a half-approved listing on any failure.
-- ---------------------------------------------------------------------------

create or replace function public.approve_claim(p_claim_id uuid, p_note text default null)
returns public.claims
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  target public.claims;
  before_state jsonb;
begin
  if not public.is_admin() then
    raise exception 'only an admin may decide a claim' using errcode = '42501';
  end if;

  select * into target from public.claims where id = p_claim_id for update;
  if not found then
    raise exception 'claim % not found', p_claim_id using errcode = 'P0002';
  end if;
  if target.status <> 'pending' then
    raise exception 'claim % is already %', p_claim_id, target.status
      using errcode = '22023';
  end if;

  select to_jsonb(b) into before_state from public.businesses b where b.id = target.business_id;

  update public.businesses
     set owner_id = target.claimant_id,
         verified = true
   where id = target.business_id;

  update public.profiles
     set role = 'owner'
   where id = target.claimant_id and role = 'user';

  update public.claims
     set status = 'approved',
         reviewed_by = auth.uid(),
         reviewed_at = now(),
         decision_note = p_note
   where id = p_claim_id
  returning * into target;

  -- Competing claims on the same listing lose automatically.
  update public.claims
     set status = 'rejected',
         reviewed_by = auth.uid(),
         reviewed_at = now(),
         decision_note = 'Another claim for this listing was approved.'
   where business_id = target.business_id
     and id <> p_claim_id
     and status = 'pending';

  perform public.record_audit(
    'claim.approve', 'claim', p_claim_id::text,
    before_state,
    (select to_jsonb(b) from public.businesses b where b.id = target.business_id)
  );

  return target;
end;
$$;

create or replace function public.reject_claim(p_claim_id uuid, p_note text)
returns public.claims
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  target public.claims;
begin
  if not public.is_admin() then
    raise exception 'only an admin may decide a claim' using errcode = '42501';
  end if;

  if nullif(btrim(coalesce(p_note, '')), '') is null then
    raise exception 'a rejection reason is required' using errcode = '22023';
  end if;

  update public.claims
     set status = 'rejected',
         reviewed_by = auth.uid(),
         reviewed_at = now(),
         decision_note = p_note
   where id = p_claim_id and status = 'pending'
  returning * into target;

  if not found then
    raise exception 'claim % is not pending', p_claim_id using errcode = '22023';
  end if;

  perform public.record_audit('claim.reject', 'claim', p_claim_id::text, null,
                              jsonb_build_object('note', p_note));
  return target;
end;
$$;

revoke execute on function public.record_audit(text, text, text, jsonb, jsonb) from anon;

-- ===========================================================================
-- RLS
-- ===========================================================================

alter table public.claims enable row level security;
alter table public.audit_log enable row level security;

create policy claims_insert_own on public.claims
  for insert to authenticated
  with check (claimant_id = auth.uid() and status = 'pending' and reviewed_by is null);

create policy claims_select_own on public.claims
  for select to authenticated
  using (claimant_id = auth.uid() or public.owns_business(business_id) or public.is_admin());

-- A claimant may withdraw, nothing more. Deciding is admin-only, and goes
-- through approve_claim()/reject_claim().
create policy claims_withdraw_own on public.claims
  for update to authenticated
  using (claimant_id = auth.uid() and status = 'pending')
  with check (claimant_id = auth.uid() and status = 'withdrawn');

create policy claims_admin_all on public.claims
  for all using (public.is_admin()) with check (public.is_admin());

-- Read-only, admin-only. There is deliberately no INSERT policy: writes go
-- exclusively through record_audit().
create policy audit_log_admin_select on public.audit_log
  for select using (public.is_admin());
