'use server'

import { createClient } from '@/lib/supabase/server'
import type { User } from '@/lib/types'

export async function getFriends(): Promise<User[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data } = await supabase
    .from('friendships')
    .select('friend:users!friend_id(*)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  return data?.map((r: any) => r.friend).filter(Boolean) ?? []
}

export async function addFriendByEmail(email: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Sign in to add friends' }

  const trimmed = email.toLowerCase().trim()
  if (!trimmed) return { error: 'Enter an email address' }

  const { data: target } = await supabase
    .from('users')
    .select('id')
    .eq('email', trimmed)
    .single()

  if (!target) return { error: 'No Settle account found for that email' }
  if (target.id === user.id) return { error: "That's you!" }

  // Insert both directions so either user can query by user_id
  const { error } = await supabase.from('friendships').upsert(
    [
      { user_id: user.id, friend_id: target.id },
      { user_id: target.id, friend_id: user.id },
    ],
    { onConflict: 'user_id,friend_id' }
  )

  if (error) return { error: error.message }
  return {}
}

export async function removeFriend(friendId: string): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  await supabase
    .from('friendships')
    .delete()
    .eq('user_id', user.id)
    .eq('friend_id', friendId)
}
