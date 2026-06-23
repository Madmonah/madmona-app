// marketing-director v2 — reviews existing drafts FIRST, plans week, dispatches tasks. Respects enabled.
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
    const { data: reg } = await sb().from('agent_registry').select('enabled').eq('agent_name','marketing-director').single()
    if (!reg?.enabled) {
      return new Response(JSON.stringify({ ok:true, skipped:true, reason:'agent disabled' }), { status:200, headers:{ 'Content-Type':'application/json', ...CORS } })
    }

    const { data: ctxRow } = await sb().from('system_context').select('context').eq('id','current').single()
    const ctx: any = ctxRow?.context ?? {}
    const pod = ctx.marketing_pod ?? {}
    const playbook = ctx.algorithm_playbook ?? {}
    const engine = ctx.content_engine ?? {}
    const changelog = Array.isArray(ctx.app_changelog) ? ctx.app_changelog.slice(0,5) : []

    const { data: drafts } = await sb().from('content_drafts')
      .select('id,topic,format,hook,caption,status,scheduled_for,published_at')
      .is('published_at', null).order('created_at',{ ascending:false }).limit(15)
    const { data: insights } = await sb().from('agent_insights').select('agent_name,title,description,priority').order('created_at',{ ascending:false }).limit(12)
    const { data: kpis } = await sb().from('daily_kpis').select('*').order('created_at',{ ascending:false }).limit(3)

    const squads = pod.squads ?? {}
    const validAgents: string[] = ([] as string[]).concat(squads.intel||[], squads.creation||[], squads.distribution||[], squads.growth||[])

    const tool = {
      name:'submit_marketing_plan',
      description:'Submit the weekly marketing plan with per-agent task assignments',
      input_schema:{ type:'object', properties:{
        weekly_theme:{ type:'string', description:'محور الأسبوع بالعامية المصرية' },
        rationale:{ type:'string', description:'سطرين: ليه المحور ده دلوقتي' },
        existing_review:{ type:'string', description:'مراجعة سريعة للمحتوى الموجود وإيه اللي يتحسّن فيه قبل أي جديد' },
        tasks:{ type:'array', items:{ type:'object', properties:{
          agent:{ type:'string', enum: validAgents },
          task:{ type:'string', description:'تاسك واضح بالعامية' },
          format:{ type:'string', enum:['short_vertical_video','carousel','single_image','story','email','whatsapp','seo','listing','other'] },
          priority:{ type:'string', enum:['high','medium','low'] }
        }, required:['agent','task','priority'] } }
      }, required:['weekly_theme','rationale','tasks'] }
    }

    const system = 'أنت Marketing Director لمنصة Madmona (madmonacairo.com) — marketplace إيجار مضمون في مصر، تأسست 2019 وإعادة إطلاق 2026. الهدف: أكتر شركة منتشرة في مصر بريتش عالمي المستوى.\nأوامر ثابتة بالترتيب:\n1) أول حاجة راجع وحسّن المحتوى الموجود في existing_drafts قبل أي إنتاج/نشر جديد.\n2) البطل = فيديو 3D (+ فيديوهات المالك الحقيقية).\n3) كل هيرو يتعمله repurpose لكل المنصات بفورمات كل منصة (اتبع repurposing_engine + platform_matrix) — مش كوبي-بست.\n4) اتأكد إن كل المنصات نزل عليها محتوى (coverage).\n5) كل فيديو: هوك أول ثانيتين + كابشن word-by-word + trending audio.\nاتبع algorithm_playbook، استخدم أدوات content_engine، البراند يطابق madmonacairo.com (كريمي + تدرجات خضراء/تيل + ذهبي مسموح، Cairo+Inter)، كل المحتوى عامية مصرية. وزّع التاسكات على أجينتس البود فقط.'

    const userMsg = JSON.stringify({ marketing_pod:pod, algorithm_playbook:playbook, content_engine:engine, existing_drafts:drafts, recent_app_updates:changelog, recent_insights:insights, recent_kpis:kpis })

    const apiKey = await getKey()
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method:'POST',
      headers:{ 'x-api-key':apiKey, 'anthropic-version':'2023-06-01', 'Content-Type':'application/json' },
      body: JSON.stringify({ model:SONNET, max_tokens:4096, system, tools:[tool], tool_choice:{ type:'tool', name:'submit_marketing_plan' }, messages:[{ role:'user', content:userMsg }] })
    })
    const data = await r.json()
    if (!r.ok) throw new Error('Claude ' + r.status + ': ' + JSON.stringify(data).slice(0,300))
    const block = data?.content?.find((b:any)=>b.type==='tool_use')
    if (!block?.input) throw new Error('no plan returned (stop_reason ' + (data?.stop_reason||'?') + ')')
    const plan = block.input as { weekly_theme:string; rationale:string; existing_review?:string; tasks:Array<{agent:string;task:string;format?:string;priority:string}> }

    const validSet = new Set(validAgents)
    let dispatched = 0
    for (const t of (plan.tasks||[])) {
      if (!validSet.has(t.agent)) continue
      const { error } = await sb().from('agent_messages').insert({
        from_agent:'marketing-director', to_agent:t.agent, message_type:'task',
        subject:(t.format?('['+t.format+'] '):'')+(t.task||'').slice(0,80),
        payload:t, priority:(t.priority||'normal'), status:'sent', response_required:false
      })
      if (!error) dispatched++
    }

    await sb().from('agent_insights').insert({
      agent_name:'marketing-director', insight_type:'plan', title:(plan.weekly_theme||'خطة الأسبوع').slice(0,200),
      description:((plan.existing_review?('مراجعة الموجود: '+plan.existing_review+' | '):'')+(plan.rationale||'')).slice(0,1000), priority:'high', data_points:plan,
      recommended_action:'نفّذ التاسكات الموزّعة'
    })

    const dur = Date.now()-start
    await sb().from('agent_runs').insert({ agent_name:'marketing-director', trigger_type:'edge_function', status:'success', started_at:new Date(Date.now()-dur).toISOString(), finished_at:new Date().toISOString(), duration_ms:dur, output_summary:{ theme:plan.weekly_theme, dispatched } })
    try { await sb().rpc('mark_agent_ran',{ p_agent_name:'marketing-director', p_success:true }) } catch {}

    return new Response(JSON.stringify({ ok:true, theme:plan.weekly_theme, existing_review:plan.existing_review||null, tasks_dispatched:dispatched, total_tasks:(plan.tasks||[]).length }), { status:200, headers:{ 'Content-Type':'application/json', ...CORS } })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unknown'
    try { await sb().from('agent_runs').insert({ agent_name:'marketing-director', trigger_type:'edge_function', status:'error', error_message:msg, finished_at:new Date().toISOString() }) } catch {}
    return new Response(JSON.stringify({ ok:false, error:msg }), { status:500, headers:{ 'Content-Type':'application/json', ...CORS } })
  }
})
