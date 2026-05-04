# Settle MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Settle MVP — a mobile-first social web app where friends create, accept, track, and resolve friendly bets, settling externally via Venmo/Cash App.

**Architecture:** Next.js 14 App Router with Server Components for initial data load and Server Actions for mutations. Supabase handles auth (phone OTP), Postgres, Realtime subscriptions for live feed updates, and Edge Functions for SMS invites and deadline checks.

**Tech Stack:** Next.js 14, TypeScript, Tailwind CSS, Supabase (Auth + Postgres + Realtime + Edge Functions), Vitest + React Testing Library, Vercel deployment.

---

## File Map

```
~/Settle/
  app/
    layout.tsx                              — Root HTML, Inter font, dark bg
    globals.css                             — Tailwind directives, max-width 480px
    (auth)/
      login/
        page.tsx                            — Phone input form
        verify/
          page.tsx                          — OTP input form
        actions.ts                          — signInWithPhone, verifyOtp, signOut Server Actions
    (app)/
      layout.tsx                            — Auth guard (redirects to /login if no session)
      page.tsx                              — Server component: fetches bets + scoreboard
      MainPageClient.tsx                    — Client shell: FAB, CreateBetSheet toggle
      bets/
        [id]/
          accept/
            page.tsx                        — Server: load bet, guard auth
            AcceptBetClient.tsx             — Client: Accept/Decline UI
    api/
      invites/
        [token]/
          route.ts                          — GET: resolve token → redirect to accept page
  components/
    BottomSheet.tsx                         — Reusable animated bottom sheet wrapper
    BetCard.tsx                             — Single bet card, color-coded by status
    BetFeed.tsx                             — Client: Realtime feed, sheet orchestration
    Scoreboard.tsx                          — Client: net +/- card with Realtime refresh
    CreateBetSheet.tsx                      — New bet form (phone invite or share link)
    ResolveSheet.tsx                        — Declare winner form
    ConfirmSheet.tsx                        — Confirm/dispute + Venmo/Cash App links
  lib/
    types.ts                                — Shared TypeScript interfaces
    bets.ts                                 — Pure bet business logic (takes SupabaseClient)
    supabase/
      client.ts                             — Browser Supabase client
      server.ts                             — Server Supabase client (cookies)
    actions/
      bets.ts                               — Server Actions: createBet, accept, declare, confirm, markPaid
      auth.ts                               — Server Actions: signInWithPhone, verifyOtp, signOut
  middleware.ts                             — Supabase session refresh on every request
  supabase/
    migrations/
      001_initial.sql                       — All tables, view, RLS policies, triggers
    functions/
      check-deadlines/index.ts              — Cron: move active→resolving past deadline
      send-invite-sms/index.ts              — Send Twilio SMS for phone invites
  __tests__/
    lib/
      bets.test.ts                          — Unit tests for all bet logic functions
    components/
      BetCard.test.tsx                      — Component rendering tests
  vitest.config.ts
  vitest.setup.ts
  .env.local.example
  vercel.json
```

---

## Task 1: Project Scaffold

**Files:**
- Create: `~/Settle/` (scaffold)
- Create: `vitest.config.ts`
- Create: `vitest.setup.ts`
- Modify: `package.json` (add test scripts)
- Modify: `tailwind.config.ts` (darkMode)

- [ ] **Step 1: Scaffold Next.js app**

```bash
cd ~
npx create-next-app@14 Settle --typescript --tailwind --app --no-src-dir --no-import-alias --yes
cd Settle
```

Expected output: Next.js project created in `~/Settle/`.

- [ ] **Step 2: Install dependencies**

```bash
cd ~/Settle
npm install @supabase/supabase-js @supabase/ssr nanoid
npm install -D vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/user-event @testing-library/jest-dom
```

- [ ] **Step 3: Write vitest.config.ts**

```typescript
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    globals: true,
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, '.') },
  },
})
```

- [ ] **Step 4: Write vitest.setup.ts**

```typescript
import '@testing-library/jest-dom'
```

- [ ] **Step 5: Add test scripts to package.json**

Add to the `"scripts"` section:
```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 6: Update tailwind.config.ts**

Replace the exported config object's `darkMode` field:
```typescript
import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: 'class',
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: { extend: {} },
  plugins: [],
}
export default config
```

- [ ] **Step 7: Run tests to verify setup**

```bash
cd ~/Settle && npm test
```

Expected: `No test files found` (0 tests, no failures).

- [ ] **Step 8: Commit**

```bash
cd ~/Settle
git add -A
git commit -m "feat: scaffold Next.js + Supabase + Vitest"
```

---

## Task 2: TypeScript Types

**Files:**
- Create: `lib/types.ts`

- [ ] **Step 1: Create lib/types.ts**

```typescript
export type BetStatus =
  | 'pending'
  | 'active'
  | 'resolving'
  | 'disputed'
  | 'settled'
  | 'paid'
  | 'cancelled'

export interface User {
  id: string
  phone: string
  display_name: string
  avatar_url: string | null
  created_at: string
}

export interface Bet {
  id: string
  creator_id: string
  opponent_id: string | null
  description: string
  amount: number | null
  stake_label: string | null
  deadline: string
  status: BetStatus
  declared_winner_id: string | null
  declarer_id: string | null
  winner_id: string | null
  created_at: string
  updated_at: string
  creator?: User
  opponent?: User
}

export interface InviteLink {
  id: string
  bet_id: string
  token: string
  expires_at: string
  used_at: string | null
}

export interface Notification {
  id: string
  user_id: string
  bet_id: string | null
  type:
    | 'bet_invite'
    | 'bet_accepted'
    | 'bet_declared'
    | 'bet_confirmed'
    | 'bet_disputed'
    | 'bet_paid'
  read: boolean
  created_at: string
  bet?: Bet
}

export interface Scoreboard {
  id: string
  net_amount: number
  wins: number
  losses: number
  pending: number
}
```

- [ ] **Step 2: Commit**

```bash
cd ~/Settle
git add lib/types.ts
git commit -m "feat: add shared TypeScript types"
```

---

## Task 3: Supabase Client Helpers + Middleware

**Files:**
- Create: `lib/supabase/client.ts`
- Create: `lib/supabase/server.ts`
- Create: `middleware.ts`

- [ ] **Step 1: Create lib/supabase/client.ts**

```typescript
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

- [ ] **Step 2: Create lib/supabase/server.ts**

```typescript
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {}
        },
      },
    }
  )
}
```

- [ ] **Step 3: Create middleware.ts**

```typescript
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const path = request.nextUrl.pathname
  const isPublic =
    path.startsWith('/login') ||
    path.startsWith('/api/invites') ||
    path.startsWith('/_next') ||
    path === '/favicon.ico'

  if (!user && !isPublic) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
```

- [ ] **Step 4: Commit**

```bash
cd ~/Settle
git add lib/supabase/ middleware.ts
git commit -m "feat: add Supabase client helpers and middleware"
```

---

## Task 4: Database Migration

**Files:**
- Create: `supabase/migrations/001_initial.sql`

- [ ] **Step 1: Create supabase/migrations/001_initial.sql**

```sql
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
```

- [ ] **Step 2: Apply migration in Supabase dashboard**

Go to Supabase dashboard → SQL Editor → paste and run `001_initial.sql`.

- [ ] **Step 3: Commit**

```bash
cd ~/Settle
git add supabase/
git commit -m "feat: add database migration with tables, RLS, and scoreboard view"
```

---

## Task 5: Pure Bet Logic + Unit Tests

**Files:**
- Create: `lib/bets.ts`
- Create: `__tests__/lib/bets.test.ts`

- [ ] **Step 1: Write failing tests first**

Create `__tests__/lib/bets.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  createBet,
  acceptBet,
  declareBet,
  confirmBet,
  markPaid,
} from '@/lib/bets'

const BASE_BET = {
  id: 'bet-1',
  creator_id: 'user-1',
  opponent_id: 'user-2',
  description: 'Lakers win',
  amount: 20,
  stake_label: null,
  deadline: new Date(Date.now() + 86_400_000).toISOString(),
  status: 'pending',
  declared_winner_id: null,
  declarer_id: null,
  winner_id: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
}

function makeSupa(resolvedValues: any[] = []) {
  let callCount = 0
  const chain: any = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    eq:     vi.fn().mockReturnThis(),
    is:     vi.fn().mockReturnThis(),
    in:     vi.fn().mockReturnThis(),
    or:     vi.fn().mockReturnThis(),
    order:  vi.fn().mockReturnThis(),
    single: vi.fn().mockImplementation(() => {
      const val = resolvedValues[callCount] ?? { data: null, error: null }
      callCount++
      return Promise.resolve(val)
    }),
  }
  return { from: vi.fn().mockReturnValue(chain), _chain: chain }
}

describe('createBet', () => {
  it('returns an invite_token of length 10', async () => {
    const supa = makeSupa([
      { data: null, error: null },                                    // opponent lookup
      { data: { ...BASE_BET, opponent_id: null }, error: null },     // bet insert
    ])
    const result = await createBet(supa as any, 'user-1', {
      description: 'Lakers win',
      amount: 20,
      stake_label: null,
      deadline: BASE_BET.deadline,
      opponent_phone: '+15550000000',
    })
    expect(result.invite_token).toHaveLength(10)
    expect(result.bet.description).toBe('Lakers win')
  })
})

describe('acceptBet', () => {
  it('throws on expired invite', async () => {
    const supa = makeSupa([
      {
        data: {
          id: 'inv-1',
          bet_id: 'bet-1',
          expires_at: new Date(Date.now() - 1000).toISOString(),
          used_at: null,
        },
        error: null,
      },
    ])
    await expect(acceptBet(supa as any, 'user-2', 'bet-1', 'tok')).rejects.toThrow(
      'Invite expired'
    )
  })

  it('throws on already-used invite', async () => {
    const supa = makeSupa([{ data: null, error: { message: 'not found' } }])
    await expect(acceptBet(supa as any, 'user-2', 'bet-1', 'tok')).rejects.toThrow(
      'Invalid or expired invite'
    )
  })
})

describe('declareBet', () => {
  it('throws if already declared', async () => {
    const supa = makeSupa([
      {
        data: {
          ...BASE_BET,
          status: 'resolving',
          declared_winner_id: 'user-1',
        },
        error: null,
      },
    ])
    await expect(declareBet(supa as any, 'user-1', 'bet-1', true)).rejects.toThrow(
      'Result already declared'
    )
  })

  it('sets declared_winner_id to opponent when iWon=false', async () => {
    const supa = makeSupa([
      { data: { ...BASE_BET, status: 'active' }, error: null },
      {
        data: {
          ...BASE_BET,
          status: 'resolving',
          declared_winner_id: 'user-2',
          declarer_id: 'user-1',
        },
        error: null,
      },
    ])
    const result = await declareBet(supa as any, 'user-1', 'bet-1', false)
    expect(result.declared_winner_id).toBe('user-2')
  })
})

describe('confirmBet', () => {
  it('sets status=settled and winner_id when confirmed', async () => {
    const supa = makeSupa([
      {
        data: {
          ...BASE_BET,
          status: 'resolving',
          declared_winner_id: 'user-1',
          declarer_id: 'user-1',
        },
        error: null,
      },
      { data: { ...BASE_BET, status: 'settled', winner_id: 'user-1' }, error: null },
    ])
    const result = await confirmBet(supa as any, 'user-2', 'bet-1', true)
    expect(result.status).toBe('settled')
    expect(result.winner_id).toBe('user-1')
  })

  it('sets status=disputed when not confirmed', async () => {
    const supa = makeSupa([
      {
        data: {
          ...BASE_BET,
          status: 'resolving',
          declared_winner_id: 'user-1',
          declarer_id: 'user-1',
        },
        error: null,
      },
      { data: { ...BASE_BET, status: 'disputed', winner_id: null }, error: null },
    ])
    const result = await confirmBet(supa as any, 'user-2', 'bet-1', false)
    expect(result.status).toBe('disputed')
  })
})

describe('markPaid', () => {
  it('throws if winner tries to mark as paid', async () => {
    const supa = makeSupa([
      { data: { ...BASE_BET, status: 'settled', winner_id: 'user-1' }, error: null },
    ])
    await expect(markPaid(supa as any, 'user-1', 'bet-1')).rejects.toThrow(
      'Only the loser marks as paid'
    )
  })

  it('returns updated bet with status=paid for loser', async () => {
    const supa = makeSupa([
      { data: { ...BASE_BET, status: 'settled', winner_id: 'user-1' }, error: null },
      { data: { ...BASE_BET, status: 'paid', winner_id: 'user-1' }, error: null },
    ])
    const result = await markPaid(supa as any, 'user-2', 'bet-1')
    expect(result.status).toBe('paid')
  })
})
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
cd ~/Settle && npm test
```

Expected: multiple failures — `@/lib/bets` not found.

- [ ] **Step 3: Create lib/bets.ts**

```typescript
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Bet, Scoreboard } from './types'
import { nanoid } from 'nanoid'

export interface CreateBetInput {
  description: string
  amount: number | null
  stake_label: string | null
  deadline: string
  opponent_phone: string | null
}

export async function createBet(
  supabase: SupabaseClient,
  userId: string,
  input: CreateBetInput
): Promise<{ bet: Bet; invite_token: string }> {
  let opponentId: string | null = null
  if (input.opponent_phone) {
    const { data: opponent } = await supabase
      .from('users')
      .select('id')
      .eq('phone', input.opponent_phone)
      .single()
    opponentId = opponent?.id ?? null
  }

  const { data: bet, error } = await supabase
    .from('bets')
    .insert({
      creator_id: userId,
      opponent_id: opponentId,
      description: input.description,
      amount: input.amount,
      stake_label: input.stake_label,
      deadline: input.deadline,
      status: 'pending',
    })
    .select('*, creator:users!creator_id(*), opponent:users!opponent_id(*)')
    .single()

  if (error) throw new Error(error.message)

  const token = nanoid(10)
  await supabase.from('invite_links').insert({ bet_id: bet.id, token })

  if (opponentId) {
    await supabase.from('notifications').insert({
      user_id: opponentId,
      bet_id: bet.id,
      type: 'bet_invite',
    })
  }

  return { bet, invite_token: token }
}

export async function acceptBet(
  supabase: SupabaseClient,
  userId: string,
  betId: string,
  token: string
): Promise<Bet> {
  const { data: invite, error: inviteError } = await supabase
    .from('invite_links')
    .select('*')
    .eq('token', token)
    .eq('bet_id', betId)
    .is('used_at', null)
    .single()

  if (inviteError || !invite) throw new Error('Invalid or expired invite')
  if (new Date(invite.expires_at) < new Date()) throw new Error('Invite expired')

  const { data: bet, error } = await supabase
    .from('bets')
    .update({ opponent_id: userId, status: 'active' })
    .eq('id', betId)
    .eq('status', 'pending')
    .select('*, creator:users!creator_id(*), opponent:users!opponent_id(*)')
    .single()

  if (error || !bet) throw new Error('Could not accept bet')

  await supabase
    .from('invite_links')
    .update({ used_at: new Date().toISOString() })
    .eq('id', invite.id)

  await supabase.from('notifications').insert({
    user_id: bet.creator_id,
    bet_id: bet.id,
    type: 'bet_accepted',
  })

  return bet
}

export async function declareBet(
  supabase: SupabaseClient,
  userId: string,
  betId: string,
  iWon: boolean
): Promise<Bet> {
  const { data: bet, error: fetchError } = await supabase
    .from('bets')
    .select('*')
    .eq('id', betId)
    .in('status', ['active', 'resolving'])
    .single()

  if (fetchError || !bet) throw new Error('Bet not found or not resolvable')
  if (bet.declared_winner_id) throw new Error('Result already declared')

  const declaredWinnerId = iWon
    ? userId
    : bet.creator_id === userId
    ? bet.opponent_id
    : bet.creator_id

  const { data: updated, error } = await supabase
    .from('bets')
    .update({
      declared_winner_id: declaredWinnerId,
      declarer_id: userId,
      status: 'resolving',
    })
    .eq('id', betId)
    .select('*, creator:users!creator_id(*), opponent:users!opponent_id(*)')
    .single()

  if (error || !updated) throw new Error('Could not declare bet')

  const opponentId =
    bet.creator_id === userId ? bet.opponent_id : bet.creator_id
  if (opponentId) {
    await supabase.from('notifications').insert({
      user_id: opponentId,
      bet_id: betId,
      type: 'bet_declared',
    })
  }

  return updated
}

export async function confirmBet(
  supabase: SupabaseClient,
  userId: string,
  betId: string,
  confirm: boolean
): Promise<Bet> {
  const { data: bet, error: fetchError } = await supabase
    .from('bets')
    .select('*')
    .eq('id', betId)
    .eq('status', 'resolving')
    .single()

  if (fetchError || !bet) throw new Error('Bet not found or not in resolving state')
  if (!bet.declared_winner_id) throw new Error('No declaration to confirm')

  const { data: updated, error } = await supabase
    .from('bets')
    .update({
      status: confirm ? 'settled' : 'disputed',
      winner_id: confirm ? bet.declared_winner_id : null,
    })
    .eq('id', betId)
    .select('*, creator:users!creator_id(*), opponent:users!opponent_id(*)')
    .single()

  if (error || !updated) throw new Error('Could not confirm bet')

  const opponentId =
    bet.creator_id === userId ? bet.opponent_id : bet.creator_id
  if (opponentId) {
    await supabase.from('notifications').insert({
      user_id: opponentId,
      bet_id: betId,
      type: confirm ? 'bet_confirmed' : 'bet_disputed',
    })
  }

  return updated
}

export async function markPaid(
  supabase: SupabaseClient,
  userId: string,
  betId: string
): Promise<Bet> {
  const { data: bet, error: fetchError } = await supabase
    .from('bets')
    .select('*')
    .eq('id', betId)
    .eq('status', 'settled')
    .single()

  if (fetchError || !bet) throw new Error('Bet not found or not settled')
  if (bet.winner_id === userId) throw new Error('Only the loser marks as paid')

  const { data: updated, error } = await supabase
    .from('bets')
    .update({ status: 'paid' })
    .eq('id', betId)
    .select('*, creator:users!creator_id(*), opponent:users!opponent_id(*)')
    .single()

  if (error || !updated) throw new Error('Could not mark as paid')

  if (bet.winner_id) {
    await supabase.from('notifications').insert({
      user_id: bet.winner_id,
      bet_id: betId,
      type: 'bet_paid',
    })
  }

  return updated
}

export async function getUserBets(
  supabase: SupabaseClient,
  userId: string
): Promise<Bet[]> {
  const { data, error } = await supabase
    .from('bets')
    .select('*, creator:users!creator_id(*), opponent:users!opponent_id(*)')
    .or(`creator_id.eq.${userId},opponent_id.eq.${userId}`)
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return data ?? []
}

export async function getScoreboard(
  supabase: SupabaseClient,
  userId: string
): Promise<Scoreboard> {
  const { data, error } = await supabase
    .from('user_scoreboard')
    .select('*')
    .eq('id', userId)
    .single()

  if (error) throw new Error(error.message)
  return data
}
```

- [ ] **Step 4: Run tests — verify they pass**

```bash
cd ~/Settle && npm test
```

Expected: `8 tests passed`.

- [ ] **Step 5: Commit**

```bash
cd ~/Settle
git add lib/bets.ts __tests__/
git commit -m "feat: add bet business logic with unit tests"
```

---

## Task 6: Server Actions

**Files:**
- Create: `lib/actions/auth.ts`
- Create: `lib/actions/bets.ts`

- [ ] **Step 1: Create lib/actions/auth.ts**

```typescript
'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function signInWithPhone(phone: string) {
  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithOtp({ phone })
  if (error) throw new Error(error.message)
}

export async function verifyOtp(phone: string, token: string) {
  const supabase = await createClient()
  const { error } = await supabase.auth.verifyOtp({ phone, token, type: 'sms' })
  if (error) throw new Error(error.message)
  redirect('/')
}

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}
```

- [ ] **Step 2: Create lib/actions/bets.ts**

```typescript
'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import {
  createBet,
  acceptBet,
  declareBet,
  confirmBet,
  markPaid,
  type CreateBetInput,
} from '@/lib/bets'

async function getAuthenticatedUser() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')
  return { supabase, userId: user.id }
}

export async function createBetAction(input: CreateBetInput) {
  const { supabase, userId } = await getAuthenticatedUser()
  const result = await createBet(supabase, userId, input)
  revalidatePath('/')
  return result
}

export async function acceptBetAction(betId: string, token: string) {
  const { supabase, userId } = await getAuthenticatedUser()
  const bet = await acceptBet(supabase, userId, betId, token)
  revalidatePath('/')
  return bet
}

export async function declareBetAction(betId: string, iWon: boolean) {
  const { supabase, userId } = await getAuthenticatedUser()
  const bet = await declareBet(supabase, userId, betId, iWon)
  revalidatePath('/')
  return bet
}

export async function confirmBetAction(betId: string, confirm: boolean) {
  const { supabase, userId } = await getAuthenticatedUser()
  const bet = await confirmBet(supabase, userId, betId, confirm)
  revalidatePath('/')
  return bet
}

export async function markPaidAction(betId: string) {
  const { supabase, userId } = await getAuthenticatedUser()
  const bet = await markPaid(supabase, userId, betId)
  revalidatePath('/')
  return bet
}
```

- [ ] **Step 3: Commit**

```bash
cd ~/Settle
git add lib/actions/
git commit -m "feat: add Server Actions for auth and bets"
```

---

## Task 7: App Layout + Global Styles

**Files:**
- Modify: `app/layout.tsx`
- Modify: `app/globals.css`
- Create: `app/(app)/layout.tsx`

- [ ] **Step 1: Replace app/layout.tsx**

```tsx
import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Settle',
  description: 'Friendly bets, no drama',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#000000',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} bg-black text-white antialiased`}>
        {children}
      </body>
    </html>
  )
}
```

- [ ] **Step 2: Replace app/globals.css**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  * {
    -webkit-tap-highlight-color: transparent;
    box-sizing: border-box;
  }

  body {
    @apply bg-black text-white;
    max-width: 480px;
    margin: 0 auto;
    min-height: 100dvh;
  }
}
```

- [ ] **Step 3: Create app/(app)/layout.tsx**

```tsx
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  return <>{children}</>
}
```

- [ ] **Step 4: Commit**

```bash
cd ~/Settle
git add app/layout.tsx app/globals.css app/'(app)'/layout.tsx
git commit -m "feat: add root layout, global styles, app auth guard"
```

---

## Task 8: Auth Pages

**Files:**
- Create: `app/(auth)/login/page.tsx`
- Create: `app/(auth)/login/verify/page.tsx`

- [ ] **Step 1: Create app/(auth)/login/page.tsx**

```tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { signInWithPhone } from '@/lib/actions/auth'

export default function LoginPage() {
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      await signInWithPhone(phone)
      router.push(`/login/verify?phone=${encodeURIComponent(phone)}`)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-dvh bg-black flex flex-col items-center justify-center p-6">
      <h1 className="text-4xl font-black text-white mb-1 tracking-tight">
        Settle
      </h1>
      <p className="text-zinc-500 text-sm mb-10">Friendly bets, no drama</p>

      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4">
        <div>
          <label className="text-[10px] uppercase tracking-widest text-zinc-500 mb-2 block">
            Phone Number
          </label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+1 555 000 0000"
            className="w-full bg-zinc-900 text-white rounded-2xl px-4 py-3.5 text-base focus:outline-none focus:ring-2 focus:ring-green-400"
            required
          />
        </div>
        {error && <p className="text-red-400 text-sm">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-green-400 text-black font-bold rounded-2xl py-3.5 text-base disabled:opacity-50 transition-opacity"
        >
          {loading ? 'Sending code...' : 'Get Code'}
        </button>
      </form>
    </div>
  )
}
```

- [ ] **Step 2: Create app/(auth)/login/verify/page.tsx**

```tsx
'use client'

import { Suspense, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { verifyOtp } from '@/lib/actions/auth'

function VerifyForm() {
  const searchParams = useSearchParams()
  const phone = decodeURIComponent(searchParams.get('phone') ?? '')
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      await verifyOtp(phone, code)
    } catch (err: any) {
      setError(err.message)
      setLoading(false)
    }
  }

  return (
    <div className="min-h-dvh bg-black flex flex-col items-center justify-center p-6">
      <h1 className="text-4xl font-black text-white mb-1 tracking-tight">
        Settle
      </h1>
      <p className="text-zinc-500 text-sm mb-1">Code sent to</p>
      <p className="text-white text-sm font-semibold mb-10">{phone}</p>

      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4">
        <input
          type="text"
          inputMode="numeric"
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
          placeholder="000000"
          maxLength={6}
          className="w-full bg-zinc-900 text-white rounded-2xl px-4 py-3.5 text-3xl text-center tracking-[0.5em] focus:outline-none focus:ring-2 focus:ring-green-400"
          required
        />
        {error && <p className="text-red-400 text-sm">{error}</p>}
        <button
          type="submit"
          disabled={loading || code.length < 6}
          className="w-full bg-green-400 text-black font-bold rounded-2xl py-3.5 text-base disabled:opacity-50 transition-opacity"
        >
          {loading ? 'Verifying...' : 'Verify'}
        </button>
      </form>
    </div>
  )
}

export default function VerifyPage() {
  return (
    <Suspense>
      <VerifyForm />
    </Suspense>
  )
}
```

- [ ] **Step 3: Commit**

```bash
cd ~/Settle
git add app/'(auth)'/
git commit -m "feat: add phone login and OTP verify pages"
```

---

## Task 9: BottomSheet Component

**Files:**
- Create: `components/BottomSheet.tsx`

- [ ] **Step 1: Create components/BottomSheet.tsx**

```tsx
'use client'

import { useEffect } from 'react'

interface BottomSheetProps {
  open: boolean
  onClose: () => void
  children: React.ReactNode
  title?: string
}

export default function BottomSheet({
  open,
  onClose,
  children,
  title,
}: BottomSheetProps) {
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal>
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />
      {/* Sheet */}
      <div className="absolute bottom-0 left-0 right-0 bg-zinc-900 rounded-t-3xl px-5 pt-4 pb-10 max-h-[90dvh] overflow-y-auto">
        <div className="w-9 h-1 bg-zinc-700 rounded-full mx-auto mb-5" />
        {title && (
          <h2 className="text-white font-bold text-lg mb-5">{title}</h2>
        )}
        {children}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
cd ~/Settle
git add components/BottomSheet.tsx
git commit -m "feat: add BottomSheet wrapper component"
```

---

## Task 10: BetCard Component + Tests

**Files:**
- Create: `components/BetCard.tsx`
- Create: `__tests__/components/BetCard.test.tsx`

- [ ] **Step 1: Write failing tests**

Create `__tests__/components/BetCard.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import BetCard from '@/components/BetCard'
import type { Bet } from '@/lib/types'

const FUTURE = new Date(Date.now() + 86_400_000 * 5).toISOString()

const BASE: Bet = {
  id: 'bet-1',
  creator_id: 'user-1',
  opponent_id: 'user-2',
  description: 'Lakers win tonight',
  amount: 20,
  stake_label: null,
  deadline: FUTURE,
  status: 'active',
  declared_winner_id: null,
  declarer_id: null,
  winner_id: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  creator:  { id: 'user-1', phone: '+1', display_name: 'Me',   avatar_url: null, created_at: '' },
  opponent: { id: 'user-2', phone: '+2', display_name: 'Jake', avatar_url: null, created_at: '' },
}

describe('BetCard', () => {
  it('renders the description', () => {
    render(<BetCard bet={BASE} currentUserId="user-1" />)
    expect(screen.getByText('Lakers win tonight')).toBeTruthy()
  })

  it('shows dollar amount', () => {
    render(<BetCard bet={BASE} currentUserId="user-1" />)
    expect(screen.getByText('$20')).toBeTruthy()
  })

  it('shows stake_label when amount is null', () => {
    render(
      <BetCard
        bet={{ ...BASE, amount: null, stake_label: 'loser buys dinner' }}
        currentUserId="user-1"
      />
    )
    expect(screen.getByText('loser buys dinner')).toBeTruthy()
  })

  it('shows RESOLVE badge for resolving status', () => {
    render(<BetCard bet={{ ...BASE, status: 'resolving' }} currentUserId="user-1" />)
    expect(screen.getByText('RESOLVE')).toBeTruthy()
  })

  it('shows opponent display_name', () => {
    render(<BetCard bet={BASE} currentUserId="user-1" />)
    expect(screen.getByText(/Jake/)).toBeTruthy()
  })

  it('shows 🚩 for disputed bets', () => {
    render(<BetCard bet={{ ...BASE, status: 'disputed' }} currentUserId="user-1" />)
    expect(screen.getByText(/DISPUTED/)).toBeTruthy()
  })
})
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
cd ~/Settle && npm test -- BetCard
```

Expected: FAIL — `@/components/BetCard` not found.

- [ ] **Step 3: Create components/BetCard.tsx**

```tsx
import type { Bet, BetStatus } from '@/lib/types'

const STATUS_CONFIG: Record<
  BetStatus,
  { border: string; badge: string; label: string }
> = {
  pending:   { border: 'border-yellow-400', badge: 'bg-yellow-400 text-black', label: 'PENDING' },
  active:    { border: 'border-blue-400',   badge: 'bg-blue-400 text-black',   label: 'LOCKED' },
  resolving: { border: 'border-red-400',    badge: 'bg-red-400 text-black',    label: 'RESOLVE' },
  disputed:  { border: 'border-orange-400', badge: 'bg-orange-400 text-black', label: '🚩 DISPUTED' },
  settled:   { border: 'border-zinc-600',   badge: 'bg-zinc-600 text-white',   label: 'SETTLED' },
  paid:      { border: 'border-zinc-700',   badge: 'bg-zinc-700 text-white',   label: 'PAID' },
  cancelled: { border: 'border-zinc-700',   badge: 'bg-zinc-700 text-zinc-400', label: 'CANCELLED' },
}

interface BetCardProps {
  bet: Bet
  currentUserId: string
  onClick?: () => void
}

export default function BetCard({ bet, currentUserId, onClick }: BetCardProps) {
  const cfg = STATUS_CONFIG[bet.status]
  const opponent =
    bet.creator_id === currentUserId ? bet.opponent : bet.creator

  const stakeDisplay =
    bet.amount != null
      ? `$${Number(bet.amount).toFixed(0)}`
      : (bet.stake_label ?? '—')

  const deadline = new Date(bet.deadline)
  const diffMs = deadline.getTime() - Date.now()
  const diffDays = Math.ceil(diffMs / 86_400_000)
  const deadlineLabel =
    diffMs < 0
      ? 'Deadline passed'
      : diffDays === 0
      ? 'Due today'
      : `${diffDays}d left`

  return (
    <button
      onClick={onClick}
      className={`w-full text-left bg-zinc-900 rounded-xl p-3 border-l-4 ${cfg.border} mb-2 active:opacity-70 transition-opacity`}
    >
      <div className="flex justify-between items-start gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-white text-sm font-semibold truncate">
            {bet.description}
          </p>
          <p className="text-zinc-500 text-xs mt-0.5">
            vs {opponent?.display_name ?? 'Pending...'}
          </p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-sm font-bold text-white">{stakeDisplay}</p>
          <span
            className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${cfg.badge}`}
          >
            {cfg.label}
          </span>
        </div>
      </div>
      <p className="text-zinc-600 text-[10px] mt-2">{deadlineLabel}</p>
    </button>
  )
}
```

- [ ] **Step 4: Run tests — verify they pass**

```bash
cd ~/Settle && npm test -- BetCard
```

Expected: `6 tests passed`.

- [ ] **Step 5: Commit**

```bash
cd ~/Settle
git add components/BetCard.tsx __tests__/components/BetCard.test.tsx
git commit -m "feat: add BetCard component with tests"
```

---

## Task 11: Scoreboard Component

**Files:**
- Create: `components/Scoreboard.tsx`

- [ ] **Step 1: Create components/Scoreboard.tsx**

```tsx
'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Scoreboard } from '@/lib/types'

interface ScoreboardProps {
  userId: string
  initial: Scoreboard
}

export default function ScoreboardCard({ userId, initial }: ScoreboardProps) {
  const [data, setData] = useState<Scoreboard>(initial)

  useEffect(() => {
    const supabase = createClient()

    async function refresh() {
      const { data: fresh } = await supabase
        .from('user_scoreboard')
        .select('*')
        .eq('id', userId)
        .single()
      if (fresh) setData(fresh)
    }

    const channel = supabase
      .channel(`scoreboard-${userId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'bets' },
        refresh
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [userId])

  const isPositive = Number(data.net_amount) >= 0
  const netDisplay = isPositive
    ? `+$${Number(data.net_amount).toFixed(0)}`
    : `-$${Math.abs(Number(data.net_amount)).toFixed(0)}`

  return (
    <div className="mx-3 mb-3 bg-gradient-to-br from-zinc-900 to-zinc-800 rounded-2xl p-4">
      <p className="text-[10px] uppercase tracking-widest text-zinc-500 mb-1">
        Your Balance
      </p>
      <p
        className={`text-4xl font-black mb-3 tabular-nums ${
          isPositive ? 'text-green-400' : 'text-red-400'
        }`}
      >
        {netDisplay}
      </p>
      <div className="flex gap-2">
        {(
          [
            { label: 'Wins',    value: data.wins },
            { label: 'Losses',  value: data.losses },
            { label: 'Pending', value: data.pending },
          ] as const
        ).map(({ label, value }) => (
          <div
            key={label}
            className="flex-1 bg-black/30 rounded-xl p-2 text-center"
          >
            <p className="text-white font-bold text-base tabular-nums">
              {value}
            </p>
            <p className="text-zinc-500 text-[9px] uppercase tracking-wide">
              {label}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
cd ~/Settle
git add components/Scoreboard.tsx
git commit -m "feat: add Scoreboard component with Realtime refresh"
```

---

## Task 12: CreateBetSheet

**Files:**
- Create: `components/CreateBetSheet.tsx`

- [ ] **Step 1: Create components/CreateBetSheet.tsx**

```tsx
'use client'

import { useState } from 'react'
import BottomSheet from './BottomSheet'
import { createBetAction } from '@/lib/actions/bets'

interface CreateBetSheetProps {
  open: boolean
  onClose: () => void
}

const EMPTY = {
  description: '',
  amount: '',
  stake_label: '',
  deadline: '',
  opponent_phone: '',
}

export default function CreateBetSheet({ open, onClose }: CreateBetSheetProps) {
  const [form, setForm] = useState(EMPTY)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [shareLink, setShareLink] = useState<string | null>(null)

  function field(key: keyof typeof EMPTY) {
    return (
      e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
    ) => setForm((f) => ({ ...f, [key]: e.target.value }))
  }

  function handleClose() {
    setForm(EMPTY)
    setError(null)
    setShareLink(null)
    onClose()
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const result = await createBetAction({
        description: form.description,
        amount: form.amount ? Number(form.amount) : null,
        stake_label: form.stake_label || null,
        deadline: new Date(form.deadline).toISOString(),
        opponent_phone: form.opponent_phone || null,
      })
      if (!form.opponent_phone) {
        // share link flow — show the link
        const link = `${window.location.origin}/api/invites/${result.invite_token}`
        await navigator.clipboard.writeText(link).catch(() => {})
        setShareLink(link)
      } else {
        handleClose()
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <BottomSheet open={open} onClose={handleClose} title="New Bet">
      {shareLink ? (
        <div className="space-y-4">
          <p className="text-green-400 font-semibold text-sm">
            Bet created! Link copied to clipboard.
          </p>
          <div className="bg-zinc-800 rounded-xl p-3 text-xs text-zinc-400 break-all select-all">
            {shareLink}
          </div>
          <button
            onClick={handleClose}
            className="w-full bg-green-400 text-black font-bold rounded-xl py-3 text-sm"
          >
            Done
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-[10px] uppercase tracking-widest text-zinc-500 mb-1.5 block">
              The Bet
            </label>
            <textarea
              value={form.description}
              onChange={field('description')}
              placeholder="Lakers win tonight..."
              rows={2}
              className="w-full bg-zinc-800 text-white rounded-xl px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-green-400"
              required
            />
          </div>

          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-[10px] uppercase tracking-widest text-zinc-500 mb-1.5 block">
                Amount (optional)
              </label>
              <input
                type="number"
                min="0"
                step="1"
                value={form.amount}
                onChange={field('amount')}
                placeholder="$20"
                className="w-full bg-zinc-800 text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
              />
            </div>
            <div className="flex-1">
              <label className="text-[10px] uppercase tracking-widest text-zinc-500 mb-1.5 block">
                Deadline
              </label>
              <input
                type="datetime-local"
                value={form.deadline}
                onChange={field('deadline')}
                className="w-full bg-zinc-800 text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
                required
              />
            </div>
          </div>

          <div>
            <label className="text-[10px] uppercase tracking-widest text-zinc-500 mb-1.5 block">
              Stake label (optional)
            </label>
            <input
              type="text"
              value={form.stake_label}
              onChange={field('stake_label')}
              placeholder="loser buys dinner"
              className="w-full bg-zinc-800 text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
            />
          </div>

          <div>
            <label className="text-[10px] uppercase tracking-widest text-zinc-500 mb-1.5 block">
              Challenge (phone or leave blank for link)
            </label>
            <input
              type="tel"
              value={form.opponent_phone}
              onChange={field('opponent_phone')}
              placeholder="+1 555 000 0000"
              className="w-full bg-zinc-800 text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
            />
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-green-400 text-black font-bold rounded-xl py-3 text-sm disabled:opacity-50 transition-opacity"
          >
            {loading
              ? 'Creating...'
              : form.opponent_phone
              ? 'Send Bet'
              : 'Get Share Link'}
          </button>
        </form>
      )}
    </BottomSheet>
  )
}
```

- [ ] **Step 2: Commit**

```bash
cd ~/Settle
git add components/CreateBetSheet.tsx
git commit -m "feat: add CreateBetSheet component"
```

---

## Task 13: ResolveSheet + ConfirmSheet

**Files:**
- Create: `components/ResolveSheet.tsx`
- Create: `components/ConfirmSheet.tsx`

- [ ] **Step 1: Create components/ResolveSheet.tsx**

```tsx
'use client'

import { useState } from 'react'
import BottomSheet from './BottomSheet'
import { declareBetAction } from '@/lib/actions/bets'
import type { Bet } from '@/lib/types'

interface ResolveSheetProps {
  bet: Bet | null
  currentUserId: string
  onClose: () => void
}

export default function ResolveSheet({
  bet,
  currentUserId,
  onClose,
}: ResolveSheetProps) {
  const [iWon, setIWon] = useState<boolean | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const opponent =
    bet?.creator_id === currentUserId ? bet?.opponent : bet?.creator
  const stakeDisplay =
    bet?.amount != null
      ? `$${Number(bet.amount).toFixed(0)}`
      : (bet?.stake_label ?? '')

  function handleClose() {
    setIWon(null)
    setError(null)
    onClose()
  }

  async function handleDeclare() {
    if (!bet || iWon === null) return
    setLoading(true)
    setError(null)
    try {
      await declareBetAction(bet.id, iWon)
      handleClose()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <BottomSheet open={!!bet} onClose={handleClose}>
      <p className="text-zinc-500 text-sm mb-0.5">
        Bet vs {opponent?.display_name ?? '...'}
      </p>
      <p className="text-white font-bold text-base mb-1">
        &ldquo;{bet?.description}&rdquo;
      </p>
      {stakeDisplay && (
        <p className="text-yellow-400 font-semibold text-sm mb-5">
          {stakeDisplay} on the line
        </p>
      )}

      <p className="text-[10px] uppercase tracking-widest text-zinc-500 mb-3">
        Who won?
      </p>
      <div className="flex gap-3 mb-5">
        {(
          [
            { value: true,  emoji: '🏆', label: 'I Won',  activeColor: 'border-green-400 bg-green-400/10', activeText: 'text-green-400' },
            { value: false, emoji: '😔', label: 'I Lost', activeColor: 'border-red-400 bg-red-400/10',   activeText: 'text-red-400' },
          ] as const
        ).map(({ value, emoji, label, activeColor, activeText }) => (
          <button
            key={label}
            type="button"
            onClick={() => setIWon(value)}
            className={`flex-1 rounded-xl p-4 text-center border-2 transition-colors ${
              iWon === value
                ? activeColor
                : 'border-zinc-700 bg-zinc-800'
            }`}
          >
            <div className="text-2xl mb-1">{emoji}</div>
            <p
              className={`text-sm font-bold ${
                iWon === value ? activeText : 'text-zinc-400'
              }`}
            >
              {label}
            </p>
          </button>
        ))}
      </div>

      {error && <p className="text-red-400 text-sm mb-3">{error}</p>}

      <button
        onClick={handleDeclare}
        disabled={iWon === null || loading}
        className="w-full bg-red-400 text-black font-bold rounded-xl py-3 text-sm disabled:opacity-50 transition-opacity"
      >
        {loading ? 'Declaring...' : 'Declare Result'}
      </button>
      <p className="text-center text-zinc-600 text-xs mt-3">
        {opponent?.display_name ?? 'Your opponent'} will be asked to confirm
      </p>
    </BottomSheet>
  )
}
```

- [ ] **Step 2: Create components/ConfirmSheet.tsx**

```tsx
'use client'

import { useState } from 'react'
import BottomSheet from './BottomSheet'
import { confirmBetAction, markPaidAction } from '@/lib/actions/bets'
import type { Bet } from '@/lib/types'

interface ConfirmSheetProps {
  bet: Bet | null
  currentUserId: string
  onClose: () => void
}

export default function ConfirmSheet({
  bet,
  currentUserId,
  onClose,
}: ConfirmSheetProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showPay, setShowPay] = useState(false)

  const iAmLoser =
    bet !== null && bet.declared_winner_id !== currentUserId
  const declarer =
    bet?.creator_id === currentUserId ? bet?.opponent : bet?.creator
  const stakeDisplay =
    bet?.amount != null
      ? `$${Number(bet.amount).toFixed(0)}`
      : (bet?.stake_label ?? '')

  function handleClose() {
    setError(null)
    setShowPay(false)
    onClose()
  }

  async function handleConfirm(confirm: boolean) {
    if (!bet) return
    setLoading(true)
    setError(null)
    try {
      await confirmBetAction(bet.id, confirm)
      if (confirm && iAmLoser && bet.amount) {
        setShowPay(true)
      } else {
        handleClose()
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleMarkPaid() {
    if (!bet) return
    setLoading(true)
    setError(null)
    try {
      await markPaidAction(bet.id)
      handleClose()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (showPay && bet) {
    const amountStr = bet.amount ? String(Number(bet.amount).toFixed(2)) : ''
    const noteEncoded = encodeURIComponent(bet.description)
    return (
      <BottomSheet open onClose={handleClose} title="Time to Pay Up 💸">
        <p className="text-zinc-400 text-sm mb-5">
          {declarer?.display_name} confirmed you lost{' '}
          <span className="text-white font-semibold">{stakeDisplay}</span>
        </p>
        <div className="space-y-3 mb-5">
          <a
            href={`venmo://paycharge?txn=pay&note=${noteEncoded}&amount=${amountStr}`}
            className="flex items-center justify-between bg-blue-600 rounded-xl px-4 py-3"
          >
            <span className="text-white font-bold">Pay via Venmo</span>
            <span className="text-blue-200 text-sm">{stakeDisplay}</span>
          </a>
          <a
            href="https://cash.app"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between bg-green-600 rounded-xl px-4 py-3"
          >
            <span className="text-white font-bold">Pay via Cash App</span>
            <span className="text-green-200 text-sm">{stakeDisplay}</span>
          </a>
        </div>
        {error && <p className="text-red-400 text-sm mb-3">{error}</p>}
        <button
          onClick={handleMarkPaid}
          disabled={loading}
          className="w-full bg-zinc-700 text-white font-bold rounded-xl py-3 text-sm disabled:opacity-50"
        >
          {loading ? 'Marking...' : 'Mark as Paid'}
        </button>
      </BottomSheet>
    )
  }

  return (
    <BottomSheet open={!!bet} onClose={handleClose} title="Confirm Result">
      <p className="text-zinc-500 text-sm mb-1">
        {declarer?.display_name ?? '...'} declared:
      </p>
      <p className="text-white font-bold text-base mb-2">
        &ldquo;{bet?.description}&rdquo;
      </p>
      {iAmLoser ? (
        <p className="text-red-400 font-semibold mb-5">You lost 😔</p>
      ) : (
        <p className="text-green-400 font-semibold mb-5">You won 🏆</p>
      )}

      {error && <p className="text-red-400 text-sm mb-3">{error}</p>}

      <div className="flex gap-3">
        <button
          onClick={() => handleConfirm(true)}
          disabled={loading}
          className="flex-1 bg-green-400 text-black font-bold rounded-xl py-3 text-sm disabled:opacity-50"
        >
          Confirm
        </button>
        <button
          onClick={() => handleConfirm(false)}
          disabled={loading}
          className="flex-1 bg-zinc-700 text-white font-bold rounded-xl py-3 text-sm disabled:opacity-50"
        >
          Dispute
        </button>
      </div>
    </BottomSheet>
  )
}
```

- [ ] **Step 3: Commit**

```bash
cd ~/Settle
git add components/ResolveSheet.tsx components/ConfirmSheet.tsx
git commit -m "feat: add ResolveSheet and ConfirmSheet components"
```

---

## Task 14: BetFeed Component

**Files:**
- Create: `components/BetFeed.tsx`

- [ ] **Step 1: Create components/BetFeed.tsx**

```tsx
'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import BetCard from './BetCard'
import ResolveSheet from './ResolveSheet'
import ConfirmSheet from './ConfirmSheet'
import type { Bet } from '@/lib/types'

const URGENCY: Record<string, number> = {
  resolving: 0,
  pending:   1,
  active:    2,
  disputed:  3,
}

interface BetFeedProps {
  initialBets: Bet[]
  userId: string
}

export default function BetFeed({ initialBets, userId }: BetFeedProps) {
  const [bets, setBets] = useState<Bet[]>(initialBets)
  const [resolveBet, setResolveBet] = useState<Bet | null>(null)
  const [confirmBet, setConfirmBet] = useState<Bet | null>(null)
  const [showSettled, setShowSettled] = useState(false)

  useEffect(() => {
    const supabase = createClient()

    async function refresh() {
      const { data } = await supabase
        .from('bets')
        .select('*, creator:users!creator_id(*), opponent:users!opponent_id(*)')
        .or(`creator_id.eq.${userId},opponent_id.eq.${userId}`)
        .order('created_at', { ascending: false })
      if (data) setBets(data)
    }

    const channel = supabase
      .channel(`feed-${userId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bets' }, refresh)
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [userId])

  function handleCardClick(bet: Bet) {
    if (bet.status !== 'resolving') return
    if (!bet.declared_winner_id) {
      // Nobody declared yet — either party can declare
      setResolveBet(bet)
    } else if (bet.declarer_id !== userId) {
      // I'm not the declarer — I need to confirm
      setConfirmBet(bet)
    }
    // If I am the declarer, do nothing (waiting for other party)
  }

  const activeBets = bets
    .filter((b) => !['settled', 'paid', 'cancelled'].includes(b.status))
    .sort(
      (a, b) =>
        (URGENCY[a.status] ?? 9) - (URGENCY[b.status] ?? 9) ||
        new Date(a.deadline).getTime() - new Date(b.deadline).getTime()
    )

  const settledBets = bets.filter((b) =>
    ['settled', 'paid'].includes(b.status)
  )

  return (
    <>
      <div className="px-3 pb-24">
        <p className="text-[10px] uppercase tracking-widest text-zinc-500 mb-2">
          Active Bets
        </p>

        {activeBets.length === 0 && (
          <p className="text-zinc-600 text-sm text-center py-12">
            No active bets — tap + to start one
          </p>
        )}

        {activeBets.map((bet) => (
          <BetCard
            key={bet.id}
            bet={bet}
            currentUserId={userId}
            onClick={() => handleCardClick(bet)}
          />
        ))}

        {settledBets.length > 0 && (
          <>
            <button
              onClick={() => setShowSettled((s) => !s)}
              className="text-[10px] uppercase tracking-widest text-zinc-500 mt-4 mb-2 flex items-center gap-1"
            >
              Settled ({settledBets.length}) {showSettled ? '▲' : '▼'}
            </button>
            {showSettled &&
              settledBets.map((bet) => (
                <BetCard key={bet.id} bet={bet} currentUserId={userId} />
              ))}
          </>
        )}
      </div>

      <ResolveSheet
        bet={resolveBet}
        currentUserId={userId}
        onClose={() => setResolveBet(null)}
      />
      <ConfirmSheet
        bet={confirmBet}
        currentUserId={userId}
        onClose={() => setConfirmBet(null)}
      />
    </>
  )
}
```

- [ ] **Step 2: Commit**

```bash
cd ~/Settle
git add components/BetFeed.tsx
git commit -m "feat: add BetFeed with Realtime and sheet orchestration"
```

---

## Task 15: Main Page

**Files:**
- Create: `app/(app)/page.tsx`
- Create: `app/(app)/MainPageClient.tsx`

- [ ] **Step 1: Create app/(app)/page.tsx**

```tsx
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getUserBets, getScoreboard } from '@/lib/bets'
import MainPageClient from './MainPageClient'

export default async function HomePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [bets, scoreboard] = await Promise.all([
    getUserBets(supabase, user.id),
    getScoreboard(supabase, user.id).catch(() => ({
      id: user.id,
      net_amount: 0,
      wins: 0,
      losses: 0,
      pending: 0,
    })),
  ])

  return (
    <MainPageClient
      userId={user.id}
      initialBets={bets}
      scoreboard={scoreboard}
    />
  )
}
```

- [ ] **Step 2: Create app/(app)/MainPageClient.tsx**

```tsx
'use client'

import { useState } from 'react'
import ScoreboardCard from '@/components/Scoreboard'
import BetFeed from '@/components/BetFeed'
import CreateBetSheet from '@/components/CreateBetSheet'
import type { Bet, Scoreboard } from '@/lib/types'

interface MainPageClientProps {
  userId: string
  initialBets: Bet[]
  scoreboard: Scoreboard
}

export default function MainPageClient({
  userId,
  initialBets,
  scoreboard,
}: MainPageClientProps) {
  const [createOpen, setCreateOpen] = useState(false)

  return (
    <div className="min-h-dvh bg-black">
      {/* Header */}
      <div className="flex justify-between items-center px-4 pt-12 pb-3">
        <h1 className="text-2xl font-black text-white tracking-tight">
          Settle
        </h1>
        <div className="w-8 h-8 bg-zinc-800 rounded-full flex items-center justify-center text-xs text-zinc-400">
          You
        </div>
      </div>

      <ScoreboardCard userId={userId} initial={scoreboard} />
      <BetFeed initialBets={initialBets} userId={userId} />

      {/* FAB */}
      <button
        onClick={() => setCreateOpen(true)}
        aria-label="New bet"
        className="fixed bottom-6 right-5 w-14 h-14 bg-green-400 rounded-full flex items-center justify-center text-3xl font-light text-black shadow-xl shadow-green-400/25 active:scale-95 transition-transform"
      >
        +
      </button>

      <CreateBetSheet
        open={createOpen}
        onClose={() => setCreateOpen(false)}
      />
    </div>
  )
}
```

- [ ] **Step 3: Start dev server and verify main page loads**

First, create `.env.local` with your Supabase credentials:

```bash
cp .env.local.example .env.local
# Fill in NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY
```

Then:

```bash
cd ~/Settle && npm run dev
```

Open http://localhost:3000 — should redirect to `/login`. Sign in with your phone number to see the main feed.

- [ ] **Step 4: Commit**

```bash
cd ~/Settle
git add app/'(app)'/page.tsx app/'(app)'/MainPageClient.tsx
git commit -m "feat: add main feed page with scoreboard and FAB"
```

---

## Task 16: Invite API Route + Accept Bet Page

**Files:**
- Create: `app/api/invites/[token]/route.ts`
- Create: `app/(app)/bets/[id]/accept/page.tsx`
- Create: `app/(app)/bets/[id]/accept/AcceptBetClient.tsx`

- [ ] **Step 1: Create app/api/invites/[token]/route.ts**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  const { token } = params
  const supabase = await createClient()

  const { data: invite } = await supabase
    .from('invite_links')
    .select('bet_id, expires_at, used_at')
    .eq('token', token)
    .single()

  if (!invite) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (invite.used_at || new Date(invite.expires_at) < new Date()) {
    return NextResponse.redirect(
      new URL('/invite-expired', request.url)
    )
  }

  return NextResponse.redirect(
    new URL(
      `/bets/${invite.bet_id}/accept?token=${token}`,
      request.url
    )
  )
}
```

- [ ] **Step 2: Create app/(app)/bets/[id]/accept/page.tsx**

```tsx
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import AcceptBetClient from './AcceptBetClient'

export default async function AcceptBetPage({
  params,
  searchParams,
}: {
  params: { id: string }
  searchParams: { token?: string }
}) {
  const { id } = params
  const { token } = searchParams

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect(
      `/login?redirect=/bets/${id}/accept${token ? `&token=${token}` : ''}`
    )
  }

  const { data: bet } = await supabase
    .from('bets')
    .select('*, creator:users!creator_id(*)')
    .eq('id', id)
    .single()

  if (!bet) redirect('/')

  return <AcceptBetClient bet={bet} token={token ?? ''} />
}
```

- [ ] **Step 3: Create app/(app)/bets/[id]/accept/AcceptBetClient.tsx**

```tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { acceptBetAction } from '@/lib/actions/bets'
import type { Bet } from '@/lib/types'

export default function AcceptBetClient({
  bet,
  token,
}: {
  bet: Bet
  token: string
}) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const stakeDisplay =
    bet.amount != null
      ? `$${Number(bet.amount).toFixed(0)}`
      : bet.stake_label

  async function handleAccept() {
    setLoading(true)
    setError(null)
    try {
      await acceptBetAction(bet.id, token)
      router.push('/')
    } catch (err: any) {
      setError(err.message)
      setLoading(false)
    }
  }

  return (
    <div className="min-h-dvh bg-black flex flex-col items-center justify-center p-6">
      <h1 className="text-4xl font-black text-white mb-1 tracking-tight">
        Settle
      </h1>
      <p className="text-zinc-500 text-sm mb-8">You've been challenged</p>

      <div className="w-full max-w-sm bg-zinc-900 rounded-2xl p-5 mb-6">
        <p className="text-zinc-500 text-xs mb-1.5">
          From {bet.creator?.display_name ?? 'Someone'}
        </p>
        <p className="text-white font-bold text-lg mb-3">
          &ldquo;{bet.description}&rdquo;
        </p>
        {stakeDisplay && (
          <p className="text-yellow-400 font-semibold text-sm">
            Stake: {stakeDisplay}
          </p>
        )}
        <p className="text-zinc-500 text-xs mt-2">
          Deadline:{' '}
          {new Date(bet.deadline).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          })}
        </p>
      </div>

      {error && <p className="text-red-400 text-sm mb-4">{error}</p>}

      <div className="w-full max-w-sm space-y-3">
        <button
          onClick={handleAccept}
          disabled={loading}
          className="w-full bg-green-400 text-black font-bold rounded-2xl py-3.5 disabled:opacity-50 transition-opacity"
        >
          {loading ? 'Accepting...' : "I'm In 🤝"}
        </button>
        <button
          onClick={() => router.push('/')}
          className="w-full bg-zinc-900 text-zinc-500 font-medium rounded-2xl py-3.5"
        >
          Decline
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Commit**

```bash
cd ~/Settle
git add app/api/ app/'(app)'/bets/
git commit -m "feat: add invite API route and accept bet page"
```

---

## Task 17: Deadline Edge Function

**Files:**
- Create: `supabase/functions/check-deadlines/index.ts`

- [ ] **Step 1: Create supabase/functions/check-deadlines/index.ts**

```typescript
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

Deno.serve(async () => {
  const { error, count } = await supabase
    .from('bets')
    .update({ status: 'resolving' })
    .eq('status', 'active')
    .lt('deadline', new Date().toISOString())

  if (error) {
    console.error('Deadline check failed:', error.message)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  console.log(`Updated ${count ?? 0} bets to resolving`)
  return new Response(JSON.stringify({ updated: count ?? 0 }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
```

- [ ] **Step 2: Deploy the Edge Function**

```bash
cd ~/Settle
npx supabase functions deploy check-deadlines --project-ref <your-project-ref>
```

- [ ] **Step 3: Schedule it via Supabase cron (run in SQL Editor)**

```sql
select cron.schedule(
  'check-bet-deadlines',
  '*/5 * * * *',
  $$
  select net.http_post(
    url := 'https://<your-project-ref>.supabase.co/functions/v1/check-deadlines',
    headers := '{"Authorization": "Bearer <your-anon-key>"}'::jsonb
  )
  $$
);
```

Replace `<your-project-ref>` and `<your-anon-key>` with values from Supabase dashboard → Settings → API.

- [ ] **Step 4: Commit**

```bash
cd ~/Settle
git add supabase/functions/check-deadlines/
git commit -m "feat: add check-deadlines Edge Function"
```

---

## Task 18: SMS Invite Edge Function

**Files:**
- Create: `supabase/functions/send-invite-sms/index.ts`

- [ ] **Step 1: Create supabase/functions/send-invite-sms/index.ts**

```typescript
interface Payload {
  to: string
  invite_url: string
  creator_name: string
  description: string
}

Deno.serve(async (req) => {
  const { to, invite_url, creator_name, description }: Payload =
    await req.json()

  const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID')!
  const authToken = Deno.env.get('TWILIO_AUTH_TOKEN')!
  const fromNumber = Deno.env.get('TWILIO_PHONE_NUMBER')!

  const body = `${creator_name} challenged you on Settle: "${description}" — Accept: ${invite_url}`

  const resp = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${btoa(`${accountSid}:${authToken}`)}`,
      },
      body: new URLSearchParams({
        From: fromNumber,
        To: to,
        Body: body,
      }),
    }
  )

  const data = await resp.json()
  return new Response(JSON.stringify(data), {
    status: resp.ok ? 200 : 400,
    headers: { 'Content-Type': 'application/json' },
  })
})
```

- [ ] **Step 2: Deploy the Edge Function**

```bash
npx supabase functions deploy send-invite-sms --project-ref <your-project-ref>
```

- [ ] **Step 3: Set secrets in Supabase dashboard**

Go to Supabase dashboard → Edge Functions → Manage secrets:
```
TWILIO_ACCOUNT_SID = <from Twilio console>
TWILIO_AUTH_TOKEN  = <from Twilio console>
TWILIO_PHONE_NUMBER = <your Twilio number e.g. +15551234567>
```

- [ ] **Step 4: Wire up the Edge Function call in createBet**

Update `lib/bets.ts` — in `createBet`, after creating the invite link, add the SMS call for new (non-existing) users:

```typescript
// After: await supabase.from('invite_links').insert({ bet_id: bet.id, token })

if (!opponentId && input.opponent_phone) {
  // New user — send invite SMS via Edge Function
  const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/invites/${token}`
  await supabase.functions.invoke('send-invite-sms', {
    body: {
      to: input.opponent_phone,
      invite_url: inviteUrl,
      creator_name: bet.creator?.display_name ?? 'Someone',
      description: input.description,
    },
  })
}
```

Add `NEXT_PUBLIC_APP_URL` to `.env.local`:
```
NEXT_PUBLIC_APP_URL=http://localhost:3000
```
(Set to your Vercel URL in production.)

- [ ] **Step 5: Commit**

```bash
cd ~/Settle
git add supabase/functions/send-invite-sms/ lib/bets.ts
git commit -m "feat: add SMS invite Edge Function and wire into createBet"
```

---

## Task 19: Env Vars + Deploy Config

**Files:**
- Create: `.env.local.example`
- Create: `vercel.json`
- Modify: `.gitignore`

- [ ] **Step 1: Create .env.local.example**

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# App
NEXT_PUBLIC_APP_URL=https://your-vercel-app.vercel.app
```

- [ ] **Step 2: Create vercel.json**

```json
{
  "framework": "nextjs",
  "buildCommand": "npm run build",
  "devCommand": "npm run dev",
  "installCommand": "npm install"
}
```

- [ ] **Step 3: Ensure .gitignore excludes secrets**

Verify `.gitignore` contains:
```
.env.local
.env.*.local
.superpowers/
```

If any are missing, add them.

- [ ] **Step 4: Run full test suite**

```bash
cd ~/Settle && npm test
```

Expected: all tests pass.

- [ ] **Step 5: Deploy to Vercel**

```bash
npx vercel --prod
```

When prompted, add environment variables:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_APP_URL` (set to your `.vercel.app` URL)

- [ ] **Step 6: Final commit**

```bash
cd ~/Settle
git add .env.local.example vercel.json .gitignore
git commit -m "feat: add deploy config and env var template"
```

---

## Post-Deploy Smoke Test Checklist

After deploying, verify these flows manually:

- [ ] Visit the app URL — redirects to `/login`
- [ ] Enter your phone number — receive OTP SMS
- [ ] Enter OTP — lands on main feed, scoreboard shows `+$0`
- [ ] Tap + — CreateBetSheet opens
- [ ] Create a bet with "Get Share Link" — link copied, bet appears in feed as PENDING
- [ ] Open share link in another browser (incognito) — sign in with a different phone
- [ ] Accept the bet — both feeds update live via Realtime; scoreboard pending count increments
- [ ] Wait for deadline or tap RESOLVE card — ResolveSheet opens
- [ ] Declare "I Won" — other user sees ConfirmSheet notification
- [ ] Other user confirms — bet moves to SETTLED; scoreboard updates
- [ ] Loser sees Venmo/Cash App buttons; taps "Mark as Paid" — bet moves to PAID
