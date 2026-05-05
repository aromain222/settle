import { render, screen } from '@testing-library/react'
import BetCard from '@/components/BetCard'
import type { Bet } from '@/lib/types'

const FUTURE = new Date(Date.now() + 86_400_000 * 5).toISOString()

const BASE: Bet = {
  id: 'bet-1',
  creator_id: 'user-1',
  opponent_id: 'user-2',
  description: 'Lakers win tonight',
  amount: 20,
  stake_label: null,
  deadline: FUTURE,
  status: 'active',
  declared_winner_id: null,
  declarer_id: null,
  winner_id: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  creator:  { id: 'user-1', phone: '+1', display_name: 'Me',   avatar_url: null, created_at: '' },
  opponent: { id: 'user-2', phone: '+2', display_name: 'Jake', avatar_url: null, created_at: '' },
}

describe('BetCard', () => {
  it('renders the description', () => {
    render(<BetCard bet={BASE} currentUserId="user-1" />)
    expect(screen.getByText('Lakers win tonight')).toBeTruthy()
  })

  it('shows dollar amount', () => {
    render(<BetCard bet={BASE} currentUserId="user-1" />)
    expect(screen.getByText('$20')).toBeTruthy()
  })

  it('shows stake_label when amount is null', () => {
    render(
      <BetCard
        bet={{ ...BASE, amount: null, stake_label: 'loser buys dinner' }}
        currentUserId="user-1"
      />
    )
    expect(screen.getByText('loser buys dinner')).toBeTruthy()
  })

  it('shows RESOLVE badge for resolving status', () => {
    render(<BetCard bet={{ ...BASE, status: 'resolving' }} currentUserId="user-1" />)
    expect(screen.getByText('RESOLVE')).toBeTruthy()
  })

  it('shows opponent name', () => {
    render(<BetCard bet={BASE} currentUserId="user-1" />)
    expect(screen.getByText(/Jake/)).toBeTruthy()
  })

  it('shows 🚩 DISPUTED for disputed status', () => {
    render(<BetCard bet={{ ...BASE, status: 'disputed' }} currentUserId="user-1" />)
    expect(screen.getByText(/DISPUTED/)).toBeTruthy()
  })
})
