// src/app/api/admin/wallets/route.ts
// GET  → قائمة المحافظ + طلبات السحب (مع بحث)
// POST → إجراءات الأدمن: adjust (تعديل رصيد) | grant_credit | process_withdrawal
import { NextResponse } from 'next/server'
import { supabase as supabaseAdmin } from '@/lib/supabase'
import { verifyAdmin, type AuthedUser } from '@/lib/wallet-server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// يقبل المصادقة بطريقتين: Supabase Bearer (role=admin) أو X-Admin-Password القديمة.
async function gate(request: Request): Promise<{ ok: boolean; user?: AuthedUser; status?: number; reason?: string }> {
  const legacyPw = request.headers.get('x-admin-password')
  const expected = process.env.MADMONA_ADMIN_PW || process.env.ADMIN_PASSWORD
  if (expected && legacyPw === expected) return { ok: true, user: { id: '', role: 'admin' } }

  const auth = await verifyAdmin(request.headers.get('authorization'))
  if (!auth.ok) return { ok: false, status: auth.reason === 'not_admin' ? 403 : 401, reason: auth.reason }
  return { ok: true, user: auth.user }
}

export async function GET(request: Request) {
  const auth = await gate(request)
  if (!auth.ok) return NextResponse.json({ error: auth.reason }, { status: auth.status })

  const url = new URL(request.url)
  const q = (url.searchParams.get('q') || '').trim()

  // المحافظ + اسم/تليفون صاحبها
  // @ts-ignore new schema
  let walletQuery = supabaseAdmin
    .from('wallets')
    .select('*, profile:profiles!wallets_profile_id_fkey(id, full_name, phone, role)')
    .order('updated_at', { ascending: false })
    .limit(100)

  // @ts-ignore new schema
  const { data: wallets, error: wErr } = await walletQuery
  if (wErr) {
    console.error('[admin/wallets] list error', wErr)
    return NextResponse.json({ error: 'list_error' }, { status: 500 })
  }

  let rows = wallets ?? []
  if (q) {
    const ql = q.toLowerCase()
    rows = rows.filter((w: any) =>
      (w.profile?.full_name || '').toLowerCase().includes(ql) ||
      (w.profile?.phone || '').includes(q))
  }

  // طلبات السحب المعلّقة/الكل
  // @ts-ignore new schema
  const { data: withdrawals } = await supabaseAdmin
    .from('wallet_withdrawals')
    .select('*, profile:profiles!wallet_withdrawals_profile_id_fkey(full_name, phone)')
    .order('created_at', { ascending: false })
    .limit(100)

  // إجماليات سريعة
  const totals = rows.reduce(
    (acc: { cash: number; credit: number }, w: any) => {
      acc.cash += Number(w.balance_cash || 0)
      acc.credit += Number(w.balance_credit || 0)
      return acc
    },
    { cash: 0, credit: 0 },
  )

  return NextResponse.json({ wallets: rows, withdrawals: withdrawals ?? [], totals })
}

export async function POST(request: Request) {
  const auth = await gate(request)
  if (!auth.ok) return NextResponse.json({ error: auth.reason }, { status: auth.status })
  const adminId = auth.user?.id || null

  let body: any
  try { body = await request.json() } catch { return NextResponse.json({ error: 'bad_json' }, { status: 400 }) }

  const action = body.action as string

  if (action === 'adjust' || action === 'grant_credit') {
    const amount = Number(body.amount)
    const kind = action === 'grant_credit' ? 'credit' : (body.kind === 'credit' ? 'credit' : 'cash')
    const direction = action === 'grant_credit' ? 'in' : (body.direction === 'out' ? 'out' : 'in')
    if (!body.profile_id || !amount || amount <= 0) {
      return NextResponse.json({ error: 'invalid_input' }, { status: 400 })
    }
    // @ts-ignore rpc
    const { data, error } = await supabaseAdmin.rpc('wallet_admin_adjust', {
      p_profile: body.profile_id,
      p_amount: amount,
      p_kind: kind,
      p_direction: direction,
      p_reason: body.reason || (action === 'grant_credit' ? 'منح كريدت' : 'تعديل يدوي'),
      p_admin: adminId,
    })
    if (error) {
      const msg = error.message || 'adjust_failed'
      const status = msg.includes('insufficient_funds') ? 402 : 400
      return NextResponse.json({ error: msg }, { status })
    }
    return NextResponse.json({ ok: true, transaction: data })
  }

  if (action === 'process_withdrawal') {
    const valid = ['approve', 'reject', 'paid']
    if (!body.withdrawal_id || !valid.includes(body.decision)) {
      return NextResponse.json({ error: 'invalid_input' }, { status: 400 })
    }
    // @ts-ignore rpc
    const { data, error } = await supabaseAdmin.rpc('wallet_process_withdrawal', {
      p_withdrawal: body.withdrawal_id,
      p_action: body.decision,
      p_admin: adminId,
      p_notes: body.notes || null,
    })
    if (error) return NextResponse.json({ error: error.message || 'process_failed' }, { status: 400 })
    return NextResponse.json({ ok: true, withdrawal: data })
  }

  return NextResponse.json({ error: 'unknown_action' }, { status: 400 })
}
