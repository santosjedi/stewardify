-- Stewardify step 10: "Needed by" and "Revise by" dates
-- Run this whole file in the Supabase SQL Editor, AFTER step9_categories.sql.
-- It is safe to run more than once. Everything runs together: if any part
-- fails, nothing is changed.

begin;


-- ============================================================
-- 1. TWO NEW OPTIONAL DATES
-- ============================================================
--   needed_by: set by the submitter when submitting (or resubmitting)
--   revise_by: set by an approver when rejecting, for the resubmission

alter table public.expenses add column if not exists needed_by date;
alter table public.expenses add column if not exists revise_by date;

-- "Revise by" only makes sense on a rejected expense.
alter table public.expenses drop constraint if exists expenses_revise_by_check;
alter table public.expenses
  add constraint expenses_revise_by_check
  check (status = 'rejected' or revise_by is null);


-- ============================================================
-- 2. THE STAMP-AND-LOG STEP ALSO HANDLES THE NEW DATES
-- ============================================================
-- Same as step 9, plus:
--   - "Needed by" counts as a detail: only the submitter may change it,
--     and only when resubmitting a rejected expense.
--   - "Revise by" is kept only when the new status is "rejected";
--     approving, resubmitting, or moving back to pending clears it.

create or replace function public.stamp_review()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
declare
  decision_comment text := nullif(trim(coalesce(new.review_comment, '')), '');
  is_resubmission boolean :=
    old.submitted_by = auth.uid() and old.status = 'rejected' and new.status = 'pending';
  details_changed boolean :=
    (new.expense_date, new.description, new.category, new.category_other, new.amount_php,
     new.note, new.receipt_path, new.needed_by)
    is distinct from
    (old.expense_date, old.description, old.category, old.category_other, old.amount_php,
     old.note, old.receipt_path, old.needed_by);
begin
  if new.status is not distinct from old.status then
    raise exception 'To change a decision, choose a different status.';
  end if;

  if details_changed and not is_resubmission then
    raise exception 'Expense details can only be edited by the submitter when resubmitting a rejected expense.';
  end if;

  if new.status = 'pending' then
    new.reviewed_by := null;
    new.reviewed_at := null;
    new.review_comment := null;
  else
    new.reviewed_by := auth.uid();
    new.reviewed_at := now();
  end if;

  if new.status <> 'rejected' then
    new.revise_by := null;
  end if;

  insert into public.expense_decisions (expense_id, decided_by, old_status, new_status, comment, kind)
  values (
    new.id,
    auth.uid(),
    old.status,
    new.status,
    case when is_resubmission then null else decision_comment end,
    case when is_resubmission then 'resubmission' else 'decision' end
  );

  return new;
end;
$$;

revoke execute on function public.stamp_review() from public, anon, authenticated;


-- ============================================================
-- 3. WHO MAY SET THE NEW DATES
-- ============================================================
-- The app may now change these two columns too. The existing rules decide when:
--   - needed_by: on new expenses (the "add" rule), and by the submitter when
--     resubmitting (the "resubmit" rule plus the guard above).
--   - revise_by: only by approvers, because only the approvers' rule lets anyone
--     set an expense to "rejected", and the guard above clears it otherwise.

grant update (needed_by, revise_by) on public.expenses to authenticated;

-- A brand-new expense can't arrive with a "Revise by" date.
drop policy if exists "Add own pending expenses" on public.expenses;
create policy "Add own pending expenses"
  on public.expenses
  for insert
  to authenticated
  with check (
    submitted_by = (select auth.uid())
    and status = 'pending'
    and reviewed_by is null
    and review_comment is null
    and revise_by is null
    and (receipt_path is null or receipt_path like (select auth.uid())::text || '/%')
    and (category <> 'Other' or category_other is not null)
  );


commit;
