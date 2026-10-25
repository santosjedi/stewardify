-- Stewardify step 14: optional expense detail fields, and a duplicate check
-- Run this whole file in a NEW, EMPTY SQL Editor tab, AFTER step13_reimbursements.sql.
-- It is safe to run more than once. Everything runs together: if any part
-- fails, nothing is changed.

begin;


-- ============================================================
-- 1. THE NEW OPTIONAL DETAILS (all can be left empty)
-- ============================================================
--   paid_vendor_via = how the submitter paid the store
--   (different from reimbursed_via = how the ministry paid the submitter back)

alter table public.expenses add column if not exists or_number text;        -- OR / Invoice number
alter table public.expenses add column if not exists vendor_name text;      -- Vendor / Merchant
alter table public.expenses add column if not exists paid_vendor_via text;  -- Paid vendor via
alter table public.expenses add column if not exists payment_ref text;      -- Reference / Transaction number
alter table public.expenses add column if not exists vendor_tin text;       -- Vendor TIN
alter table public.expenses add column if not exists project text;          -- Project / Program
alter table public.expenses add column if not exists attendees text;        -- Attendees (Meals & Food)

alter table public.expenses drop constraint if exists expenses_paid_vendor_via_check;
alter table public.expenses
  add constraint expenses_paid_vendor_via_check
  check (paid_vendor_via is null
         or paid_vendor_via in ('Cash', 'GCash', 'Maya', 'Bank transfer', 'Card', 'Check', 'Other'));

alter table public.expenses drop constraint if exists expenses_detail_lengths_check;
alter table public.expenses
  add constraint expenses_detail_lengths_check
  check (
    (or_number is null or length(or_number) <= 50)
    and (vendor_name is null or length(vendor_name) <= 120)
    and (payment_ref is null or length(payment_ref) <= 100)
    and (vendor_tin is null or length(vendor_tin) <= 20)
    and (project is null or length(project) <= 100)
    and (attendees is null or length(attendees) <= 500)
  );

-- A reference number only goes with GCash, Maya, Bank transfer, or Card.
alter table public.expenses drop constraint if exists expenses_payment_ref_check;
alter table public.expenses
  add constraint expenses_payment_ref_check
  check (payment_ref is null or paid_vendor_via in ('GCash', 'Maya', 'Bank transfer', 'Card'));

-- Attendees only go with Meals & Food.
alter table public.expenses drop constraint if exists expenses_attendees_check;
alter table public.expenses
  add constraint expenses_attendees_check
  check (attendees is null or category = 'Meals & Food');

-- Makes looking up an OR number + vendor quick.
create index if not exists expenses_or_vendor_idx
  on public.expenses (lower(trim(or_number)), lower(trim(vendor_name)));


-- ============================================================
-- 2. THE STAMP-AND-LOG STEP ALSO GUARDS THE NEW DETAILS
-- ============================================================
-- Same as step 13, with the seven new fields added to the details that only
-- the submitter may change, and only when resubmitting a rejected expense.

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
     new.note, new.receipt_path, new.needed_by,
     new.or_number, new.vendor_name, new.paid_vendor_via, new.payment_ref,
     new.vendor_tin, new.project, new.attendees)
    is distinct from
    (old.expense_date, old.description, old.category, old.category_other, old.amount_php,
     old.note, old.receipt_path, old.needed_by,
     old.or_number, old.vendor_name, old.paid_vendor_via, old.payment_ref,
     old.vendor_tin, old.project, old.attendees);
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

-- The submitter may set these when resubmitting (the rules above decide when).
grant update (or_number, vendor_name, paid_vendor_via, payment_ref, vendor_tin, project, attendees)
  on public.expenses to authenticated;


-- ============================================================
-- 3. DUPLICATE CHECK: "has this receipt possibly been submitted already?"
-- ============================================================
-- Submitters can only see their own expenses, so this function looks across
-- all expenses on their behalf, and answers only yes or no. It never reveals
-- whose expense it is or anything about it. Matching ignores capital letters
-- and extra spaces. "except_id" leaves out the expense being edited.

create or replace function public.possible_duplicate(or_no text, vendor text, except_id uuid default null)
returns boolean
language sql
stable
security definer set search_path = ''
as $$
  select exists (
    select 1 from public.expenses
    where nullif(trim(or_no), '') is not null
      and nullif(trim(vendor), '') is not null
      and lower(trim(or_number)) = lower(trim(or_no))
      and lower(trim(vendor_name)) = lower(trim(vendor))
      and (except_id is null or id <> except_id)
  );
$$;

revoke execute on function public.possible_duplicate(text, text, uuid) from public, anon;
grant execute on function public.possible_duplicate(text, text, uuid) to authenticated;


commit;
