-- NIGERIA 2027 account-backed story mode (Supabase/Postgres)
-- Apply this once in Supabase SQL Editor. The service-role key belongs ONLY on the server.

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  alias text not null default 'New Candidate' check (char_length(alias) between 1 and 26),
  party text not null default '',
  color text not null default '#d8f36b',
  state text not null default 'Lagos',
  career_track text not null default 'politics',
  game_save jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.meetings (
  id uuid primary key default gen_random_uuid(),
  host_id uuid references auth.users(id) on delete set null,
  host_name text not null default 'Meeting host',
  title text not null check (char_length(title) between 1 and 90),
  topic text not null default '' check (char_length(topic) <= 280),
  action_id text not null default '',
  location jsonb not null default '{}'::jsonb,
  status text not null default 'open' check (status in ('open','closed')),
  outcome jsonb,
  created_at timestamptz not null default now(),
  ended_at timestamptz
);

create table if not exists public.meeting_participants (
  meeting_id uuid not null references public.meetings(id) on delete cascade,
  participant_key text not null,
  user_id uuid references auth.users(id) on delete set null,
  display_name text not null default 'Player',
  joined_at timestamptz not null default now(),
  primary key (meeting_id, participant_key)
);

create table if not exists public.meeting_messages (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid not null references public.meetings(id) on delete cascade,
  sender_id uuid references auth.users(id) on delete set null,
  sender_name text not null default 'Player',
  kind text not null default 'speech' check (kind in ('speech','reply','summary')),
  body text not null check (char_length(body) between 1 and 500),
  reply_to uuid,
  created_at timestamptz not null default now()
);

create table if not exists public.meeting_votes (
  meeting_id uuid not null references public.meetings(id) on delete cascade,
  voter_key text not null,
  user_id uuid references auth.users(id) on delete set null,
  display_name text not null default 'Player',
  vote text not null check (vote in ('support','mixed','concern')),
  created_at timestamptz not null default now(),
  primary key (meeting_id, voter_key)
);

create table if not exists public.direct_messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references auth.users(id) on delete cascade,
  recipient_id uuid not null references auth.users(id) on delete cascade,
  sender_name text not null default 'Player',
  recipient_name text not null default 'Player',
  body text not null check (char_length(body) between 1 and 300),
  message_type text not null default 'text' check (message_type in ('text','meeting_invite')),
  meeting_id uuid references public.meetings(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint direct_messages_not_self check (sender_id <> recipient_id)
);

create index if not exists meetings_open_created_idx on public.meetings(status, created_at desc);
create index if not exists meeting_messages_meeting_created_idx on public.meeting_messages(meeting_id, created_at asc);
create index if not exists direct_messages_sender_created_idx on public.direct_messages(sender_id, created_at desc);
create index if not exists direct_messages_recipient_created_idx on public.direct_messages(recipient_id, created_at desc);
create unique index if not exists meeting_votes_account_unique on public.meeting_votes(meeting_id, user_id) where user_id is not null;

alter table public.profiles enable row level security;
alter table public.meetings enable row level security;
alter table public.meeting_participants enable row level security;
alter table public.meeting_messages enable row level security;
alter table public.meeting_votes enable row level security;
alter table public.direct_messages enable row level security;

drop policy if exists "profiles_read_own" on public.profiles;
create policy "profiles_read_own" on public.profiles for select to authenticated using (auth.uid() = id);
drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles for insert to authenticated with check (auth.uid() = id);
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "meetings_read_open_or_joined" on public.meetings;
create policy "meetings_read_open_or_joined" on public.meetings for select to authenticated using (
  status = 'open' or host_id = auth.uid()
);
drop policy if exists "meeting_host_insert" on public.meetings;
create policy "meeting_host_insert" on public.meetings for insert to authenticated with check (host_id = auth.uid());
drop policy if exists "meeting_host_update" on public.meetings;
create policy "meeting_host_update" on public.meetings for update to authenticated using (host_id = auth.uid()) with check (host_id = auth.uid());

drop policy if exists "participants_read_own_or_host" on public.meeting_participants;
create policy "participants_read_own_or_host" on public.meeting_participants for select to authenticated using (user_id = auth.uid());
drop policy if exists "participants_insert_self" on public.meeting_participants;
create policy "participants_insert_self" on public.meeting_participants for insert to authenticated with check (
  user_id = auth.uid() and exists (select 1 from public.meetings m where m.id = meeting_participants.meeting_id and m.status = 'open')
);

drop policy if exists "meeting_messages_read_participant" on public.meeting_messages;
create policy "meeting_messages_read_participant" on public.meeting_messages for select to authenticated using (
  exists (select 1 from public.meeting_participants mp where mp.meeting_id = meeting_messages.meeting_id and mp.user_id = auth.uid())
  or exists (select 1 from public.meetings m where m.id = meeting_messages.meeting_id and m.host_id = auth.uid())
);
drop policy if exists "meeting_messages_insert_participant" on public.meeting_messages;
create policy "meeting_messages_insert_participant" on public.meeting_messages for insert to authenticated with check (
  sender_id = auth.uid()
  and exists (select 1 from public.meeting_participants mp where mp.meeting_id = meeting_messages.meeting_id and mp.user_id = auth.uid())
  and exists (select 1 from public.meetings m where m.id = meeting_messages.meeting_id and m.status = 'open')
);

drop policy if exists "meeting_votes_read_participant" on public.meeting_votes;
create policy "meeting_votes_read_participant" on public.meeting_votes for select to authenticated using (
  user_id = auth.uid() or exists (select 1 from public.meetings m where m.id = meeting_votes.meeting_id and m.host_id = auth.uid())
);
drop policy if exists "meeting_votes_insert_self" on public.meeting_votes;
create policy "meeting_votes_insert_self" on public.meeting_votes for insert to authenticated with check (
  user_id = auth.uid() and exists (select 1 from public.meeting_participants mp where mp.meeting_id = meeting_votes.meeting_id and mp.user_id = auth.uid())
  and exists (select 1 from public.meetings m where m.id = meeting_votes.meeting_id and m.status = 'open')
);
drop policy if exists "meeting_votes_update_self" on public.meeting_votes;
create policy "meeting_votes_update_self" on public.meeting_votes for update to authenticated using (user_id = auth.uid()) with check (
  user_id = auth.uid() and exists (select 1 from public.meetings m where m.id = meeting_votes.meeting_id and m.status = 'open')
);

drop policy if exists "direct_messages_read_participant" on public.direct_messages;
create policy "direct_messages_read_participant" on public.direct_messages for select to authenticated using (sender_id = auth.uid() or recipient_id = auth.uid());
drop policy if exists "direct_messages_insert_sender" on public.direct_messages;
create policy "direct_messages_insert_sender" on public.direct_messages for insert to authenticated with check (sender_id = auth.uid());
