'use client'

import { useState } from 'react'
import { ChevronRight, ChevronLeft, Copy, Check } from 'lucide-react'
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

const STEP_TITLES = ['What\'s the bet?', 'Details', 'Share it!']

export default function CreateBetSheet({ open, onClose }: CreateBetSheetProps) {
  const [step, setStep] = useState(0)
  const [form, setForm] = useState(EMPTY)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [shareLink, setShareLink] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  function field(key: keyof typeof EMPTY) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value }))
  }

  function handleClose() {
    setStep(0)
    setForm(EMPTY)
    setError(null)
    setShareLink(null)
    setCopied(false)
    onClose()
  }

  async function handleCreate() {
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
      setShareLink(link)
      await navigator.clipboard.writeText(link).catch(() => {})
      setCopied(true)
      setStep(2)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function copyLink() {
    if (!shareLink) return
    await navigator.clipboard.writeText(shareLink).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <BottomSheet open={open} onClose={handleClose} title={STEP_TITLES[step]}>
      {/* Step indicator */}
      {step < 2 && (
        <div className="flex gap-1.5 mb-5">
          {[0, 1].map((i) => (
            <div
              key={i}
              className={`h-1 rounded-full flex-1 transition-colors ${i <= step ? 'bg-green-400' : 'bg-zinc-700'}`}
            />
          ))}
        </div>
      )}

      {/* Step 0: Description */}
      {step === 0 && (
        <div className="space-y-5">
          <div>
            <label className="text-[10px] uppercase tracking-widest text-zinc-500 mb-2 block">
              Describe the bet
            </label>
            <textarea
              value={form.description}
              onChange={field('description')}
              placeholder="Lakers win tonight..."
              rows={3}
              autoFocus
              className="w-full bg-zinc-800 text-white rounded-2xl px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-green-400 placeholder-zinc-600"
            />
          </div>
          <button
            disabled={!form.description.trim()}
            onClick={() => setStep(1)}
            className="w-full bg-green-400 text-black font-bold rounded-2xl py-3.5 text-sm flex items-center justify-center gap-1.5 disabled:opacity-40 transition-opacity"
          >
            Next <ChevronRight size={16} strokeWidth={2.5} />
          </button>
        </div>
      )}

      {/* Step 1: Amount + deadline */}
      {step === 1 && (
        <div className="space-y-4">
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-[10px] uppercase tracking-widest text-zinc-500 mb-2 block">
                Amount (optional)
              </label>
              <input
                type="number"
                min="0"
                step="1"
                value={form.amount}
                onChange={field('amount')}
                placeholder="$20"
                className="w-full bg-zinc-800 text-white rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 placeholder-zinc-600"
              />
            </div>
            <div className="flex-1">
              <label className="text-[10px] uppercase tracking-widest text-zinc-500 mb-2 block">
                Stake label
              </label>
              <input
                type="text"
                value={form.stake_label}
                onChange={field('stake_label')}
                placeholder="loser buys dinner"
                className="w-full bg-zinc-800 text-white rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 placeholder-zinc-600"
              />
            </div>
          </div>

          <div>
            <label className="text-[10px] uppercase tracking-widest text-zinc-500 mb-2 block">
              Deadline
            </label>
            <input
              type="datetime-local"
              value={form.deadline}
              onChange={field('deadline')}
              className="w-full bg-zinc-800 text-white rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
              required
            />
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <div className="flex gap-3">
            <button
              onClick={() => setStep(0)}
              className="w-12 h-12 bg-zinc-800 rounded-2xl flex items-center justify-center text-zinc-400 active:opacity-70 shrink-0"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              disabled={!form.deadline || loading}
              onClick={handleCreate}
              className="flex-1 bg-green-400 text-black font-bold rounded-2xl py-3.5 text-sm disabled:opacity-40 transition-opacity"
            >
              {loading ? 'Creating...' : 'Create & Get Link'}
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Share link */}
      {step === 2 && shareLink && (
        <div className="space-y-5">
          <div className="text-center py-2">
            <div className="w-16 h-16 rounded-full bg-green-400/10 flex items-center justify-center mx-auto mb-3 text-3xl">
              🎉
            </div>
            <p className="text-white font-bold text-base">Bet created!</p>
            <p className="text-zinc-500 text-sm mt-1">Share the link with your opponent</p>
          </div>

          <div
            className="bg-zinc-800 rounded-2xl px-4 py-3 text-xs text-zinc-400 break-all select-all leading-relaxed"
          >
            {shareLink}
          </div>

          <button
            onClick={copyLink}
            className={`w-full font-bold rounded-2xl py-3.5 text-sm flex items-center justify-center gap-2 transition-colors ${
              copied ? 'bg-zinc-700 text-green-400' : 'bg-zinc-800 text-white'
            }`}
          >
            {copied ? <Check size={16} /> : <Copy size={16} />}
            {copied ? 'Copied!' : 'Copy link'}
          </button>

          <button
            onClick={handleClose}
            className="w-full bg-green-400 text-black font-bold rounded-2xl py-3.5 text-sm"
          >
            Done
          </button>
        </div>
      )}
    </BottomSheet>
  )
}
