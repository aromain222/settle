import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import AcceptBetClient from './AcceptBetClient'

export default async function AcceptBetPage({
  params,
  searchParams,
}: {
  params: { id: string }
  searchParams: { token?: string }
}) {
  const { id } = params
  const { token } = searchParams

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect(
      `/login?redirect=/bets/${id}/accept${token ? `&token=${token}` : ''}`
    )
  }

  const { data: bet } = await supabase
    .from('bets')
    .select('*, creator:users!creator_id(*)')
    .eq('id', id)
    .single()

  if (!bet) redirect('/')

  return <AcceptBetClient bet={bet} token={token ?? ''} />
}
