'use client'

import { Suspense, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { verifyOtp } from '@/lib/actions/auth'

function VerifyForm() {
  const searchParams = useSearchParams()
  const phone = decodeURIComponent(searchParams.get('phone') ?? '')
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      await verifyOtp(phone, code)
    } catch (err: any) {
      setError(err.message)
      setLoading(false)
    }
  }

  return (
    <div className="min-h-dvh bg-black flex flex-col items-center justify-center p-6">
      <h1 className="text-4xl font-black text-white mb-1 tracking-tight">
        Settle
      </h1>
      <p className="text-zinc-500 text-sm mb-1">Code sent to</p>
      <p className="text-white text-sm font-semibold mb-10">{phone}</p>

      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4">
        <input
          type="text"
          inputMode="numeric"
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
          placeholder="000000"
          maxLength={6}
          className="w-full bg-zinc-900 text-white rounded-2xl px-4 py-3.5 text-3xl text-center tracking-[0.5em] focus:outline-none focus:ring-2 focus:ring-green-400"
          required
        />
        {error && <p className="text-red-400 text-sm">{error}</p>}
        <button
          type="submit"
          disabled={loading || code.length < 6}
          className="w-full bg-green-400 text-black font-bold rounded-2xl py-3.5 text-base disabled:opacity-50 transition-opacity"
        >
          {loading ? 'Verifying...' : 'Verify'}
        </button>
      </form>
    </div>
  )
}

export default function VerifyPage() {
  return (
    <Suspense>
      <VerifyForm />
    </Suspense>
  )
}
