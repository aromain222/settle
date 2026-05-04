# Settle — MVP Design Spec
_Date: 2026-05-04_

## Overview

Settle is a mobile-first social web app that lets friends create, accept, track, and settle friendly bets and informal agreements. It records agreements and helps users settle them externally via Venmo or Cash App. It does not process payments, hold money, or offer credit.

## Decisions Log

| Decision | Choice | Reason |
|---|---|---|
| Auth | Phone + SMS OTP | Frictionless, native to friends app |
| Stack | Next.js App Router + Supabase | Realtime, free tier, fast DX |
| Invites | Share link + phone number tagging | Covers all sharing contexts |
| Resolution | One party declares, other confirms | Natural for friendly bets |
| Stakes | Optional $ amount + free-form text | Covers money bets and "loser buys dinner" |
| Deployment | Vercel (frontend) + Supabase (backend) | Free tier covers MVP |

## Architecture

### Stack
- **Frontend:** Next.js 14 App Router, TypeScript, Tailwind CSS
- **Backend:** Supabase (Postgres, Auth, Realtime, Edge Functions)
- **Deployment:** Vercel (frontend), Supabase hosted (backend)
- **SMS:** Supabase Auth phone provider (Twilio under the hood)
- **Push notifications:** Supabase Edge Functions + Web Push API

### High-Level Structure

```
app/
  (auth)/
    login/           — phone input + OTP verify
  (app)/
    page.tsx         — main feed + scoreboard (authenticated)
    bets/[id]/       — bet detail view
  api/
    invites/[token]/ — resolve invite token → redirect to bet
components/
  Scoreboard.tsx
  BetCard.tsx
  CreateBetSheet.tsx
  ResolveSheet.tsx
  ConfirmSheet.tsx
lib/
  supabase/          — client, server, middleware helpers
  actions/           — Server Actions (createBet, acceptBet, declareBet, confirmBet)
```

## Data Model

### Tables

**users**
```sql
id            uuid primary key (auth.users)
phone         text unique not null
display_name  text not null
avatar_url    text
created_at    timestamptz default now()
```

**bets**
```sql
id            uuid primary key default gen_random_uuid()
creator_id    uuid references users(id) not null
opponent_id   uuid references users(id)        -- null until accepted
description   text not null
amount        numeric(10,2)                     -- null = non-monetary
stake_label   text                              -- "loser buys dinner" etc.
deadline      timestamptz not null
status        text not null default 'pending'
  -- pending | active | resolving | disputed | settled | cancelled
declared_winner_id  uuid references users(id)  -- who was declared winner
winner_id           uuid references users(id)  -- confirmed winner
created_at    timestamptz default now()
updated_at    timestamptz default now()
```

**invite_links**
```sql
id        uuid primary key default gen_random_uuid()
bet_id    uuid references bets(id) not null
token     text unique not null default nanoid(10)
expires_at timestamptz default now() + interval '7 days'
used_at   timestamptz
```

**notifications**
```sql
id         uuid primary key default gen_random_uuid()
user_id    uuid references users(id) not null
bet_id     uuid references bets(id)
type       text not null
  -- bet_invite | bet_accepted | bet_declared | bet_confirmed | bet_disputed | bet_paid
read       boolean default false
created_at timestamptz default now()
```

### Derived Scoreboard View

```sql
create view user_scoreboard as
select
  u.id,
  coalesce(sum(b.amount) filter (where b.winner_id = u.id), 0)
    - coalesce(sum(b.amount) filter (where b.winner_id != u.id
        and (b.creator_id = u.id or b.opponent_id = u.id)), 0) as net_amount,
  count(*) filter (where b.winner_id = u.id) as wins,
  count(*) filter (where b.winner_id != u.id
    and (b.creator_id = u.id or b.opponent_id = u.id)) as losses,
  count(*) filter (where b.status in ('pending','active','resolving')
    and (b.creator_id = u.id or b.opponent_id = u.id)) as pending
from users u
left join bets b on b.status = 'settled'
  and (b.creator_id = u.id or b.opponent_id = u.id)
group by u.id;
```

## Bet Status Flow

```
pending     — created, waiting for opponent to accept via link or phone invite
    ↓ (opponent accepts)
active      — locked, both parties committed, deadline in future
    ↓ (deadline passes OR either party taps Resolve)
resolving   — one party has declared a winner, waiting for other to confirm
    ↓ (other party confirms)           ↓ (other party disputes)
settled                              disputed
    ↓ (loser taps Mark Paid)
paid
```

## UI Layout

### Main Screen (single page)

1. **Header** — "Settle" wordmark + profile avatar
2. **Scoreboard card** — net +/- in dollars (or wins/losses if no $ bets), win/loss/pending counts. Live via Supabase Realtime.
3. **Active Bets feed** — bet cards sorted by urgency (RESOLVE first, then PENDING, then LOCKED by deadline)
4. **Settled section** — collapsed by default, expandable history
5. **Floating + button** — fixed bottom-right, opens Create Bet bottom sheet

### Bet Card Colors
- 🟡 Yellow border — `pending` (awaiting acceptance)
- 🔴 Red border — `resolving` (needs action)
- 🔵 Blue border — `active` (locked, running)
- ⚪ Gray — `settled` / `paid`

### Bottom Sheets

**Create Bet**
- Description (text input)
- Amount (optional number input, labeled "optional")
- Stake label (optional text, e.g. "loser buys dinner")
- Deadline (date/time picker)
- Opponent: phone number input OR "Get Share Link" button
- "Send Bet" CTA

**Accept Bet** (reached via invite link)
- Shows bet terms, creator name
- "Accept" or "Decline" CTA

**Resolve Bet** (tap card when resolving)
- Shows bet description and stake
- "I Won" / "I Lost" toggle
- "Declare Result" CTA
- Subtext: "[Opponent] will be asked to confirm"

**Confirm/Dispute** (notification → sheet)
- Shows what opponent declared
- "Confirm" or "Dispute" CTA
- If Confirm + loser: shows "Pay via Venmo / Cash App" deep links, then "Mark as Paid"

## Core Flows

### Create a Bet (phone invite)
1. Tap + → Create Bet sheet
2. Fill description, optional amount/label, deadline, opponent phone
3. Submit → Server Action creates bet (status: pending), sends SMS via Supabase Auth invite
4. Recipient taps SMS link → lands on `/api/invites/[token]` → redirects to bet accept page
5. Recipient signs in (phone OTP) → Accept Bet sheet → confirm
6. Bet status → `active`, both see it in feed

### Create a Bet (share link)
1. Same as above but tap "Get Share Link" → generates invite_links row, copies URL
2. User pastes into iMessage/WhatsApp/etc.
3. Rest of flow identical

### Resolve a Bet
1. Deadline passes → bet status → `resolving` (cron or trigger)
2. Either party taps RESOLVE card → Resolve sheet
3. Select I Won / I Lost → Declare Result → Server Action sets `declared_winner_id`
4. Supabase Realtime + push notification to opponent
5. Opponent sees Confirm/Dispute sheet
6. Confirm → `winner_id` set, status → `settled`
7. If loser confirmed: show Venmo/Cash App deep link → "Mark as Paid" → status → `paid`
8. Dispute → status → `disputed`, both see disputed state (manual resolution out of scope for MVP)

## Edge Cases & Rules

- A user cannot be both creator and opponent on the same bet
- Invite links expire after 7 days
- Only the declared loser sees the Venmo/Cash App prompt (not the winner)
- Disputed bets are shown with a 🚩 flag; no automated resolution in MVP
- Bets with no $ amount show "—" in net column; scoreboard shows win/loss count only for those users
- A bet can only be declared once per party; re-declaration not allowed

## Out of Scope (MVP)

- Group bets (3+ participants)
- In-app chat or comments on bets
- Push notifications via native app (web push only)
- Payment processing of any kind
- Bet categories or tags
- Public profiles or social discovery
- Admin dashboard

## Positioning Note

Settle is a social agreement and accountability tool. It is not a gambling app, financial services app, or payment processor. All settlement happens externally.
