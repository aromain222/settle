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
        .select('*, creator:users!creator_id(*), opponent:users!opponent_id(*), declarer:users!declarer_id(*)')
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
