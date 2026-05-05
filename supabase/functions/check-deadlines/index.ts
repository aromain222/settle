import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

Deno.serve(async () => {
  const { error, count } = await supabase
    .from('bets')
    .update({ status: 'resolving' })
    .eq('status', 'active')
    .lt('deadline', new Date().toISOString())

  if (error) {
    console.error('Deadline check failed:', error.message)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  console.log(`Updated ${count ?? 0} bets to resolving`)
  return new Response(JSON.stringify({ updated: count ?? 0 }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
