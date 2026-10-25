-- Stewardify step 6: approvals
-- Run this whole file in the Supabase SQL Editor, AFTER step5_submit.sql.
-- It is safe to run more than once.


-- ============================================================
-- 1. RECORD WHEN AN EXPENSE WAS REVIEWED
-- ============================================================

alter table public.expenses add column if not exists reviewed_at timestamptz;

-- A rejection must come with a comment explaining why.
alter table public.expenses drop constraint if exists expenses_reject_needs_comment;
alter table public.expenses
  add constraint expenses_reject_needs_comment
  check (status <> 'rejected' or length(trim(coalesce(review_comment, ''))) > 0);


-- ============================================================
-- 2. FILL IN "WHO" AND "WHEN" AUTOMATICALLY
-- ============================================================
-- Whenever the status changes, the database itself records the signed-in
-- person as the reviewer and the current time. Nobody can fake either one.

create or replace function public.stamp_review()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status is distinct from old.status then
    new.reviewed_by := auth.uid();
    new.reviewed_at := now();
  end if;
  return new;
end;
$$;

drop trigger if exists stamp_review on public.expenses;
create trigger stamp_review
  before update on public.expenses
  for each row execute function public.stamp_review();


-- ============================================================
-- 3. ONLY THE REVIEW COLUMNS CAN EVER BE CHANGED
-- ============================================================
-- Signed-in people may change only status, reviewer, review time, and
-- comment. Date, description, amount, receipt, and owner can never be edited.
-- Visitors who aren't signed in can't touch the table at all.

revoke all on public.expenses from anon;
revoke update, delete, truncate on public.expenses from authenticated;
grant update (status, reviewed_by, reviewed_at, review_comment)
  on public.expenses to authenticated;


-- ============================================================
-- 4. ROW LEVEL SECURITY: WHO MAY MAKE A DECISION
-- ============================================================
-- An update is allowed only if:
--   - the person is an approver
--   - the expense is still pending (decisions are final)
--   - it is NOT their own expense
--   - the new status is approved or rejected, with them as the reviewer
-- Submitters have no update rule at all, so they can't change any status.

drop policy if exists "Approvers review others' pending expenses" on public.expenses;
create policy "Approvers review others' pending expenses"
  on public.expenses
  for update
  to authenticated
  using (
    (select public.is_approver())
    and status = 'pending'
    and submitted_by <> (select auth.uid())
  )
  with check (
    (select public.is_approver())
    and status in ('approved', 'rejected')
    and reviewed_by = (select auth.uid())
    and submitted_by <> (select auth.uid())
  );


-- ============================================================
-- 5. SUBMITTERS CAN SEE THE NAME OF WHOEVER REVIEWED THEIR EXPENSE
-- ============================================================

drop policy if exists "Read names of your expenses' reviewers" on public.profiles;
create policy "Read names of your expenses' reviewers"
  on public.profiles
  for select
  to authenticated
  using (
    exists (
      select 1 from public.expenses e
      where e.reviewed_by = profiles.id
        and e.submitted_by = (select auth.uid())
    )
  );

-- Profiles can't be added, changed, or deleted from the app.
revoke insert, update, delete, truncate on public.profiles from anon, authenticated;
