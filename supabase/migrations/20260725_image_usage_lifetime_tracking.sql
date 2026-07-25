-- Lifetime image-conversion usage tracking.
--
-- Deliberately a SEPARATE table from `profiles`, not a column on it, and
-- with no direct UPDATE/INSERT policy for users at all -- only the
-- increment_image_usage() function (SECURITY DEFINER, scoped to auth.uid()
-- internally) can modify a row. If this were just a column on `profiles`
-- with the typical "users can update own profile" policy already in place
-- there, a signed-in user could trivially reset their own count to 0 via
-- the client SDK, defeating the whole point of a lifetime limit.

create table if not exists public.image_usage (
  user_id uuid primary key references auth.users(id) on delete cascade,
  lifetime_pages_used integer not null default 0,
  updated_at timestamptz not null default now()
);

alter table public.image_usage enable row level security;

-- Users can see their own usage (e.g. to show "3 of 10 used" in the UI),
-- but cannot write to this table directly at all.
create policy "Users can view own image usage"
  on public.image_usage for select
  to authenticated
  using (auth.uid() = user_id);

-- Atomic check-and-increment. Row-locked (`for update`) so two simultaneous
-- uploads from the same user (e.g. two open tabs) can't both succeed past
-- the limit. Returns true and reserves the quota if there's enough left;
-- returns false and leaves the count unchanged if not.
create or replace function public.increment_image_usage(p_count integer, p_limit integer)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  current_count integer;
begin
  insert into public.image_usage (user_id, lifetime_pages_used)
  values (auth.uid(), 0)
  on conflict (user_id) do nothing;

  select lifetime_pages_used into current_count
  from public.image_usage
  where user_id = auth.uid()
  for update;

  if current_count + p_count > p_limit then
    return false;
  end if;

  update public.image_usage
  set lifetime_pages_used = lifetime_pages_used + p_count,
      updated_at = now()
  where user_id = auth.uid();

  return true;
end;
$$;

grant execute on function public.increment_image_usage(integer, integer) to authenticated;

-- Read-only helper for displaying current usage in the UI (e.g. account
-- settings, or a "3 of 10 images used" indicator) without needing broader
-- table access than the SELECT policy above already allows.
create or replace function public.get_image_usage()
returns integer
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(
    (select lifetime_pages_used from public.image_usage where user_id = auth.uid()),
    0
  );
$$;

grant execute on function public.get_image_usage() to authenticated;
