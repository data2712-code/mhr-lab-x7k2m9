-- =====================================================================
-- MHR DECK LAB — Username (v6.32)
--
-- Renames the free-text "display_name" column on `profiles` to a proper
-- `username`: unique (case-insensitively — "Data2712" and "data2712" can't
-- both exist), 3-20 characters, letters/numbers/underscore only.
--
-- HOW TO APPLY:
-- 1. Open your Supabase project at https://supabase.com/dashboard
-- 2. Left sidebar -> SQL Editor -> "New query"
-- 3. Paste this whole file, click "Run"
-- 4. You should see "Success. No rows returned"
--
-- Safe to run whether or not anyone has signed up yet — if `profiles` is
-- empty this just changes the table shape; if there's already a row or two
-- (e.g. from testing) their existing display name carries over as-is into
-- the new `username` column, as long as it already happens to fit the
-- format rule below (3-20 chars, letters/numbers/underscore only) — if not,
-- this migration will fail with a constraint error naming the bad row, and
-- you'd just clean up that one row's value first, then re-run.
-- =====================================================================

-- 1. Rename the column — no data is lost, existing values carry over.
alter table public.profiles rename column display_name to username;

-- 2. Format rule: 3-20 characters, letters, numbers, underscore only (no
--    spaces, no emoji) — standard "username" shape.
alter table public.profiles
  add constraint username_format check (username ~ '^[A-Za-z0-9_]{3,20}$');

-- 3. Uniqueness, case-insensitive — the actual "no two people can be the
--    same username" rule. A plain UNIQUE constraint on `username` would
--    still let "Data2712" and "data2712" both exist; this index prevents
--    that too.
create unique index profiles_username_lower_idx on public.profiles (lower(username));

-- 4. Update the auto-create-profile trigger (fires on every signup) to
--    read `username` from the signup metadata instead of `display_name`.
--    The fallback (only used if something bypasses the app's own signup
--    form and calls the API directly without a username) is randomized
--    per-user so it can never collide with the new unique index.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, username)
  values (new.id, coalesce(new.raw_user_meta_data->>'username', 'player_' || substr(new.id::text, 1, 8)));
  return new;
end;
$$;
