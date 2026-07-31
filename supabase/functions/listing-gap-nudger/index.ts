// listing-gap-nudger v1 (31 يوليو 2026)
//
// السبب: 339 صف في listing_content_gaps (إعلانات ناقصة سعر/صورة) — ولا واحد
// فيهم اتبعتله رسالة أبدًا (request_count=0, last_request_at=null للكل).
// كان فيه جدول تتبّع كامل ومحدش وصّله بحاجة — الوعد "هنكلم صاحبه يكمله"
// كان مبني بس مش شغّال. الدالة دي بتوصّله.
//
// بتبعت مرة كل صف كل ٧ أيام (مش أكتر) لحد ما يتحل (status يتغيّر لـresolved
// من مكان تاني — تريجر أو مراجعة يدوية)، وبتوقف تلقائي بعد ٥ محاولات
// (request_count>=5) عشان ما تفضلش تضايق نفس المورد للأبد.

import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const RESEND_AFTER_DAYS = 7
const MAX_REQUESTS = 5
const BATCH_LIMIT = 40

function normalizePhone(raw: string | null): string | null {
  if (!raw) return null
  const p = String(raw).trim().replace(/\s|-/g, '')
  if (p === 'grandfathered' || p === '') return null
  if (/^01\d{9}$/.test(p)) return '+2' + p
  if (/^\+201\d{9}$/.test(p)) return p
  if (/^201\d{9}$/.test(p)) return '+' + p
  return null
}

function gapMessage(businessName: string | null, listingTitle: string | null, gapKind: string, gapDetail: string): string {
  const name = businessName || listingTitle || 'إعلانك'
  const what =
    gapKind === 'price' ? 'السعر' :
    gapKind === 'photo' ? 'صورة المنتج/الخدمة الحقيقية' :
    'السعر وصورة المنتج/الخدمة الحقيقية'

  return (
    `أهلاً 👋 معاك المارد من مضمونة\n\n` +
    `إعلان «${name}» عندنا موقوف مؤقتًا لحد ما نكمّل بيانات ناقصة — ${what}.\n\n` +
    `(${gapDetail})\n\n` +
    `ابعتلي البيانات دي وأنا أكمّلها فورًا ويرجع الإعلان شغال تاني 🙌`
  )
}

Deno.serve(async (_req) => {
  const startTs = Date.now()
  const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
  try {
    const resendCutoff = new Date(Date.now() - RESEND_AFTER_DAYS * 86400_000).toISOString()

    const { data: gaps, error: fetchErr } = await sb
      .from('listing_content_gaps')
      .select('id, listing_id, supplier_id, business_name, listing_title, gap_kind, gap_detail, reach_phone, request_count, last_request_at')
      .eq('status', 'open')
      .lt('request_count', MAX_REQUESTS)
      .or(`last_request_at.is.null,last_request_at.lt.${resendCutoff}`)
      .order('last_request_at', { ascending: true, nullsFirst: true })
      .limit(BATCH_LIMIT * 2)

    if (fetchErr) {
      return new Response(JSON.stringify({ ok: false, stage: 'fetch_gaps', error: fetchErr.message }), { status: 500 })
    }

    // نبعت رسالة واحدة بس لكل رقم في المرة الواحدة (لو نفس المورد عنده
    // كذا إعلان ناقص، مانضايقوش بكذا رسالة في نفس الدقيقة).
    const byPhone = new Map<string, typeof gaps>()
    let phoneInvalid = 0
    for (const g of gaps ?? []) {
      const phone = normalizePhone(g.reach_phone)
      if (!phone) { phoneInvalid++; continue }
      const existing = byPhone.get(phone) ?? []
      existing.push(g)
      byPhone.set(phone, existing)
    }

    let queued = 0, errors = 0, skipped_same_phone = 0
    const touchedIds: string[] = []
    const phones = Array.from(byPhone.keys()).slice(0, BATCH_LIMIT)

    for (const phone of phones) {
      const rows = byPhone.get(phone) ?? []
      const primary = rows[0]
      skipped_same_phone += rows.length - 1
      if (!primary) continue

      const msg = gapMessage(primary.business_name, primary.listing_title, primary.gap_kind, primary.gap_detail)

      const { error: insErr } = await sb.from('whatsapp_outbound_queue').insert({
        recipient_phone: phone,
        recipient_name: primary.business_name || primary.listing_title || 'مورد',
        message: msg,
        agent_name: 'listing-gap-nudger',
        campaign: 'listing_gap_followup_v1',
        status: 'pending',
        scheduled_at: new Date().toISOString(),
        metadata: {
          source: 'listing-gap-nudger-v1',
          gap_ids: rows.map(r => r.id),
          gap_kind: primary.gap_kind,
        },
      })

      if (insErr) { errors++; continue }
      queued++

      const stamp = new Date().toISOString()
      for (const g of rows) {
        await sb
          .from('listing_content_gaps')
          .update({ request_count: (g.request_count || 0) + 1, last_request_at: stamp })
          .eq('id', g.id)
        touchedIds.push(g.id)
      }
    }

    return new Response(JSON.stringify({
      ok: true,
      version: 'v1',
      ran_at: new Date().toISOString(),
      candidates_found: gaps?.length ?? 0,
      distinct_phones: byPhone.size,
      queued,
      skipped_same_phone,
      phone_invalid: phoneInvalid,
      errors,
      touched_gap_ids: touchedIds.length,
      duration_ms: Date.now() - startTs,
    }), { status: 200, headers: { 'Content-Type': 'application/json' } })
  } catch (err) {
    return new Response(JSON.stringify({
      ok: false,
      error: err instanceof Error ? err.message : 'unknown',
      duration_ms: Date.now() - startTs,
    }), { status: 500 })
  }
})
