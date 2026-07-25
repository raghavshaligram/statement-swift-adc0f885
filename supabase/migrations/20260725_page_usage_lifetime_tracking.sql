-- Free-tier lifetime page usage tracking -- ONE shared pool covering both
-- PDF pages and image conversions, matching the real competitive model
-- (verified directly this session: CapyParse's actual free tier is
-- "10 pages, lifetime, no expiry," with no distinction by file type at
-- all). Earlier in this project this was scoped as image-only; generalized
-- here before the migration was ever run, since every competitor
-- researched (CapyParse, DocuClipper, bankstatementconverter.com,
-- usstatementconverter.com) uses a cumulative pool -- lifetime or monthly
-- -- never "unlimited separate conversions, each capped individually,"
-- which is what the PDF side of this app was doing before this fix.
--
-- Anonymous users are NOT tracked here at all -- there's no persistent
-- identity to track against without requiring sign-in, and the anonymous
-- 6-page-per-conversion tier is deliberately kept as a no-tracking "try it
-- instantly" hook (mirroring CapyParse's own separate, even-stricter
-- daily-reset anonymous demo tier).
--
-- Deliberately a SEPARATE table from `profiles`, not a column on it, and
-- with no direct UPDATE/INSERT policy for users at all -- only the
-- increment_page_usage() function (SECURITY DEFINER, scoped to auth.uid()
-- internally) can modify a row. If this were just a column on `profiles`
-- with the typical "users can update own profile" policy already in place
-- there, a signed-in user could trivially reset their own count to 0 via
-- the client SDK, defeating the whole point of a lifetime limit.

create table if not exists public.page_usage (
  user_id uuid primary key references auth.users(id) on delete cascade,
  lifetime_pages_used integer not null default 0,
  updated_at timestamptz not null default now()
);

alter table public.page_usage enable row level security;

-- Users can see their own usage (e.g. to show "3 of 10 used" in the UI),
-- but cannot write to this table directly at all.
create policy "Users can view own page usage"
  on public.page_usage for select
  to authenticated
  using (auth.uid() = user_id);

-- Atomic check-and-increment, shared by both PDF and image uploads. Row-
-- locked (`for update`) so two simultaneous uploads from the same user
-- (e.g. two open tabs) can't both succeed past the limit. Returns true and
-- reserves the quota if there's enough left; returns false and leaves the
-- count unchanged if not.
create or replace function public.increment_page_usage(p_count integer, p_limit integer)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  current_count integer;
begin
  insert into public.page_usage (user_id, lifetime_pages_used)
  values (auth.uid(), 0)
  on conflict (user_id) do nothing;

  select lifetime_pages_used into current_count
  from public.page_usage
  where user_id = auth.uid()
  for update;

  if current_count + p_count > p_limit then
    return false;
  end if;

  update public.page_usage
  set lifetime_pages_used = lifetime_pages_used + p_count,
      updated_at = now()
  where user_id = auth.uid();

  return true;
end;
$$;

grant execute on function public.increment_page_usage(integer, integer) to authenticated;

-- Read-only helper for displaying current usage in the UI (billing page,
-- upload page) without needing broader table access than the SELECT
-- policy above already allows.
create or replace function public.get_page_usage()
returns integer
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(
    (select lifetime_pages_used from public.page_usage where user_id = auth.uid()),
    0
  );
$$;

grant execute on function public.get_page_usage() to authenticated;
