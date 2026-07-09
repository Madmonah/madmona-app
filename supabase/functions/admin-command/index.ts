// admin-command v6 (13 Jun 2026) — MODEL FALLBACK: claude-fable-5 was disabled by
//  a US-government export directive (12 Jun 2026), so admin commands errored. Switched
//  to claude-opus-4-8 (most capable AVAILABLE model). Restore Fable later if it returns.
// v5: DESIGN power + demand matching. v4: full agentic loop.
import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const RELAY_KEY = 'mdmn-probe-8f3a2c91e7d44b06'
const MODEL = 'claude-opus-4-8'
const SITE = 'https://madmonacairo.com'
const sb = () => createClient(SUPABASE_URL, SERVICE_KEY)

const FN_WHITELIST = [
  'metricool-publish', 'reply-sweeper', 'daily-ai-brief', 'system-health-monitor',
  'hot-leads-now', 'bulk-outreach-top-leads', 'drip-campaign-engine', 'ceo-command-center',
  'abandoned-booking-alerter', 'listing-friction-alerter', 'demand-matchmaker', 'generate-post-images'
]

async function getKey(): Promise<string> {
  const { data } = await sb().rpc('get_anthropic_key')
  if (!data) throw new Error('no key')
  return data as string
}

async function getCreds(): Promise<{ phone_id: string; token: string }> {
  const { data } = await sb().from('whatsapp_config').select('key, value').in('key', ['phone_number_id', 'access_token'])
  const m = Object.fromEntries((data || []).map((r: { key: string; value: string }) => [r.key, r.value]))
  return { phone_id: m.phone_number_id, token: m.access_token }
}

async function sendWA(to: string, body: string): Promise<void> {
  const { phone_id, token } = await getCreds()
  const chunks: string[] = []
  let rest = body || ''
  while (rest.length > 0) { chunks.push(rest.slice(0, 3800)); rest = rest.slice(3800) }
  for (const chunk of chunks) {
    await fetch(`https://graph.facebook.com/v21.0/${phone_id}/messages`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ messaging_product: 'whatsapp', recipient_type: 'individual', to, type: 'text', text: { body: chunk, preview_url: false } })
    }).catch(() => {})
  }
}

async function sendWAImage(to: string, imageUrl: string, caption: string): Promise<{ ok: boolean; err?: string }> {
  const { phone_id, token } = await getCreds()
  const r = await fetch(`https://graph.facebook.com/v21.0/${phone_id}/messages`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ messaging_product: 'whatsapp', recipient_type: 'individual', to, type: 'image', image: { link: imageUrl, caption: (caption || '').slice(0, 1000) } })
  })
  if (!r.ok) {
    const d = await r.json().catch(() => ({}))
    return { ok: false, err: d?.error?.message || `HTTP ${r.status}` }
  }
  return { ok: true }
}

async function logMsg(convId: string, body: string): Promise<void> {
  await sb().from('whatsapp_messages').insert({
    conversation_id: convId, direction: 'outbound', body, message_type: 'text',
    status: 'sent', status_updated_at: new Date().toISOString(),
    ai_generated: true, agent_name: 'admin-command'
  }).then(() => {}, () => {})
}

// ---------- TOOL EXECUTORS ----------

async function toolQueryDb(sql: string): Promise<string> {
  const cleaned = (sql || '').trim().replace(/;+\s*$/, '')
  if (!/^(select|with)\b/i.test(cleaned)) return JSON.stringify({ error: 'read-only: لازم SELECT أو WITH بس' })
  if (/;/.test(cleaned)) return JSON.stringify({ error: 'no multiple statements' })
  if (/\b(insert|update|delete|drop|alter|create|grant|revoke|truncate)\b/i.test(cleaned.replace(/'[^']*'/g, ''))) {
    return JSON.stringify({ error: 'read-only — للكتابة استخدم الأدوات المخصصة' })
  }
  const wrapped = `select coalesce(json_agg(t), '[]'::json) as rows from (${cleaned} ${/\blimit\b/i.test(cleaned) ? '' : 'limit 50'}) t`
  const { data, error } = await sb().rpc('exec_admin_readonly_sql', { p_sql: wrapped })
  if (error) return JSON.stringify({ error: error.message.slice(0, 300) })
  const s = JSON.stringify(data)
  return s.length > 5000 ? s.slice(0, 5000) + '…(truncated)' : s
}

async function toolRunAgent(agent: string): Promise<string> {
  const r = await fetch(`${SUPABASE_URL}/functions/v1/unified-agents`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${SERVICE_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ agent })
  })
  const data = await r.json().catch(() => ({}))
  const s = JSON.stringify(data)
  return s.length > 4000 ? s.slice(0, 4000) + '…' : s
}

async function toolPublishNow(): Promise<string> {
  const r = await fetch(`${SUPABASE_URL}/functions/v1/metricool-publish`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${SERVICE_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'publish' })
  })
  const data = await r.json().catch(() => ({}))
  const results = Array.isArray(data?.results) ? data.results : []
  const okCount = results.filter((x: any) => x.ok).length
  const failed = results.filter((x: any) => !x.ok).map((x: any) => String(x.error || '').slice(0, 100))
  const { count: pendingQc } = await sb().from('content_calendar').select('id', { count: 'exact', head: true }).eq('status', 'pending_review')
  return JSON.stringify({ published: okCount, failed, pending_qc: pendingQc ?? 0 })
}

async function toolCallFunction(name: string, payload: Record<string, unknown> | undefined): Promise<string> {
  if (!FN_WHITELIST.includes(name)) return JSON.stringify({ error: `function مش مسموحة. المتاح: ${FN_WHITELIST.join(', ')}` })
  const r = await fetch(`${SUPABASE_URL}/functions/v1/${name}`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${SERVICE_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload || {})
  })
  const data = await r.json().catch(() => ({ status: r.status }))
  const s = JSON.stringify(data)
  return s.length > 4000 ? s.slice(0, 4000) + '…' : s
}

async function toolQcDecision(kind: string, id: string, decision: string, reason?: string): Promise<string> {
  if (decision === 'approve') {
    const { data, error } = await sb().rpc('qc_approve', { p_kind: kind, p_id: id })
    return JSON.stringify(error ? { error: error.message } : { ok: true, data })
  }
  const { data, error } = await sb().rpc('qc_reject', { p_kind: kind, p_id: id, p_reason: reason || 'admin rejected via WhatsApp' })
  return JSON.stringify(error ? { error: error.message } : { ok: true, data })
}

async function toolCreatePost(topic: string, instructions?: string): Promise<string> {
  const apiKey = await getKey()
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: MODEL, max_tokens: 1500,
      system: 'إنت content marketer لمنصة مضمونة (بالضاد دايماً). السلوجان «معاملاتك مضمونة». ممنوع: 2019، أكبر منصة، أجر معانا (الصح: ضيف المنتج)، coworking، أي لينك wa.me. اللينك الوحيد المسموح madmonacairo.com. عامية مصرية. ولّد بوست Instagram عن الموضوع المطلوب.',
      tools: [{
        name: 'submit_post', description: 'post',
        input_schema: { type: 'object', properties: { title: { type: 'string' }, body: { type: 'string' }, hashtags: { type: 'array', items: { type: 'string' } }, cta: { type: 'string' }, design_brief: { type: 'string' } }, required: ['title', 'body', 'hashtags', 'cta', 'design_brief'] }
      }],
      tool_choice: { type: 'tool', name: 'submit_post' },
      messages: [{ role: 'user', content: `الموضوع: ${topic}${instructions ? '\nتعليمات إضافية من محمد: ' + instructions : ''}` }]
    })
  })
  const data = await r.json()
  const block = data?.content?.find((b: { type: string }) => b.type === 'tool_use')
  if (!block?.input) return JSON.stringify({ error: 'post generation failed' })
  const p = block.input as { title: string; body: string; hashtags: string[]; cta: string; design_brief: string }
  const { data: ins, error } = await sb().from('content_calendar').insert({
    content_type: 'instagram_post', title: p.title, body: p.body, hashtags: p.hashtags,
    cta: p.cta, design_brief: p.design_brief, status: 'drafted',
    agent_name: 'admin-command', category: 'admin_requested', language: 'ar',
    metadata: { requested_by: 'mohamed_whatsapp', topic }
  }).select('id').single()
  return JSON.stringify(error ? { error: error.message } : { ok: true, id: (ins as any)?.id, title: p.title })
}

async function toolCreateDesign(adminPhone: string, headline: string, subtext?: string, cta?: string, style?: string, format?: string): Promise<string> {
  const r = await fetch(`${SUPABASE_URL}/functions/v1/design-studio`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${SERVICE_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ headline, subtext: subtext || '', cta: cta || '', style: style || 'dark', format: format || 'post' })
  })
  const data = await r.json().catch(() => ({}))
  if (!data?.ok || !data?.png_url) return JSON.stringify({ error: data?.error || 'design failed' })
  // ابعت التصميم فوراً كصورة على واتساب محمد
  const sent = await sendWAImage(adminPhone, data.png_url, `🎨 ${headline}`)
  return JSON.stringify({ ok: true, png_url: data.png_url, sent_as_image: sent.ok, send_error: sent.err || null })
}

async function toolSendWhatsapp(phone: string, message: string): Promise<string> {
  const digits = (phone || '').replace(/\D/g, '')
  if (digits.length < 10) return JSON.stringify({ error: 'رقم مش مفهوم' })
  if (digits.endsWith('1002229982')) return JSON.stringify({ error: 'ده رقم الـ WABA نفسه — self-send مستحيل (Meta #100)' })
  await sendWA(digits, message)
  await sb().from('whatsapp_outbound_queue').insert({
    recipient_phone: '+' + digits, recipient_name: 'admin-directed', message,
    campaign: 'admin_direct', agent_name: 'admin-command', status: 'sent',
    metadata: { sent_by: 'mohamed_whatsapp_command', sent_at: new Date().toISOString() }
  }).then(() => {}, () => {})
  return JSON.stringify({ ok: true, to: '+' + digits })
}

async function toolSetConfig(key: string, value: string): Promise<string> {
  const ALLOWED_PREFIXES = ['commission_line', 'admin_alert', 'brand_', 'outreach_', 'concierge_']
  if (!ALLOWED_PREFIXES.some(p => key.startsWith(p))) {
    return JSON.stringify({ error: `مفاتيح مسموحة بس: ${ALLOWED_PREFIXES.join('*, ')}* — للحماية` })
  }
  const { error } = await sb().from('whatsapp_config').upsert({ key, value }, { onConflict: 'key' })
  return JSON.stringify(error ? { error: error.message } : { ok: true, key, value })
}

// ---------- AGENTIC LOOP ----------

async function runAdminAgent(text: string, history: string, adminPhone: string): Promise<string> {
  const apiKey = await getKey()
  const { data: agents } = await sb().from('agent_registry')
    .select('agent_name, team, description').eq('enabled', true)
  const agentCatalog = ((agents || []) as Array<any>)
    .map(a => `• ${a.agent_name} (${a.team}): ${(a.description || '').slice(0, 90)}`).join('\n')

  const system = `إنت المساعد التنفيذي بتاع محمد — مالك منصة مضمونة (${SITE}) — على قناة الواتساب الإدارية.
محمد هو الأدمن الوحيد وصاحب الصلاحية الكاملة. مهمتك: تفهم أي أمر مهما كانت صياغته، تنفذه بسرعة، وترد بعامية مصرية مختصرة.

🛠️ أدواتك:
1) query_db — أي سؤال عن الداتا (SELECT فقط). أهم الجداول: listings · marketplace_bookings · marketplace_orders+items · sales_leads · whatsapp_conversations+messages · customer_demand_requests (طلبات مش متوفرة: status new/matching/no_match) · cold_leads (الكولد ليدز) · job_applications · content_calendar · suppliers+marketplace_suppliers+supplier_branches · business_employees · attendance/hr_infractions · agent_runs+agent_registry · claim_outreach_log · categories · v_pending_approvals.
2) run_agent — تشغيل أي agent:\n${agentCatalog}
3) publish_now — نشر كل البوستات المعتمدة فوراً على كل المنصات.
4) create_post — كتابة بوست جديد (بيدخل مراجعة الجودة).
5) create_design — 🎨 لما محمد يقول «صمم» أو يطلب تصميم/صورة/بوستر: بيعمل تصميم براند فوري (headline + subtext + cta، style: dark/light، format: post/square/story) وبيتبعت كصورة على واتسابه على طول. لو طلب تعديل (غير اللون، كبّر العنوان، خليه ستوري) — اعمل نسخة جديدة بالتعديل وابعتها تاني فوراً. خليك سريع — نفذ الأول وبعدين اسأل لو محتاج.
6) qc_decision — اعتماد/رفض محتوى معلّق (هات الـ id من v_pending_approvals الأول).
7) call_function — وظايف: reply-sweeper · daily-ai-brief · system-health-monitor · hot-leads-now · bulk-outreach-top-leads · drip-campaign-engine · ceo-command-center · abandoned-booking-alerter · listing-friction-alerter · demand-matchmaker (🎯 مطابقة طلبات العملاء الغير متوفرة مع الكولد ليدز وموردين كلمناهم قبل كده — شغال أوتوماتيك كل 15 دقيقة وتقدر تشغله فوراً) · generate-post-images.
8) send_whatsapp — إرسال رسالة لأي رقم.
9) set_config — تعديل إعدادات محددة.

📌 ثوابت البراند (في أي محتوى/تصميم/رسالة): مضمونة بالضاد · «معاملاتك مضمونة» · اتلانشت مايو 2026 (ممنوع 2019) · «ضيف المنتج» · ممنوع coworking و wa.me · العمولة: 10٪ موحدة على الكل / مطاعم مجاناً لفترة محدودة / أمانة: بيع عربيات/عقارات 2٪+1٪، إيجار طويل = شهر + نص شهر.

📋 قواعد: افهم القصد مش الحروف · نفذ الأول لو فيه تفسير معقول (محمد بيحب التنفيذ مش الأسئلة) · الأوامر المركبة خطوة خطوة · «مساعدة» = اعرض قدراتك بأمثلة · الرد النهائي مختصر بأرقام واضحة + اقتراح الخطوة التالية في سطر.

=== آخر رسايل القناة الإدارية (عشان «كمل» و«نفذ» و«عدّل» يتفهموا) ===
${history}
=== نهاية السياق ===`

  const tools = [
    { name: 'query_db', description: 'Run a read-only SELECT/WITH SQL query. Auto-limited to 50 rows.', input_schema: { type: 'object', properties: { sql: { type: 'string' } }, required: ['sql'] } },
    { name: 'run_agent', description: 'Run one of the enabled AI agents by name.', input_schema: { type: 'object', properties: { agent: { type: 'string' } }, required: ['agent'] } },
    { name: 'publish_now', description: 'Push all approved posts to Metricool for immediate publish.', input_schema: { type: 'object', properties: {} } },
    { name: 'create_post', description: 'Generate and save a new Instagram post about a topic (goes through QC).', input_schema: { type: 'object', properties: { topic: { type: 'string' }, instructions: { type: 'string' } }, required: ['topic'] } },
    { name: 'create_design', description: 'Generate a Madmona-branded design and send it to Mohamed on WhatsApp as an image immediately. Use for صمم/تصميم/بوستر/صورة requests and for revisions.', input_schema: { type: 'object', properties: { headline: { type: 'string', description: 'العنوان الرئيسي بالعربي' }, subtext: { type: 'string', description: 'سطور تفصيلية قصيرة' }, cta: { type: 'string', description: 'نص زر الـ CTA — الافتراضي ضيف المنتج دلوقتي' }, style: { type: 'string', enum: ['dark', 'light'] }, format: { type: 'string', enum: ['post', 'square', 'story'] } }, required: ['headline'] } },
    { name: 'qc_decision', description: 'Approve or reject a pending content item. Get id+kind from v_pending_approvals first.', input_schema: { type: 'object', properties: { kind: { type: 'string', enum: ['post', 'wa'] }, id: { type: 'string' }, decision: { type: 'string', enum: ['approve', 'reject'] }, reason: { type: 'string' } }, required: ['kind', 'id', 'decision'] } },
    { name: 'call_function', description: `Invoke a whitelisted edge function: ${FN_WHITELIST.join(', ')}`, input_schema: { type: 'object', properties: { name: { type: 'string' }, payload: { type: 'object' } }, required: ['name'] } },
    { name: 'send_whatsapp', description: 'Send a WhatsApp text message to a specific phone number on behalf of Mohamed.', input_schema: { type: 'object', properties: { phone: { type: 'string' }, message: { type: 'string' } }, required: ['phone', 'message'] } },
    { name: 'set_config', description: 'Update an allowed whatsapp_config key (commission_line*, admin_alert*, brand_*, outreach_*, concierge_*).', input_schema: { type: 'object', properties: { key: { type: 'string' }, value: { type: 'string' } }, required: ['key', 'value'] } },
  ]

  const apiMessages: Array<Record<string, unknown>> = [{ role: 'user', content: text }]
  for (let round = 0; round < 6; round++) {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: MODEL, max_tokens: 1800, system, tools, messages: apiMessages })
    })
    const data = await r.json()
    if (!r.ok) throw new Error(JSON.stringify(data).slice(0, 250))
    const content = data?.content || []
    const toolUses = content.filter((b: any) => b.type === 'tool_use')
    if (toolUses.length === 0 || data?.stop_reason !== 'tool_use') {
      const finalText = content.filter((b: any) => b.type === 'text').map((b: any) => b.text).join('\n').trim()
      return finalText || 'خلص ✅'
    }
    apiMessages.push({ role: 'assistant', content })
    const results: Array<Record<string, unknown>> = []
    for (const tu of toolUses) {
      let out = ''
      try {
        const inp = tu.input || {}
        switch (tu.name) {
          case 'query_db': out = await toolQueryDb(String(inp.sql || '')); break
          case 'run_agent': out = await toolRunAgent(String(inp.agent || '')); break
          case 'publish_now': out = await toolPublishNow(); break
          case 'create_post': out = await toolCreatePost(String(inp.topic || ''), inp.instructions ? String(inp.instructions) : undefined); break
          case 'create_design': out = await toolCreateDesign(adminPhone, String(inp.headline || ''), inp.subtext ? String(inp.subtext) : undefined, inp.cta ? String(inp.cta) : undefined, inp.style ? String(inp.style) : undefined, inp.format ? String(inp.format) : undefined); break
          case 'qc_decision': out = await toolQcDecision(String(inp.kind), String(inp.id), String(inp.decision), inp.reason ? String(inp.reason) : undefined); break
          case 'call_function': out = await toolCallFunction(String(inp.name || ''), inp.payload as Record<string, unknown> | undefined); break
          case 'send_whatsapp': out = await toolSendWhatsapp(String(inp.phone || ''), String(inp.message || '')); break
          case 'set_config': out = await toolSetConfig(String(inp.key || ''), String(inp.value || '')); break
          default: out = JSON.stringify({ error: 'unknown tool' })
        }
      } catch (e) { out = JSON.stringify({ error: String(e).slice(0, 200) }) }
      results.push({ type: 'tool_result', tool_use_id: tu.id, content: out })
    }
    apiMessages.push({ role: 'user', content: results })
  }
  return 'نفذت جزء كبير من الطلب بس الموضوع طويل — ابعتلي «كمل» وأكمل من مكاني ✅'
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('POST only', { status: 405 })
  if (req.headers.get('x-relay-key') !== RELAY_KEY) return new Response('forbidden', { status: 403 })
  const { phone, conversation_id, text } = await req.json().catch(() => ({}))
  if (!phone || !text) return new Response(JSON.stringify({ ok: false, error: 'phone+text required' }), { status: 400 })

  // ==== سوّق واكسب: اعتماد/رفض إثبات الشير — حتمي 100% (فلوس = مفيش AI) ====
  const shareCmd = String(text).trim().match(/^(اعتماد|قبول|رفض)\s+شير\s+(.+)$/)
  if (shareCmd) {
    try {
      const verdict = shareCmd[1]
      const target = shareCmd[2].trim()
      const digits = target.replace(/\D/g, '')
      const tail = digits.slice(-10)
      const { data: refs } = tail.length >= 9
        ? await sb().from('referrals').select('*').eq('status', 'share_submitted').like('referred_phone', `%${tail}`).order('created_at', { ascending: true }).limit(1)
        : await sb().from('referrals').select('*').eq('status', 'share_submitted').ilike('code', target).order('created_at', { ascending: true }).limit(1)
      const ref = (refs || [])[0] as Record<string, any> | undefined
      if (!ref) { await sendWA(String(phone), 'مفيش إثبات شير معلّق للرقم/الكود ده 🤷\nصيغة الأمر: اعتماد شير 01xxxxxxxxx'); return new Response(JSON.stringify({ ok: true })) }
      if (verdict === 'رفض') {
        await sb().from('referrals').update({ status: 'rejected', notes: 'إثبات الشير مرفوض من الأدمن' }).eq('id', ref.id)
        await sendWA(String(phone), `تم الرفض ❌ — إحالة ${ref.referred_phone || ref.code} اتقفلت.`)
        return new Response(JSON.stringify({ ok: true }))
      }
      // اعتماد: نرجّعها pending → نأهلها بالمنطق الرسمي → نصرف المكافأة
      await sb().from('referrals').update({ status: 'pending' }).eq('id', ref.id)
      const { data: q } = await sb().rpc('referral_qualify', { p_referred_phone: ref.referred_phone, p_kind: ref.referral_kind || 'customer', p_event: 'share_approved' })
      const qq = q as Record<string, any> | null
      if (!qq?.ok) { await sendWA(String(phone), `معرفتش أأهّل الإحالة ⚠️ ${JSON.stringify(qq).slice(0, 120)}`); return new Response(JSON.stringify({ ok: true })) }
      const { data: rw } = await sb().rpc('referral_reward', { p_referral_id: qq.referral_id })
      const rr = rw as Record<string, any> | null
      if (!rr?.ok) { await sendWA(String(phone), `الإحالة اتأهلت بس المكافأة وقفت ⚠️ ${JSON.stringify(rr).slice(0, 120)}`); return new Response(JSON.stringify({ ok: true })) }
      // بلّغ المُحيل عبر الطابور (لو جلسته مقفولة هتتأجل — عادي)
      if (ref.referrer_phone) {
        await sb().from('whatsapp_outbound_queue').insert({
          recipient_phone: ref.referrer_phone.startsWith('+') ? ref.referrer_phone : '+' + ref.referrer_phone.replace(/\D/g, ''),
          recipient_name: 'مسوّق مضمونة', status: 'pending', agent_name: 'referral-program', campaign: 'referral_reward_notice',
          message: `مبروك! 🎉 مكافأة «سوّق واكسب» نزلت في محفظتك: +${rr.amount} جنيه رصيد.\nاستخدمه كخصم على طلباتك في مضمونة (بحد أقصى عمولة مضمونة في الطلب).\nكمّل تسويق واكسب أكتر 💪\n— مضمونة · معاملاتك مضمونة 💚`,
          metadata: { referral_id: ref.id }
        })
      }
      await sendWA(String(phone), `تم الاعتماد ✅\n+${rr.amount} ج نزلت لمحفظة المُحيل (${ref.referrer_phone || ref.code}).\nالإحالة: ${ref.referred_name || ref.referred_phone}`)
      return new Response(JSON.stringify({ ok: true }))
    } catch (e) {
      await sendWA(String(phone), `خطأ في أمر الشير ⚠️ ${String(e).slice(0, 120)}`)
      return new Response(JSON.stringify({ ok: false }))
    }
  }
  try {
    let history = ''
    if (conversation_id) {
      const { data: hist } = await sb().from('whatsapp_messages')
        .select('direction, body, agent_name, created_at')
        .eq('conversation_id', String(conversation_id))
        .order('created_at', { ascending: false }).limit(12)
      history = (((hist || []) as Array<any>).reverse())
        .map(r => `${r.direction === 'inbound' ? 'محمد' : 'المساعد'}: ${(r.body || '').slice(0, 250)}`).join('\n')
    }
    await sendWA(String(phone), '📩 استلمت — شغال عليه دلوقتي...')
    const result = await runAdminAgent(String(text), history, String(phone))
    await sendWA(String(phone), result)
    if (conversation_id) await logMsg(String(conversation_id), result)
    return new Response(JSON.stringify({ ok: true }), { headers: { 'Content-Type': 'application/json' } })
  } catch (e) {
    const msg = `معرفتش أنفذ الأمر ⚠️ — جرب تاني أو اكتبه بشكل تاني.\n(${String(e).slice(0, 100)})`
    await sendWA(String(phone), msg).catch(() => {})
    return new Response(JSON.stringify({ ok: false, error: String(e).slice(0, 200) }), { status: 500, headers: { 'Content-Type': 'application/json' } })
  }
})
