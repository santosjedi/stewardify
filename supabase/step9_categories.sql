-- Stewardify step 9: more expense categories, and "Other: please specify"
-- Run this whole file in the Supabase SQL Editor, AFTER step8_resubmit.sql.
-- It is safe to run more than once. Everything runs together: if any part
-- fails, nothing is changed.

begin;


-- ============================================================
-- 1. A PLACE TO SAVE THE "PLEASE SPECIFY" TEXT
-- ============================================================

alter table public.expenses add column if not exists category_other text;


-- ============================================================
-- 2. RENAME EXISTING EXPENSES' CATEGORIES TO THE NEW NAMES
-- ============================================================
--   Transport → Transportation
--   Food      → Meals & Food
--   Supplies  → Office Supplies
--   Other     → stays Other (shown as just "Other", since it has no specify text)
-- The automatic stamp-and-log step blocks edits to expense details, so it is
-- switched off only for these few lines, then switched straight back on.

alter table public.expenses drop constraint if exists expenses_category_check;

alter table public.expenses disable trigger stamp_review;
update public.expenses
set category = case category
  when 'Transport' then 'Transportation'
  when 'Food' then 'Meals & Food'
  when 'Supplies' then 'Office Supplies'
end
where category in ('Transport', 'Food', 'Supplies');
alter table public.expenses enable trigger stamp_review;


-- ============================================================
-- 3. THE NEW LIST OF CATEGORIES
-- ============================================================

alter table public.expenses
  add constraint expenses_category_check
  check (category in (
    'Transportation',
    'Meals & Food',
    'Office Supplies',
    'Printing & Documents',
    'Venue & Rentals',
    'Utilities',
    'Internet & Mobile Load',
    'Honorarium & Speaker Fees',
    'Outreach & Missions',
    'Scholarships & Benevolence',
    'Equipment',
    'Accommodation',
    'Other'
  ));

-- The specify text is only for "Other", and can't be blank or too long.
alter table public.expenses drop constraint if exists expenses_category_other_check;
alter table public.expenses
  add constraint expenses_category_other_check
  check (
    (category = 'Other' or category_other is null)
    and (category_other is null or length(trim(category_other)) between 1 and 100)
  );


-- ============================================================
-- 4. THE STAMP-AND-LOG STEP ALSO GUARDS THE SPECIFY TEXT
-- ============================================================
-- Same as step 8, with category_other added to the details that only the
-- submitter may change, and only when resubmitting a rejected expense.

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
    (new.expense_date, new.description, new.category, new.category_other, new.amount_php, new.note, new.receipt_path)
    is distinct from
    (old.expense_date, old.description, old.category, old.category_other, old.amount_php, old.note, old.receipt_path);
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

-- Submitters may set the specify text when resubmitting (the rules below decide when).
grant update (category_other) on public.expenses to authenticated;


-- ============================================================
-- 5. "OTHER" NEEDS A SPECIFICATION ON NEW AND RESUBMITTED EXPENSES
-- ============================================================
-- Same rules as steps 5 and 8, plus: if the category is "Other", the specify
-- text is required. (Older "Other" expenses without it can still be reviewed.)

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
    and (receipt_path is null or receipt_path like (select auth.uid())::text || '/%')
    and (category <> 'Other' or category_other is not null)
  );

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
    and (category <> 'Other' or category_other is not null)
  );


commit;
