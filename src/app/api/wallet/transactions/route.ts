// src/app/api/wallet/transactions/route.ts
// GET → سجل المعاملات (مقسّم صفحات) للمستخدم الحالي
import { NextResponse } from 'next/server'
import { supabase as supabaseAdmin } from '@/lib/supabase'
import { verifyUser } from '@/lib/wallet-server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const auth = await verifyUser(request.headers.get('authorization'))
  if (!auth.ok) return NextResponse.json({ error: auth.reason }, { status: 401 })

  const url = new URL(request.url)
  const page = Math.max(0, parseInt(url.searchParams.get('page') || '0', 10))
  const size = Math.min(50, Math.max(1, parseInt(url.searchParams.get('size') || '20', 10)))
  const from = page * size
  const to = from + size - 1

  // @ts-ignore new schema
  const { data, count, error } = await supabaseAdmin
    .from('wallet_transactions')
    .select('*', { count: 'exact' })
    .eq('profile_id', auth.user!.id)
    .order('created_at', { ascending: false })
    .range(from, to)

  if (error) {
    console.error('[api/wallet/transactions]', error)
    return NextResponse.json({ error: 'query_error' }, { status: 500 })
  }
  return NextResponse.json({ transactions: data ?? [], total: count ?? 0, page, size })
}
