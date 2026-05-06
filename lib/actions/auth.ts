'use server'

import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function signInWithEmail(
  email: string,
  redirectTo?: string
): Promise<{ error?: string }> {
  try {
    const supabase = await createClient()

    if (redirectTo) {
      ;(await cookies()).set('auth_redirect', redirectTo, {
        maxAge: 60 * 10, // 10 minutes
        httpOnly: true,
        path: '/',
      })
    }

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/callback`,
      },
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
