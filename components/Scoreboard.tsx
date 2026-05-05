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
      const { data: fresh, error } = await supabase
        .from('user_scoreboard')
        .select('*')
        .eq('id', userId)
        .single()
      if (error) { console.error('scoreboard refresh failed', error); return }
      if (fresh) setData(fresh)
    }

    const ch1 = supabase
      .channel(`scoreboard-${userId}-creator`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'bets', filter: `creator_id=eq.${userId}` },
        refresh
      )
      .subscribe()

    const ch2 = supabase
      .channel(`scoreboard-${userId}-opponent`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'bets', filter: `opponent_id=eq.${userId}` },
        refresh
      )
      .subscribe()

    return () => {
      supabase.removeChannel(ch1)
      supabase.removeChannel(ch2)
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
