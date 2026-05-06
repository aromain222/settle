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
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bets', filter: `creator_id=eq.${userId}` }, refresh)
      .subscribe()

    const ch2 = supabase
      .channel(`scoreboard-${userId}-opponent`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bets', filter: `opponent_id=eq.${userId}` }, refresh)
      .subscribe()

    return () => {
      supabase.removeChannel(ch1)
      supabase.removeChannel(ch2)
    }
  }, [userId])

  const net = Number(data.net_amount)
  const isPositive = net > 0
  const isNegative = net < 0

  const netDisplay = isPositive
    ? `+$${net.toFixed(0)}`
    : isNegative
    ? `-$${Math.abs(net).toFixed(0)}`
    : '$0'

  const subtext = isPositive
    ? `You're up $${net.toFixed(0)}`
    : isNegative
    ? `You're down $${Math.abs(net).toFixed(0)}`
    : "You're even"

  const textColor = isPositive ? '#4ade80' : isNegative ? '#f87171' : '#ffffff'
  const glowColor = isPositive
    ? 'rgba(74,222,128,0.45)'
    : isNegative
    ? 'rgba(248,113,113,0.45)'
    : 'rgba(255,255,255,0.15)'

  const total = data.wins + data.losses
  const winPct = total > 0 ? Math.round((data.wins / total) * 100) : 0

  return (
    <div className="mx-4 mb-4 bg-zinc-900 rounded-3xl p-5">
      <p className="text-[10px] uppercase tracking-widest text-zinc-500 mb-1">Net Position</p>
      <p
        className="text-6xl font-black tabular-nums leading-none mb-1.5"
        style={{ color: textColor, textShadow: `0 0 32px ${glowColor}` }}
      >
        {netDisplay}
      </p>
      <p className="text-zinc-400 text-sm mb-5">{subtext}</p>

      <div className="flex gap-2">
        {[
          { label: 'Wins', value: String(data.wins) },
          { label: 'Losses', value: String(data.losses) },
          { label: 'Win %', value: `${winPct}%` },
          { label: 'Active', value: String(data.pending) },
        ].map(({ label, value }) => (
          <div key={label} className="flex-1 bg-black/40 rounded-2xl p-2.5 text-center">
            <p className="text-white font-bold text-base tabular-nums">{value}</p>
            <p className="text-zinc-500 text-[9px] uppercase tracking-wide mt-0.5">{label}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
