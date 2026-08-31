// api/integrations/dispatch — مرسل الويبهوكس لأنظمة المطاعم الخارجية
// ====================================================================
// بيقرا الأحداث المعلقة من integration_outbox ويبعت POST لكل webhook_url
// مع توقيع HMAC-SHA256 في هيدر x-madmona-signature (السر: webhook_secret).
// يتنادى من كرون (كل دقيقة) أو يدوي. GET /api/integrations/dispatch

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createHmac } from 'crypto'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

function sb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )
}

export async function GET(req: Request) {
  // 🔐 (٢٨/٨) كان مفتوح بدون حماية — أي حد يقدر يطلق ويبهوكس للموردين.
  //    ثلاث طرق زي باقي الكرونات: Bearer (Vercel) · هيدر · query.
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret) {
    const url = new URL(req.url)
    const auth = req.headers.get('authorization') || ''
    const ok =
      auth === `Bearer ${cronSecret}` ||
      req.headers.get('x-cron-secret') === cronSecret ||
      url.searchParams.get('secret') === cronSecret
    if (!ok) {
      return new Response(JSON.stringify({ error: 'unauthorized' }), {
        status: 401, headers: { 'content-type': 'application/json' },
      })
    }
  }

  const supa = sb()
  const { data: pending } = await supa
    .from('integration_outbox')
    .select('id, supplier_id, order_id, event_type, payload, attempts')
    .is('delivered_at', null)
    .lt('attempts', 5)
    .order('created_at')
    .limit(20)

  if (!pending?.length) return NextResponse.json({ processed: 0 })

  const supplierIds = [...new Set(pending.map(p => p.supplier_id))]
  const { data: integrations } = await supa
    .from('supplier_integrations')
    .select('supplier_id, webhook_url, webhook_secret, is_active')
    .in('supplier_id', supplierIds)
  const byId = new Map((integrations || []).map(i => [i.supplier_id, i]))

  let ok = 0, failed = 0
  for (const ev of pending) {
    const integ = byId.get(ev.supplier_id)
    if (!integ?.is_active || !integ.webhook_url) {
      await supa.from('integration_outbox').update({ delivered_at: new Date().toISOString(), last_error: 'no_active_webhook' }).eq('id', ev.id)
      continue
    }
    const body = JSON.stringify(ev.payload)
    const signature = createHmac('sha256', integ.webhook_secret).update(body).digest('hex')
    try {
      const ctrl = new AbortController()
      const t = setTimeout(() => ctrl.abort(), 8000)
      const r = await fetch(integ.webhook_url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-madmona-signature': signature, 'x-madmona-event': ev.event_type },
        body, signal: ctrl.signal,
      })
      clearTimeout(t)
      if (r.ok) {
        ok++
        await supa.from('integration_outbox').update({ delivered_at: new Date().toISOString(), attempts: ev.attempts + 1 }).eq('id', ev.id)
        await supa.from('supplier_integrations').update({ last_delivery_at: new Date().toISOString(), last_delivery_status: `ok:${r.status}` }).eq('supplier_id', ev.supplier_id)
      } else {
        failed++
        await supa.from('integration_outbox').update({ attempts: ev.attempts + 1, last_error: `http_${r.status}` }).eq('id', ev.id)
        await supa.from('supplier_integrations').update({ last_delivery_status: `fail:${r.status}` }).eq('supplier_id', ev.supplier_id)
      }
    } catch (e) {
      failed++
      await supa.from('integration_outbox').update({ attempts: ev.attempts + 1, last_error: String(e).slice(0, 200) }).eq('id', ev.id)
    }
  }
  return NextResponse.json({ processed: pending.length, ok, failed })
}
