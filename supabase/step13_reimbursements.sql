-- Stewardify step 13: recording reimbursements (Pending → Approved → Reimbursed)
-- Run this whole file in a NEW, EMPTY SQL Editor tab, AFTER step12_budgets.sql.
-- It only RECORDS that a payment happened outside the app; no money moves.
-- It is safe to run more than once. Everything runs together: if any part
-- fails, nothing is changed.

begin;


-- ============================================================
-- 1. A NEW STATUS, "reimbursed"
-- ============================================================

alter table public.expenses drop constraint if exists expenses_status_check;
alter table public.expenses
  add constraint expenses_status_check
  check (status in ('pending', 'approved', 'rejected', 'reimbursed'));


-- ============================================================
-- 2. HOW THE MINISTRY PAID THE SUBMITTER BACK ("Reimbursed via")
-- ============================================================

alter table public.expenses add column if not exists reimbursed_via text;
alter table public.expenses add column if not exists reimbursed_on date;
alter table public.expenses add column if not exists reimbursement_ref text;
alter table public.expenses add column if not exists reimbursement_note text;
alter table public.expenses add column if not exists reimbursed_by uuid references public.profiles (id) on delete set null;
alter table public.expenses add column if not exists reimbursed_at timestamptz;

alter table public.expenses drop constraint if exists expenses_reimbursed_via_check;
alter table public.expenses
  add constraint expenses_reimbursed_via_check
  check (reimbursed_via is null or reimbursed_via in ('Cash', 'GCash', 'Maya', 'Bank transfer', 'Check'));

alter table public.expenses drop constraint if exists expenses_reimbursement_text_check;
alter table public.expenses
  add constraint expenses_reimbursement_text_check
  check (
    (reimbursement_ref is null or length(reimbursement_ref) <= 100)
    and (reimbursement_note is null or length(reimbursement_note) <= 500)
  );

-- A reimbursed expense always says how and when; nothing else has those.
alter table public.expenses drop constraint if exists expenses_reimbursed_fields_check;
alter table public.expenses
  add constraint expenses_reimbursed_fields_check
  check ((status = 'reimbursed') = (reimbursed_via is not null and reimbursed_on is not null));

create index if not exists expenses_reimbursed_by_idx on public.expenses (reimbursed_by);


-- ============================================================
-- 3. THE ACTIVITY LOG CAN RECORD REIMBURSEMENTS AND UNDOS
-- ============================================================

alter table public.expense_decisions add column if not exists details text;

alter table public.expense_decisions drop constraint if exists expense_decisions_old_status_check;
alter table public.expense_decisions
  add constraint expense_decisions_old_status_check
  check (old_status in ('pending', 'approved', 'rejected', 'reimbursed'));

alter table public.expense_decisions drop constraint if exists expense_decisions_new_status_check;
alter table public.expense_decisions
  add constraint expense_decisions_new_status_check
  check (new_status in ('pending', 'approved', 'rejected', 'reimbursed'));

alter table public.expense_decisions drop constraint if exists expense_decisions_kind_check;
alter table public.expense_decisions
  add constraint expense_decisions_kind_check
  check (kind in ('decision', 'resubmission', 'reimbursement', 'undo_reimbursement'));


-- ============================================================
-- 4. THE STAMP-AND-LOG STEP, NOW WITH REIMBURSEMENTS
-- ============================================================
-- Same as step 10, plus:
--   - "reimbursed" can only come from "approved", and must say how and when.
--     The database records who marked it and the time, and keeps the
--     original approval (approver, time, comment) untouched.
--   - A reimbursed expense can only go back to "approved" (an undo).
--     The undo clears the reimbursement details; the reason is logged.
--   - Any other change clears the reimbursement fields.

create or replace function public.stamp_review()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
declare
  decision_comment text := nullif(trim(coalesce(new.review_comment, '')), '');
  is_resubmission boolean :=
    old.submitted_by = auth.uid() and old.status = 'rejected' and new.status = 'pending';
  is_reimbursing boolean := old.status = 'approved' and new.status = 'reimbursed';
  is_undoing boolean := old.status = 'reimbursed' and new.status = 'approved';
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

  if new.status = 'reimbursed' and not is_reimbursing then
    raise exception 'Only approved expenses can be marked as reimbursed.';
  end if;

  if old.status = 'reimbursed' and not is_undoing then
    raise exception 'A reimbursed expense can only be moved back to Approved.';
  end if;

  -- Approved → Reimbursed
  if is_reimbursing then
    if new.reimbursed_via is null or new.reimbursed_on is null then
      raise exception 'Please choose how and when it was reimbursed.';
    end if;
    new.reimbursement_ref := nullif(trim(coalesce(new.reimbursement_ref, '')), '');
    new.reimbursement_note := nullif(trim(coalesce(new.reimbursement_note, '')), '');
    new.reimbursed_by := auth.uid();
    new.reimbursed_at := now();
    new.reviewed_by := old.reviewed_by;
    new.reviewed_at := old.reviewed_at;
    new.review_comment := old.review_comment;

    insert into public.expense_decisions (expense_id, decided_by, old_status, new_status, comment, kind, details)
    values (
      new.id, auth.uid(), old.status, new.status, new.reimbursement_note, 'reimbursement',
      new.reimbursed_via || ' · paid ' || to_char(new.reimbursed_on, 'Mon FMDD, YYYY')
        || coalesce(' · Ref ' || new.reimbursement_ref, '')
    );
    return new;
  end if;

  -- Reimbursed → Approved (undo). The reason comes in the note field.
  if is_undoing then
    insert into public.expense_decisions (expense_id, decided_by, old_status, new_status, comment, kind, details)
    values (
      new.id, auth.uid(), old.status, new.status,
      nullif(trim(coalesce(new.reimbursement_note, '')), ''),
      'undo_reimbursement',
      'Was: ' || old.reimbursed_via || ' · paid ' || to_char(old.reimbursed_on, 'Mon FMDD, YYYY')
        || coalesce(' · Ref ' || old.reimbursement_ref, '')
    );
    new.reimbursed_via := null;
    new.reimbursed_on := null;
    new.reimbursement_ref := null;
    new.reimbursement_note := null;
    new.reimbursed_by := null;
    new.reimbursed_at := null;
    new.reviewed_by := old.reviewed_by;
    new.reviewed_at := old.reviewed_at;
    new.review_comment := old.review_comment;
    return new;
  end if;

  -- Every other change: as before.
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

  new.reimbursed_via := null;
  new.reimbursed_on := null;
  new.reimbursement_ref := null;
  new.reimbursement_note := null;
  new.reimbursed_by := null;
  new.reimbursed_at := null;

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
-- 5. WHO MAY MARK (OR UNDO) A REIMBURSEMENT
-- ============================================================
-- The app may now fill in the reimbursement details; the rules decide when.
-- (Who marked it, and when, are always set by the database itself.)

grant update (reimbursed_via, reimbursed_on, reimbursement_ref, reimbursement_note)
  on public.expenses to authenticated;

-- Replaces step 7's approver rule. Approvers may change the status of
-- other people's expenses (never their own). The stamp-and-log step above
-- decides which changes are allowed and fills in who and when, so those
-- can't be faked. Submitters still only have the resubmit rule, so they can
-- never mark anything as reimbursed.
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
    and status in ('pending', 'approved', 'rejected', 'reimbursed')
  );


commit;
