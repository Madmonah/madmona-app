// src/app/api/wallet/pay/route.ts
// POST → دفع من المحفظة (يُستخدم داخليًا من شاشات الحجز/الطلب).
// source: 'auto' (كريدت الأول ثم كاش) | 'cash' | 'credit'
import { NextResponse } from 'next/server'
import { supabase as supabaseAdmin } from '@/lib/supabase'
import { verifyUser } from '@/lib/wallet'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  const auth = await verifyUser(request.headers.get('authorization'))
  if (!auth.ok) return NextResponse.json({ error: auth.reason }, { status: 401 })

  let body: {
    amount?: number; source?: string
    reference_type?: string; reference_id?: string; description?: string
  }
  try { body = await request.json() } catch { return NextResponse.json({ error: 'bad_json' }, { status: 400 }) }

  const amount = Number(body.amount)
  const source = ['cash', 'credit', 'auto'].includes(body.source || '') ? body.source : 'auto'
  if (!amount || amount <= 0) return NextResponse.json({ error: 'invalid_amount' }, { status: 400 })

  // @ts-ignore rpc not in generated types
  const { data, error } = await supabaseAdmin.rpc('wallet_pay', {
    p_profile: auth.user!.id,
    p_amount: amount,
    p_reference_type: body.reference_type ?? null,
    p_reference_id: body.reference_id ?? null,
    p_description: body.description ?? 'دفع من المحفظة',
    p_source: source,
  })

  if (error) {
    const msg = error.message || 'pay_failed'
    const status = msg.includes('insufficient_funds') ? 402 : 400
    return NextResponse.json({ error: msg }, { status })
  }
  return NextResponse.json({ ok: true, transactions: data })
}
