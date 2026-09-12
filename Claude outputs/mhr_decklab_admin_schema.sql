-- =====================================================================
-- MHR DECK LAB — Admin role (v6.31)
--
-- Adds a way for your own account to have elevated ("admin") access —
-- currently used for the proxy-printing panel in the Deck Builder, and
-- lays the groundwork for moderating public decks once deck
-- sharing (Phase 3) ships.
--
-- HOW TO APPLY:
-- 1. Open your Supabase project at https://supabase.com/dashboard
-- 2. Left sidebar -> SQL Editor -> "New query"
-- 3. Paste the CREATE TABLE / POLICY block below (everything above the
--    "MAKE YOUR OWN ACCOUNT ADMIN" section), click "Run"
-- 4. You should see "Success. No rows returned"
-- 5. IMPORTANT: sign up on the live site first (mhrdecklab.com) with the
--    email/password account you want to use as your admin account, if you
--    haven't already — the INSERT below needs that account to already
--    exist.
-- 6. Then come back here, edit the email address in the last statement to
--    match the account you signed up with, and run just that statement.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. ADMIN_USERS — who has elevated access.
--
-- Deliberately its OWN table, not a column on `profiles`. `profiles` is
-- editable by its owner through the app (e.g. changing display name), so
-- a flag living there could — in theory, if a future edit to the update
-- policy went wrong — be something a user could set on themselves. This
-- table has NO insert/update/delete policy for ANY role, so the only way
-- to add or remove an admin, ever, is to run SQL directly here — no
-- signed-in session, including an admin's own, can grant admin access
-- through the site itself.
-- ---------------------------------------------------------------------
create table public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.admin_users enable row level security;

-- A signed-in user may check only whether THEY are an admin (this is what
-- the site uses to decide whether to show the proxy-print button, and
-- later, moderation controls) — they can never list or edit the table.
create policy "users can check own admin status"
  on public.admin_users for select
  using (auth.uid() = user_id);


-- ---------------------------------------------------------------------
-- 2. MODERATION — let an admin hide or delete ANY public deck, not just
--    their own. These sit ALONGSIDE the "users can update own decks" /
--    "users can delete own decks" policies from the Phase 0 schema —
--    Postgres combines multiple permissive policies with OR, so a deck's
--    own owner keeps managing it exactly as before; this only adds a
--    second way in, for admins, over anyone else's deck.
--
--    There's no UI for this yet — the `decks` table isn't used by any
--    page until deck publishing (Phase 3) ships — but the policies are
--    safe to add now and mean Phase 3 won't need another migration for
--    moderation later.
-- ---------------------------------------------------------------------
create policy "admins can update any deck"
  on public.decks for update
  using (exists (select 1 from public.admin_users a where a.user_id = auth.uid()));

create policy "admins can delete any deck"
  on public.decks for delete
  using (exists (select 1 from public.admin_users a where a.user_id = auth.uid()));


-- ---------------------------------------------------------------------
-- 3. MAKE YOUR OWN ACCOUNT ADMIN (one-time, run separately)
--
--    Replace the email below with the one you signed up with on the live
--    site (email/password account — not a Google account, since Google
--    sign-in has been removed). Run this AFTER that account already
--    exists (sign up on the site first if you haven't).
-- ---------------------------------------------------------------------
insert into public.admin_users (user_id)
select id from auth.users where email = 'REPLACE_WITH_YOUR_LOGIN_EMAIL';

-- To check it worked:
-- select * from public.admin_users;

-- To remove an admin later, just delete their row:
-- delete from public.admin_users where user_id = (select id from auth.users where email = '...');
