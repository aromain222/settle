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

type Filter = 'all' | 'active' | 'awaiting' | 'settled' | 'disputed'

const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all',      label: 'All' },
  { id: 'active',   label: 'Active' },
  { id: 'awaiting', label: 'Awaiting' },
  { id: 'settled',  label: 'Settled' },
  { id: 'disputed', label: 'Disputed' },
]

function applyFilter(bets: Bet[], filter: Filter): Bet[] {
  switch (filter) {
    case 'active':   return bets.filter(b => ['active', 'resolving'].includes(b.status))
    case 'awaiting': return bets.filter(b => b.status === 'pending')
    case 'settled':  return bets.filter(b => ['settled', 'paid', 'cancelled'].includes(b.status))
    case 'disputed': return bets.filter(b => b.status === 'disputed')
    default:         return bets
  }
}

const FILTER_EMPTY: Record<Filter, string> = {
  all:      'No bets yet',
  active:   'No active bets',
  awaiting: 'Nothing waiting',
  settled:  'Nothing settled yet',
  disputed: 'No disputes',
}

interface BetFeedProps {
  initialBets: Bet[]
  userId: string
}

export default function BetFeed({ initialBets, userId }: BetFeedProps) {
  const [bets, setBets] = useState<Bet[]>(initialBets)
  const [resolveBet, setResolveBet] = useState<Bet | null>(null)
  const [confirmBet, setConfirmBet] = useState<Bet | null>(null)
  const [filter, setFilter] = useState<Filter>('all')

  useEffect(() => {
    const supabase = createClient()

    async function refresh() {
      const { data } = await supabase
        .from('bets')
        .select('*, creator:users!creator_id(*), opponent:users!opponent_id(*), declarer:users!declarer_id(*)')
        .or(`creator_id.eq.${userId},opponent_id.eq.${userId}`)
        .order('created_at', { ascending: false })
      if (data) setBets(data)
    }

    const channel = supabase
      .channel(`feed-${userId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bets' }, refresh)
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [userId])

  function handleCardClick(bet: Bet) {
    if (bet.status === 'active') {
      // Either party can declare from an active bet
      setResolveBet(bet)
    } else if (bet.status === 'resolving') {
      if (!bet.declared_winner_id) {
        setResolveBet(bet)
      } else if (bet.declarer_id !== userId) {
        // I'm not the declarer — I need to confirm
        setConfirmBet(bet)
      }
      // If I AM the declarer, do nothing (waiting on the other person)
    }
  }

  const sorted = [...bets].sort(
    (a, b) =>
      (URGENCY[a.status] ?? 9) - (URGENCY[b.status] ?? 9) ||
      new Date(a.deadline).getTime() - new Date(b.deadline).getTime()
  )

  const visible = applyFilter(sorted, filter)

  return (
    <>
      {/* Filter chips */}
      <div className="flex gap-2 px-4 mb-4 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
        {FILTERS.map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setFilter(id)}
            className={`shrink-0 text-xs font-semibold px-3.5 py-1.5 rounded-full transition-colors ${
              filter === id
                ? 'bg-green-400 text-black'
                : 'bg-zinc-800 text-zinc-400 active:bg-zinc-700'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="px-4 pb-28">
        <p className="text-[10px] uppercase tracking-widest text-zinc-500 mb-3">Your Bets</p>

        {visible.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 rounded-full bg-zinc-900 flex items-center justify-center mb-4 text-3xl">
              🎯
            </div>
            <p className="text-white font-semibold text-base mb-1">
              {FILTER_EMPTY[filter]}
            </p>
            {filter === 'all' && (
              <p className="text-zinc-500 text-sm">Tap + to start your first bet</p>
            )}
          </div>
        ) : (
          visible.map((bet) => (
            <BetCard
              key={bet.id}
              bet={bet}
              currentUserId={userId}
              onClick={() => handleCardClick(bet)}
            />
          ))
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
