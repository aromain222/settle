-- Users (extends auth.users)
create table public.users (
  id            uuid primary key references auth.users(id) on delete cascade,
  phone         text unique not null,
  display_name  text not null,
  avatar_url    text,
  created_at    timestamptz default now()
);

-- Bets
create table public.bets (
  id                  uuid primary key default gen_random_uuid(),
  creator_id          uuid references public.users(id) not null,
  opponent_id         uuid references public.users(id),
  description         text not null,
  amount              numeric(10,2),
  stake_label         text,
  deadline            timestamptz not null,
  status              text not null default 'pending'
    check (status in ('pending','active','resolving','disputed','settled','paid','cancelled')),
  declared_winner_id  uuid references public.users(id),
  declarer_id         uuid references public.users(id),
  winner_id           uuid references public.users(id),
  created_at          timestamptz default now(),
  updated_at          timestamptz default now(),
  constraint no_self_bet check (creator_id != opponent_id)
);

-- Invite links
create table public.invite_links (
  id         uuid primary key default gen_random_uuid(),
  bet_id     uuid references public.bets(id) on delete cascade not null,
  token      text unique not null,
  expires_at timestamptz default (now() + interval '7 days'),
  used_at    timestamptz
);

-- Notifications
create table public.notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references public.users(id) on delete cascade not null,
  bet_id     uuid references public.bets(id) on delete cascade,
  type       text not null
    check (type in (
      'bet_invite','bet_accepted','bet_declared',
      'bet_confirmed','bet_disputed','bet_paid'
    )),
  read       boolean default false,
  created_at timestamptz default now()
);

-- Scoreboard view
create view public.user_scoreboard as
select
  u.id,
  coalesce(sum(b.amount) filter (
    where b.winner_id = u.id
      and b.status in ('settled','paid')), 0)
  - coalesce(sum(b.amount) filter (
    where b.winner_id != u.id
      and b.status in ('settled','paid')
      and (b.creator_id = u.id or b.opponent_id = u.id)), 0) as net_amount,
  count(*) filter (
    where b.winner_id = u.id
      and b.status in ('settled','paid')) as wins,
  count(*) filter (
    where b.winner_id != u.id
      and b.status in ('settled','paid')
      and (b.creator_id = u.id or b.opponent_id = u.id)) as losses,
  count(*) filter (
    where b.status in ('pending','active','resolving')
      and (b.creator_id = u.id or b.opponent_id = u.id)) as pending
from public.users u
left join public.bets b
  on (b.creator_id = u.id or b.opponent_id = u.id)
group by u.id;

-- updated_at trigger
create or replace function update_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger bets_updated_at
  before update on public.bets
  for each row execute function update_updated_at();

-- Auto-create user profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.users (id, phone, display_name)
  values (
    new.id,
    coalesce(new.phone, ''),
    coalesce(
      new.raw_user_meta_data->>'display_name',
      regexp_replace(coalesce(new.phone,''), '^\+1', '')
    )
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- RLS
alter table public.users enable row level security;
alter table public.bets enable row level security;
alter table public.invite_links enable row level security;
alter table public.notifications enable row level security;

create policy "users_read_all"    on public.users for select using (true);
create policy "users_insert_own"  on public.users for insert with check (auth.uid() = id);
create policy "users_update_own"  on public.users for update using (auth.uid() = id);

create policy "bets_read_participant" on public.bets for select
  using (auth.uid() = creator_id or auth.uid() = opponent_id);
create policy "bets_insert_auth" on public.bets for insert
  with check (auth.uid() = creator_id);
create policy "bets_update_participant" on public.bets for update
  using (auth.uid() = creator_id or auth.uid() = opponent_id);

create policy "invite_links_read_all" on public.invite_links for select using (true);
create policy "invite_links_insert_creator" on public.invite_links for insert
  with check (
    auth.uid() = (select creator_id from public.bets where id = bet_id)
  );
create policy "invite_links_update_accept" on public.invite_links for update using (true);

create policy "notifications_own"    on public.notifications for select
  using (auth.uid() = user_id);
create policy "notifications_insert" on public.notifications for insert with check (true);
create policy "notifications_update_own" on public.notifications for update
  using (auth.uid() = user_id);

-- Realtime
alter publication supabase_realtime add table public.bets;
alter publication supabase_realtime add table public.notifications;
