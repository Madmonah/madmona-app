import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// «شير واكسب» API: action='me' (كودي + لينكي + إحالاتي + الليدربورد) | action='attribute' (تسجيل الإحالة)
// بيشتغل بجلسة مضمونة (madmona_token) عن طريق madmona_resolve — مش Supabase Auth
export const runtime = 'nodejs'

const svc = () =>
  createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false },
  })

const cleanCode = (c: unknown) => String(c || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12)

export async function POST(req: NextRequest) {
  let body: Record<string, unknown> = {}
  try { body = await req.json() } catch {}
  const token = String(body.token || '')
  const action = String(body.action || '')
  if (!/^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(token)) {
    return NextResponse.json({ ok: false, err: 'bad_token' }, { status: 401 })
  }
  const db = svc()
  const { data: acct } = await db.rpc('madmona_resolve', { p_token: token })
  const phone: string | undefined = acct?.phone || acct?.wa_phone || acct?.msisdn
  if (!phone) return NextResponse.json({ ok: false, err: 'no_session' }, { status: 401 })

  if (action === 'me') {
    const { data: codeRes } = await db.rpc('get_or_create_referral_code', {
      p_owner_phone: phone,
      p_owner_profile_id: acct?.profile_id ?? null,
      p_owner_type: 'customer',
      p_label: null,
    })
    const code = cleanCode(codeRes?.code ?? codeRes?.data?.code)
    const { data: mine } = await db.rpc('get_referrals', { p_owner_phone: phone })
    const { data: board } = await db.rpc('referral_leaderboard', { p_limit: 5 })
    return NextResponse.json({
      ok: true,
      code,
      link: `https://www.madmonacairo.com/r/${code}`,
      mine: mine ?? null,
      board: board ?? null,
    })
  }

  if (action === 'attribute') {
    const code = cleanCode(body.code)
    if (!code) return NextResponse.json({ ok: false, err: 'no_code' })
    const { data: applied } = await db.rpc('apply_referral', {
      p_code: code,
      p_referred_phone: phone,
      p_referred_profile_id: acct?.profile_id ?? null,
      p_referred_name: acct?.name ?? null,
      p_kind: 'customer',
    })
    // لو الإحالة اتسجلت لسه (جديدة) → إشعار واتساب فوري للمعزِّم (مرة واحدة بس)
    const digits9 = phone.replace(/\D/g, '').slice(-9)
    const { data: row } = await db
      .from('referrals')
      .select('id,referrer_phone,created_at')
      .eq('code', code)
      .like('referred_phone', `%${digits9}`)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    let notified = false
    if (row?.referrer_phone && row.created_at && Date.now() - new Date(row.created_at).getTime() < 120000) {
      const msg = `🎉 مبروك! حد لسه داخل شات مضمونة بكودك ${code} — مكافأتك ١٠٠ جنيه رصيد بتتراجع دلوقتي. تابع إحالاتك من «شير واكسب» جوه الشات: madmonacairo.com/chat`
      const { error } = await db.from('whatsapp_outbound_queue').insert({
        recipient_phone: row.referrer_phone,
        message: msg,
        campaign: 'eksab_reward',
        metadata: { from_session: '201002229982', referral_id: row.id },
      })
      notified = !error
    }
    return NextResponse.json({ ok: true, applied: applied ?? null, notified })
  }

  return NextResponse.json({ ok: false, err: 'bad_action' }, { status: 400 })
}
