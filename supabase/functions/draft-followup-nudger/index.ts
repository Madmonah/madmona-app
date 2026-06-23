// draft-followup-nudger v3 (May 16 2026)
// CHANGE FROM v2: template swapped from partnership_intro_v2 (DEPRECATED — high failure rate,
// linked to old halls Edge Fn landing page) to madmona_intro_outreach_v3 (Active, 107 sent / 0
// failed in last 14 days, points to madmonacairo.com per May 16 link policy).
// Body-param shape is identical: [{type:'body', parameters:[{type:'text', text: <displayName>}]}]
//
// CHANGE FROM v1 (preserved from v2): dedupe by recipient_phone within a single batch so
// multiple stuck drafts from the same phone don't get 3 messages in the same minute = spam.

import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const TEMPLATE_NAME = 'madmona_intro_outreach_v3'  // was 'partnership_intro_v2' in v2
const MIN_AGE_HOURS = 1
const MAX_AGE_HOURS = 168
const BATCH_LIMIT = 50

function normalizePhone(raw: string): string | null {
  const p = String(raw ?? '').replace(/\s|-/g, '')
  if (/^01\d{9}$/.test(p)) return '+2' + p
  if (/^\+201\d{9}$/.test(p)) return p
  if (/^201\d{9}$/.test(p)) return '+' + p
  return null
}

Deno.serve(async (_req) => {
  const startTs = Date.now()
  const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
  try {
    const minAge = new Date(Date.now() - MIN_AGE_HOURS * 3600_000).toISOString()
    const maxAge = new Date(Date.now() - MAX_AGE_HOURS * 3600_000).toISOString()

    const { data: stuck, error: fetchErr } = await sb
      .from('listing_drafts')
      .select('id, contact_name, contact_phone, business_name, category_slug, current_step, created_at, metadata')
      .eq('status', 'draft')
      .lt('current_step', 5)
      .not('contact_phone', 'is', null)
      .lt('created_at', minAge)
      .gt('created_at', maxAge)
      .order('current_step', { ascending: false })
      .order('created_at', { ascending: true })
      .limit(BATCH_LIMIT * 3)

    if (fetchErr) {
      return new Response(JSON.stringify({ ok: false, stage: 'fetch_drafts', error: fetchErr.message }), { status: 500 })
    }

    const byPhone = new Map<string, typeof stuck>()
    const phoneInvalid: string[] = []
    for (const d of (stuck ?? [])) {
      const meta = (d.metadata as Record<string, unknown> | null) ?? {}
      if (meta.followup_sent === true || meta.followup_sent === 'true') continue
      const normalized = normalizePhone(String(d.contact_phone))
      if (!normalized) { phoneInvalid.push(d.id); continue }
      const existing = byPhone.get(normalized) ?? []
      existing.push({ ...d, _normalized_phone: normalized } as unknown as typeof stuck[number])
      byPhone.set(normalized, existing)
    }

    let queued = 0, errors = 0, skipped_same_phone = 0
    const queuedIds: string[] = []
    const allMarkedIds: string[] = []

    const phones = Array.from(byPhone.keys()).slice(0, BATCH_LIMIT)

    for (const phone of phones) {
      const draftsForPhone = byPhone.get(phone) ?? []
      const primary = draftsForPhone[0]
      const dups = draftsForPhone.slice(1)
      skipped_same_phone += dups.length

      if (!primary) continue
      const displayName = primary.business_name || primary.contact_name || 'صاحب الليستنج'

      const { error: insErr } = await sb.from('whatsapp_outbound_queue').insert({
        recipient_phone: phone,
        recipient_name: displayName,
        message: `[template:${TEMPLATE_NAME}]`,
        agent_name: 'draft-followup-nudger',
        campaign: 'draft_followup_v1',
        status: 'pending',
        scheduled_at: new Date().toISOString(),
        template_name: TEMPLATE_NAME,
        template_params: [{
          type: 'body',
          parameters: [{ type: 'text', text: displayName }]
        }],
        metadata: {
          source: 'draft-followup-nudger-v3',
          primary_draft_id: primary.id,
          dedup_count: draftsForPhone.length,
          category_slug: primary.category_slug,
          stuck_at_step: primary.current_step,
          draft_age_hours: Math.round((Date.now() - new Date(primary.created_at).getTime()) / 3600_000)
        }
      })

      if (insErr) { errors++; continue }
      queued++
      queuedIds.push(primary.id)

      const stamp = new Date().toISOString()
      for (const d of draftsForPhone) {
        const newMeta = { ...(d.metadata as Record<string, unknown> | null ?? {}), followup_sent: true, followup_sent_at: stamp }
        await sb.from('listing_drafts').update({ metadata: newMeta }).eq('id', d.id)
        allMarkedIds.push(d.id)
      }
    }

    return new Response(JSON.stringify({
      ok: true,
      version: 'v3',
      template: TEMPLATE_NAME,
      ran_at: new Date().toISOString(),
      candidates_found: stuck?.length ?? 0,
      distinct_phones: byPhone.size,
      queued,
      skipped_same_phone,
      phone_invalid: phoneInvalid.length,
      errors,
      queued_primary_draft_ids: queuedIds,
      marked_followup_sent: allMarkedIds.length,
      duration_ms: Date.now() - startTs
    }), { status: 200, headers: { 'Content-Type': 'application/json' } })
  } catch (err) {
    return new Response(JSON.stringify({
      ok: false,
      error: err instanceof Error ? err.message : 'unknown',
      duration_ms: Date.now() - startTs
    }), { status: 500 })
  }
})
