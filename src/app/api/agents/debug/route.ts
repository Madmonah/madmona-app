import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${process.env.AGENT_WEBHOOK_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const emailFrom = process.env.EMAIL_FROM || '(not set)'
  const ownerEmail = process.env.MADMONA_OWNER_EMAIL || '(not set)'

  return NextResponse.json({
    EMAIL_FROM: emailFrom,
    EMAIL_FROM_length: emailFrom.length,
    EMAIL_FROM_charCodes: emailFrom.split('').slice(0, 50).map(c => c.charCodeAt(0)),
    MADMONA_OWNER_EMAIL: ownerEmail,
    has_RESEND_API_KEY: !!process.env.RESEND_API_KEY,
    has_ANTHROPIC_API_KEY: !!process.env.ANTHROPIC_API_KEY,
    deployment_time: new Date().toISOString(),
  })
}
