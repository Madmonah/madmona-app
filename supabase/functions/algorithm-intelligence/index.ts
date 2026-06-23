// algorithm-intelligence v1 — weekly web research → refreshes system_context.algorithm_playbook.
// Respects agent_registry.enabled (no-op when disabled).
import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'

const CORS = { 'Access-Control-Allow-Origin':'*','Access-Control-Allow-Methods':'POST, OPTIONS','Access-Control-Allow-Headers':'Content-Type, Authorization, apikey' }
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const SONNET = 'claude-sonnet-4-6'
const sb = () => createClient(SUPABASE_URL, SERVICE)

async function getKey(): Promise<string> {
  const { data, error } = await sb().rpc('get_anthropic_key')
  if (error || !data) throw new Error('anthropic key missing: ' + (error?.message || 'empty'))
  return data as string
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  const start = Date.now()
  try {
    const { data: reg } = await sb().from('agent_registry').select('enabled').eq('agent_name','algorithm-intelligence').single()
    if (!reg?.enabled) {
      return new Response(JSON.stringify({ ok:true, skipped:true, reason:'agent disabled' }), { status:200, headers:{ 'Content-Type':'application/json', ...CORS } })
    }

    const apiKey = await getKey()
    const system = 'أنت Algorithm Intelligence لمنصة Madmona. ابحث في الويب عن أحدث عوامل الريتش وتغييرات خوارزميات 2026 لإنستجرام وتيك توك وفيسبوك ويوتيوب (عوامل الترتيب، أفضل الصيغ، التوقيت، الأطوال). بعد البحث ردّ بـ JSON فقط بدون أي نص أو backticks بالشكل: {"instagram":{"primary":"...","best_practices":["..."]},"tiktok":{"primary":"...","best_practices":["..."]},"facebook":{"primary":"...","best_practices":["..."]},"youtube":{"primary":"...","best_practices":["..."]},"cross_cutting":["..."]}. كل best_practices بالعامية المصرية ومختصرة وعملية.'

    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method:'POST',
      headers:{ 'x-api-key':apiKey, 'anthropic-version':'2023-06-01', 'Content-Type':'application/json' },
      body: JSON.stringify({ model:SONNET, max_tokens:3500, system, tools:[{ type:'web_search_20250305', name:'web_search', max_uses:5 }], messages:[{ role:'user', content:'حدّث algorithm_playbook بأحدث بيانات 2026 موثّقة من الويب.' }] })
    })
    const data = await r.json()
    if (!r.ok) throw new Error('Claude ' + r.status + ': ' + JSON.stringify(data).slice(0,300))

    const text = (data.content||[]).filter((b:any)=>b.type==='text').map((b:any)=>b.text||'').join('\n').trim()
    let clean = text.replace(/^```(?:json)?/i,'').replace(/```$/,'').trim()
    let parsed:any
    try { parsed = JSON.parse(clean) } catch {
      const m = clean.match(/\{[\s\S]*\}/)
      if (!m) throw new Error('playbook JSON parse failed; raw=' + clean.slice(0,200))
      parsed = JSON.parse(m[0])
    }

    const { data: ctxRow } = await sb().from('system_context').select('context').eq('id','current').single()
    const ctx:any = ctxRow?.context ?? {}
    const prev = ctx.algorithm_playbook ?? {}
    const merged = { ...prev, ...parsed, _meta: { ...(prev._meta||{}), refreshed_by:'algorithm-intelligence', cadence:'weekly', last_refreshed:new Date().toISOString(), source:'web research' } }
    const newCtx = { ...ctx, algorithm_playbook: merged }
    await sb().from('system_context').update({ context:newCtx }).eq('id','current')

    await sb().from('agent_insights').insert({
      agent_name:'algorithm-intelligence', insight_type:'optimization', title:'تحديث algorithm_playbook',
      description:'تم تحديث أفضل ممارسات الريتش لكل المنصات ببحث ويب', priority:'medium', data_points:merged,
      recommended_action:'الفرق تستخدم البلاي بوك المحدّث في المحتوى'
    })

    const dur = Date.now()-start
    await sb().from('agent_runs').insert({ agent_name:'algorithm-intelligence', trigger_type:'edge_function', status:'success', started_at:new Date(Date.now()-dur).toISOString(), finished_at:new Date().toISOString(), duration_ms:dur, output_summary:{ platforms:Object.keys(parsed||{}) } })
    try { await sb().rpc('mark_agent_ran',{ p_agent_name:'algorithm-intelligence', p_success:true }) } catch {}

    return new Response(JSON.stringify({ ok:true, platforms:Object.keys(parsed||{}), refreshed_at:merged._meta.last_refreshed }), { status:200, headers:{ 'Content-Type':'application/json', ...CORS } })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unknown'
    try { await sb().from('agent_runs').insert({ agent_name:'algorithm-intelligence', trigger_type:'edge_function', status:'error', error_message:msg, finished_at:new Date().toISOString() }) } catch {}
    return new Response(JSON.stringify({ ok:false, error:msg }), { status:500, headers:{ 'Content-Type':'application/json', ...CORS } })
  }
})
