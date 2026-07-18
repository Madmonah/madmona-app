// src/app/api/wallet/apply-discount/route.ts — «شير واكسب»
// POST { order_id } → خصم رصيد المحفظة (credit) على الأوردر بحد أقصى عمولة مضمونة فيه.
import { NextResponse } from 'next/server'
import { supabase as supabaseAdmin } from '@/lib/supabase'
import { verifyUser } from '@/lib/wallet-server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const STATUS: Record<string, number> = {
  order_not_found: 404,
  not_your_order: 403,
  order_not_discountable: 409,
}

export async function POST(request: Request) {
  const auth = await verifyUser(request.headers.get('authorization'))
  if (!auth.ok) return NextResponse.json({ error: auth.reason }, { status: 401 })

  let body: { order_id?: string }
  try { body = await request.json() } catch { return NextResponse.json({ error: 'bad_json' }, { status: 400 }) }
  if (!body.order_id) return NextResponse.json({ error: 'missing_order_id' }, { status: 400 })

  // @ts-ignore rpc not in generated types
  const { data, error } = await supabaseAdmin.rpc('wallet_apply_order_discount', {
    p_profile: auth.user!.id,
    p_order_id: body.order_id,
  })
  if (error) {
    const raw = error.message || ''
    const code = Object.keys(STATUS).find(k => raw.includes(k)) || 'discount_failed'
    return NextResponse.json({ error: code }, { status: STATUS[code] || 400 })
  }
  return NextResponse.json(data as object)
}
