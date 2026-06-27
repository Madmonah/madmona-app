// src/app/api/wallet/withdraw/route.ts
// POST → طلب سحب رصيد (كاش فقط). بيحجز المبلغ فورًا لحد ما الأدمن يراجع.
import { NextResponse } from 'next/server'
import { supabase as supabaseAdmin } from '@/lib/supabase'
import { verifyUser } from '@/lib/wallet-server'
import { WITHDRAW_METHODS } from '@/lib/wallet'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const MIN_WITHDRAW = Number(process.env.WALLET_MIN_WITHDRAW || 50)

export async function POST(request: Request) {
  const auth = await verifyUser(request.headers.get('authorization'))
  if (!auth.ok) return NextResponse.json({ error: auth.reason }, { status: 401 })

  let body: { amount?: number; method?: string; details?: string }
  try { body = await request.json() } catch { return NextResponse.json({ error: 'bad_json' }, { status: 400 }) }

  const amount = Number(body.amount)
  const method = body.method || ''
  const details = (body.details || '').trim()

  if (!amount || amount < MIN_WITHDRAW) {
    return NextResponse.json({ error: 'amount_below_minimum', min: MIN_WITHDRAW }, { status: 400 })
  }
  if (!WITHDRAW_METHODS[method]) return NextResponse.json({ error: 'invalid_method' }, { status: 400 })
  if (details.length < 3) return NextResponse.json({ error: 'missing_payout_details' }, { status: 400 })

  // @ts-ignore rpc not in generated types
  const { data, error } = await supabaseAdmin.rpc('wallet_request_withdrawal', {
    p_profile: auth.user!.id,
    p_amount: amount,
    p_method: method,
    p_details: details,
  })

  if (error) {
    const msg = error.message || 'withdraw_failed'
    const status = msg.includes('insufficient_funds') ? 402 : 400
    return NextResponse.json({ error: msg }, { status })
  }
  return NextResponse.json({ ok: true, withdrawal: data })
}
