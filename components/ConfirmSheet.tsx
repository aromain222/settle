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
    bet !== null &&
    bet.declared_winner_id !== null &&
    bet.declared_winner_id !== currentUserId
  const declarer = bet?.declarer
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
          {declarer?.display_name} declared you lost{' '}
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
