'use client'

import { useState } from 'react'
import { signInWithEmail } from '@/lib/actions/auth'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      await signInWithEmail(email)
      setSent(true)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (sent) {
    return (
      <div className="min-h-dvh bg-black flex flex-col items-center justify-center p-6">
        <h1 className="text-4xl font-black text-white mb-1 tracking-tight">Settle</h1>
        <p className="text-zinc-500 text-sm mb-10">Friendly bets, no drama</p>
        <div className="w-full max-w-sm text-center">
          <p className="text-green-400 font-semibold text-lg mb-2">Check your email</p>
          <p className="text-zinc-500 text-sm">We sent a magic link to <span className="text-white">{email}</span>. Click it to sign in.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-dvh bg-black flex flex-col items-center justify-center p-6">
      <h1 className="text-4xl font-black text-white mb-1 tracking-tight">Settle</h1>
      <p className="text-zinc-500 text-sm mb-10">Friendly bets, no drama</p>

      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4">
        <div>
          <label className="text-[10px] uppercase tracking-widest text-zinc-500 mb-2 block">
            Email
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            autoComplete="email"
            className="w-full bg-zinc-900 text-white rounded-2xl px-4 py-3.5 text-base focus:outline-none focus:ring-2 focus:ring-green-400"
            required
          />
        </div>
        {error && <p className="text-red-400 text-sm">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-green-400 text-black font-bold rounded-2xl py-3.5 text-base disabled:opacity-50 transition-opacity"
        >
          {loading ? 'Sending...' : 'Send Magic Link'}
        </button>
      </form>
    </div>
  )
}
