-- Required for filtered Realtime subscriptions to reliably receive UPDATE events.
-- Without this, Supabase only includes the primary key in the WAL record,
-- and filter matching against creator_id / opponent_id can silently fail.
alter table public.bets replica identity full;
