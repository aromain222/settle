-- Make phone nullable — was NOT NULL, causes unique constraint conflict
-- when multiple users sign up with email (they all get phone='')
alter table public.users alter column phone drop not null;
update public.users set phone = null where phone = '';

-- Add email column with a partial unique index (nulls excluded)
alter table public.users add column if not exists email text;
create unique index if not exists users_email_unique
  on public.users(email) where email is not null;

-- Fix trigger: handle email-based auth, derive display name from email prefix
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
declare
  v_display_name text;
  v_phone text;
begin
  v_phone := nullif(trim(coalesce(new.phone, '')), '');

  v_display_name := coalesce(
    nullif(new.raw_user_meta_data->>'display_name', ''),
    nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
    nullif(regexp_replace(coalesce(new.phone, ''), '[^0-9]', '', 'g'), ''),
    'User'
  );

  insert into public.users (id, phone, email, display_name)
  values (new.id, v_phone, new.email, v_display_name)
  on conflict (id) do update set
    email        = coalesce(excluded.email, public.users.email),
    phone        = coalesce(excluded.phone, public.users.phone),
    display_name = coalesce(excluded.display_name, public.users.display_name);

  return new;
end;
$$;

-- Allow reading a bet when a valid (unused, unexpired) invite link exists.
-- This lets the invited person see the bet before accepting it.
create policy "bets_read_via_invite" on public.bets for select
  using (
    exists (
      select 1 from public.invite_links il
      where il.bet_id = id
        and il.used_at is null
        and il.expires_at > now()
    )
  );
