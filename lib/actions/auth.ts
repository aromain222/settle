'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function signInWithEmail(
  email: string,
  redirectTo?: string
): Promise<{ error?: string }> {
  try {
    const supabase = await createClient()
    const callbackUrl = new URL(
      `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/callback`
    )
    if (redirectTo) callbackUrl.searchParams.set('redirect', redirectTo)

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: callbackUrl.toString() },
    })
    if (error) return { error: error.message }
    return {}
  } catch (e: any) {
    return { error: e?.message ?? 'Something went wrong' }
  }
}

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}
