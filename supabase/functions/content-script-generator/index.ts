// content-script-generator — AI generates Reels, TikTok, posts, stories
// for Madmona's social channels. Saves to content_drafts table.
//
// POST body: {
//   format: 'reel' | 'tiktok' | 'instagram_post' | 'story' | 'thread' | 'carousel',
//   topic: string (e.g. "AI matchmaking explained"),
//   duration_seconds?: number (default by format),
//   target_audience?: string (default "موردين مصريين"),
//   intent?: 'awareness' | 'consideration' | 'conversion' | 'retention',
//   tone?: 'casual' | 'professional' | 'urgent' | 'playful' | 'inspirational',
//   keep_in_brand_voice?: boolean (default true)
// }
import { createClient } from 'jsr:@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const CLAUDE_MODEL = 'claude-sonnet-4-6'

const BRAND_VOICE_CONTEXT = `أنت content strategist لـ "مضمونة" (madmonacairo.com).
المنصة: أكبر ماركتبليس للإيجار في مصر (عقارات، عربيات، معدات، كاميرات، ورك سبيس، شاليهات، إلخ).
السلوجان: "إحنا بتوع الإيجار".
الـ 3 ركائز: حماية كاملة · دفع مستحقات سريع · دعم مستمر.
العمولة: 10% أفراد · 5% بزنس (بعد الحجز، مفيش اشتراك).
ال USP الجديد: AI بيربط الموردين بالعملاء تلقائياً 24/7.
اللوجو: يد خضراء OK + حرف "م" · ألوان: أخضر غامق #1F5F3F + دهبي #B8860B + أيفوري.
النبرة: عامية مصرية بحتة، صريحة، غير رسمية دون إفراط، غير مبالغ، وثوقية.
الـ ICPs: موردين (أصحاب عربيات/عقارات/معدات) + عملاء (بيدوروا على إيجار مضمون).
لا تستخدم: الفصحى، أسلوب إعلاني صارخ، وعود فارغة، emojis زيادة (حد أقصى 3 في الـ caption).`

const FORMAT_DEFAULTS: Record<string, { duration: number; description: string }> = {
  reel: { duration: 30, description: 'Instagram Reel · portrait 9:16 · 15-60s' },
  tiktok: { duration: 25, description: 'TikTok video · portrait 9:16 · 15-60s · trending audio matters' },
  instagram_post: { duration: 0, description: 'Instagram feed post · square 1:1 · image + caption' },
  story: { duration: 10, description: 'Instagram/Facebook Story · portrait 9:16 · 5-15s · ephemeral' },
  thread: { duration: 0, description: 'X/Threads multi-post · 280 chars per post' },
  carousel: { duration: 0, description: 'Instagram carousel · 3-10 slides · storytelling format' },
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('POST only', { status: 405 })

  const body = await req.json().catch(() => ({}))
  const format = (body.format || 'reel') as keyof typeof FORMAT_DEFAULTS
  const topic = body.topic
  const duration = body.duration_seconds || FORMAT_DEFAULTS[format]?.duration || 30
  const audience = body.target_audience || 'موردين مصريين بيدوروا على دخل إضافي'
  const intent = body.intent || 'awareness'
  const tone = body.tone || 'casual'

  if (!topic) {
    return new Response(JSON.stringify({ error: 'topic_required' }), { status: 400 })
  }

  const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

  const { data: keyData } = await sb.rpc('get_anthropic_key')
  if (!keyData) return new Response(JSON.stringify({ error: 'no_api_key' }), { status: 500 })

  const formatInfo = FORMAT_DEFAULTS[format]
  const isVideo = ['reel', 'tiktok', 'story'].includes(format)

  const system = `${BRAND_VOICE_CONTEXT}

أنت دلوقتي بتصيغ content لـ ${formatInfo.description}.

التعليمات:
- التوقيت: ${duration} ثانية ${isVideo ? '(ولازم تلتزم بيها)' : ''}
- الـ audience: ${audience}
- الـ intent: ${intent}
- النبرة: ${tone}
- لازم الـ hook يتعمل في أول 3 ثواني · لو فيديو، أول frame لازم يوقف الـ scroll.
- الـ CTA واضح وسهل (مثل: ادخل madmonacairo.com · ابعتلنا واتساب · إلخ)
- الـ hashtags: مزيج من broad و niche عربي + إنجليزي (5-15 hashtag)
- visual_directions: ${isVideo ? 'لازم shot-by-shot بـ timing دقيق' : 'وصف visual الإمج'}

Reply with JSON only, no markdown fences:
{
  "hook": "أول 3 ثواني (أو first frame text)",
  "script": "${isVideo ? 'full timed script مع [00:00], [00:05]... markers' : 'main content text'}",
  "visual_directions": [
    {"timing": "0-3s", "action": "وصف الـ shot", "text_overlay": "لو فيه نص فوق الفيديو"}
  ],
  "caption": "caption لل post (حد أقصى 220 char للـ reel/tiktok، 500 لل post)",
  "hashtags": ["#hashtag1", "#hashtag2"],
  "cta": "جملة الدعوة للفعل",
  "thumbnail_text": "نص التمبنيل (حد أقصى 6 كلمات · لل video formats فقط)",
  "music_suggestion": "وصف صوت/موسيقى (لل video formats · مثل: 'صوت trending مصري hip-hop هادئ')",
  "ai_reasoning": "ليه اخترت الـ angle ده (1-2 جملة)"
}`

  const userMsg = `صيغ content لـ:
- format: ${format}
- topic: "${topic}"
- duration: ${duration}s
- audience: ${audience}
- intent: ${intent}
- tone: ${tone}`

  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': keyData as string, 'anthropic-version': '2023-06-01', 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: CLAUDE_MODEL,
      max_tokens: 3000,
      system,
      messages: [{ role: 'user', content: userMsg }]
    })
  })

  if (!r.ok) {
    const err = await r.text()
    return new Response(JSON.stringify({ error: 'claude_error', detail: err.slice(0, 300) }), { status: 500 })
  }

  const data = await r.json()
  const text = data?.content?.[0]?.text || ''
  const match = text.replace(/^```(?:json)?/i, '').replace(/```$/, '').trim().match(/\{[\s\S]*\}/)
  if (!match) return new Response(JSON.stringify({ error: 'parse_failed', raw: text.slice(0, 500) }), { status: 500 })

  let parsed
  try { parsed = JSON.parse(match[0]) }
  catch (e) {
    return new Response(JSON.stringify({ error: 'json_parse_failed', detail: String(e), raw: match[0].slice(0, 500) }), { status: 500 })
  }

  // Save to content_drafts
  const { data: saved, error: saveErr } = await sb.from('content_drafts').insert({
    format,
    topic,
    duration_seconds: isVideo ? duration : null,
    target_audience: audience,
    intent,
    status: 'generated',
    hook: parsed.hook,
    script: parsed.script,
    visual_directions: parsed.visual_directions,
    caption: parsed.caption,
    hashtags: parsed.hashtags || [],
    cta: parsed.cta,
    thumbnail_text: parsed.thumbnail_text,
    music_suggestion: parsed.music_suggestion,
    ai_reasoning: parsed.ai_reasoning,
    ai_model: CLAUDE_MODEL,
    prompt_used: userMsg,
    agent_name: 'content-script-generator',
  }).select('id').single()

  return new Response(JSON.stringify({
    ok: true,
    draft_id: saved?.id,
    save_error: saveErr?.message,
    format,
    topic,
    duration_seconds: duration,
    ...parsed
  }, null, 2), { headers: { 'Content-Type': 'application/json' } })
})
