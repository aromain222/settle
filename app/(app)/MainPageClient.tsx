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
