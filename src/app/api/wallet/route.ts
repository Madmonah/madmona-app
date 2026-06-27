// src/app/api/wallet/route.ts
// GET → المحفظة بتاعة المستخدم الحالي + آخر المعاملات (تنشئ محفظة لو مش موجودة)
import { NextResponse } from 'next/server'
import { supabase as supabaseAdmin } from '@/lib/supabase'
import { verifyUser } from '@/lib/wallet-server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const auth = await verifyUser(request.headers.get('authorization'))
  if (!auth.ok) return NextResponse.json({ error: auth.reason }, { status: 401 })
  const profileId = auth.user!.id

  // ensure wallet exists
  // @ts-ignore rpc not in generated types
  const { error: rpcErr } = await supabaseAdmin.rpc('wallet_ensure', { p_profile: profileId })
  if (rpcErr) {
    console.error('[api/wallet] ensure error', rpcErr)
    return NextResponse.json({ error: 'wallet_error' }, { status: 500 })
  }

  // @ts-ignore new schema
  const { data: wallet } = await supabaseAdmin
    .from('wallets').select('*').eq('profile_id', profileId).maybeSingle()

  // @ts-ignore new schema
  const { data: txns } = await supabaseAdmin
    .from('wallet_transactions')
    .select('*')
    .eq('profile_id', profileId)
    .order('created_at', { ascending: false })
    .limit(15)

  // @ts-ignore new schema
  const { data: withdrawals } = await supabaseAdmin
    .from('wallet_withdrawals')
    .select('*')
    .eq('profile_id', profileId)
    .order('created_at', { ascending: false })
    .limit(10)

  return NextResponse.json({ wallet, transactions: txns ?? [], withdrawals: withdrawals ?? [] })
}
