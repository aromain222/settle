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
