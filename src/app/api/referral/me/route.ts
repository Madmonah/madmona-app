// src/app/api/referral/me/route.ts — «سوّق واكسب»
// GET → كود الإحالة الخاص بالمستخدم + لينك المشاركة + إحصائياته.
import { NextResponse } from 'next/server'
import { supabase as supabaseAdmin } from '@/lib/supabase'
import { verifyUser } from '@/lib/wallet-server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const auth = await verifyUser(request.headers.get('authorization'))
  if (!auth.ok) return NextResponse.json({ error: auth.reason }, { status: 401 })
  const profileId = auth.user!.id

  const { data: prof } = await supabaseAdmin.from('profiles')
    .select('id, phone').eq('id', profileId).maybeSingle()

  // @ts-ignore rpc not in generated types
  const { data: codeRes, error } = await supabaseAdmin.rpc('get_or_create_referral_code', {
    p_owner_profile_id: profileId,
    p_owner_phone: (prof as { phone?: string } | null)?.phone || null,
    p_owner_type: 'customer',
  })
  if (error) return NextResponse.json({ error: error.message.slice(0, 120) }, { status: 400 })

  const code = (codeRes as { code?: string } | null)?.code
  let stats = { pending: 0, share_submitted: 0, rewarded: 0 }
  if (code) {
    const { data: refs } = await supabaseAdmin.from('referrals')
      .select('status').ilike('code', code).limit(200)
    for (const r of (refs || []) as Array<{ status: string }>) {
      if (r.status === 'pending') stats.pending++
      else if (r.status === 'share_submitted') stats.share_submitted++
      else if (r.status === 'rewarded') stats.rewarded++
    }
  }
  return NextResponse.json({ ok: true, ...(codeRes as object), stats })
}
