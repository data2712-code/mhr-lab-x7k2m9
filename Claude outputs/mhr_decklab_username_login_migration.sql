-- =====================================================================
-- MHR DECK LAB — Login by username (v6.33)
--
-- Lets people log in with their USERNAME + password instead of their
-- email. Supabase Auth itself only knows how to sign in with email +
-- password, so this adds one small, carefully-scoped database function
-- that translates "username + password" -> "email" — but ONLY when the
-- password is actually correct. The app then uses that email to sign in
-- for real through Supabase Auth (the actual login is still 100% done by
-- Supabase Auth's own password check — this function is just the
-- translation step, not a replacement for it).
--
-- WHY IT ONLY RETURNS THE EMAIL ON A CORRECT PASSWORD (not just for any
-- valid username): if it returned the email for any existing username,
-- anyone could type in usernames one by one and harvest real email
-- addresses. By checking the password first (using the same bcrypt
-- hashing Supabase itself uses, via the pgcrypto extension already
-- enabled on this project), a wrong guess reveals nothing at all — same
-- as a normal "invalid username or password" message.
--
-- HOW TO APPLY:
-- 1. Open your Supabase project at https://supabase.com/dashboard
-- 2. Left sidebar -> SQL Editor -> "New query"
-- 3. Paste this whole file, click "Run"
-- 4. You should see "Success. No rows returned"
-- =====================================================================

create or replace function public.verify_login(p_username text, p_password text)
returns text
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  found_email text;
  found_hash text;
begin
  select u.email, u.encrypted_password
    into found_email, found_hash
  from auth.users u
  join public.profiles p on p.id = u.id
  where lower(p.username) = lower(p_username)
  limit 1;

  if found_hash is null then
    return null;
  end if;

  if found_hash = crypt(p_password, found_hash) then
    return found_email;
  end if;

  return null;
end;
$$;

-- Only ever callable through the app's anon/signed-in key, never directly
-- readable/listable by anyone — same "narrow single-purpose function"
-- pattern as the rest of this project's RLS design.
revoke all on function public.verify_login(text, text) from public;
grant execute on function public.verify_login(text, text) to anon, authenticated;
