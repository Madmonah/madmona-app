// unified-agents v2 (2026-06-11) — Fable-5 consolidation: 6 agents replace 56.
// v2: (a) campaign focus per-agent from agent_registry.config.campaign_focus (default marid_mascots),
//     (b) quality-guardian FIXES misspellings in pending queue instead of cancelling (cancel only hard violations),
//     (c) concierge search is location-aware via search_listings_catalog (extraction lives in the RPC, data layer).
// Model per-agent from agent_registry.config.model (default claude-fable-5, fallback sonnet).
import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'

const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type, Authorization, apikey' }
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const DEFAULT_MODEL = 'claude-fable-5'
const FALLBACK_MODEL = 'claude-sonnet-4-6'
const SITE = 'https://madmonacairo.com'
const WA_CUSTOMER = 'wa.me/201002229982'

const sb = () => createClient(SUPABASE_URL, SERVICE_KEY)

const BRAND_SYSTEM = `قواعد براند مضمونة — صارمة وغير قابلة للكسر:
- الاسم: مضمونة (بالضاد دايماً — عمراً مدمونة/مظمونة/مذمونة). بالإنجليزي: Madmona.
- السلوجان: «معاملاتك مضمونة».
- ممنوع نهائياً: «من 2019»، «أكبر منصة»، «أجر معانا» (الصح: «ضيف الليستنج»)، أي محتوى coworking.
- المنصة: ماركت بليس مصري مضمون اتلانش مايو 2026 وبينمو بسرعة غير طبيعية — إيجار، بيع وشرا، خدمات، مطاعم، بيوتي.
- اللهجة: مصري عامي 100%.
- الركايز: حماية كاملة · دفع مستحقات سريع · دعم مستمر. العمولة: أفراد 10% / شركات 5% (مطاعم حالياً 0%).
- لينك العملاء: ${WA_CUSTOMER} — لينك الموردين: ${SITE}/add-listing — في الـ outreach يستخدم madmonacairo.com فقط.
- الماسكوتات الرسمية: المارد (البطل، مذكر دايماً)، زيزو، ميرو، الحاج مضمون، تيتا نوسة.`

function enforceBrand(text: string): string {
  if (!text) return text
  return text
    .replace(/مدمون[ةه]/g, 'مضمونة').replace(/مظمون[ةه]/g, 'مضمونة')
    .replace(/مذمون[ةه]/g, 'مضمونة').replace(/متمون[ةه]/g, 'مضمونة')
    .replace(/Madmoonah?/gi, 'Madmona')
    .replace(/أجر معانا/g, 'ضيف الليستنج')
}

const HARD_VIOLATIONS: Array<[RegExp, string]> = [
  [/\b2019\b|٢٠١٩/, 'founding-date-2019'],
  [/أكبر منصة/, 'biggest-platform-claim'],
  [/كوركينج|coworking/i, 'coworking-content'],
]
const FIXABLE_RE = /مدمون[ةه]|مظمون[ةه]|مذمون[ةه]|متمون[ةه]|Madmoonah?|أجر معانا/i

let cachedKey: string | null = null
async function getKey(): Promise<string> {
  if (cachedKey) return cachedKey
  const { data, error } = await sb().rpc('get_anthropic_key')
  if (error || !data) throw new Error('no anthropic key')
  cachedKey = data as string
  return cachedKey
}

async function getAgentCfg(agentName: string): Promise<{ model: string; config: Record<string, unknown> }> {
  try {
    const { data } = await sb().from('agent_registry').select('config').eq('agent_name', agentName).single()
    const cfg = ((data as { config?: Record<string, unknown> } | null)?.config || {}) as Record<string, unknown>
    return { model: (cfg.model as string) || DEFAULT_MODEL, config: cfg }
  } catch { return { model: DEFAULT_MODEL, config: {} } }
}

interface ToolSpec { name: string; description: string; input_schema: Record<string, unknown> }

async function callClaude<T>(model: string, system: string, user: string, tool: ToolSpec, maxTokens = 3000, timeoutMs = 90000): Promise<T> {
  const apiKey = await getKey()
  const attempt = async (m: string): Promise<Response> => {
    const ctrl = new AbortController()
    const t = setTimeout(() => ctrl.abort(), timeoutMs)
    try {
      return await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST', signal: ctrl.signal,
        headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: m, max_tokens: maxTokens, system, tools: [tool], tool_choice: { type: 'tool', name: tool.name }, messages: [{ role: 'user', content: user }] })
      })
    } finally { clearTimeout(t) }
  }
  let r = await attempt(model)
  if (r.status === 400 || r.status === 404) {
    const errBody = await r.text()
    if (/model/i.test(errBody)) r = await attempt(FALLBACK_MODEL)
    else throw new Error(`Claude ${r.status}: ${errBody.slice(0, 200)}`)
  }
  const data = await r.json()
  if (!r.ok) throw new Error(`Claude ${r.status}: ${JSON.stringify(data).slice(0, 250)}`)
  const block = data?.content?.find((b: { type: string }) => b.type === 'tool_use')
  if (!block?.input) throw new Error(`no tool_use (stop: ${data?.stop_reason})`)
  return block.input as T
}

function normPhone(raw: string): string {
  let d = (raw || '').replace(/\D/g, '')
  if (d.startsWith('0') && d.length === 11) d = '20' + d.slice(1)
  return d
}

async function queueWA(to: string, text: string, agent: string, campaign: string, metadata: Record<string, unknown> = {}): Promise<boolean> {
  const phone = normPhone(to)
  if (!phone) return false
  const { error } = await sb().from('whatsapp_outbound_queue').insert({
    recipient_phone: '+' + phone, message: enforceBrand(text), agent_name: agent,
    campaign, status: 'pending', scheduled_at: new Date().toISOString(), metadata
  })
  return !error
}

async function insight(agent: string, type: string, title: string, description: string, priority: string, data: Record<string, unknown> = {}, action?: string) {
  await sb().from('agent_insights').insert({
    agent_name: agent, insight_type: type, title: title.slice(0, 200),
    description, priority, data_points: data, recommended_action: action ?? null
  })
}

async function logRun(agent: string, status: string, output: Record<string, unknown>, errMsg: string | undefined, ms: number) {
  await sb().from('agent_runs').insert({
    agent_name: agent, trigger_type: 'edge_function', status,
    started_at: new Date(Date.now() - ms).toISOString(), finished_at: new Date().toISOString(),
    duration_ms: ms, output_summary: output, error_message: errMsg ?? null
  })
  try { await sb().rpc('mark_agent_ran', { p_agent_name: agent, p_success: status === 'success' }) } catch { /* ok */ }
}

// ============================================================
// 1) MARID CAMPAIGN MANAGER — reels content + daily post + scheduling
// ============================================================
async function runMaridCampaignManager(): Promise<Record<string, unknown>> {
  const { model, config } = await getAgentCfg('marid-campaign-manager')
  const focus = (config.campaign_focus as string) || 'marid_mascots'
  const out: Record<string, unknown> = { campaign_focus: focus }

  try {
    const ROTATION: Array<[string, string]> = [['hag', 'البيت والثقة — الحاج مضمون رجل بيت مصري حكيم'], ['mero', 'الستايل والجمال — ميرو شابة عصرية'], ['zizo', 'الصيف والخروجات — زيزو شاب طاقة'], ['teta', 'العيلة والبيت — تيتا نوسة جدة حنينة']]
    const since14d = new Date(Date.now() - 14 * 86400000).toISOString()
    const { data: recentScripts } = await sb().from('reel_scripts').select('metadata').gte('created_at', since14d)
    const done = new Set(((recentScripts || []) as Array<{ metadata: { mascot?: string } | null }>).map(r => r?.metadata?.mascot).filter(Boolean))
    const next = ROTATION.find(([m]) => !done.has(m))
    if (!next) { out.reel_package = 'rotation_complete_14d' }
    else {
      const [mascot, theme] = next
      type Pkg = { hook: string; wishes: Array<{ character: string; genie: string }>; comment_bait: string; closing: string; caption: string; title: string }
      const pkg = await callClaude<Pkg>(model,
        BRAND_SYSTEM + `\nإنت بتكتب سكريبت ريل سلسلة أمنيات المارد (9:16، 8-9 ثواني). الهيكل المقفول: hook سؤال ~ثانية بصيغة المارد المذكر → الشخصية تفرك اللوجو والمارد يطلع منه → 3 تبادلات أمنيات (فقاعة بيضا «عايز/عايزة <أمنية>» ← فقاعة دهبية «تحت أمرك ✨») لازم تكون خدمات حقيقية قابلة للحجز على مضمونة → comment-bait «اكتب أمنيتك في الكومنت 👇 ومضمونة تحققهالك ✨» → قفلة السلوجان + الواتساب. CTA المورد في الكابشن فقط.`,
        `الشخصية: ${mascot} — الثيم: ${theme}. ولّد الباكدج كامل.`,
        {
          name: 'submit_reel_package', description: 'Submit complete marid wish-reel package',
          input_schema: {
            type: 'object',
            properties: {
              title: { type: 'string' }, hook: { type: 'string' },
              wishes: { type: 'array', items: { type: 'object', properties: { character: { type: 'string' }, genie: { type: 'string' } }, required: ['character', 'genie'] }, minItems: 3, maxItems: 3 },
              comment_bait: { type: 'string' }, closing: { type: 'string' },
              caption: { type: 'string', description: 'full caption formula incl supplier CTA + hashtags' }
            },
            required: ['title', 'hook', 'wishes', 'comment_bait', 'closing', 'caption']
          }
        })
      const { data: ins } = await sb().from('reel_scripts').insert({
        title: enforceBrand(pkg.title), caption: enforceBrand(pkg.caption),
        status: 'script_ready',
        metadata: { series: 'marid_wishes', mascot, theme, hook: enforceBrand(pkg.hook), wishes: pkg.wishes, comment_bait: pkg.comment_bait, closing: enforceBrand(pkg.closing), generated_by: 'marid-campaign-manager', model }
      }).select('id').single()
      out.reel_package = { mascot, script_id: (ins as { id?: string } | null)?.id, title: pkg.title }
    }
  } catch (e) { out.reel_package_error = String(e).slice(0, 200) }

  try {
    const since48 = new Date(Date.now() - 48 * 3600000).toISOString()
    const { data: recent } = await sb().from('content_calendar').select('title').gte('created_at', since48).order('created_at', { ascending: false }).limit(40)
    const recentTitles = ((recent || []) as Array<{ title: string }>).map(r => r.title).filter(Boolean).slice(0, 25)
    const campaignsBlock = focus === 'marid_mascots'
      ? 'الحملة النشطة الوحيدة: حملة المارد والماسكوتات — كل بوست لازم يلف حوالين عالم المارد: أمنيات الجمهور، الماسكوتات (الحاج مضمون، تيتا نوسة، زيزو، ميرو)، «لو طلع لك مارد تتمنى إيه؟»، وربط الأمنيات بخدمات حقيقية على مضمونة.'
      : 'الحملات النشطة: (1) حملة المارد والماسكوتات، (2) المطاعم والكافيهات (عمولة 0% + CRM/ERP مجاني). اختار حملة.'
    const campaignEnum = focus === 'marid_mascots' ? ['marid_mascots'] : ['marid_mascots', 'restaurants_cafes']
    type Post = { campaign: string; topic: string; headline: string; caption: string; hashtags: string[]; cta: string; design_brief: string }
    const post = await callClaude<Post>(model,
      BRAND_SYSTEM + `\nإنت content marketer. ${campaignsBlock} ولّد بوست Instagram مصري فريد.${recentTitles.length ? `\n⚠️ تجنّب العناوين دي حرفياً:\n${recentTitles.join('\n')}` : ''}`,
      `ولّد بوست النهاردة ${new Date().toISOString().split('T')[0]} — لازم topic جديد تماماً.`,
      {
        name: 'submit_post', description: 'Submit daily Instagram post',
        input_schema: {
          type: 'object',
          properties: {
            campaign: { type: 'string', enum: campaignEnum },
            topic: { type: 'string' }, headline: { type: 'string' },
            caption: { type: 'string' }, hashtags: { type: 'array', items: { type: 'string' } },
            cta: { type: 'string' }, design_brief: { type: 'string' }
          },
          required: ['campaign', 'topic', 'headline', 'caption', 'hashtags', 'cta', 'design_brief']
        }
      })
    const topic = enforceBrand(post.topic)
    const dup = recentTitles.some(t => t.trim() === topic.trim())
    const { data: ins } = await sb().from('content_calendar').insert({
      content_type: 'instagram_post', title: topic, body: enforceBrand(post.caption),
      hashtags: (post.hashtags || []).map(enforceBrand), cta: enforceBrand(post.cta),
      design_brief: enforceBrand(post.design_brief), status: dup ? 'rejected' : 'drafted',
      agent_name: 'marid-campaign-manager', category: post.campaign, language: 'ar',
      metadata: { headline: enforceBrand(post.headline), campaign: post.campaign, model, duplicate: dup }
    }).select('id').single()
    out.daily_post = { topic, campaign: post.campaign, id: (ins as { id?: string } | null)?.id, duplicate: dup }
  } catch (e) { out.daily_post_error = String(e).slice(0, 200) }

  try {
    const { data: drafts } = await sb().from('content_calendar').select('id, title').eq('status', 'drafted').is('published_at', null).order('created_at', { ascending: true }).limit(3)
    let scheduled = 0
    for (const d of (drafts || []) as Array<{ id: string; title: string }>) {
      const { error } = await sb().from('content_calendar').update({ status: 'scheduled', scheduled_for: new Date(Date.now() + 3600000).toISOString() }).eq('id', d.id)
      if (!error) scheduled++
    }
    out.scheduled = scheduled
  } catch (e) { out.schedule_error = String(e).slice(0, 200) }

  return out
}

// ============================================================
// 2) SALES ENGINE — qualify (batch) + outreach hot + KYC nudge
// ============================================================
async function runSalesEngine(): Promise<Record<string, unknown>> {
  const { model } = await getAgentCfg('sales-engine')
  const out: Record<string, unknown> = {}

  let hotLeads: Array<{ id: string; business_name: string; phone: string }> = []
  try {
    type L = { id: string; business_name: string; phone: string; category: string | null; rating: number | null; review_count: number | null; location: string | null }
    const { data: leads } = await sb().from('cold_leads')
      .select('id, business_name, phone, category, rating, review_count, location')
      .in('status', ['new', 'contacted']).or('contact_count.is.null,contact_count.lt.1').limit(12)
    const targets = (leads || []) as L[]
    if (targets.length === 0) { out.qualify = 'no_leads' }
    else {
      type Evals = { evaluations: Array<{ lead_id: string; score: number; verdict: string; reason: string }> }
      const res = await callClaude<Evals>(model,
        BRAND_SYSTEM + `\nإنت sales analyst. قيّم الـ leads دي دفعة واحدة لمنصة مضمونة — hot/warm/cold بناءً على الفئة والتقييم وعدد الريفيوهات والموقع.`,
        JSON.stringify(targets),
        {
          name: 'submit_batch_evaluation', description: 'Evaluate all leads in one batch',
          input_schema: {
            type: 'object',
            properties: {
              evaluations: {
                type: 'array',
                items: { type: 'object', properties: { lead_id: { type: 'string' }, score: { type: 'integer', minimum: 1, maximum: 10 }, verdict: { type: 'string', enum: ['hot', 'warm', 'cold'] }, reason: { type: 'string' } }, required: ['lead_id', 'score', 'verdict', 'reason'] }
              }
            },
            required: ['evaluations']
          }
        }, 3500)
      let hot = 0
      for (const e of res.evaluations || []) {
        const lead = targets.find(l => l.id === e.lead_id)
        if (!lead) continue
        if (e.score >= 7) { hot++; hotLeads.push({ id: lead.id, business_name: lead.business_name, phone: lead.phone }) }
        await insight('sales-engine', 'opportunity', `${lead.business_name} — ${e.verdict.toUpperCase()} (${e.score}/10)`, enforceBrand(e.reason), e.score >= 7 ? 'high' : e.score >= 4 ? 'medium' : 'low', { lead_id: lead.id, ...e })
      }
      out.qualify = { evaluated: (res.evaluations || []).length, hot }
    }
  } catch (e) { out.qualify_error = String(e).slice(0, 200) }

  try {
    let queued = 0
    for (const lead of hotLeads.slice(0, 8)) {
      if (!lead.phone) continue
      const body = `السلام عليكم 👋\n\nمن فريق مضمونة (madmonacairo.com) — منصة جديدة اتلانشت مايو 2026 وبتنمو بسرعة غير طبيعية.\nشفنا ${lead.business_name} وحابين نعرض عليكم الانضمام:\n✅ حماية كاملة\n✅ دفع مستحقات سريع\n✅ دعم مستمر\nالعمولة: أفراد 10% / شركات 5% — وبنستخدم ذكاء اصطناعي يربط ليستنجك بعملاء جاهزين.\n\nضيف الليستنج من: madmonacairo.com\n\nمعاملاتك مضمونة`
      const ok = await queueWA(lead.phone, body, 'sales-engine', 'hot_lead_outreach_v1', { lead_id: lead.id })
      if (ok) {
        queued++
        await sb().from('cold_leads').update({ status: 'contacted', last_contacted: new Date().toISOString(), contact_count: 1 }).eq('id', lead.id)
      }
    }
    out.outreach = { queued }
  } catch (e) { out.outreach_error = String(e).slice(0, 200) }

  try {
    const since7d = new Date(Date.now() - 7 * 86400000).toISOString()
    const { data: sups } = await sb().from('marketplace_suppliers')
      .select('id, business_name, profiles!inner(full_name, phone)')
      .eq('kyc_status', 'pending').gte('created_at', since7d).limit(8)
    type S = { id: string; business_name: string; profiles: { full_name: string | null; phone: string | null } }
    let nudged = 0
    for (const s of ((sups || []) as unknown as S[])) {
      if (!s.profiles?.phone) continue
      const dedupSince = new Date(Date.now() - 72 * 3600000).toISOString()
      const { data: dup } = await sb().from('whatsapp_outbound_queue').select('id').eq('campaign', 'kyc_nudge_v2').eq('recipient_phone', '+' + normPhone(s.profiles.phone)).gte('created_at', dedupSince).limit(1)
      if (dup && dup.length) continue
      const name = s.profiles.full_name ?? 'صديقنا'
      const ok = await queueWA(s.profiles.phone,
        `أهلاً ${name} 👋\n\nشكراً إنك سجلت ${s.business_name} على مضمونة.\nفاضل خطوة واحدة لتفعيل حسابك:\n1️⃣ ارفع البطاقة + السجل التجاري\n2️⃣ ضيف الليستنج الأول\n\nmadmonacairo.com\n\nمحتاج مساعدة؟ رد علينا — معاملاتك مضمونة`,
        'sales-engine', 'kyc_nudge_v2', { supplier_id: s.id })
      if (ok) nudged++
    }
    out.kyc_nudge = { nudged }
  } catch (e) { out.kyc_error = String(e).slice(0, 200) }

  return out
}

// ============================================================
// 3) CUSTOMER CONCIERGE — realtime, location-aware via RPC (data layer)
// ============================================================
async function runCustomerConcierge(payload: Record<string, unknown>): Promise<Record<string, unknown>> {
  const phone = String(payload?.contact_phone || '')
  const convId = String(payload?.conversation_id || '')
  if (!phone || !convId) return { skipped: 'missing payload' }
  const since = new Date(Date.now() - 24 * 3600000).toISOString()
  const { data: dup } = await sb().from('whatsapp_outbound_queue').select('id').eq('campaign', 'concierge_followup_v1').eq('recipient_phone', phone).gte('created_at', since).limit(1)
  if (dup && dup.length) return { skipped: 'already_followed_up_24h' }
  const { data: lastIn } = await sb().from('whatsapp_messages').select('body').eq('conversation_id', convId).eq('direction', 'inbound').eq('message_type', 'text').order('created_at', { ascending: false }).limit(3)
  const query = ((lastIn || []) as Array<{ body: string }>).map(m => m.body).filter(Boolean).join(' ')
  if (!query) return { skipped: 'no_inbound_text' }
  const { data: listings } = await sb().rpc('search_listings_catalog', { p_query: query, p_category_slug: null, p_city: null, p_limit: 2 })
  const found = (Array.isArray(listings) ? listings : []) as Array<Record<string, unknown>>
  if (found.length === 0) return { skipped: 'no_matching_listings', query: query.slice(0, 60) }
  const matchedLoc = found[0]?.matched_location ? String(found[0].matched_location) : null
  const lines = found.map((l, i) => `${i + 1}) ${l.title}${l.district ? ' — ' + l.district : (l.city ? ' — ' + l.city : '')} — ${l.price ? l.price + ' جنيه' : 'السعر بالتواصل'}\n${l.url}`).join('\n\n')
  const intro = matchedLoc ? `دي اقتراحات جاهزة ليك في منطقتك من مضمونة 📍👇` : `دي اقتراحات جاهزة ليك من مضمونة 👇`
  const msg = `${intro}\n\n${lines}\n\nكلها بحماية كاملة ودفع آمن — لو محتاج حاجة تانية أو في منطقة تانية قولنا.\nمعاملاتك مضمونة ✅`
  const ok = await queueWA(phone, msg, 'customer-concierge', 'concierge_followup_v1', { conversation_id: convId, listings: found.map(l => l.url), matched_location: matchedLoc })
  return { followed_up: ok, listings_sent: found.length, matched_location: matchedLoc }
}

// ============================================================
// 4) OPERATIONS SENTINEL — health checks (deterministic, no AI cost)
// ============================================================
async function runOperationsSentinel(): Promise<Record<string, unknown>> {
  const out: Record<string, unknown> = {}
  const since24 = new Date(Date.now() - 24 * 3600000).toISOString()
  const { count: waFails } = await sb().from('whatsapp_messages').select('id', { count: 'exact', head: true }).eq('status', 'failed').gte('created_at', since24)
  out.wa_failed_24h = waFails ?? 0
  if ((waFails ?? 0) >= 5) await insight('operations-sentinel', 'alert', `${waFails} رسالة واتساب فشلت في آخر 24 ساعة`, 'افحص error_message في whatsapp_messages — ممكن مشكلة توكن أو قالب.', 'high', { count: waFails }, 'راجع whatsapp_messages status=failed')
  const { count: runFails } = await sb().from('agent_runs').select('id', { count: 'exact', head: true }).eq('status', 'error').gte('started_at', since24)
  out.agent_errors_24h = runFails ?? 0
  if ((runFails ?? 0) >= 3) await insight('operations-sentinel', 'alert', `${runFails} agent runs فشلت في آخر 24 ساعة`, 'راجع agent_runs error_message.', 'high', { count: runFails })
  const twoHrs = new Date(Date.now() - 2 * 3600000).toISOString()
  const { count: stuck } = await sb().from('whatsapp_outbound_queue').select('id', { count: 'exact', head: true }).eq('status', 'pending').lt('scheduled_at', twoHrs)
  out.queue_stuck = stuck ?? 0
  if ((stuck ?? 0) >= 10) await insight('operations-sentinel', 'alert', `${stuck} رسالة عالقة في طابور الإرسال >ساعتين`, 'الـ poller ممكن واقف — افحص الكرون.', 'high', { count: stuck })
  const { count: oldDrafts } = await sb().from('content_calendar').select('id', { count: 'exact', head: true }).eq('status', 'drafted').lt('created_at', new Date(Date.now() - 3 * 86400000).toISOString())
  out.stale_content_drafts = oldDrafts ?? 0
  return out
}

// ============================================================
// 5) INTELLIGENCE ANALYST — daily KPI brief (one Fable-5 call)
// ============================================================
async function runIntelligenceAnalyst(): Promise<Record<string, unknown>> {
  const { model } = await getAgentCfg('intelligence-analyst')
  const since24 = new Date(Date.now() - 24 * 3600000).toISOString()
  const kpis: Record<string, number> = {}
  const count = async (table: string, filter: (q: any) => any): Promise<number> => {
    try { const { count: c } = await filter(sb().from(table).select('id', { count: 'exact', head: true })); return c ?? 0 } catch { return 0 }
  }
  kpis.new_conversations = await count('whatsapp_conversations', q => q.gte('created_at', since24))
  kpis.inbound_messages = await count('whatsapp_messages', q => q.eq('direction', 'inbound').gte('created_at', since24))
  kpis.ai_replies = await count('whatsapp_messages', q => q.eq('direction', 'outbound').eq('ai_generated', true).gte('created_at', since24))
  kpis.new_leads = await count('sales_leads', q => q.gte('created_at', since24))
  kpis.new_orders = await count('marketplace_orders', q => q.gte('created_at', since24))
  kpis.new_bookings = await count('marketplace_bookings', q => q.gte('created_at', since24))
  kpis.content_published = await count('content_calendar', q => q.eq('status', 'published').gte('published_at', since24))
  kpis.agent_errors = await count('agent_runs', q => q.eq('status', 'error').gte('started_at', since24))
  try {
    type Brief = { headline: string; summary: string; top_action: string }
    const brief = await callClaude<Brief>(model,
      BRAND_SYSTEM + '\nإنت محلل ذكاء أعمال لمضمونة. اكتب daily brief قصير وذكي بالعامية المصرية من الأرقام دي — ركّز على الإشارة مش الضوضاء، واقترح أهم action واحد.',
      JSON.stringify({ date: new Date().toISOString().split('T')[0], kpis }),
      {
        name: 'submit_brief', description: 'Daily brief',
        input_schema: { type: 'object', properties: { headline: { type: 'string' }, summary: { type: 'string', description: '3-5 lines' }, top_action: { type: 'string' } }, required: ['headline', 'summary', 'top_action'] }
      }, 1200)
    await insight('intelligence-analyst', 'daily_brief', enforceBrand(brief.headline), enforceBrand(brief.summary), 'medium', { kpis, model }, enforceBrand(brief.top_action))
    return { kpis, headline: brief.headline }
  } catch (e) {
    await insight('intelligence-analyst', 'daily_brief', `KPIs ${new Date().toISOString().split('T')[0]}`, JSON.stringify(kpis), 'medium', { kpis, narrative_error: String(e).slice(0, 150) })
    return { kpis, narrative_error: String(e).slice(0, 150) }
  }
}

// ============================================================
// 6) QUALITY GUARDIAN — brand sweep: cancel hard violations, FIX fixable text
// ============================================================
async function runQualityGuardian(): Promise<Record<string, unknown>> {
  const since24 = new Date(Date.now() - 24 * 3600000).toISOString()
  let fixed = 0, flagged = 0
  const { data: contents } = await sb().from('content_calendar').select('id, title, body, cta').in('status', ['drafted', 'scheduled']).gte('created_at', since24).limit(50)
  for (const c of (contents || []) as Array<{ id: string; title: string; body: string; cta: string }>) {
    const full = [c.title, c.body, c.cta].join(' ')
    const hard = HARD_VIOLATIONS.find(([re]) => re.test(full))
    if (hard) {
      await sb().from('content_calendar').update({ status: 'rejected', metadata: { qc_rejected: hard[1], qc_at: new Date().toISOString() } }).eq('id', c.id)
      await insight('quality-guardian', 'violation', `محتوى مرفوض: ${hard[1]}`, (c.title || '').slice(0, 150), 'high', { content_id: c.id, code: hard[1] })
      flagged++
    } else if (FIXABLE_RE.test(full)) {
      await sb().from('content_calendar').update({ title: enforceBrand(c.title), body: enforceBrand(c.body), cta: enforceBrand(c.cta) }).eq('id', c.id)
      fixed++
    }
  }
  const { data: pend } = await sb().from('whatsapp_outbound_queue').select('id, message').eq('status', 'pending').limit(50)
  for (const m of (pend || []) as Array<{ id: string; message: string }>) {
    const txt = m.message || ''
    const hard = HARD_VIOLATIONS.find(([re]) => re.test(txt))
    if (hard) {
      await sb().from('whatsapp_outbound_queue').update({ status: 'cancelled', metadata: { qc_cancelled: hard[1] } }).eq('id', m.id)
      await insight('quality-guardian', 'violation', `رسالة ملغية من الطابور: ${hard[1]}`, txt.slice(0, 120), 'high', { queue_id: m.id, code: hard[1] })
      flagged++
    } else if (FIXABLE_RE.test(txt)) {
      await sb().from('whatsapp_outbound_queue').update({ message: enforceBrand(txt) }).eq('id', m.id)
      fixed++
    }
  }
  return { fixed, flagged }
}

// ============================================================
const RUNNERS: Record<string, (payload: Record<string, unknown>) => Promise<Record<string, unknown>>> = {
  'marid-campaign-manager': () => runMaridCampaignManager(),
  'sales-engine': () => runSalesEngine(),
  'customer-concierge': (p) => runCustomerConcierge(p),
  'operations-sentinel': () => runOperationsSentinel(),
  'intelligence-analyst': () => runIntelligenceAnalyst(),
  'quality-guardian': () => runQualityGuardian(),
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  const t0 = Date.now()
  let agentName = 'unknown'
  try {
    let body: { agent?: string; agent_name?: string; payload?: Record<string, unknown> } = {}
    try { body = await req.json() } catch { /* default */ }
    agentName = body.agent || body.agent_name || ''
    if (!agentName || !RUNNERS[agentName]) {
      return new Response(JSON.stringify({ ok: false, error: 'Specify { agent }', available: Object.keys(RUNNERS) }), { status: 400, headers: { 'Content-Type': 'application/json', ...CORS } })
    }
    const output = await RUNNERS[agentName](body.payload || {})
    const ms = Date.now() - t0
    await logRun(agentName, 'success', output, undefined, ms)
    return new Response(JSON.stringify({ ok: true, agent: agentName, output, duration_ms: ms }), { status: 200, headers: { 'Content-Type': 'application/json', ...CORS } })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unknown'
    const ms = Date.now() - t0
    await logRun(agentName, 'error', {}, msg, ms)
    return new Response(JSON.stringify({ ok: false, agent: agentName, error: msg, duration_ms: ms }), { status: 500, headers: { 'Content-Type': 'application/json', ...CORS } })
  }
})
