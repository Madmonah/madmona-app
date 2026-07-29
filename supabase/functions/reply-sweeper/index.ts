// reply-sweeper v3 (13 Jun 2026) — aligned with webhook v28 ONE-REPLY rule:
//  • answers ALL unanswered inbound messages since last outbound in ONE reply (not just the last one)
//  • skips noise-only batches (dots/emojis)
//  • threshold raised 8→10 min so it never races the webhook's 25s debounce
//  • records claim in wa_reply_claims so webhook instances also back off
// v2: excludes WABA self number. v1: safety net per Mohamed.
import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'
import { waSend } from '../_shared/wa-send.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const MODEL = 'claude-sonnet-4-6'
const SITE = 'https://madmonacairo.com'
const WABA_TAIL = '1002229982'
const sb = createClient(SUPABASE_URL, SERVICE_KEY)

function enforceBrand(t: string): string {
  return (t || '')
    .replace(/مدمون[ةه]/g, 'مضمونة').replace(/مظمون[ةه]/g, 'مضمونة').replace(/مذمونة/g, 'مضمونة')
}

function isNoise(s: string): boolean {
  const stripped = (s || '')
    .replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}\u{200D}]/gu, '')
    .replace(/[.\u06D4،؟?!,;:\-_*~'"()\[\]{}\s]/g, '')
  return stripped.length < 2
}

async function getCfg(key: string, fb = ''): Promise<string> {
  const { data } = await sb.from('whatsapp_config').select('value').eq('key', key).maybeSingle()
  return (data as { value?: string } | null)?.value || fb
}

async function sendWA(to: string, body: string, session?: string): Promise<{ ok: boolean; wa_id?: string; err?: string }> {
  // بيعدّي من البوابة الموحّدة — مايناديش Graph مباشرة.
  // 🔀 (28 Jul) بنمرّر session (رقم المحادثة) عشان الإرسال يتوجّه لخدمة الرقم المتصلة
  //    (OpenWA) بدل ما يقع على جسر Baileys الاحتياطي الميت («مفيش جلسة متصلة»).
  const r = await waSend({ to, text: enforceBrand(body), agentName: 'المارد', session })
  return { ok: r.ok, wa_id: r.wa_message_id ?? undefined, err: r.error }
}

async function catalogBlock(text: string): Promise<string> {
  try {
    const { data } = await sb.rpc('search_listings_catalog', { p_query: text, p_category_slug: null, p_city: null, p_limit: 3 })
    if (!Array.isArray(data) || !data.length) return ''
    const lines = (data as Array<Record<string, unknown>>).map((l, i) =>
      `${i + 1}. ${l.title}${l.city ? ` (${l.city})` : ''} — ${l.url}`).join('\n')
    return `\n\nمنتجات حقيقية متاحة (استخدم اللينكات دي بالظبط لو مناسبة، ومتخترعش لينكات):\n${lines}`
  } catch { return '' }
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('POST only', { status: 405 })
  try {
    const { data: keyData } = await sb.rpc('get_anthropic_key')
    if (!keyData) return json({ ok: false, error: 'no key' })
    const apiKey = keyData as string
    const adminPhone = (await getCfg('admin_alert_phone')).replace(/\D/g, '')
    const commissionLine = await getCfg('commission_line_restaurants_prompt',
      'Commission: 10% unified for everyone / restaurants & cafes FREE (0%) for a LIMITED TIME — frame as «عرض لفترة محدودة»')

    const { data: convs } = await sb.from('whatsapp_conversations')
      .select('id, contact_phone, contact_name, contact_type, last_inbound_at, last_outbound_at, session_id')
      .gt('last_inbound_at', new Date(Date.now() - 24 * 3600000).toISOString())
      .lt('last_inbound_at', new Date(Date.now() - 10 * 60000).toISOString())
      .order('last_inbound_at', { ascending: false }).limit(30)
    const targets = ((convs || []) as Array<any>).filter(c => {
      const digits = (c.contact_phone || '').replace(/\D/g, '')
      if (digits.endsWith(WABA_TAIL)) return false
      if (adminPhone && digits.endsWith(adminPhone.slice(-10))) return false
      return !c.last_outbound_at || new Date(c.last_outbound_at) < new Date(c.last_inbound_at)
    }).slice(0, 5)

    let swept = 0
    const results: Array<Record<string, unknown>> = []
    for (const c of targets) {
      const { data: hist } = await sb.from('whatsapp_messages')
        .select('id, direction, body, ai_generated, created_at').eq('conversation_id', c.id)
        .order('created_at', { ascending: true }).limit(24)
      const rows = (hist || []) as Array<any>
      const lastOut = [...rows].reverse().find(r => r.direction === 'outbound')
      const unanswered = rows.filter(r =>
        r.direction === 'inbound' && (!lastOut || r.created_at > lastOut.created_at) && r.body)
      if (unanswered.length === 0) { results.push({ conv: c.id, skip: 'no_unanswered' }); continue }
      // noise-only → mark answered silently, don't waste a message
      if (unanswered.every(r => isNoise(String(r.body)))) {
        await sb.from('whatsapp_conversations').update({ last_outbound_at: new Date().toISOString() }).eq('id', c.id)
        results.push({ conv: c.id, skip: 'noise_only' })
        continue
      }
      // claim — if webhook already claimed this burst, back off
      const lastInboundId = unanswered[unanswered.length - 1].id
      const { error: claimErr } = await sb.from('wa_reply_claims').insert({
        conversation_id: c.id, last_inbound_id: lastInboundId, claimed_by: 'reply-sweeper'
      })
      if (claimErr) { results.push({ conv: c.id, skip: 'claimed' }); continue }

      const combined = unanswered.map(r => String(r.body)).join('\n---\n')
      const history = rows.map(r => `${r.direction === 'inbound' ? 'العميل' : 'مضمونة'}: ${r.body || ''}`).join('\n')
      const cat = await catalogBlock(combined)
      const system = `You are Madmona Concierge — WhatsApp sweeper replying to a customer whose messages were missed earlier. ${SITE}.
Brand: مضمونة (بالضاد). Slogan «معاملاتك مضمونة». Egyptian Arabic only. Madmona = guaranteed marketplace (rent, buy/sell, services, restaurants, beauty), launched May 2026.
STUDY-FIRST: read the FULL history, then answer ALL the unanswered messages below together in ONE coherent reply. Never re-greet if already greeted. Start with a brief warm apology for the late reply.
فرد/شركة: العمولة 10٪ موحدة على الكل · مطاعم مجاناً لفترة محدودة (فرد/شركة بيفرق بس في الفروع). Supplier pitch: «سجّل مرة واحدة على ${SITE}/add-listing وحط كل التفاصيل (صور، أسعار، مواصفات، مواعيد) عشان أي عميل يحجز وهو عارف كل حاجة».
HARD RULES: never ask for name/email/personal info. Supplier CTA: ${SITE}/add-listing. Customers: ${SITE}/marketplace?category=<slug>. Jobs/hiring → ${SITE}/careers (no supplier pitch). ${commissionLine}. NEVER mention 2019 or «أكبر منصة». NEVER say a field is unavailable — we can source anything; ask 1-2 clarifying questions instead.${cat}\n\n=== HISTORY ===\n${history}\n=== END ===\nRespond with the reply text ONLY (no JSON).`
      try {
        const r = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'Content-Type': 'application/json' },
          body: JSON.stringify({ model: MODEL, max_tokens: 600, system, messages: [{ role: 'user', content: `رسائل العميل اللي محدش رد عليها (رد عليها كلها في رسالة واحدة):\n"${combined}"` }] })
        })
        const d = await r.json()
        const reply = (d?.content?.[0]?.text || '').trim()
        if (!r.ok || !reply) { results.push({ conv: c.id, err: 'gen_failed' }); continue }
        const sent = await sendWA(c.contact_phone.replace(/^\+/, ''), reply, c.session_id)
        await sb.from('whatsapp_messages').insert({
          conversation_id: c.id, direction: 'outbound', wa_message_id: sent.wa_id,
          body: enforceBrand(reply), message_type: 'text', status: sent.ok ? 'sent' : 'failed',
          status_updated_at: new Date().toISOString(), ai_generated: true,
          agent_name: 'reply-sweeper', error_message: sent.err,
          metadata: { swept: true, reply_to_count: unanswered.length, inbound_age_min: Math.round((Date.now() - new Date(c.last_inbound_at).getTime()) / 60000) }
        })
        if (sent.ok) {
          await sb.from('whatsapp_conversations').update({
            last_outbound_at: new Date().toISOString(), last_message_direction: 'outbound'
          }).eq('id', c.id)
          swept++
        } else {
          // ⚠️ (28 Jul) الإرسال فشل — مانعلّمش المحادثة «اترد عليها» عشان مانحرقش الليد.
          //   فشل دايم (مُعرّف مخفي @lid مش هينفع نبعتله) → نعلّمها بس عشان مانعيدش المحاولة للأبد.
          //   فشل مؤقت (جلسة/شبكة) → نشيل الـclaim عشان الرن الجاي يعيد المحاولة لما القناة ترجع.
          const permanent = /مُعرّف مخفي|@lid|مش هينفع/.test(String(sent.err || ''))
          if (permanent) {
            await sb.from('whatsapp_conversations').update({ last_outbound_at: new Date().toISOString() }).eq('id', c.id)
          } else {
            await sb.from('wa_reply_claims').delete()
              .eq('conversation_id', c.id).eq('last_inbound_id', lastInboundId).eq('claimed_by', 'reply-sweeper')
          }
        }
        results.push({ conv: c.id, ok: sent.ok, err: sent.err ?? null })
      } catch (e) { results.push({ conv: c.id, err: String(e).slice(0, 120) }) }
    }
    // GC old claims opportunistically
    try { await sb.rpc('wa_reply_claims_gc') } catch { /* noop */ }
    return json({ ok: true, candidates: targets.length, swept, results })
  } catch (e) {
    return json({ ok: false, error: String(e).slice(0, 300) })
  }
})

function json(o: Record<string, unknown>): Response {
  return new Response(JSON.stringify(o), { status: 200, headers: { 'Content-Type': 'application/json' } })
}
