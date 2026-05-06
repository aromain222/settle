'use client'

import { useState } from 'react'
import { Bell, Plus, UserPlus } from 'lucide-react'
import ScoreboardCard from '@/components/Scoreboard'
import BetFeed from '@/components/BetFeed'
import CreateBetSheet from '@/components/CreateBetSheet'
import type { Bet, Scoreboard } from '@/lib/types'

interface MainPageClientProps {
  userId: string
  initialBets: Bet[]
  scoreboard: Scoreboard
}

export default function MainPageClient({ userId, initialBets, scoreboard }: MainPageClientProps) {
  const [createOpen, setCreateOpen] = useState(false)

  return (
    <div className="min-h-dvh bg-black max-w-[480px] mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center px-4 pt-14 pb-4">
        <div className="w-9 h-9 bg-zinc-800 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0">
          S
        </div>
        <h1 className="text-xl font-black text-white tracking-tight">Settle</h1>
        <button
          className="w-9 h-9 flex items-center justify-center text-zinc-400 active:text-white transition-colors shrink-0"
          aria-label="Notifications"
        >
          <Bell size={20} />
        </button>
      </div>

      <ScoreboardCard userId={userId} initial={scoreboard} />

      {/* Quick actions */}
      <div className="flex gap-3 px-4 mb-5">
        <button
          onClick={() => setCreateOpen(true)}
          className="flex-1 bg-green-400 text-black font-bold rounded-2xl py-3 text-sm flex items-center justify-center gap-1.5 active:opacity-80 transition-opacity"
        >
          <Plus size={16} strokeWidth={2.5} />
          Start a bet
        </button>
        <button
          onClick={() => setCreateOpen(true)}
          className="flex-1 bg-zinc-800 text-white font-semibold rounded-2xl py-3 text-sm flex items-center justify-center gap-1.5 active:opacity-80 transition-opacity"
        >
          <UserPlus size={16} />
          Invite friend
        </button>
      </div>

      <BetFeed initialBets={initialBets} userId={userId} />

      {/* FAB */}
      <button
        onClick={() => setCreateOpen(true)}
        aria-label="New bet"
        className="fixed bottom-6 right-5 w-14 h-14 bg-green-400 rounded-full flex items-center justify-center text-black active:scale-95 transition-transform"
        style={{ boxShadow: '0 0 28px rgba(74,222,128,0.4), 0 8px 24px rgba(0,0,0,0.4)' }}
      >
        <Plus size={24} strokeWidth={2.5} />
      </button>

      <CreateBetSheet open={createOpen} onClose={() => setCreateOpen(false)} />
    </div>
  )
}
