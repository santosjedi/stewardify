-- Stewardify step 7: changing decisions, with an activity log
-- Run this whole file in the Supabase SQL Editor, AFTER step6_approvals.sql.
-- It is safe to run more than once.


-- ============================================================
-- 1. THE DECISION LOG (the only new table)
-- ============================================================
-- One row per decision: who made it, when, the old and new status, and the comment.

create table if not exists public.expense_decisions (
  id          bigint generated always as identity primary key,
  expense_id  uuid not null references public.expenses (id) on delete cascade,
  decided_by  uuid references public.profiles (id) on delete set null,
  old_status  text not null check (old_status in ('pending', 'approved', 'rejected')),
  new_status  text not null check (new_status in ('pending', 'approved', 'rejected')),
  comment     text,
  created_at  timestamptz not null default now()
);

create index if not exists expense_decisions_expense_id_idx on public.expense_decisions (expense_id);
create index if not exists expense_decisions_decided_by_idx on public.expense_decisions (decided_by);

-- Add the decisions made before this log existed (once only).
insert into public.expense_decisions (expense_id, decided_by, old_status, new_status, comment, created_at)
select e.id, e.reviewed_by, 'pending', e.status, e.review_comment, coalesce(e.reviewed_at, now())
from public.expenses e
where e.status <> 'pending'
  and not exists (select 1 from public.expense_decisions d where d.expense_id = e.id);


-- ============================================================
-- 2. EVERY STATUS CHANGE IS STAMPED AND LOGGED BY THE DATABASE
-- ============================================================
-- Replaces step 6's version. When the status changes:
--   - approved/rejected: records the signed-in person and the time
--   - back to pending: clears the reviewer, time, and comment
--   - either way: adds a row to the decision log
-- Saving without changing the status is refused, so a comment can't be
-- quietly edited without a log entry.
-- It runs with extra rights so it can write the log; people can't write it directly.

create or replace function public.stamp_review()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
declare
  decision_comment text := nullif(trim(coalesce(new.review_comment, '')), '');
begin
  if new.status is not distinct from old.status then
    raise exception 'To change a decision, choose a different status.';
  end if;

  if new.status = 'pending' then
    new.reviewed_by := null;
    new.reviewed_at := null;
    new.review_comment := null;
  else
    new.reviewed_by := auth.uid();
    new.reviewed_at := now();
  end if;

  insert into public.expense_decisions (expense_id, decided_by, old_status, new_status, comment)
  values (new.id, auth.uid(), old.status, new.status, decision_comment);

  return new;
end;
$$;

revoke execute on function public.stamp_review() from public, anon, authenticated;

drop trigger if exists stamp_review on public.expenses;
create trigger stamp_review
  before update on public.expenses
  for each row execute function public.stamp_review();


-- ============================================================
-- 3. ROW LEVEL SECURITY: WHO MAY MAKE OR CHANGE A DECISION
-- ============================================================
-- Replaces step 6's "pending only" rule. An update is allowed only if:
--   - the person is an approver
--   - it is NOT their own expense
--   - the result is approved/rejected with them as the reviewer,
--     or pending with no reviewer
-- Submitters still have no update rule, so they can't change any status.

drop policy if exists "Approvers review others' pending expenses" on public.expenses;
drop policy if exists "Approvers decide on others' expenses" on public.expenses;
create policy "Approvers decide on others' expenses"
  on public.expenses
  for update
  to authenticated
  using (
    (select public.is_approver())
    and submitted_by <> (select auth.uid())
  )
  with check (
    (select public.is_approver())
    and submitted_by <> (select auth.uid())
    and (
      (status in ('approved', 'rejected') and reviewed_by = (select auth.uid()))
      or (status = 'pending' and reviewed_by is null)
    )
  );


-- ============================================================
-- 4. WHO CAN SEE THE LOG
-- ============================================================
-- You can see the log of any expense you can see: your own, or all if approver.
-- Nobody can add, change, or delete log entries from the app.

alter table public.expense_decisions enable row level security;

drop policy if exists "Read the log of expenses you can see" on public.expense_decisions;
create policy "Read the log of expenses you can see"
  on public.expense_decisions
  for select
  to authenticated
  using (exists (select 1 from public.expenses e where e.id = expense_id));

revoke all on public.expense_decisions from anon, authenticated;
grant select on public.expense_decisions to authenticated;


-- ============================================================
-- 5. SUBMITTERS CAN SEE THE NAMES IN THEIR EXPENSES' LOGS
-- ============================================================
-- Replaces step 6's rule, which only covered the current reviewer.

drop policy if exists "Read names of your expenses' reviewers" on public.profiles;
create policy "Read names of your expenses' reviewers"
  on public.profiles
  for select
  to authenticated
  using (
    exists (
      select 1 from public.expenses e
      where e.submitted_by = (select auth.uid())
        and (
          e.reviewed_by = profiles.id
          or exists (
            select 1 from public.expense_decisions d
            where d.expense_id = e.id and d.decided_by = profiles.id
          )
        )
    )
  );
