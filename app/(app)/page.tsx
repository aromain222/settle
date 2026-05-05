import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getUserBets, getScoreboard } from '@/lib/bets'
import MainPageClient from './MainPageClient'

export default async function HomePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [bets, scoreboard] = await Promise.all([
    getUserBets(supabase, user.id).catch(() => [] as import('@/lib/types').Bet[]),
    getScoreboard(supabase, user.id).catch(() => ({
      id: user.id,
      net_amount: 0,
      wins: 0,
      losses: 0,
      pending: 0,
    })),
  ])

  return (
    <MainPageClient
      userId={user.id}
      initialBets={bets}
      scoreboard={scoreboard}
    />
  )
}
