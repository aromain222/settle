create table if not exists friendships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  friend_id uuid not null references users(id) on delete cascade,
  created_at timestamp with time zone default now(),
  unique(user_id, friend_id),
  check (user_id != friend_id)
);

alter table friendships enable row level security;

create policy "users can view their friendships"
  on friendships for select
  using (auth.uid() = user_id or auth.uid() = friend_id);

create policy "users can add friends"
  on friendships for insert
  with check (auth.uid() = user_id);

create policy "users can remove friends"
  on friendships for delete
  using (auth.uid() = user_id);
