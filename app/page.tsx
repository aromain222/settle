import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getUserBets, getScoreboard } from '@/lib/bets'
import MainPageClient from '@/components/MainPageClient'
import type { Bet } from '@/lib/types'

export default async function HomePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const userId = user.id

  const [bets, scoreboard] = await Promise.all([
    getUserBets(supabase, userId).catch(() => [] as Bet[]),
    getScoreboard(supabase, userId).catch(() => ({
      id: userId,
      net_amount: 0,
      wins: 0,
      losses: 0,
      pending: 0,
    })),
  ])

  return (
    <MainPageClient
      userId={userId}
      initialBets={bets}
      scoreboard={scoreboard}
    />
  )
}
