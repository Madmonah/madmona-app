// weekly-content-plan — Sunday morning, generates 7-day content calendar:
// 3 Reels + 7 TikToks + 2 posts + 5 stories spread across themes.
// Each item becomes a content_drafts row with status='generated'.
import { createClient } from 'jsr:@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const AGENT_SECRET = Deno.env.get('AGENT_SECRET') || 'c9aade438b57204664c496dcd43ab8a640af5061273abc6591522bf96065d0c7'
const CLAUDE_MODEL = 'claude-sonnet-4-6'

const BRAND_VOICE = `أنت content strategist لـ مضمونة (madmonacairo.com). تصيغ مواضيع الأسبوع الجاي.
المنصة: ماركتبليس إيجار عام في مصر (عربيات، عقارات، معدات، كاميرات، ورك سبيس، شاليهات).
ال USP: AI يربط الموردين بالعملاء تلقائياً.
السلوجان: "إحنا بتوع الإيجار".
العمولة: 10%/5% (بعد الحجز، لا اشتراك).
ال ICP: موردين + عملاء مصريين.
النبرة: عامية صريحة واثقة غير رسمية غير مبالغة.`

Deno.serve(async (req) => {
  const auth = req.headers.get('authorization') || ''
  const agentSecret = req.headers.get('x-agent-secret') || ''
  const vercelCron = req.headers.get('x-vercel-cron')
  const isAuthorized = vercelCron === '1' || agentSecret === AGENT_SECRET || auth.includes(AGENT_SECRET) || auth.includes(SUPABASE_SERVICE_ROLE_KEY)
  if (!isAuthorized) return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401 })

  const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

  const { data: apiKey } = await sb.rpc('get_anthropic_key')
  if (!apiKey) return new Response(JSON.stringify({ error: 'no_api_key' }), { status: 500 })

  // Get marketplace stats to inform content topics
  const { count: listingsCount } = await sb.from('listings').select('*', { count: 'exact', head: true }).eq('status', 'published')
  const { count: suppliersCount } = await sb.from('marketplace_suppliers').select('*', { count: 'exact', head: true }).eq('kyc_status', 'approved')

  // Ask Claude to design the week's content mix
  const system = `${BRAND_VOICE}

المهمة: خطط 7 أيام من content لـ Reels + TikTok + posts + stories.

الإحصائيات الحالية (تستخدمها لو عاوز):
- listings: ${listingsCount}
- suppliers: ${suppliersCount}

المزيج المطلوب:
- 3 Reels (Instagram, 30s each)
- 5 TikToks (25s each)
- 2 Instagram posts (static)
- 3 stories (10s each)

التوزيع:
- 50% awareness (الـ AI سحر تقني)
- 30% conversion (سجّل كمورد / احجز إيجار)
- 20% consideration (ليه مضمونة أفضل من OLX/Hatla2ee)

التنوع الموضوعي (اختر 7 مواضيع مختلفة):
- الـ AI matchmaker (وإنت نايم)
- before/after lift لمورد
- tips تصوير الـ listing
- مقارنة OLX vs مضمونة
- حماية بروتوكول الدفع
- صواريخ + فواجئ (ستوري)
- سؤال تفاعلي

Reply JSON only, no markdown fences:
{
  "plan": [
    {
      "day": 1,
      "format": "reel|tiktok|instagram_post|story",
      "topic": "عنوان وصفي",
      "duration_seconds": 30,
      "intent": "awareness|consideration|conversion",
      "target_audience": "...",
      "tone": "casual|professional|playful|inspirational|urgent",
      "why_this_day": "ليه اخترت اليوم ده"
    },
    ...
  ],
  "weekly_theme": "ثيم عام للأسبوع"
}`

  const userMsg = `خطط أسبوع ${new Date().toISOString().split('T')[0]} لمضمونة. 13 بوست (3 reels + 5 tiktoks + 2 posts + 3 stories).`

  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': apiKey as string, 'anthropic-version': '2023-06-01', 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: CLAUDE_MODEL,
      max_tokens: 4000,
      system,
      messages: [{ role: 'user', content: userMsg }]
    })
  })

  if (!r.ok) return new Response(JSON.stringify({ error: 'claude_error', detail: (await r.text()).slice(0, 300) }), { status: 500 })

  const data = await r.json()
  const text = data?.content?.[0]?.text || ''
  const match = text.replace(/^```(?:json)?/i, '').replace(/```$/, '').trim().match(/\{[\s\S]*\}/)
  if (!match) return new Response(JSON.stringify({ error: 'parse_failed' }), { status: 500 })

  let parsed: { plan?: Array<Record<string, unknown>>; weekly_theme?: string }
  try { parsed = JSON.parse(match[0]) }
  catch (e) { return new Response(JSON.stringify({ error: 'json_parse_failed', detail: String(e) }), { status: 500 }) }

  const plan = parsed.plan || []
  const today = new Date()
  const inserts: Array<Record<string, unknown>> = []
  for (const item of plan) {
    const day = Number(item.day) || 1
    const scheduledFor = new Date(today.getTime() + (day - 1) * 86400_000)
    inserts.push({
      format: item.format,
      topic: item.topic,
      duration_seconds: item.duration_seconds || null,
      target_audience: item.target_audience,
      intent: item.intent,
      status: 'generated',
      scheduled_for: scheduledFor.toISOString(),
      ai_reasoning: `[أسبوع ${today.toISOString().split('T')[0]} · يوم ${day}] ${item.why_this_day || ''}`,
      ai_model: CLAUDE_MODEL,
      agent_name: 'weekly-content-plan',
      hook: null, script: null, visual_directions: null, caption: null,
      hashtags: [], cta: null, thumbnail_text: null, music_suggestion: null,
    })
  }

  if (inserts.length > 0) {
    await sb.from('content_drafts').insert(inserts)
  }

  // Save the plan as an admin_alert
  await sb.from('admin_alerts').insert({
    alert_type: 'weekly_content_plan',
    severity: 'info',
    title: `📅 خطة content لأسبوع ${today.toISOString().split('T')[0]} وصلت`,
    summary: `${plan.length} content idea · ${parsed.weekly_theme || ''} · محتاجة توليد scripts`,
    detail: { plan, weekly_theme: parsed.weekly_theme },
    action_url: '/admin/content-studio',
    agent_name: 'weekly-content-plan',
    status: 'unread',
  })

  return new Response(JSON.stringify({
    ok: true,
    inserted: inserts.length,
    weekly_theme: parsed.weekly_theme,
    plan,
  }, null, 2), { headers: { 'Content-Type': 'application/json' } })
})
