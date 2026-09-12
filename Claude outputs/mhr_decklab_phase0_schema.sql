-- =====================================================================
-- MHR DECK LAB — Phase 0: database schema for login, deck sharing,
-- and the card collection tracker.
--
-- HOW TO APPLY:
-- 1. Open your Supabase project at https://supabase.com/dashboard
-- 2. Left sidebar -> SQL Editor -> "New query"
-- 3. Paste this whole file, click "Run"
-- 4. You should see "Success. No rows returned"
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. PROFILES — one row per user, public display name
-- ---------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default 'Player',
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Anyone (including logged-out visitors) can read display names —
-- needed so a shared deck can show "by <name>".
create policy "profiles are publicly readable"
  on public.profiles for select
  using (true);

-- You can only edit your own profile row.
create policy "users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Auto-create a profile row the moment someone signs up, using the
-- name they entered at signup (falls back to "Player" if not given).
create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', 'Player'));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();


-- ---------------------------------------------------------------------
-- 2. DECKS — saved deck builds, optionally published publicly with a
--    playstyle/opinion write-up.
-- ---------------------------------------------------------------------
create table public.decks (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  deck_code text not null,        -- reuses the site's existing deck-code format
  playstyle text not null default '', -- the author's opinion/playstyle notes
  is_public boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index decks_owner_idx on public.decks(owner_id);
create index decks_public_idx on public.decks(is_public) where is_public = true;

alter table public.decks enable row level security;

-- Anyone can read a deck that's marked public; owners can always read
-- their own (even private/draft ones).
create policy "public decks are readable by anyone"
  on public.decks for select
  using (is_public = true or auth.uid() = owner_id);

-- You can only create decks under your own account.
create policy "users can insert own decks"
  on public.decks for insert
  with check (auth.uid() = owner_id);

-- You can only edit or delete your own decks.
create policy "users can update own decks"
  on public.decks for update
  using (auth.uid() = owner_id);

create policy "users can delete own decks"
  on public.decks for delete
  using (auth.uid() = owner_id);

-- keep updated_at current on every edit
create function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger decks_set_updated_at
  before update on public.decks
  for each row execute procedure public.set_updated_at();


-- ---------------------------------------------------------------------
-- 3. COLLECTION — each user's "which cards do I own" tracker.
--    One row per user; cards stored as {"BP01-001": 2, "SP01-021": 1, ...}
-- ---------------------------------------------------------------------
create table public.collection (
  user_id uuid primary key references auth.users(id) on delete cascade,
  cards jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.collection enable row level security;

-- Private by default — only you can read your own collection.
create policy "users can read own collection"
  on public.collection for select
  using (auth.uid() = user_id);

create policy "users can insert own collection"
  on public.collection for insert
  with check (auth.uid() = user_id);

create policy "users can update own collection"
  on public.collection for update
  using (auth.uid() = user_id);

create trigger collection_set_updated_at
  before update on public.collection
  for each row execute procedure public.set_updated_at();
