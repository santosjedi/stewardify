-- Stewardify step 12: monthly budget goals per category
-- Run this whole file in a NEW, EMPTY SQL Editor tab, AFTER step11_reminders.sql.
-- It is safe to run more than once. Everything runs together: if any part
-- fails, nothing is changed.

begin;


-- ============================================================
-- 1. THE BUDGETS TABLE (the only new table)
-- ============================================================
-- One monthly budget per category, the same every month.
-- A category with no row simply has no budget.

create table if not exists public.category_budgets (
  category       text primary key
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
                 )),
  monthly_amount numeric(12, 2) not null check (monthly_amount >= 0),
  updated_by     uuid references public.profiles (id) on delete set null default auth.uid(),
  updated_at     timestamptz not null default now()
);


-- ============================================================
-- 2. ROW LEVEL SECURITY: ONLY APPROVERS SEE OR MANAGE BUDGETS
-- ============================================================

alter table public.category_budgets enable row level security;

drop policy if exists "Approvers read budgets" on public.category_budgets;
create policy "Approvers read budgets"
  on public.category_budgets
  for select
  to authenticated
  using ((select public.is_approver()));

drop policy if exists "Approvers add budgets" on public.category_budgets;
create policy "Approvers add budgets"
  on public.category_budgets
  for insert
  to authenticated
  with check ((select public.is_approver()) and updated_by = (select auth.uid()));

drop policy if exists "Approvers change budgets" on public.category_budgets;
create policy "Approvers change budgets"
  on public.category_budgets
  for update
  to authenticated
  using ((select public.is_approver()))
  with check ((select public.is_approver()) and updated_by = (select auth.uid()));

drop policy if exists "Approvers remove budgets" on public.category_budgets;
create policy "Approvers remove budgets"
  on public.category_budgets
  for delete
  to authenticated
  using ((select public.is_approver()));

revoke all on public.category_budgets from anon;
grant select, insert, update, delete on public.category_budgets to authenticated;


commit;
