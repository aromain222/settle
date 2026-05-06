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
        opponent_phone: null,
      })
      const link = `${window.location.origin}/api/invites/${result.invite_token}`
      await navigator.clipboard.writeText(link).catch(() => {})
      setShareLink(link)
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

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-green-400 text-black font-bold rounded-xl py-3 text-sm disabled:opacity-50 transition-opacity"
          >
            {loading ? 'Creating...' : 'Get Share Link'}
          </button>
        </form>
      )}
    </BottomSheet>
  )
}
