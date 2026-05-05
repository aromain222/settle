'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { signInWithPhone } from '@/lib/actions/auth'

export default function LoginPage() {
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      await signInWithPhone(phone)
      router.push(`/login/verify?phone=${encodeURIComponent(phone)}`)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-dvh bg-black flex flex-col items-center justify-center p-6">
      <h1 className="text-4xl font-black text-white mb-1 tracking-tight">
        Settle
      </h1>
      <p className="text-zinc-500 text-sm mb-10">Friendly bets, no drama</p>

      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4">
        <div>
          <label className="text-[10px] uppercase tracking-widest text-zinc-500 mb-2 block">
            Phone Number
          </label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+1 555 000 0000"
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
          {loading ? 'Sending code...' : 'Get Code'}
        </button>
      </form>
    </div>
  )
}
