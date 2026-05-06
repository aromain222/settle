'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function signUp(
  email: string,
  password: string
): Promise<{ error?: string }> {
  try {
    const supabase = await createClient()
    const { error } = await supabase.auth.signUp({ email, password })
    if (error) return { error: error.message }
    return {}
  } catch (e: any) {
    return { error: e?.message ?? 'Something went wrong' }
  }
}

export async function signIn(
  email: string,
  password: string
): Promise<{ error?: string }> {
  try {
    const supabase = await createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
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
