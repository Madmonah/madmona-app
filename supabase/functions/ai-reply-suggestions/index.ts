// ai-reply-suggestions — generate 3 reply variants for a WhatsApp inbound.
// POST { conversation_id?, contact_phone?, inbound_text }
// Returns: { variants: [{label, body, tone}], detected_intent, suggested_category }
import { createClient } from 'jsr:@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const CLAUDE_MODEL = 'claude-sonnet-4-6'
const SITE_URL = 'https://madmonacairo.com'

async function getAnthropicKey(sb: ReturnType<typeof createClient>): Promise<string> {
  const { data } = await sb.rpc('get_anthropic_key')
  if (!data) throw new Error('No Anthropic key')
  return data as string
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('POST only', { status: 405 })

  const body = await req.json()
  const { conversation_id, contact_phone, inbound_text } = body

  if (!inbound_text) {
    return new Response(JSON.stringify({ error: 'inbound_text required' }), { status: 400 })
  }

  const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

  // Pull conversation context if we have an ID or phone
  let history = ''
  let convInfo: Record<string, unknown> = {}
  if (conversation_id || contact_phone) {
    let convQuery = sb.from('whatsapp_conversations').select('id, contact_phone, contact_type, ad_id, first_category, message_count, last_inbound_at').limit(1)
    if (conversation_id) convQuery = convQuery.eq('id', conversation_id)
    else if (contact_phone) convQuery = convQuery.eq('contact_phone', contact_phone)
    const { data: conv } = await convQuery.maybeSingle()
    if (conv) {
      convInfo = conv as Record<string, unknown>
      const { data: msgs } = await sb
        .from('whatsapp_messages')
        .select('direction, body, ai_generated, created_at')
        .eq('conversation_id', (conv as { id: string }).id)
        .order('created_at', { ascending: true })
        .limit(15)
      history = ((msgs as Array<{ direction: string; body: string; ai_generated: boolean }>) || [])
        .map(m => `${m.direction === 'inbound' ? 'العميل' : (m.ai_generated ? 'مضمونة(AI)' : 'مضمونة')}: ${m.body}`)
        .join('\n')
    }
  }

  const apiKey = await getAnthropicKey(sb)

  const system = `You are a senior sales coach for Madmona (مضمونة) — Egyptian rental marketplace.
Your job: produce THREE distinct reply variants for a sales agent handling this WhatsApp inbound.

Madmona facts:
- Egyptian Arabic colloquial only
- 10% commission individuals / 5% companies
- AI-powered platform matching listings with real customers
- Pillars: حماية كاملة · دفع سريع · دعم 24/7
- Supplier URL: ${SITE_URL}/add-listing
- Customer URL: ${SITE_URL}/marketplace?category=<slug>
- NEVER ask for personal info via WhatsApp
- Brand name: مضمونة (with ض) — never مدمونة

PRODUCE 3 VARIANTS with different strategies:
1. "Direct & professional" — confident, concise, gets to the point fast
2. "Warm & relationship-focused" — friendly, asks 1 contextual question first
3. "Urgency & social proof" — mentions activity ("222 ليستنج نشط", "مئات الموردين")

ALSO classify:
- detected_intent: signup_supplier | book_rental | ask_question | objection | spam
- suggested_category: properties | vehicles | workspaces | equipment | media | weddings | tourism | recreation | marine | null
- urgency: low | medium | high (high = ready to commit, low = just browsing)

Conversation history:
${history || '(no prior history — fresh contact)'}

Contact info: ${JSON.stringify(convInfo)}

Respond ONLY with valid JSON:
{
  "variants": [
    {"label": "رد مباشر واحترافي", "body": "...", "tone": "direct"},
    {"label": "رد ودي + سؤال", "body": "...", "tone": "warm"},
    {"label": "رد بـ social proof", "body": "...", "tone": "urgency"}
  ],
  "detected_intent": "...",
  "suggested_category": "...|null",
  "urgency": "...",
  "summary": "وصف مختصر عربي للفرصة (سطر واحد)"
}`

  const userMsg = `الرسالة الأخيرة من العميل:\n"${inbound_text}"`

  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: CLAUDE_MODEL, max_tokens: 1500, system, messages: [{ role: 'user', content: userMsg }] })
  })

  if (!r.ok) {
    const errText = await r.text()
    return new Response(JSON.stringify({ error: 'claude_error', detail: errText.slice(0, 300) }), { status: 500, headers: { 'Content-Type': 'application/json' } })
  }

  const data = await r.json()
  const text = data?.content?.[0]?.text || ''
  const match = text.replace(/^```(?:json)?/i, '').replace(/```$/, '').trim().match(/\{[\s\S]*\}/)
  if (!match) {
    return new Response(JSON.stringify({ error: 'parse_failed', raw: text.slice(0, 300) }), { status: 500, headers: { 'Content-Type': 'application/json' } })
  }

  try {
    const parsed = JSON.parse(match[0])
    return new Response(JSON.stringify({ ok: true, ...parsed }), { headers: { 'Content-Type': 'application/json' } })
  } catch (e) {
    return new Response(JSON.stringify({ error: 'json_parse', detail: String(e) }), { status: 500, headers: { 'Content-Type': 'application/json' } })
  }
})
