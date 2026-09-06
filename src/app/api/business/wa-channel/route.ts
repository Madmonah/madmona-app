// src/app/api/business/wa-channel/route.ts
// ============================================================================
// 🤖 ربط واتساب البيزنس ببوت مضمونة — (٦ سبتمبر ٢٠٢٦)
//
// محمد: «محتاجين نفعّله بحيث يرشّح منتجات البيزنس لصاحب البيزنس ويظبط ليه
// الليد». المحرّك (business_channel_context + business-concierge) كان موجود
// من ٤/٩ بس مفيش باب: الجدول supplier_wa_channels كان فاضي ومفيش شاشة ربط.
//
// الفلو: start → جلسة OpenWA جديدة (POST /api/sessions + /start) + ويبهوك على
// نفس نقطة الدخول بتاعتنا (/api/whatsapp/openwa?token=) → status بيتسأل كل
// كام ثانية: qr_ready → نرجّع صورة الـQR · ready → نعرف رقمه ونكتب
// session_id = الرقم (ده اللي business_channel_context بتطابق عليه) +
// صف wa_number_configs (transport openwa) → البوت شغّال.
//
// 🔐 الوصول: schedule_edit_ok(supplier, token) — نظامين الدخول (جلسة Supabase
//    أو madmona_token). الكتابة كلها بمفتاح السيرفر هنا، مش من المتصفح.
// ⚠️ OPENWA_URL/KEY من env (Vercel) ولو مش موجودين من whatsapp_config —
//    نفس اللي wa_inbound_watchdog بيقرا منه.
// ============================================================================
import { NextRequest, NextResponse } from 'next/server'
import { supabaseUntyped } from '@/lib/supabase'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type Cfg = { url: string; key: string }

async function openwaCfg(): Promise<Cfg | null> {
  let url = (process.env.OPENWA_URL || '').replace(/\/$/, '')
  let key = process.env.OPENWA_API_KEY || ''
  if (!url || !key) {
    const { data } = await supabaseUntyped.from('whatsapp_config').select('key, value').in('key', ['openwa_url', 'openwa_api_key'])
    for (const r of (data as Array<{ key: string; value: string }> | null) ?? []) {
      if (r.key === 'openwa_url') url = String(r.value || '').replace(/\/$/, '')
      if (r.key === 'openwa_api_key') key = String(r.value || '')
    }
  }
  return url && key ? { url, key } : null
}

async function owa<T>(cfg: Cfg, path: string, init?: RequestInit): Promise<{ status: number; body: T | null }> {
  const r = await fetch(`${cfg.url}${path}`, {
    ...init,
    headers: { 'content-type': 'application/json', 'x-api-key': cfg.key, ...(init?.headers || {}) },
    signal: AbortSignal.timeout(20000),
    cache: 'no-store',
  })
  let body: T | null = null
  try { body = (await r.json()) as T } catch { body = null }
  return { status: r.status, body }
}

type OwaSession = { id: string; name: string; status: string; phone?: string | null; pushName?: string | null; lastError?: string | null }

type ChannelRow = {
  session_id: string; supplier_id: string; enabled: boolean; status: string
  openwa_session_id: string | null; phone: string | null; bot_name: string | null
}

async function canEdit(supplierId: string, token: string | null): Promise<boolean> {
  const { data } = await (supabaseUntyped.rpc as unknown as (f: string, a: Record<string, unknown>) => Promise<{ data: unknown }>)(
    'schedule_edit_ok', { p_supplier_id: supplierId, p_token: token || null },
  )
  return data === true
}

async function loadRow(supplierId: string): Promise<ChannelRow | null> {
  const { data } = await supabaseUntyped
    .from('supplier_wa_channels')
    .select('session_id, supplier_id, enabled, status, openwa_session_id, phone, bot_name')
    .eq('supplier_id', supplierId)
    .maybeSingle()
  return (data as ChannelRow | null) ?? null
}

export async function POST(req: NextRequest) {
  let body: { supplierId?: string; token?: string | null; action?: string } = {}
  try { body = await req.json() } catch { /* فاضي */ }
  const supplierId = String(body.supplierId || '')
  const action = String(body.action || 'status')
  if (!/^[0-9a-f-]{36}$/i.test(supplierId)) return NextResponse.json({ ok: false, error: 'supplierId' }, { status: 400 })
  if (!(await canEdit(supplierId, body.token ?? null))) return NextResponse.json({ ok: false, error: 'مالكش صلاحية' }, { status: 403 })

  const cfg = await openwaCfg()
  if (!cfg) return NextResponse.json({ ok: false, error: 'OpenWA مش متظبط' }, { status: 500 })
  const row = await loadRow(supplierId)

  // ── start: جلسة جديدة + ويبهوك ──────────────────────────────────────────
  if (action === 'start') {
    if (row?.openwa_session_id) {
      const cur = await owa<OwaSession>(cfg, `/api/sessions/${row.openwa_session_id}`)
      if (cur.status === 200 && cur.body && !['failed', 'disconnected', 'stopped'].includes(cur.body.status)) {
        return NextResponse.json({ ok: true, state: cur.body.status })  // شغّالة أصلًا — status هيكمّل
      }
      await owa(cfg, `/api/sessions/${row.openwa_session_id}`, { method: 'DELETE' }).catch(() => null)
    }
    const name = `biz-${supplierId.slice(0, 8)}-${Date.now().toString(36)}`
    const created = await owa<OwaSession>(cfg, '/api/sessions', { method: 'POST', body: JSON.stringify({ name }) })
    if (created.status !== 201 || !created.body?.id) return NextResponse.json({ ok: false, error: `OpenWA رفض إنشاء الجلسة (${created.status})` }, { status: 502 })
    const sid = created.body.id
    const secret = process.env.WA_SERVICE_SECRET || ''
    const hookUrl = `https://www.madmonacairo.com/api/whatsapp/openwa${secret ? `?token=${encodeURIComponent(secret)}` : ''}`
    await owa(cfg, `/api/sessions/${sid}/webhooks`, { method: 'POST', body: JSON.stringify({ url: hookUrl, events: ['*'] }) })
    await owa(cfg, `/api/sessions/${sid}/start`, { method: 'POST' })
    const { error } = await supabaseUntyped.from('supplier_wa_channels').upsert(
      { session_id: `pending:${supplierId}`, supplier_id: supplierId, enabled: false, status: 'initializing',
        openwa_session_id: sid, phone: null, linked_at: null, updated_at: new Date().toISOString() },
      { onConflict: 'supplier_id' },
    )
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true, state: 'initializing' })
  }

  // ── unlink ───────────────────────────────────────────────────────────────
  if (action === 'unlink') {
    if (row?.openwa_session_id) await owa(cfg, `/api/sessions/${row.openwa_session_id}`, { method: 'DELETE' }).catch(() => null)
    if (row?.phone) await supabaseUntyped.from('wa_number_configs').delete().eq('session_id', row.phone)
    await supabaseUntyped.from('supplier_wa_channels').delete().eq('supplier_id', supplierId)
    return NextResponse.json({ ok: true, state: 'none' })
  }

  // ── status (الافتراضي) ───────────────────────────────────────────────────
  if (!row?.openwa_session_id) return NextResponse.json({ ok: true, state: row?.enabled ? 'ready' : 'none', phone: row?.phone ?? null })
  const cur = await owa<OwaSession>(cfg, `/api/sessions/${row.openwa_session_id}`)
  if (cur.status === 404) {
    await supabaseUntyped.from('supplier_wa_channels').update({ status: 'failed', enabled: false }).eq('supplier_id', supplierId)
    return NextResponse.json({ ok: true, state: 'failed', error: 'الجلسة اتمسحت من OpenWA — اربط تاني' })
  }
  const s = cur.body
  if (!s) return NextResponse.json({ ok: false, error: `OpenWA رد ${cur.status}` }, { status: 502 })

  if (s.status === 'qr' || s.status === 'qr_ready') {
    const q = await owa<{ qrCode?: string }>(cfg, `/api/sessions/${s.id}/qr`)
    await supabaseUntyped.from('supplier_wa_channels').update({ status: 'qr' }).eq('supplier_id', supplierId)
    return NextResponse.json({ ok: true, state: 'qr', qr: q.body?.qrCode ?? null })
  }

  if (s.status === 'ready') {
    const phone = String(s.phone ?? '').replace(/\D/g, '')
    if (phone && row.session_id !== phone) {
      // 🔑 session_id = الرقم — ده اللي الرسالة الواردة بتتطابق عليه (data.to)
      const { data: sup } = await supabaseUntyped.from('suppliers').select('business_name').eq('id', supplierId).maybeSingle()
      await supabaseUntyped.from('supplier_wa_channels')
        .update({ session_id: phone, phone, status: 'ready', enabled: true, linked_at: new Date().toISOString(), updated_at: new Date().toISOString() })
        .eq('supplier_id', supplierId)
      await supabaseUntyped.from('wa_number_configs').upsert(
        { session_id: phone, label: `🤖 ${(sup as { business_name?: string } | null)?.business_name ?? 'بيزنس'}`, transport: 'openwa', enabled: true, updated_at: new Date().toISOString() },
        { onConflict: 'session_id' },
      )
    }
    return NextResponse.json({ ok: true, state: 'ready', phone: phone || row.phone, pushName: s.pushName ?? null })
  }

  if (['failed', 'disconnected', 'stopped'].includes(s.status)) {
    await supabaseUntyped.from('supplier_wa_channels').update({ status: s.status, enabled: false }).eq('supplier_id', supplierId)
    return NextResponse.json({ ok: true, state: s.status, error: s.lastError ?? null })
  }
  return NextResponse.json({ ok: true, state: s.status })
}
