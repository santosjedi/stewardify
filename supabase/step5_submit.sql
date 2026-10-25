-- Stewardify step 5: submitting expenses and receipt photos
-- Run this whole file in the Supabase SQL Editor, AFTER step4_accounts.sql.
-- It is safe to run more than once.


-- ============================================================
-- 1. REMOVE THE SAMPLE ROWS
-- ============================================================
-- The 3 rows typed in by hand have no owner, so delete them.
-- (Any expense with no owner is one of those sample rows.)

delete from public.expenses where submitted_by is null;


-- ============================================================
-- 2. TIGHTEN THE EXPENSES TABLE
-- ============================================================

-- Every expense must now belong to someone.
-- If a person's account is deleted, their expenses are deleted with it.
alter table public.expenses
  drop constraint if exists expenses_submitted_by_fkey;
alter table public.expenses
  add constraint expenses_submitted_by_fkey
  foreign key (submitted_by) references public.profiles (id) on delete cascade;
alter table public.expenses alter column submitted_by set not null;

-- Only these four categories are allowed.
alter table public.expenses drop constraint if exists expenses_category_check;
alter table public.expenses
  add constraint expenses_category_check
  check (category in ('Transport', 'Food', 'Supplies', 'Other'));

-- The description can't be blank.
alter table public.expenses drop constraint if exists expenses_description_check;
alter table public.expenses
  add constraint expenses_description_check
  check (length(trim(description)) > 0);


-- ============================================================
-- 3. LET PEOPLE ADD THEIR OWN EXPENSES
-- ============================================================
-- A new expense must:
--   - belong to the person adding it
--   - start as "pending", with no reviewer or review comment
--   - point to a receipt in that person's own folder (or have no receipt)

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
  );

grant insert on public.expenses to authenticated;


-- ============================================================
-- 4. RECEIPT PHOTO RULES (the private "receipts" bucket)
-- ============================================================
-- Each person's photos go in a folder named after their account ID,
-- like  receipts/<their id>/photo.jpg

-- People can upload only into their own folder.
drop policy if exists "Upload own receipts" on storage.objects;
create policy "Upload own receipts"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'receipts'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

-- People can view their own photos. Approvers can view everyone's.
drop policy if exists "View own receipts, or all if approver" on storage.objects;
create policy "View own receipts, or all if approver"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'receipts'
    and (
      (storage.foldername(name))[1] = (select auth.uid())::text
      or (select public.is_approver())
    )
  );

-- Nobody can change or delete a receipt through the app (no rules for that).

-- Accept only JPG, PNG, and WebP photos (the kinds every browser can show), up to 5 MB.
update storage.buckets
set allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp'],
    file_size_limit = 5242880
where id = 'receipts';
