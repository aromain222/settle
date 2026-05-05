interface Payload {
  to: string
  invite_url: string
  creator_name: string
  description: string
}

Deno.serve(async (req) => {
  const { to, invite_url, creator_name, description }: Payload =
    await req.json()

  const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID')!
  const authToken = Deno.env.get('TWILIO_AUTH_TOKEN')!
  const fromNumber = Deno.env.get('TWILIO_PHONE_NUMBER')!

  const body = `${creator_name} challenged you on Settle: "${description}" — Accept: ${invite_url}`

  const resp = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${btoa(`${accountSid}:${authToken}`)}`,
      },
      body: new URLSearchParams({
        From: fromNumber,
        To: to,
        Body: body,
      }),
    }
  )

  const data = await resp.json()
  return new Response(JSON.stringify(data), {
    status: resp.ok ? 200 : 400,
    headers: { 'Content-Type': 'application/json' },
  })
})
