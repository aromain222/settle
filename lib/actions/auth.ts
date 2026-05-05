'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function signInWithPhone(phone: string) {
  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithOtp({ phone })
  if (error) throw new Error(error.message)
}

export async function verifyOtp(phone: string, token: string) {
  const supabase = await createClient()
  const { error } = await supabase.auth.verifyOtp({ phone, token, type: 'sms' })
  if (error) throw new Error(error.message)
  redirect('/')
}

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}
