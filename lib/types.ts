export type BetStatus =
  | 'pending'
  | 'active'
  | 'resolving'
  | 'disputed'
  | 'settled'
  | 'paid'
  | 'cancelled'

export interface User {
  id: string
  phone: string
  display_name: string
  avatar_url: string | null
  created_at: string
}

export interface Bet {
  id: string
  creator_id: string
  opponent_id: string | null
  description: string
  amount: number | null
  stake_label: string | null
  deadline: string
  status: BetStatus
  declared_winner_id: string | null
  declarer_id: string | null
  winner_id: string | null
  created_at: string
  updated_at: string
  creator?: User
  opponent?: User
}

export interface InviteLink {
  id: string
  bet_id: string
  token: string
  expires_at: string
  used_at: string | null
}

export interface Notification {
  id: string
  user_id: string
  bet_id: string | null
  type:
    | 'bet_invite'
    | 'bet_accepted'
    | 'bet_declared'
    | 'bet_confirmed'
    | 'bet_disputed'
    | 'bet_paid'
  read: boolean
  created_at: string
  bet?: Bet
}

export interface Scoreboard {
  id: string
  net_amount: string | number
  wins: number
  losses: number
  pending: number
}
