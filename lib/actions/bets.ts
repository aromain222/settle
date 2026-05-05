'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import {
  createBet,
  acceptBet,
  declareBet,
  confirmBet,
  markPaid,
  type CreateBetInput,
} from '@/lib/bets'

async function getAuthenticatedUser() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')
  return { supabase, userId: user.id }
}

export async function createBetAction(input: CreateBetInput) {
  const { supabase, userId } = await getAuthenticatedUser()
  const result = await createBet(supabase, userId, input)
  revalidatePath('/')
  return result
}

export async function acceptBetAction(betId: string, token: string) {
  const { supabase, userId } = await getAuthenticatedUser()
  const bet = await acceptBet(supabase, userId, betId, token)
  revalidatePath('/')
  return bet
}

export async function declareBetAction(betId: string, iWon: boolean) {
  const { supabase, userId } = await getAuthenticatedUser()
  const bet = await declareBet(supabase, userId, betId, iWon)
  revalidatePath('/')
  return bet
}

export async function confirmBetAction(betId: string, confirm: boolean) {
  const { supabase, userId } = await getAuthenticatedUser()
  const bet = await confirmBet(supabase, userId, betId, confirm)
  revalidatePath('/')
  return bet
}

export async function markPaidAction(betId: string) {
  const { supabase, userId } = await getAuthenticatedUser()
  const bet = await markPaid(supabase, userId, betId)
  revalidatePath('/')
  return bet
}
