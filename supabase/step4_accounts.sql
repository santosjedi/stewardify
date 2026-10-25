-- Stewardify step 4: accounts and tighter security
-- Run this whole file in the Supabase SQL Editor, AFTER schema.sql.
-- It is safe to run more than once.


-- ============================================================
-- 1. AUTO-CREATE A PROFILE WHEN SOMEONE SIGNS UP
-- ============================================================
-- When a new login is created, add a matching row to profiles.
-- The name comes from the sign-up form. Everyone starts as a
-- "submitter"; change someone to "approver" by hand in the Table Editor.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data ->> 'full_name', ''), new.email),
    'submitter'
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Give a profile to anyone who signed up before this trigger existed.
insert into public.profiles (id, full_name, role)
select id, coalesce(nullif(raw_user_meta_data ->> 'full_name', ''), email), 'submitter'
from auth.users
on conflict (id) do nothing;


-- ============================================================
-- 2. HELPER: "is the signed-in person an approver?"
-- ============================================================
-- The security rules below use this. It runs with extra rights so it can
-- look at profiles without tripping over the profiles rules themselves.

create or replace function public.is_approver()
returns boolean
language sql
stable
security definer set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role = 'approver'
  );
$$;

revoke execute on function public.is_approver() from public, anon;
grant execute on function public.is_approver() to authenticated;


-- ============================================================
-- 3. EXPENSES: replace the temporary "anyone can read" rule
-- ============================================================

drop policy if exists "TEMPORARY: anyone can read expenses" on public.expenses;
revoke select on public.expenses from anon;

-- Submitters see only their own expenses. Approvers see everything.
drop policy if exists "Read own expenses, or all if approver" on public.expenses;
create policy "Read own expenses, or all if approver"
  on public.expenses
  for select
  to authenticated
  using (submitted_by = (select auth.uid()) or (select public.is_approver()));

grant select on public.expenses to authenticated;

-- New expenses belong to whoever is signed in, automatically.
alter table public.expenses alter column submitted_by set default auth.uid();

-- TODO (step 5, submit form): add a rule that lets people add their own expenses,
-- then make submitted_by "not null". The sample rows you typed by hand
-- have no owner yet, so give each one an owner (or delete them) first.


-- ============================================================
-- 4. PROFILES: read your own, approvers read everyone's
-- ============================================================
-- Nobody can change profiles through the app (there is no update rule),
-- so a submitter cannot promote themselves to approver.

drop policy if exists "Read own profile, or all if approver" on public.profiles;
create policy "Read own profile, or all if approver"
  on public.profiles
  for select
  to authenticated
  using (id = (select auth.uid()) or (select public.is_approver()));

grant select on public.profiles to authenticated;


-- TODO (step 5, submit form): add storage rules for the "receipts" bucket so
-- people can upload and view their own receipt photos.
