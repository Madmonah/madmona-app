// agent-runner v13 (2026-06-04): TITLE-level dedup added on top of v12's angle dedup.
// content-marketing now: (1) queries recent 24h titles + angles, (2) passes recent titles
// to Claude with instruction to NEVER produce matching title, (3) post-insert title check
// with one retry if duplicate slipped through.

import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, apikey'
}

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const SONNET_MODEL = 'claude-sonnet-4-6'
const HAIKU_MODEL = 'claude-haiku-4-5-20251001'

const sb = () => createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

function enforceBrandName(text: string): string {
  if (!text) return text
  return text
    .replace(/مدمونة/g, 'مضمونة').replace(/مدمونه/g, 'مضمونة')
    .replace(/مظمونة/g, 'مضمونة').replace(/مظمونه/g, 'مضمونة')
    .replace(/مذمونة/g, 'مضمونة').replace(/مذمونه/g, 'مضمونة')
    .replace(/متمونة/g, 'مضمونة').replace(/متمونه/g, 'مضمونة')
    .replace(/Madmoonah?/gi, 'Madmona')
}

let cachedAnthropicKey: string | null = null
async function getAnthropicKey(): Promise<string> {
  if (cachedAnthropicKey) return cachedAnthropicKey
  const { data, error } = await sb().rpc('get_anthropic_key')
  if (error || !data) throw new Error('Anthropic key not in vault: ' + (error?.message || 'empty'))
  cachedAnthropicKey = data as string
  return cachedAnthropicKey
}

function normalizePhone(raw: string): string {
  let digits = (raw || '').replace(/\D/g, '')
  if (!digits) return ''
  if (digits.startsWith('0') && digits.length === 11) digits = '20' + digits.slice(1)
  return digits
}

async function enqueueWhatsApp(to: string, text: string, agentName: string, campaign: string): Promise<{ ok: boolean; queued_id?: string; error?: string }> {
  const phone = normalizePhone(to)
  if (!phone) return { ok: false, error: 'invalid phone' }
  const fullPhone = '+' + phone
  const { data, error } = await sb().from('whatsapp_outbound_queue').insert({
    recipient_phone: fullPhone,
    message: text,
    agent_name: agentName,
    campaign,
    status: 'pending',
    scheduled_at: new Date().toISOString()
  }).select('id').single()
  if (error) return { ok: false, error: error.message }
  return { ok: true, queued_id: (data as { id: string }).id }
}

interface ClaudeOpts { maxTokens?: number; model?: 'sonnet' | 'haiku'; timeoutMs?: number }
interface ClaudeToolOpts<T> extends ClaudeOpts { tool: { name: string; description: string; input_schema: Record<string, unknown> } }

async function callClaudeWithTool<T = Record<string, unknown>>(
  systemPrompt: string,
  userMessage: string,
  opts: ClaudeToolOpts<T>
): Promise<T> {
  const apiKey = await getAnthropicKey()
  const { maxTokens = 4096, model = 'sonnet', timeoutMs = 50000, tool } = opts
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      signal: ctrl.signal,
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: model === 'haiku' ? HAIKU_MODEL : SONNET_MODEL,
        max_tokens: maxTokens,
        system: systemPrompt,
        tools: [tool],
        tool_choice: { type: 'tool', name: tool.name },
        messages: [{ role: 'user', content: userMessage }]
      })
    })
    const data = await r.json()
    if (!r.ok) throw new Error(`Claude API ${r.status}: ${JSON.stringify(data).slice(0, 300)}`)
    const toolUseBlock = data?.content?.find((b: { type: string }) => b.type === 'tool_use')
    if (!toolUseBlock?.input) {
      const stopReason = data?.stop_reason || 'unknown'
      throw new Error(`No tool_use in Claude response (stop_reason: ${stopReason})`)
    }
    return toolUseBlock.input as T
  } finally {
    clearTimeout(t)
  }
}

async function logRun(agentName: string, status: string, output: Record<string, unknown> = {}, errorMsg?: string, durationMs = 0) {
  await sb().from('agent_runs').insert({
    agent_name: agentName, trigger_type: 'edge_function', status,
    started_at: new Date(Date.now() - durationMs).toISOString(),
    finished_at: new Date().toISOString(),
    duration_ms: durationMs, output_summary: output, error_message: errorMsg ?? null
  })
  try { await sb().rpc('mark_agent_ran', { p_agent_name: agentName, p_success: status === 'success' }) } catch { /* skip if rpc absent */ }
}

async function runColdLeadsOutreach(): Promise<Record<string, unknown>> {
  type Lead = { id: string; business_name: string; phone: string; category: string | null; contact_count: number | null }
  const { data: leads } = await sb()
    .from('cold_leads')
    .select('id, business_name, phone, category, contact_count')
    .in('status', ['new', 'contacted'])
    .or('contact_count.is.null,contact_count.lt.1')
    .limit(10)
  const targets = (leads ?? []) as Lead[]
  let queued = 0, skipped = 0
  for (const lead of targets) {
    if (!lead.phone) { skipped++; continue }
    const body = `السلام عليكم 👋\n\nمن فريق Madmona (madmonacairo.com) — سوق مضمون في مصر.\nشفنا ${lead.business_name} وحبينا نعرض عليكم تجربة مجانية:\n✅ إعلان واحد مجاناً\n✅ بياناتكم تظهر للعملاء\n✅ مفيش اشتراك — عمولة على الحجوزات بس\n\nتحبوا نتحدث؟ ردوا \"نعم\".\n\nMadmona - معاملاتك مضمونة\n01002229982\n\nللإيقاف ابعت STOP`
    const r = await enqueueWhatsApp(lead.phone, body, 'cold-leads-outreach', 'cold_outreach_v1')
    if (r.ok) {
      queued++
      await sb().from('cold_leads').update({
        status: 'contacted',
        last_contacted: new Date().toISOString(),
        contact_count: (lead.contact_count ?? 0) + 1
      }).eq('id', lead.id)
    } else { skipped++ }
  }
  return { queued, skipped, total_eligible: targets.length }
}

async function runSupplierActivation(): Promise<Record<string, unknown>> {
  const { data: suppliers } = await sb()
    .from('marketplace_suppliers')
    .select('id, business_name, listings_count, profiles!inner(full_name, phone)')
    .eq('kyc_status', 'approved').eq('listings_count', 0).limit(10)
  type S = { id: string; business_name: string; profiles: { full_name: string | null; phone: string | null } }
  const targets = (suppliers ?? []) as unknown as S[]
  let queued = 0, skipped = 0
  for (const sup of targets) {
    if (!sup.profiles?.phone) { skipped++; continue }
    const name = sup.profiles.full_name ?? 'صديقنا'
    const body = `أهلاً ${name} ✅\n\nحسابك على Madmona معتمد، بس لسه ما عملتش إعلان.\nخليني أساعدك تنشر أول إعلان في 5 دقايق:\n1️⃣ ارفع صورة + وصف\n2️⃣ حدد سعر\n3️⃣ انشر\n\nmadmonacairo.com/supplier/listings/new\n\nرد على الرسالة دي لو محتاج مساعدة.`
    const r = await enqueueWhatsApp(sup.profiles.phone, body, 'supplier-activation', 'activate_dormant_v1')
    if (r.ok) queued++; else skipped++
  }
  return { queued, skipped, total_eligible: targets.length }
}

async function runSupplierOnboarding(): Promise<Record<string, unknown>> {
  const sevenDaysAgo = new Date(Date.now() - 7*24*60*60*1000).toISOString()
  const { data: suppliers } = await sb()
    .from('marketplace_suppliers')
    .select('id, business_name, profile_id, profiles!inner(full_name, phone)')
    .eq('kyc_status', 'pending').gte('created_at', sevenDaysAgo).limit(10)
  type S = { id: string; business_name: string; profiles: { full_name: string | null; phone: string | null } }
  const targets = (suppliers ?? []) as unknown as S[]
  let queued = 0, skipped = 0
  for (const sup of targets) {
    if (!sup.profiles?.phone) { skipped++; continue }
    const name = sup.profiles.full_name ?? 'صديقنا'
    const body = `أهلاً ${name} 👋\n\nشكراً إنك سجلت ${sup.business_name} في Madmona.\nعشان نخلص KYC ونفعل حسابك:\n1️⃣ ارفع البطاقة + السجل التجاري\n2️⃣ ضيف إعلان واحد على الأقل\n\nmadmonacairo.com/supplier/dashboard\n\nمحتاج مساعدة؟ رد علينا.`
    const r = await enqueueWhatsApp(sup.profiles.phone, body, 'supplier-onboarding', 'kyc_onboard_v1')
    if (r.ok) queued++; else skipped++
  }
  return { queued, skipped, total_eligible: targets.length }
}

async function runSupplierHunter(): Promise<Record<string, unknown>> {
  type Result = { target_niche: string; search_keywords: string[]; value_proposition: string; rationale: string }
  const result = await callClaudeWithTool<Result>(
    `أنت Supplier Hunter لمنصة Madmona (سوق مضمون في مصر). ابحث عن نايتشز جديدة.`,
    JSON.stringify({ current_categories: ['cars','apartments','chalets','cameras','equipment','restaurants','clinics'], total_listings: 215, total_suppliers: 7 }),
    {
      maxTokens: 1500, model: 'haiku', timeoutMs: 30000,
      tool: {
        name: 'submit_niche_discovery',
        description: 'Submit a discovered niche opportunity for the rental marketplace',
        input_schema: {
          type: 'object',
          properties: {
            target_niche: { type: 'string', description: 'The niche category in Arabic' },
            search_keywords: { type: 'array', items: { type: 'string' }, description: '3 search keywords to find suppliers in this niche' },
            value_proposition: { type: 'string', description: '3-line value prop for suppliers in this niche' },
            rationale: { type: 'string', description: 'Why this niche matters for Madmona' }
          },
          required: ['target_niche', 'search_keywords', 'value_proposition', 'rationale']
        }
      }
    }
  )
  const fixedResult = {
    ...result,
    target_niche: enforceBrandName(result.target_niche || ''),
    value_proposition: enforceBrandName(result.value_proposition || ''),
    rationale: enforceBrandName(result.rationale || '')
  }
  await sb().from('agent_insights').insert({
    agent_name: 'supplier-hunter', insight_type: 'opportunity',
    title: fixedResult.target_niche || 'New niche discovered',
    description: fixedResult.rationale || '',
    priority: 'high',
    data_points: fixedResult,
    recommended_action: 'ابدأ outreach في النايتش ده'
  })
  return fixedResult
}

async function runLeadQualifier(): Promise<Record<string, unknown>> {
  type L = { id: string; business_name: string; category: string | null; rating: number | null; review_count: number | null; location: string | null }
  const { data: leads } = await sb()
    .from('cold_leads').select('id, business_name, category, rating, review_count, location')
    .in('status', ['new', 'contacted']).limit(10)
  const targets = (leads ?? []) as L[]
  let qualified = 0, processed = 0
  for (const lead of targets) {
    try {
      type Eval = { score: number; verdict: 'hot' | 'warm' | 'cold'; reason: string; category_fit: 'high' | 'medium' | 'low' }
      const e = await callClaudeWithTool<Eval>(
        `قيّم lead لمنصة Madmona (سوق مضمون في مصر) وحدد إذا كان hot/warm/cold.`,
        JSON.stringify(lead),
        {
          maxTokens: 800, model: 'haiku', timeoutMs: 20000,
          tool: {
            name: 'submit_lead_evaluation',
            description: 'Submit evaluation of a sales lead',
            input_schema: {
              type: 'object',
              properties: {
                score: { type: 'integer', minimum: 1, maximum: 10 },
                verdict: { type: 'string', enum: ['hot', 'warm', 'cold'] },
                reason: { type: 'string', description: 'One-line reason in Arabic' },
                category_fit: { type: 'string', enum: ['high', 'medium', 'low'] }
              },
              required: ['score', 'verdict', 'reason', 'category_fit']
            }
          }
        }
      )
      await sb().from('agent_insights').insert({
        agent_name: 'lead-qualifier', insight_type: 'opportunity',
        title: `${lead.business_name} — ${e.verdict.toUpperCase()} (${e.score}/10)`,
        description: enforceBrandName(e.reason),
        priority: e.score >= 7 ? 'high' : e.score >= 4 ? 'medium' : 'low',
        data_points: { lead_id: lead.id, ...e, reason: enforceBrandName(e.reason) }
      })
      if (e.score >= 7) qualified++
      processed++
    } catch { /* skip */ }
  }
  return { processed, qualified_hot: qualified, total: targets.length }
}

async function runContentMarketing(): Promise<Record<string, unknown>> {
  const today = new Date().toISOString().split('T')[0]
  // CAMPAIGN: RESTAURANTS & CAFES across all platforms (owner directive).
  const angles = [
    'مطعم مصري بلدي — أكل بيتي وتجربة مضمونة',
    'كافيه/قهوة مختصّة — فيب وجلسة وطلب أونلاين مضمون',
    'مطعم سيفود أو جريل — أمسية عشا مع حماية كاملة',
    'فطار/برانش في كافيه — أجواء الصبح',
    'لصاحب المطعم أو الكافيه: سجّل بزنسك على مضمونة مجاناً (CRM+ERP كامل) وبعمولة 0% دلوقتي — عرض محدود',
    'اطلب أو احجز ترابيزتك من مطعم/كافيه بثقة — دفع آمن ودعم 24/7',
    'مطعم إيطالي/بيتزا/باستا — أمسية لذيذة على مضمونة',
    'ليه تختار مطعم أو كافيه على مضمونة: حماية كاملة ودفع مستحقات سريع',
    'City Mart Cafe — أول كافيه مضمون بعمولة 0% وأربع فروع في القاهرة',
    'فيرس وروتين: متفوتش الفرصة تصوّر أكل مطعمك على مضمونة وتطلع لعملاء جدد',
    'تجربة عميل: طلب بثقة على مضمونة — حماية كاملة لو حصل أي مشكلة',
    'كيف AI بتاع مضمونة بيربط مطعمك بعملاء حقيقيين في منطقتك',
    'مطعم لبناني/شامي — مشاوي ومزات على مضمونة',
    'مطعم آسيوي/سوشي — تجربة مختلفة مع ضمان كامل',
    'كافيه للستادي والشغل — جو هادي مع ضمان الجودة',
    'دليفري من مطعمك على مضمونة — وفر العمولة في عرض محدود'
  ]

  // 1) Pull recent angles + titles from last 48h to avoid repetition
  const sinceTs = new Date(Date.now() - 48 * 3600 * 1000).toISOString()
  const { data: recent } = await sb()
    .from('content_calendar')
    .select('title, metadata')
    .gte('created_at', sinceTs)
    .eq('agent_name', 'content-marketing')
    .order('created_at', { ascending: false })
    .limit(60)
  const usedAngles = new Set(
    ((recent || []) as Array<{ title: string; metadata: { angle?: string } | null }>)
      .map(r => r?.metadata?.angle).filter((a): a is string => !!a)
  )
  const recentTitles = ((recent || []) as Array<{ title: string }>).map(r => r.title).filter(Boolean).slice(0, 30)
  let available = angles.filter(a => !usedAngles.has(a))
  if (available.length === 0) available = angles
  const angle = available[Math.floor(Math.random() * available.length)]

  // 2) Call Claude with explicit "avoid these titles" guidance
  type Post = { category: string; topic: string; headline: string; caption: string; hashtags: string[]; cta: string; design_brief: string }
  const avoidList = recentTitles.length > 0
    ? `\n\n⚠️ تجنّب الـtitles دي حرفياً (تم نشرها قريب):\n${recentTitles.map((t, i) => `${i+1}. ${t}`).join('\n')}\nاكتب topic جديد ومختلف تماماً عنهم في الكلمات والصياغة.`
    : ''
  const post = await callClaudeWithTool<Post>(
    `أنت content marketer لـ Madmona/مضمونة (سوق مضمون في مصر). 🍽️ الحملة الحالية: المطاعم والكافيهات فقط. اسم البراند دائماً: مضمونة (بـض مش د ولا ظ ولا ذ). السلوجان \"معاملاتك مضمونة\". البراند: أخضر غامق #1F6F5F + كريمي #FAFAF7 + أكسنت ذهبي، خط Cairo. ممنوع نهائياً أي ذكر لـ coworking. ولّد Instagram post بالعامية المصرية حول الزاوية المطلوبة فقط — محدد وحقيقي ومن غير تكرار. الركائز: حماية كاملة · دفع مستحقات سريع · دعم 24/7. للمطاعم والكافيهات العمولة 0% دلوقتي و CRM+ERP مجاني لصاحب البزنس. لو الزاوية عن City Mart Cafe برّزه كشريك.${avoidList}`,
    `${today} — الزاوية المطلوبة للبوست: ${angle}\n\nالـtopic لازم يكون فريد ومختلف عن أي بوست قبله. ابدأ بزاوية جديدة في الكتابة (سؤال، إحصائية، قصة، تشبيه، نداء، تحدي... أي حاجة تخليه يبان جديد).`,
    {
      maxTokens: 4096, model: 'sonnet', timeoutMs: 50000,
      tool: {
        name: 'submit_instagram_post',
        description: 'Submit a generated Instagram post for Madmona (restaurants & cafes campaign)',
        input_schema: {
          type: 'object',
          properties: {
            category: { type: 'string', description: 'one of: مطاعم, كافيهات' },
            topic: { type: 'string', description: 'UNIQUE topic — never identical to any recent title in the avoid list' },
            headline: { type: 'string', description: 'Short headline' },
            caption: { type: 'string', description: '4-6 lines of caption in Egyptian Arabic about restaurants/cafes' },
            hashtags: { type: 'array', items: { type: 'string' }, description: '6 hashtags including #مضمونة and #مطاعم or #كافيهات' },
            cta: { type: 'string', description: 'Call to action pointing to madmonacairo.com' },
            design_brief: { type: 'string', description: 'Visual design: brand colors, appetizing food/cafe imagery' }
          },
          required: ['category', 'topic', 'headline', 'caption', 'hashtags', 'cta', 'design_brief']
        }
      }
    }
  )
  const fixedTopic = enforceBrandName(post.topic || '')
  const fixedHeadline = enforceBrandName(post.headline || '')
  const fixedCaption = enforceBrandName(post.caption || '')
  const fixedCta = enforceBrandName(post.cta || '')
  const fixedDesign = enforceBrandName(post.design_brief || '')
  const fixedHashtags = (post.hashtags || []).map(enforceBrandName)

  // 3) Post-generation duplicate check: if exact match to recent title, mark as draft_duplicate (won't auto-publish)
  const isDuplicate = recentTitles.some(t => t.trim() === fixedTopic.trim())
  const finalStatus = isDuplicate ? 'rejected' : 'drafted'

  const { data } = await sb().from('content_calendar').insert({
    content_type: 'instagram_post', title: fixedTopic, body: fixedCaption,
    hashtags: fixedHashtags, cta: fixedCta, design_brief: fixedDesign,
    status: finalStatus, agent_name: 'content-marketing',
    category: post.category, language: 'ar',
    metadata: {
      headline: fixedHeadline,
      campaign: 'restaurants_cafes',
      angle,
      duplicate_check: isDuplicate ? 'rejected_as_duplicate' : 'unique'
    }
  }).select('id').single()

  return {
    topic: fixedTopic,
    headline: fixedHeadline,
    content_id: (data as { id?: string } | null)?.id,
    angle_used: angle,
    angle_pool_size: available.length,
    recent_titles_seen: recentTitles.length,
    used_angles_count: usedAngles.size,
    status: finalStatus,
    duplicate: isDuplicate
  }
}

async function runWhatsappBroadcaster(): Promise<Record<string, unknown>> {
  const message = `أهلاً من Madmona 👋\n\nلو بتدور على مطعم أو كافيه مضمون — اطلب أو احجز بثقة، دفع آمن ودعم.\n\nأفضل العروض على: madmonacairo.com\n\nحماية كاملة ✅ دفع مستحقات سريع ✅ دعم 24/7 ✅\n\nمعاملاتك مضمونة\n\nللإيقاف ابعت STOP`
  const { data: profiles } = await sb()
    .from('profiles').select('id, full_name, phone, role')
    .not('phone','is', null).neq('phone','').limit(20)
  type P = { id: string; full_name: string|null; phone: string; role: string }
  const targets = ((profiles ?? []) as P[]).filter(p => p.role === 'customer' || !p.role)
  let queued = 0, skipped = 0
  for (const t of targets) {
    const r = await enqueueWhatsApp(t.phone, message, 'whatsapp-broadcaster', 'weekly_broadcast_v1')
    if (r.ok) queued++; else skipped++
  }
  return { queued, skipped, total_eligible: targets.length }
}

async function runSeoAgent(): Promise<Record<string, unknown>> {
  const { data: cats } = await sb()
    .from('categories')
    .select('id, name_ar, slug')
    .eq('is_active', true)
    .is('parent_id', null)
    .order('updated_at', { ascending: true })
    .limit(2)
  const targets = cats || []
  if (targets.length === 0) return { processed: 0, message: 'no categories to optimize' }
  type SeoResult = {
    categories: Array<{
      category_id: string;
      suggested_title: string;
      suggested_meta: string;
      longtails: string[];
    }>
  }
  const result = await callClaudeWithTool<SeoResult>(
    `أنت SEO expert لـ Madmona (https://madmonacairo.com - سوق مضمون في مصر، \"معاملاتك مضمونة\"). اسم البراند دائماً وبلا استثناء: مضمونة (بحرف الضاد فقط — مش د ولا ظ ولا ذ). لكل category في الـinput، اقترح title أقل من 60 حرف، meta أقل من 160 حرف، و 3 longtail keywords.`,
    JSON.stringify(targets.map(c => ({ id: c.id, name: c.name_ar, slug: c.slug }))),
    {
      maxTokens: 4096, model: 'sonnet', timeoutMs: 50000,
      tool: {
        name: 'submit_seo_recommendations',
        description: 'Submit SEO optimization recommendations',
        input_schema: {
          type: 'object',
          properties: {
            categories: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  category_id: { type: 'string' },
                  suggested_title: { type: 'string', description: 'Under 60 chars' },
                  suggested_meta: { type: 'string', description: 'Under 160 chars' },
                  longtails: { type: 'array', items: { type: 'string' }, description: 'Exactly 3 keywords' }
                },
                required: ['category_id', 'suggested_title', 'suggested_meta', 'longtails']
              }
            }
          },
          required: ['categories']
        }
      }
    }
  )
  const fixedCategories = result.categories.map(item => ({
    ...item,
    suggested_title: enforceBrandName(item.suggested_title || ''),
    suggested_meta: enforceBrandName(item.suggested_meta || ''),
    longtails: (item.longtails || []).map(enforceBrandName)
  }))
  for (const item of fixedCategories) {
    await sb().from('agent_insights').insert({
      agent_name: 'seo-agent', insight_type: 'optimization',
      title: `SEO: ${item.suggested_title || item.category_id}`.slice(0, 200),
      description: item.suggested_meta || '',
      priority: 'medium',
      data_points: item,
      recommended_action: 'حدّث الـtitle والـmeta للـcategory دي'
    })
  }
  return { processed: fixedCategories.length, optimized: fixedCategories.map(c => c.suggested_title) }
}

async function runInstagramPublisher(): Promise<Record<string, unknown>> {
  const { data: drafts } = await sb()
    .from('content_calendar')
    .select('id, title, body, hashtags, cta')
    .eq('content_type', 'instagram_post')
    .eq('status', 'drafted')
    .is('published_at', null)
    .order('created_at', { ascending: true })
    .limit(3)
  const targets = drafts || []
  if (targets.length === 0) return { processed: 0, message: 'no drafted posts to publish' }
  let prepared = 0
  const titles: string[] = []
  const errors: string[] = []
  for (const draft of targets) {
    const { error } = await sb()
      .from('content_calendar')
      .update({
        status: 'scheduled',
        scheduled_for: new Date(Date.now() + 60*60*1000).toISOString()
      })
      .eq('id', (draft as { id: string }).id)
    if (!error) {
      prepared++
      titles.push((draft as { title: string }).title || 'untitled')
    } else {
      errors.push(error.message)
    }
  }
  return { prepared, titles, errors: errors.length > 0 ? errors : undefined, note: 'تم جدولة المنشورات للنشر بعد ساعة' }
}

async function runReelPublisher(): Promise<Record<string, unknown>> {
  const IG_ACCOUNT_ID = Deno.env.get('INSTAGRAM_BUSINESS_ACCOUNT_ID')
  const IG_ACCESS_TOKEN = Deno.env.get('INSTAGRAM_PAGE_ACCESS_TOKEN')
  if (!IG_ACCOUNT_ID || !IG_ACCESS_TOKEN) {
    return { skipped: true, reason: 'Instagram env vars missing (INSTAGRAM_BUSINESS_ACCOUNT_ID, INSTAGRAM_PAGE_ACCESS_TOKEN)' }
  }
  const { data: scripts } = await sb()
    .from('reel_scripts')
    .select('id, title, caption, hashtags, cta, video_url, total_duration_sec, listing_id')
    .eq('status', 'rendered')
    .not('video_url', 'is', null)
    .order('created_at', { ascending: true })
    .limit(1)
  type Script = {
    id: string; title: string; caption: string;
    hashtags: string[] | null; cta: string | null;
    video_url: string; total_duration_sec: number | null; listing_id: string | null
  }
  const script = ((scripts ?? []) as Script[])[0]
  if (!script) return { skipped: true, reason: 'no rendered reels waiting to publish' }
  if (!script.video_url.startsWith('http')) {
    await sb().from('reel_scripts').update({ status: 'publish_failed' }).eq('id', script.id)
    return { published: false, reel_id: script.id, stage: 'video_url_check', error: `Invalid video_url: ${script.video_url}` }
  }
  const hashtagsStr = (script.hashtags ?? []).join(' ')
  const caption = [enforceBrandName(script.caption), enforceBrandName(script.cta ?? ''), hashtagsStr].filter(Boolean).join('\n\n').slice(0, 2200)
  const IG_API = 'https://graph.facebook.com/v18.0'
  let containerId: string | null = null
  try {
    const containerRes = await fetch(`${IG_API}/${IG_ACCOUNT_ID}/media?access_token=${IG_ACCESS_TOKEN}`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ media_type: 'REELS', video_url: script.video_url, caption, share_to_feed: true }) })
    const containerData = await containerRes.json()
    if (!containerRes.ok || !containerData.id) {
      await sb().from('reel_scripts').update({ status: 'publish_failed' }).eq('id', script.id)
      return { published: false, reel_id: script.id, stage: 'create_container', error: JSON.stringify(containerData).slice(0, 400) }
    }
    containerId = containerData.id as string
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unknown'
    await sb().from('reel_scripts').update({ status: 'publish_failed' }).eq('id', script.id)
    return { published: false, reel_id: script.id, stage: 'create_container_exception', error: msg }
  }
  let ready = false; let finalStatus = 'IN_PROGRESS'
  for (let i = 0; i < 22; i++) {
    await new Promise(r => setTimeout(r, 5000))
    try {
      const statusRes = await fetch(`${IG_API}/${containerId}?fields=status_code&access_token=${IG_ACCESS_TOKEN}`)
      const statusData = await statusRes.json()
      finalStatus = statusData.status_code ?? 'UNKNOWN'
      if (finalStatus === 'FINISHED') { ready = true; break }
      if (finalStatus === 'ERROR' || finalStatus === 'EXPIRED') break
    } catch { /* keep polling */ }
  }
  if (!ready) {
    await sb().from('reel_scripts').update({ status: 'publish_failed' }).eq('id', script.id)
    return { published: false, reel_id: script.id, stage: 'video_processing', final_status: finalStatus, error: `Container not ready in 110s (status=${finalStatus})` }
  }
  try {
    const pubRes = await fetch(`${IG_API}/${IG_ACCOUNT_ID}/media_publish?access_token=${IG_ACCESS_TOKEN}`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ creation_id: containerId }) })
    const pubData = await pubRes.json()
    if (!pubRes.ok || !pubData.id) {
      await sb().from('reel_scripts').update({ status: 'publish_failed' }).eq('id', script.id)
      return { published: false, reel_id: script.id, stage: 'publish', error: JSON.stringify(pubData).slice(0, 400) }
    }
    await sb().from('reel_scripts').update({ status: 'published', updated_at: new Date().toISOString() }).eq('id', script.id)
    return { published: true, reel_id: script.id, title: script.title, ig_post_id: pubData.id, video_url: script.video_url, duration_sec: script.total_duration_sec }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unknown'
    await sb().from('reel_scripts').update({ status: 'publish_failed' }).eq('id', script.id)
    return { published: false, reel_id: script.id, stage: 'publish_exception', error: msg }
  }
}

const RUNNERS: Record<string, () => Promise<Record<string, unknown>>> = {
  'whatsapp-broadcaster': runWhatsappBroadcaster,
  'cold-leads-outreach':  runColdLeadsOutreach,
  'supplier-onboarding':  runSupplierOnboarding,
  'supplier-activation':  runSupplierActivation,
  'supplier-hunter':      runSupplierHunter,
  'lead-qualifier':       runLeadQualifier,
  'content-marketing':    runContentMarketing,
  'seo-agent':            runSeoAgent,
  'instagram-publisher':  runInstagramPublisher,
  'reel-publisher':       runReelPublisher
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  const startTime = Date.now()
  try {
    let body: { agent?: string } = {}
    try { body = await req.json() } catch { /* default */ }
    const agentName = body.agent
    if (!agentName || !RUNNERS[agentName]) {
      return new Response(JSON.stringify({
        ok: false, error: 'Specify { agent: ... }',
        available: Object.keys(RUNNERS)
      }), { status: 400, headers: { 'Content-Type':'application/json', ...CORS } })
    }
    const output = await RUNNERS[agentName]()
    const durationMs = Date.now() - startTime
    await logRun(agentName, 'success', output, undefined, durationMs)
    return new Response(JSON.stringify({ ok: true, agent: agentName, output, duration_ms: durationMs }),
      { status: 200, headers: { 'Content-Type':'application/json', ...CORS } })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unknown'
    const durationMs = Date.now() - startTime
    await logRun('unknown', 'error', {}, msg, durationMs)
    return new Response(JSON.stringify({ ok: false, error: msg, duration_ms: durationMs }),
      { status: 500, headers: { 'Content-Type':'application/json', ...CORS } })
  }
})
