import { describe, it, expect, vi } from 'vitest'
import {
  createBet,
  acceptBet,
  declareBet,
  confirmBet,
  markPaid,
} from '@/lib/bets'

const BASE_BET = {
  id: 'bet-1',
  creator_id: 'user-1',
  opponent_id: 'user-2',
  description: 'Lakers win',
  amount: 20,
  stake_label: null,
  deadline: new Date(Date.now() + 86_400_000).toISOString(),
  status: 'pending',
  declared_winner_id: null,
  declarer_id: null,
  winner_id: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
}

function makeSupa(resolvedValues: any[] = []) {
  let callCount = 0
  const chain: any = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    eq:     vi.fn().mockReturnThis(),
    is:     vi.fn().mockReturnThis(),
    in:     vi.fn().mockReturnThis(),
    or:     vi.fn().mockReturnThis(),
    order:  vi.fn().mockReturnThis(),
    single: vi.fn().mockImplementation(() => {
      const val = resolvedValues[callCount] ?? { data: null, error: null }
      callCount++
      return Promise.resolve(val)
    }),
  }
  return { from: vi.fn().mockReturnValue(chain), _chain: chain }
}

describe('createBet', () => {
  it('returns an invite_token of length 10', async () => {
    const supa = makeSupa([
      { data: null, error: null },
      { data: { ...BASE_BET, opponent_id: null }, error: null },
    ])
    const result = await createBet(supa as any, 'user-1', {
      description: 'Lakers win',
      amount: 20,
      stake_label: null,
      deadline: BASE_BET.deadline,
      opponent_phone: '+15550000000',
    })
    expect(result.invite_token).toHaveLength(10)
    expect(result.bet.description).toBe('Lakers win')
  })
})

describe('acceptBet', () => {
  it('throws on expired invite', async () => {
    const supa = makeSupa([
      {
        data: {
          id: 'inv-1',
          bet_id: 'bet-1',
          expires_at: new Date(Date.now() - 1000).toISOString(),
          used_at: null,
        },
        error: null,
      },
    ])
    await expect(acceptBet(supa as any, 'user-2', 'bet-1', 'tok')).rejects.toThrow('Invite expired')
  })

  it('throws on missing invite', async () => {
    const supa = makeSupa([{ data: null, error: { message: 'not found' } }])
    await expect(acceptBet(supa as any, 'user-2', 'bet-1', 'tok')).rejects.toThrow('Invalid or expired invite')
  })
})

describe('declareBet', () => {
  it('throws if already declared', async () => {
    const supa = makeSupa([
      { data: { ...BASE_BET, status: 'resolving', declared_winner_id: 'user-1' }, error: null },
    ])
    await expect(declareBet(supa as any, 'user-1', 'bet-1', true)).rejects.toThrow('Result already declared')
  })

  it('sets declared_winner_id to opponent when iWon=false', async () => {
    const supa = makeSupa([
      { data: { ...BASE_BET, status: 'active' }, error: null },
      { data: { ...BASE_BET, status: 'resolving', declared_winner_id: 'user-2', declarer_id: 'user-1' }, error: null },
    ])
    const result = await declareBet(supa as any, 'user-1', 'bet-1', false)
    expect(result.declared_winner_id).toBe('user-2')
  })
})

describe('confirmBet', () => {
  it('sets status=settled when confirmed', async () => {
    const supa = makeSupa([
      { data: { ...BASE_BET, status: 'resolving', declared_winner_id: 'user-1', declarer_id: 'user-1' }, error: null },
      { data: { ...BASE_BET, status: 'settled', winner_id: 'user-1' }, error: null },
    ])
    const result = await confirmBet(supa as any, 'user-2', 'bet-1', true)
    expect(result.status).toBe('settled')
    expect(result.winner_id).toBe('user-1')
  })

  it('sets status=disputed when not confirmed', async () => {
    const supa = makeSupa([
      { data: { ...BASE_BET, status: 'resolving', declared_winner_id: 'user-1', declarer_id: 'user-1' }, error: null },
      { data: { ...BASE_BET, status: 'disputed', winner_id: null }, error: null },
    ])
    const result = await confirmBet(supa as any, 'user-2', 'bet-1', false)
    expect(result.status).toBe('disputed')
  })
})

describe('markPaid', () => {
  it('throws if winner tries to mark as paid', async () => {
    const supa = makeSupa([
      { data: { ...BASE_BET, status: 'settled', winner_id: 'user-1' }, error: null },
    ])
    await expect(markPaid(supa as any, 'user-1', 'bet-1')).rejects.toThrow('Only the loser marks as paid')
  })

  it('returns bet with status=paid for loser', async () => {
    const supa = makeSupa([
      { data: { ...BASE_BET, status: 'settled', winner_id: 'user-1' }, error: null },
      { data: { ...BASE_BET, status: 'paid', winner_id: 'user-1' }, error: null },
    ])
    const result = await markPaid(supa as any, 'user-2', 'bet-1')
    expect(result.status).toBe('paid')
  })
})
