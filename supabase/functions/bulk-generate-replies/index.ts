// bulk-generate-replies v2 — with retry on overload + 1.5s stagger between calls.
import { createClient } from 'jsr:@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

async function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)) }

async function callReplySuggestions(
  convId: string,
  phone: string,
  inboundText: string,
  maxAttempts: number = 3,
): Promise<{ ok: boolean; data?: Record<string, unknown>; error?: string }> {
  let lastError = ''
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const r = await fetch(`${SUPABASE_URL}/functions/v1/ai-reply-suggestions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ conversation_id: convId, contact_phone: phone, inbound_text: inboundText })
      })
      const data = await r.json()
      if (r.ok && data.variants) return { ok: true, data }
      // Check if overloaded — retry with backoff
      const detail = JSON.stringify(data).toLowerCase()
      const overloaded = detail.includes('overloaded') || detail.includes('rate_limit') || detail.includes('429')
      lastError = data.error || `HTTP ${r.status}`
      if (overloaded && attempt < maxAttempts) {
        await sleep(2000 * attempt) // 2s, 4s, ...
        continue
      }
      return { ok: false, error: lastError }
    } catch (e) {
      lastError = e instanceof Error ? e.message : 'fetch_failed'
      if (attempt < maxAttempts) await sleep(2000 * attempt)
    }
  }
  return { ok: false, error: lastError }
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('POST only', { status: 405 })
  const body = await req.json().catch(() => ({}))
  const limit = Math.min(parseInt(body.limit || '25'), 100)
  const minScore = parseInt(body.min_score || '70')

  const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
  const t0 = Date.now()

  const { data: hotLeads, error: leadsErr } = await sb
    .from('lead_intelligence_view')
    .select('id, phone, business_name, category, score, last_inbound_at')
    .eq('suggested_action', 'reply_now')
    .gte('score', minScore)
    .not('last_inbound_at', 'is', null)
    .order('last_inbound_at', { ascending: false })
    .limit(limit)

  if (leadsErr) return new Response(JSON.stringify({ error: leadsErr.message }), { status: 500 })
  if (!hotLeads || hotLeads.length === 0) {
    return new Response(JSON.stringify({ ok: true, processed: 0, message: 'no_hot_leads' }), { headers: { 'Content-Type': 'application/json' } })
  }

  let generated = 0, skipped = 0, failed = 0
  const results: Array<Record<string, unknown>> = []

  for (let i = 0; i < (hotLeads as Array<Record<string, unknown>>).length; i++) {
    const lead = hotLeads[i] as { phone: string; business_name: string; category: string; score: number }
    try {
      // Stagger: 1.5s between leads to avoid overload
      if (i > 0) await sleep(1500)

      const { data: conv } = await sb
        .from('whatsapp_conversations')
        .select('id, contact_phone, contact_name')
        .eq('contact_phone', lead.phone)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (!conv) { skipped++; results.push({ phone: lead.phone, skipped: 'no_conversation' }); continue }
      const convId = (conv as { id: string }).id

      const { count: existing } = await sb
        .from('whatsapp_messages').select('*', { count: 'exact', head: true })
        .eq('conversation_id', convId).eq('status', 'pending_review')
        .gte('created_at', new Date(Date.now() - 24 * 3600 * 1000).toISOString())
      if ((existing || 0) > 0) { skipped++; results.push({ phone: lead.phone, skipped: 'existing_draft' }); continue }

      const { data: lastInbound } = await sb
        .from('whatsapp_messages').select('body').eq('conversation_id', convId)
        .eq('direction', 'inbound').order('created_at', { ascending: false }).limit(1).maybeSingle()
      const inboundText = (lastInbound as { body?: string } | null)?.body || ''
      if (!inboundText) { skipped++; results.push({ phone: lead.phone, skipped: 'no_inbound_text' }); continue }

      const result = await callReplySuggestions(convId, lead.phone, inboundText)
      if (!result.ok) {
        failed++; results.push({ phone: lead.phone, failed: result.error?.slice(0, 100) }); continue
      }

      const replyData = result.data!
      const variants = (replyData.variants as Array<{ tone?: string; body: string; label: string }>) || []
      if (variants.length === 0) {
        failed++; results.push({ phone: lead.phone, failed: 'no_variants' }); continue
      }
      const directVariant = variants.find(v => v.tone === 'direct') || variants[0]

      const { error: insertErr } = await sb.from('whatsapp_messages').insert({
        conversation_id: convId, direction: 'outbound', body: directVariant.body,
        message_type: 'text', status: 'pending_review',
        status_updated_at: new Date().toISOString(), ai_generated: true,
        agent_name: 'bulk-reply-generator',
        metadata: {
          intent: replyData.detected_intent, category: replyData.suggested_category,
          urgency: replyData.urgency, summary: replyData.summary,
          all_variants: variants, lead_score: lead.score,
          generated_at: new Date().toISOString(), requires_review: true,
        }
      })

      if (insertErr) { failed++; results.push({ phone: lead.phone, failed: insertErr.message }); continue }

      generated++
      results.push({
        phone: lead.phone, name: lead.business_name, category: lead.category, score: lead.score,
        urgency: replyData.urgency, draft_preview: directVariant.body.slice(0, 120),
      })
    } catch (e) {
      failed++
      results.push({ phone: lead.phone, error: e instanceof Error ? e.message : 'unknown' })
    }
  }

  return new Response(JSON.stringify({
    ok: true,
    elapsed_sec: Math.round((Date.now() - t0) / 1000),
    summary: {
      eligible_hot_leads: hotLeads.length, generated, skipped, failed,
    },
    next_step: `روح /admin/wa-review وراجع الـ ${generated} draft الجدد`,
    results,
  }, null, 2), { headers: { 'Content-Type': 'application/json' } })
})
