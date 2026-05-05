import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  const { token } = params
  const supabase = await createClient()

  const { data: invite } = await supabase
    .from('invite_links')
    .select('bet_id, expires_at, used_at')
    .eq('token', token)
    .single()

  if (!invite) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (invite.used_at || new Date(invite.expires_at) < new Date()) {
    return NextResponse.redirect(
      new URL('/invite-expired', request.url)
    )
  }

  return NextResponse.redirect(
    new URL(
      `/bets/${invite.bet_id}/accept?token=${token}`,
      request.url
    )
  )
}
