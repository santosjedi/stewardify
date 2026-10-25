-- Stewardify step 11: in-app reminders ("since your last visit")
-- Run this whole file in a NEW, EMPTY SQL Editor tab, AFTER step10_deadlines.sql.
-- It is safe to run more than once. Everything runs together: if any part
-- fails, nothing is changed.

begin;


-- ============================================================
-- 1. REMEMBER WHEN EACH PERSON LAST CHECKED THEIR REMINDERS
-- ============================================================
-- Approvals and rejections after this time count as "new" for them.

alter table public.profiles add column if not exists notifications_seen_at timestamptz;


-- ============================================================
-- 2. "MARK AS READ": a safe way to update only that one field
-- ============================================================
-- People still can't edit their profile directly (so nobody can change their
-- own role). This function only ever sets the signed-in person's own
-- "last checked" time to now.

create or replace function public.mark_notifications_seen()
returns void
language sql
security definer set search_path = ''
as $$
  update public.profiles
  set notifications_seen_at = now()
  where id = (select auth.uid());
$$;

revoke execute on function public.mark_notifications_seen() from public, anon;
grant execute on function public.mark_notifications_seen() to authenticated;


commit;
