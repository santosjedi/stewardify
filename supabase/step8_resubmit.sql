-- Stewardify step 8: fixing and resubmitting rejected expenses
-- Run this whole file in the Supabase SQL Editor, AFTER step7_change_decisions.sql.
-- It is safe to run more than once.


-- ============================================================
-- 1. THE LOG CAN TELL DECISIONS AND RESUBMISSIONS APART
-- ============================================================

alter table public.expense_decisions
  add column if not exists kind text not null default 'decision'
  check (kind in ('decision', 'resubmission'));


-- ============================================================
-- 2. STAMPING, LOGGING, AND GUARDING EVERY CHANGE
-- ============================================================
-- Replaces step 7's version. It still stamps and logs every status change.
-- New: the expense's details (date, description, category, amount, note,
-- receipt) may change ONLY when its own submitter resubmits it after a
-- rejection. Any other attempt to edit details is refused, even by approvers.

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
    (new.expense_date, new.description, new.category, new.amount_php, new.note, new.receipt_path)
    is distinct from
    (old.expense_date, old.description, old.category, old.amount_php, old.note, old.receipt_path);
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
-- 3. SUBMITTERS MAY NOW CHANGE THE DETAILS COLUMNS (rules below decide when)
-- ============================================================

grant update (expense_date, description, category, amount_php, note, receipt_path)
  on public.expenses to authenticated;


-- ============================================================
-- 4. ROW LEVEL SECURITY: WHO MAY RESUBMIT
-- ============================================================
-- A submitter may update an expense only if:
--   - it is their own, and it is currently "rejected"
--   - the result is "pending" with no reviewer (never approved or rejected)
--   - any receipt is in their own folder
-- Pending and approved expenses can't be edited by their submitter at all.
-- (Approvers keep step 7's rule for decisions on other people's expenses.)

drop policy if exists "Submitters resubmit own rejected expenses" on public.expenses;
create policy "Submitters resubmit own rejected expenses"
  on public.expenses
  for update
  to authenticated
  using (
    submitted_by = (select auth.uid())
    and status = 'rejected'
  )
  with check (
    submitted_by = (select auth.uid())
    and status = 'pending'
    and reviewed_by is null
    and (receipt_path is null or receipt_path like (select auth.uid())::text || '/%')
  );
