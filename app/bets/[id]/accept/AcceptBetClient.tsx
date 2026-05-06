'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { acceptBetAction } from '@/lib/actions/bets'
import type { Bet } from '@/lib/types'

export default function AcceptBetClient({ bet, token }: { bet: Bet; token: string }) {
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
    const result = await acceptBetAction(bet.id, token)
    if (result?.error) {
      setError(result.error)
      setLoading(false)
    } else {
      router.push('/')
    }
  }

  return (
    <div className="min-h-dvh bg-black flex flex-col items-center justify-center p-6">
      <h1 className="text-4xl font-black text-white mb-1 tracking-tight">Settle</h1>
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
