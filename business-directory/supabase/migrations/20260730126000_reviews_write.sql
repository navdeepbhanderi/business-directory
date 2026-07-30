-- ===========================================================================
-- Review writes: photo storage, rate limiting, and a sortable reviews RPC.
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- Review photos. Same path-scoping as avatars: the first segment must be the
-- uploader's uid, so a crafted filename cannot write into someone else's folder.
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'review-photos', 'review-photos', true,
  5 * 1024 * 1024,
  array['image/jpeg', 'image/png', 'image/webp', 'image/avif']
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

create policy review_photos_public_read on storage.objects
  for select using (bucket_id = 'review-photos');

create policy review_photos_insert_own on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'review-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy review_photos_delete_own on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'review-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ===========================================================================
-- Rate limiting
--
-- In the database rather than in memory. The prototype's limiter was a
-- per-process sliding window, which on serverless means one bucket per instance
-- and therefore no limit at all. A table is shared by definition.
--
-- Kept deliberately simple: a fixed window per (user, action). Sliding windows
-- are more accurate but need per-request row writes; this needs one upsert.
-- ===========================================================================

create table public.rate_limits (
  user_id     uuid not null references public.profiles (id) on delete cascade,
  action      text not null,
  window_start timestamptz not null default now(),
  count       integer not null default 0,
  primary key (user_id, action)
);

alter table public.rate_limits enable row level security;

-- No policies at all: this table is only ever touched by the SECURITY DEFINER
-- function below. A client cannot read its own counter, let alone reset it.
comment on table public.rate_limits is
  'Written only via consume_rate_limit(). No RLS policies by design — a client '
  'that could update this row could lift its own limit.';

create or replace function public.consume_rate_limit(
  p_action text,
  p_max    integer,
  p_window interval
)
returns boolean
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  uid       uuid := auth.uid();
  current   public.rate_limits;
begin
  if uid is null then
    return false;
  end if;

  select * into current
  from public.rate_limits
  where user_id = uid and action = p_action
  for update;

  if not found then
    insert into public.rate_limits (user_id, action, window_start, count)
    values (uid, p_action, now(), 1);
    return true;
  end if;

  -- Window elapsed: start a fresh one.
  if current.window_start < now() - p_window then
    update public.rate_limits
       set window_start = now(), count = 1
     where user_id = uid and action = p_action;
    return true;
  end if;

  if current.count >= p_max then
    return false;
  end if;

  update public.rate_limits
     set count = count + 1
   where user_id = uid and action = p_action;
  return true;
end;
$$;

revoke execute on function public.consume_rate_limit(text, integer, interval) from anon, authenticated;

-- ---------------------------------------------------------------------------
-- Enforced on review inserts.
--
-- A trigger rather than a check in the Server Action: the limit then applies to
-- every path into the table, including a direct PostgREST call with a stolen
-- anon key. Application-level limits are advisory; this one is not.
-- ---------------------------------------------------------------------------

create or replace function public.reviews_enforce_rate_limit()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  -- Trusted server paths (no JWT) are exempt: seeding and admin tooling.
  if current_setting('request.jwt.claims', true) is null
     or current_setting('request.jwt.claims', true) = '' then
    return new;
  end if;

  if not public.consume_rate_limit('review.create', 5, interval '1 hour') then
    raise exception 'rate limit exceeded for review.create'
      using errcode = '54000';
  end if;

  return new;
end;
$$;

create trigger reviews_rate_limit
  before insert on public.reviews
  for each row execute function public.reviews_enforce_rate_limit();

-- ===========================================================================
-- Reviews, sortable — including by helpfulness.
--
-- "Most helpful" was previously sorted in the application after fetching a page,
-- which sorts only that page: the most helpful review on page three never
-- reaches page one. Counting in SQL is the only way the sort means anything.
-- ===========================================================================

create or replace function public.business_reviews(
  p_business_id uuid,
  p_sort        text default 'newest',
  p_limit       integer default 10,
  p_offset      integer default 0
)
returns table (
  id             uuid,
  rating         smallint,
  body           text,
  created_at     timestamptz,
  edited_at      timestamptz,
  author_id      uuid,
  author_name    text,
  author_avatar  text,
  helpful_count  bigint,
  viewer_voted   boolean,
  viewer_is_author boolean,
  reply_body     text,
  reply_created_at timestamptz,
  photo_paths    text[],
  total_count    bigint
)
language sql
stable
set search_path = public, auth, pg_temp
as $$
  with scoped as (
    select
      r.*,
      (select count(*) from public.review_votes v where v.review_id = r.id) as votes,
      exists (
        select 1 from public.review_votes v
        where v.review_id = r.id and v.user_id = auth.uid()
      ) as voted
    from public.reviews r
    where r.business_id = p_business_id
      and r.status = 'published'
  )
  select
    s.id,
    s.rating,
    s.body,
    s.created_at,
    s.edited_at,
    s.author_id,
    p.full_name,
    p.avatar_url,
    s.votes,
    s.voted,
    s.author_id = auth.uid(),
    rr.body,
    rr.created_at,
    coalesce(
      (select array_agg(rp.storage_path order by rp.sort_order)
         from public.review_photos rp where rp.review_id = s.id),
      '{}'::text[]
    ),
    count(*) over ()
  from scoped s
  join public.profiles p on p.id = s.author_id
  left join public.review_replies rr on rr.review_id = s.id
  order by
    case when p_sort = 'helpful' then s.votes end desc nulls last,
    case when p_sort = 'highest' then s.rating end desc nulls last,
    case when p_sort = 'lowest'  then s.rating end asc  nulls last,
    case when p_sort not in ('helpful', 'highest', 'lowest') then s.created_at end desc nulls last,
    s.created_at desc
  limit greatest(least(coalesce(p_limit, 10), 50), 1)
  offset greatest(coalesce(p_offset, 0), 0);
$$;

grant execute on function public.business_reviews(uuid, text, integer, integer) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Whether the viewer may review this listing, and why not.
--
-- One round trip instead of three, and it keeps the reasons in one place: the UI
-- can explain the refusal rather than just disabling a button, which is what the
-- prototype did.
-- ---------------------------------------------------------------------------

create or replace function public.review_eligibility(p_business_id uuid)
returns table (can_review boolean, reason text, existing_review_id uuid)
language plpgsql
stable
security definer
set search_path = public, auth, pg_temp
as $$
declare
  uid      uuid := auth.uid();
  existing uuid;
begin
  if uid is null then
    return query select false, 'signed-out'::text, null::uuid;
    return;
  end if;

  if exists (select 1 from public.profiles where id = uid and banned_at is not null) then
    return query select false, 'suspended'::text, null::uuid;
    return;
  end if;

  if exists (
    select 1 from public.businesses b
    where b.id = p_business_id and b.owner_id = uid
  ) then
    return query select false, 'owner'::text, null::uuid;
    return;
  end if;

  select r.id into existing
  from public.reviews r
  where r.business_id = p_business_id and r.author_id = uid;

  if existing is not null then
    return query select false, 'already-reviewed'::text, existing;
    return;
  end if;

  return query select true, null::text, null::uuid;
end;
$$;

grant execute on function public.review_eligibility(uuid) to anon, authenticated;
