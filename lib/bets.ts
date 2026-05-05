import type { SupabaseClient } from '@supabase/supabase-js'
import type { Bet, Scoreboard } from './types'
import { nanoid } from 'nanoid'

export interface CreateBetInput {
  description: string
  amount: number | null
  stake_label: string | null
  deadline: string
  opponent_phone: string | null
}

export async function createBet(
  supabase: SupabaseClient,
  userId: string,
  input: CreateBetInput
): Promise<{ bet: Bet; invite_token: string }> {
  let opponentId: string | null = null
  if (input.opponent_phone) {
    const { data: opponent } = await supabase
      .from('users')
      .select('id')
      .eq('phone', input.opponent_phone)
      .single()
    opponentId = opponent?.id ?? null
  }

  const { data: bet, error } = await supabase
    .from('bets')
    .insert({
      creator_id: userId,
      opponent_id: opponentId,
      description: input.description,
      amount: input.amount,
      stake_label: input.stake_label,
      deadline: input.deadline,
      status: 'pending',
    })
    .select('*, creator:users!creator_id(*), opponent:users!opponent_id(*)')
    .single()

  if (error) throw new Error(error.message)

  const token = nanoid(10)
  await supabase.from('invite_links').insert({ bet_id: bet.id, token })

  if (opponentId) {
    await supabase.from('notifications').insert({
      user_id: opponentId,
      bet_id: bet.id,
      type: 'bet_invite',
    })
  }

  return { bet, invite_token: token }
}

export async function acceptBet(
  supabase: SupabaseClient,
  userId: string,
  betId: string,
  token: string
): Promise<Bet> {
  const { data: invite, error: inviteError } = await supabase
    .from('invite_links')
    .select('*')
    .eq('token', token)
    .eq('bet_id', betId)
    .is('used_at', null)
    .single()

  if (inviteError || !invite) throw new Error('Invalid or expired invite')
  if (new Date(invite.expires_at) < new Date()) throw new Error('Invite expired')

  const { data: bet, error } = await supabase
    .from('bets')
    .update({ opponent_id: userId, status: 'active' })
    .eq('id', betId)
    .eq('status', 'pending')
    .select('*, creator:users!creator_id(*), opponent:users!opponent_id(*)')
    .single()

  if (error || !bet) throw new Error('Could not accept bet')

  await supabase
    .from('invite_links')
    .update({ used_at: new Date().toISOString() })
    .eq('id', invite.id)

  await supabase.from('notifications').insert({
    user_id: bet.creator_id,
    bet_id: bet.id,
    type: 'bet_accepted',
  })

  return bet
}

export async function declareBet(
  supabase: SupabaseClient,
  userId: string,
  betId: string,
  iWon: boolean
): Promise<Bet> {
  const { data: bet, error: fetchError } = await supabase
    .from('bets')
    .select('*')
    .eq('id', betId)
    .in('status', ['active', 'resolving'])
    .single()

  if (fetchError || !bet) throw new Error('Bet not found or not resolvable')
  if (bet.declared_winner_id) throw new Error('Result already declared')

  const declaredWinnerId = iWon
    ? userId
    : bet.creator_id === userId
    ? bet.opponent_id
    : bet.creator_id

  const { data: updated, error } = await supabase
    .from('bets')
    .update({
      declared_winner_id: declaredWinnerId,
      declarer_id: userId,
      status: 'resolving',
    })
    .eq('id', betId)
    .select('*, creator:users!creator_id(*), opponent:users!opponent_id(*)')
    .single()

  if (error || !updated) throw new Error('Could not declare bet')

  const opponentId = bet.creator_id === userId ? bet.opponent_id : bet.creator_id
  if (opponentId) {
    await supabase.from('notifications').insert({
      user_id: opponentId,
      bet_id: betId,
      type: 'bet_declared',
    })
  }

  return updated
}

export async function confirmBet(
  supabase: SupabaseClient,
  userId: string,
  betId: string,
  confirm: boolean
): Promise<Bet> {
  const { data: bet, error: fetchError } = await supabase
    .from('bets')
    .select('*')
    .eq('id', betId)
    .eq('status', 'resolving')
    .single()

  if (fetchError || !bet) throw new Error('Bet not found or not in resolving state')
  if (!bet.declared_winner_id) throw new Error('No declaration to confirm')

  const { data: updated, error } = await supabase
    .from('bets')
    .update({
      status: confirm ? 'settled' : 'disputed',
      winner_id: confirm ? bet.declared_winner_id : null,
    })
    .eq('id', betId)
    .select('*, creator:users!creator_id(*), opponent:users!opponent_id(*)')
    .single()

  if (error || !updated) throw new Error('Could not confirm bet')

  const opponentId = bet.creator_id === userId ? bet.opponent_id : bet.creator_id
  if (opponentId) {
    await supabase.from('notifications').insert({
      user_id: opponentId,
      bet_id: betId,
      type: confirm ? 'bet_confirmed' : 'bet_disputed',
    })
  }

  return updated
}

export async function markPaid(
  supabase: SupabaseClient,
  userId: string,
  betId: string
): Promise<Bet> {
  const { data: bet, error: fetchError } = await supabase
    .from('bets')
    .select('*')
    .eq('id', betId)
    .eq('status', 'settled')
    .single()

  if (fetchError || !bet) throw new Error('Bet not found or not settled')
  if (bet.winner_id === userId) throw new Error('Only the loser marks as paid')

  const { data: updated, error } = await supabase
    .from('bets')
    .update({ status: 'paid' })
    .eq('id', betId)
    .select('*, creator:users!creator_id(*), opponent:users!opponent_id(*)')
    .single()

  if (error || !updated) throw new Error('Could not mark as paid')

  if (bet.winner_id) {
    await supabase.from('notifications').insert({
      user_id: bet.winner_id,
      bet_id: betId,
      type: 'bet_paid',
    })
  }

  return updated
}

export async function getUserBets(
  supabase: SupabaseClient,
  userId: string
): Promise<Bet[]> {
  const { data, error } = await supabase
    .from('bets')
    .select('*, creator:users!creator_id(*), opponent:users!opponent_id(*)')
    .or(`creator_id.eq.${userId},opponent_id.eq.${userId}`)
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return data ?? []
}

export async function getScoreboard(
  supabase: SupabaseClient,
  userId: string
): Promise<Scoreboard> {
  const { data, error } = await supabase
    .from('user_scoreboard')
    .select('*')
    .eq('id', userId)
    .single()

  if (error) throw new Error(error.message)
  return data
}
