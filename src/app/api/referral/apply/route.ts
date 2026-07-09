// src/app/api/referral/apply/route.ts — «سوّق واكسب»
// POST { code } → يربط المستخدم الحالي كمُحال بالكود (مرة واحدة، ممنوع الإحالة الذاتية).
import { NextResponse } from 'next/server'
import { supabase as supabaseAdmin } from '@/lib/supabase'
import { verifyUser } from '@/lib/wallet-server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  const auth = await verifyUser(request.headers.get('authorization'))
  if (!auth.ok) return NextResponse.json({ error: auth.reason }, { status: 401 })
  const profileId = auth.user!.id

  let body: { code?: string }
  try { body = await request.json() } catch { return NextResponse.json({ error: 'bad_json' }, { status: 400 }) }
  const code = (body.code || '').trim().toUpperCase()
  if (!/^[A-Z0-9]{4,12}$/.test(code)) return NextResponse.json({ error: 'bad_code' }, { status: 400 })

  // بيانات المستخدم الحالي
  const { data: prof } = await supabaseAdmin.from('profiles')
    .select('id, full_name, phone, created_at').eq('id', profileId).maybeSingle()
  if (!prof) return NextResponse.json({ error: 'profile_not_found' }, { status: 404 })

  // ممنوع الإحالة الذاتية
  const { data: codeRow } = await supabaseAdmin.from('referral_codes')
    .select('code, owner_profile_id').ilike('code', code).maybeSingle()
  if (!codeRow) return NextResponse.json({ error: 'code_not_found' }, { status: 404 })
  if ((codeRow as { owner_profile_id?: string }).owner_profile_id === profileId) {
    return NextResponse.json({ error: 'self_referral' }, { status: 400 })
  }

  // مرة واحدة بس لكل حساب
  const phoneDigits = String((prof as { phone?: string }).phone || '').replace(/\D/g, '')
  const orClauses = [`referred_profile_id.eq.${profileId}`]
  if (phoneDigits.length >= 10) orClauses.push(`referred_phone.like.*${phoneDigits.slice(-10)}`)
  const { data: existing } = await supabaseAdmin.from('referrals')
    .select('id, status').or(orClauses.join(',')).limit(1)
  if (existing && existing.length > 0) return NextResponse.json({ already: true, status: (existing[0] as { status: string }).status })

  // @ts-ignore rpc not in generated types
  const { data, error } = await supabaseAdmin.rpc('apply_referral', {
    p_code: code,
    p_referred_phone: (prof as { phone?: string }).phone || ('profile:' + profileId),
    p_referred_profile_id: profileId,
    p_referred_name: (prof as { full_name?: string }).full_name || null,
    p_kind: 'customer',
  })
  if (error) return NextResponse.json({ error: error.message.slice(0, 120) }, { status: 400 })
  return NextResponse.json({ ok: true, ...(data as object) })
}
