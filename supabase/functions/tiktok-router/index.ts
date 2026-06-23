import { createClient } from 'jsr:@supabase/supabase-js@2'

const SB_URL = Deno.env.get('SUPABASE_URL')!
const SB_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const MODEL = 'claude-sonnet-4-6'

const TOOL = {
  name: 'tiktok_plan',
  description: 'Convert a stuck tiktok/youtube script into a ready-to-publish asset',
  input_schema: {
    type: 'object',
    properties: {
      format: { type: 'string', enum: ['carousel', 'video'] },
      caption: { type: 'string' },
      hashtags: { type: 'array', items: { type: 'string' } },
      carousel_slides: {
        type: 'array',
        items: {
          type: 'object',
          properties: { headline: { type: 'string' }, sub: { type: 'string' }, visual: { type: 'string' } },
          required: ['headline']
        }
      },
      capcut_kit: {
        type: 'object',
        properties: {
          scenes: {
            type: 'array',
            items: {
              type: 'object',
              properties: { t: { type: 'string' }, onscreen: { type: 'string' }, visual: { type: 'string' } },
              required: ['t', 'onscreen']
            }
          },
          sound: { type: 'string' },
          template_hint: { type: 'string' }
        }
      }
    },
    required: ['format', 'caption', 'hashtags']
  }
}

const SYSTEM = [
  'انت محرر محتوى تيك توك في "مضمونة" (منصة تأجير، عمولة 10% أفراد و5% شركات، اتأسست 2019).',
  'مهمتك: تحوّل سكريبت تيك توك واقف لأصل جاهز للنشر.',
  'القواعد:',
  '- لو المحتوى نص/أرقام/قيمة/مقارنة => format=carousel، اعمل 4-6 سلايدات (headline قصير + sub + وصف visual).',
  '- لو محتاج حركة/مشاهد/POV حقيقي => format=video، اعمل capcut_kit بمشاهد فيها توقيت t ونص onscreen ووصف visual + sound + template_hint.',
  '- لغة عامية مصرية بحتة.',
  '- ممنوع تماما: اي رقم تليفون، اي لينك غير madmonacairo.com، اي ادعاء غير مؤكد (زي دعم 24/7 او ضمان 100%).',
  '- caption قصير وجذاب + 4-6 هاشتاجات لازم يكون منهم #احنا_بتوع_الإيجار و #مضمونة و #FYP.'
].join('\n')

Deno.serve(async (req) => {
  try {
    const body = await req.json().catch(() => ({}))
    const limit = Math.min(Number(body.limit) || 5, 10)
    const sb = createClient(SB_URL, SB_KEY)

    const { data: keyData } = await sb.rpc('get_anthropic_key')
    const apiKey = typeof keyData === 'string' ? keyData : (keyData?.key ?? '')
    if (!apiKey) return j({ ok: false, error: 'no_api_key' }, 500)

    const { data: rows, error } = await sb
      .from('content_calendar')
      .select('id,title,body,content_type,metadata')
      .eq('status', 'no_publisher')
      .in('content_type', ['tiktok_script', 'youtube_script'])
      .limit(50)
    if (error) return j({ ok: false, error: error.message }, 500)

    const pending = (rows ?? []).filter((r) => !r?.metadata?.tiktok_router?.done).slice(0, limit)
    const results = []

    for (const row of pending) {
      try {
        const plan = await planOne(apiKey, row)
        if (!plan) { results.push({ id: row.id, ok: false, reason: 'no_plan' }); continue }
        const meta = { ...(row.metadata ?? {}), tiktok_router: { ...plan, done: true, at: new Date().toISOString(), by: 'tiktok-router' } }
        const { error: uErr } = await sb.from('content_calendar').update({ metadata: meta }).eq('id', row.id)
        results.push({ id: row.id, title: row.title, format: plan.format, ok: !uErr, reason: uErr?.message })
      } catch (e) {
        results.push({ id: row.id, ok: false, reason: String(e) })
      }
    }

    // heartbeat so the AI OS health-check sees the agent alive
    try {
      await sb.from('agent_registry').update({ last_run_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq('agent_name', 'tiktok-router')
    } catch (_) { /* ignore */ }

    return j({ ok: true, processed: results.length, results })
  } catch (e) {
    return j({ ok: false, error: String(e) }, 500)
  }
})

async function planOne(apiKey, row) {
  const userMsg = `عنوان: ${row.title}\nنوع: ${row.content_type}\nالسكريبت:\n${row.body ?? ''}`
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({
      model: MODEL, max_tokens: 1500, system: SYSTEM,
      tools: [TOOL], tool_choice: { type: 'tool', name: 'tiktok_plan' },
      messages: [{ role: 'user', content: userMsg }]
    })
  })
  if (!res.ok) return null
  const data = await res.json()
  const tu = (data.content ?? []).find((c) => c.type === 'tool_use')
  return tu?.input ?? null
}

function j(o, status = 200) {
  return new Response(JSON.stringify(o), { status, headers: { 'content-type': 'application/json' } })
}
