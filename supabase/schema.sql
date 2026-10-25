-- Stewardify database setup
-- Run this whole file in the Supabase SQL Editor.
-- It is safe to run more than once: it skips anything that already exists.


-- ============================================================
-- 1. PROFILES: one row per person who uses the app
-- ============================================================
-- Each profile is tied to a Supabase login (auth.users).
-- Logins come in step 4; this table is ready for them.

create table if not exists public.profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  full_name  text not null,
  role       text not null default 'submitter'
             check (role in ('submitter', 'approver')),
  created_at timestamptz not null default now()
);


-- ============================================================
-- 2. EXPENSES: one row per expense someone submits
-- ============================================================

create table if not exists public.expenses (
  id             uuid primary key default gen_random_uuid(),
  expense_date   date not null,
  description    text not null,
  category       text not null,
  amount_php     numeric(12, 2) not null check (amount_php > 0),  -- amount in pesos
  note           text,
  receipt_path   text,  -- where the photo is saved in the "receipts" bucket
  status         text not null default 'pending'
                 check (status in ('pending', 'approved', 'rejected')),
  -- Optional for now so you can type test rows in by hand.
  -- See the TODO in step4_accounts.sql.
  submitted_by   uuid references public.profiles (id) on delete set null,
  reviewed_by    uuid references public.profiles (id) on delete set null,
  review_comment text,
  created_at     timestamptz not null default now()
);

-- Speed up the two lookups the app will do most:
-- "my expenses" and "everything waiting for review".
create index if not exists expenses_submitted_by_idx on public.expenses (submitted_by);
create index if not exists expenses_status_idx on public.expenses (status);


-- ============================================================
-- 3. ROW LEVEL SECURITY (who may see or change which rows)
-- ============================================================
-- With RLS on, nobody can read or write a row unless a policy allows it.

alter table public.profiles enable row level security;
alter table public.expenses enable row level security;

-- The rules for who can read expenses and profiles are in step4_accounts.sql.
-- (Step 2 had a temporary "anyone can read expenses" rule; step 4 removed it.)


-- ============================================================
-- 4. STORAGE: a private "receipts" bucket for receipt photos
-- ============================================================
-- Private means photos are not on the open internet; the app will
-- have to ask permission to show each one.
-- Limits: images only, up to 5 MB each.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('receipts', 'receipts', false, 5242880,
        array['image/jpeg', 'image/png', 'image/webp', 'image/heic'])
on conflict (id) do nothing;

-- No storage rules yet, so nobody can upload through the app.
-- See the TODO in step4_accounts.sql.
