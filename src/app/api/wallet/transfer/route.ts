// src/app/api/wallet/transfer/route.ts
// POST → تحويل رصيد لمستخدم تاني عن طريق رقم الموبايل.
import { NextResponse } from 'next/server'
import { supabase as supabaseAdmin } from '@/lib/supabase'
import { verifyUser } from '@/lib/wallet-server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function normalizeEgyptianPhone(raw: string): string | null {
  const digits = (raw || '').replace(/\D/g, '')
  if (/^01[0125]\d{8}$/.test(digits)) return `+20${digits.slice(1)}`
  if (/^201[0125]\d{8}$/.test(digits)) return `+${digits}`
  if (/^\+201[0125]\d{8}$/.test(raw)) return raw
  return null
}

export async function POST(request: Request) {
  const auth = await verifyUser(request.headers.get('authorization'))
  if (!auth.ok) return NextResponse.json({ error: auth.reason }, { status: 401 })

  let body: { phone?: string; amount?: number; kind?: string; description?: string }
  try { body = await request.json() } catch { return NextResponse.json({ error: 'bad_json' }, { status: 400 }) }

  const amount = Number(body.amount)
  const kind = body.kind === 'credit' ? 'credit' : 'cash'
  if (!amount || amount <= 0) return NextResponse.json({ error: 'invalid_amount' }, { status: 400 })

  const phone = normalizeEgyptianPhone(body.phone || '')
  if (!phone) return NextResponse.json({ error: 'invalid_phone' }, { status: 400 })

  // ابحث عن المستلم
  // @ts-ignore new schema
  const { data: recipient } = await supabaseAdmin
    .from('profiles').select('id, full_name, phone').eq('phone', phone).maybeSingle()

  if (!recipient) return NextResponse.json({ error: 'recipient_not_found' }, { status: 404 })
  if ((recipient as { id: string }).id === auth.user!.id) {
    return NextResponse.json({ error: 'cannot_transfer_to_self' }, { status: 400 })
  }

  // @ts-ignore rpc not in generated types
  const { data, error } = await supabaseAdmin.rpc('wallet_transfer', {
    p_from: auth.user!.id,
    p_to: (recipient as { id: string }).id,
    p_amount: amount,
    p_kind: kind,
    p_description: body.description || 'تحويل رصيد',
  })

  if (error) {
    const msg = error.message || 'transfer_failed'
    const status = msg.includes('insufficient_funds') ? 402 : 400
    return NextResponse.json({ error: msg }, { status })
  }
  return NextResponse.json({
    ok: true,
    transaction: data,
    recipient_name: (recipient as { full_name?: string }).full_name || phone,
  })
}
