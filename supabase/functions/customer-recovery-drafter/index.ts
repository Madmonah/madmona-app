// customer-recovery-drafter — for high-intent visitors with a known phone,
// generates a personalized AI recovery message draft and surfaces it as an
// admin_alert with a one-click WhatsApp link.
import { createClient } from 'jsr:@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const AGENT_SECRET = Deno.env.get('AGENT_SECRET') || 'c9aade438b57204664c496dcd43ab8a640af5061273abc6591522bf96065d0c7'
const CLAUDE_MODEL = 'claude-sonnet-4-6'

Deno.serve(async (req) => {
  const auth = req.headers.get('authorization') || ''
  const agentSecret = req.headers.get('x-agent-secret') || ''
  const vercelCron = req.headers.get('x-vercel-cron')
  const isAuthorized = vercelCron === '1' || agentSecret === AGENT_SECRET || auth.includes(AGENT_SECRET) || auth.includes(SUPABASE_SERVICE_ROLE_KEY)
  if (!isAuthorized) return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401 })

  const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

  // 1. Find high-intent visitors (score >= 60) seen in last 72h, then enrich with phone if available
  const { data: visitors } = await sb
    .from('visitor_intelligence')
    .select('visitor_id, intent_score, behavior_pattern, unique_listings_viewed, booking_attempts, sessions, last_seen, from_paid_ad, from_facebook')
    .gte('intent_score', 60)
    .gte('last_seen', new Date(Date.now() - 72 * 3600 * 1000).toISOString())
    .order('intent_score', { ascending: false })
    .limit(15)

  if (!visitors || visitors.length === 0) {
    return new Response(JSON.stringify({ ok: true, drafted: 0, message: 'no_high_intent_visitors' }), {
      headers: { 'Content-Type': 'application/json' }
    })
  }

  // 2. Resolve phone for each visitor via signup events
  const enriched: Array<Record<string, unknown>> = []
  for (const v of visitors as Array<Record<string, unknown>>) {
    const { data: signup } = await sb
      .from('site_events').select('page_url').eq('visitor_id', v.visitor_id)
      .like('page_url', '%phone=%').limit(1).maybeSingle()

    let phone: string | null = null
    if (signup) {
      const m = ((signup as { page_url: string }).page_url || '').match(/phone=([^&]+)/)
      if (m) phone = decodeURIComponent(m[1])
    }
    if (!phone) continue  // skip unreachable visitors

    const { data: profile } = await sb
      .from('profiles').select('id, full_name, phone, role').eq('phone', phone).maybeSingle()

    // Get the listings they attempted
    const { data: bookingEvents } = await sb
      .from('site_events').select('page_url').eq('visitor_id', v.visitor_id)
      .ilike('page_url', '%/marketplace/listing-%/book').limit(10)

    const attemptedSlugs = ((bookingEvents as Array<{ page_url: string }>) || [])
      .map(b => {
        const m = b.page_url.match(/\/marketplace\/(listing-[a-z0-9-]+)\/book/)
        return m ? m[1] : null
      }).filter(Boolean) as string[]
    const uniqueSlugs = [...new Set(attemptedSlugs)]

    // Look up the actual listing titles
    const { data: listings } = uniqueSlugs.length > 0 ? await sb
      .from('listings').select('slug, title, supplier:marketplace_suppliers(business_name)').in('slug', uniqueSlugs)
      : { data: [] }

    enriched.push({
      ...v, phone, profile, attempted_listings: listings || []
    })
  }

  if (enriched.length === 0) {
    return new Response(JSON.stringify({ ok: true, drafted: 0, message: 'no_reachable_visitors' }), {
      headers: { 'Content-Type': 'application/json' }
    })
  }

  // 3. Get the Anthropic API key for AI drafting
  const { data: apiKey } = await sb.rpc('get_anthropic_key')
  if (!apiKey) return new Response(JSON.stringify({ error: 'no_api_key' }), { status: 500 })

  // 4. Generate one personalized message per visitor
  const drafted: Array<Record<string, unknown>> = []
  for (const v of enriched) {
    const profile = v.profile as { full_name?: string; role?: string } | null
    const listings = v.attempted_listings as Array<{ title: string; slug: string }>
    const name = profile?.full_name || ''
    const listingTitles = listings.map(l => l.title).join('، ')

    const system = `أنت copywriter مصري لـ مضمونة. تصيغ رسالة واتساب مختصرة (تحت 350 char) بالعامية المصرية لإسترداد عميل حاول يحجز وفشل.

الأسلوب: ودي · مباشر · غير مبالغ · احترافي
لازم تعترف بالخطأ، تديه سبب للجدية، تعرض مساعدة فورية.
الحل مفتوح: إما محمد بـ manual booking أو مساعدته يكمل online.

Reply with JSON only: { "message": "...", "reason": "ليه اخترت الأسلوب ده في سطر" }`

    const userMsg = `عميل حاول يحجز وفشل:
- الاسم: ${name || 'غير معروف'}
- intent_score: ${v.intent_score}/100
- عدد محاولات الحجز: ${v.booking_attempts}
- عدد الـ listings اللي شافها: ${v.unique_listings_viewed}
- الـ listings اللي جرب يحجزها: ${listingTitles || 'غير معروف'}
- الدور في النظام: ${profile?.role || 'visitor'}

السبب الفعلي للفشل: كان في bug في صفحة الحجز (زر التأكيد كان disabled بدون إعلام). الباغ تم إصلاحه دلوقتي.

صيغ رسالة واتساب تجبر الخاطر وتعرض عليه تكملة الحجز.`

    let messageText = ''
    let reasoning = ''
    try {
      const r = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'x-api-key': apiKey as string, 'anthropic-version': '2023-06-01', 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: CLAUDE_MODEL,
          max_tokens: 600,
          system,
          messages: [{ role: 'user', content: userMsg }]
        })
      })
      if (!r.ok) throw new Error(`claude_${r.status}`)
      const data = await r.json()
      const text = data?.content?.[0]?.text || ''
      const m = text.replace(/^```(?:json)?/i, '').replace(/```$/, '').trim().match(/\{[\s\S]*\}/)
      if (m) {
        const parsed = JSON.parse(m[0])
        messageText = parsed.message || ''
        reasoning = parsed.reason || ''
      }
    } catch (e) {
      messageText = `أهلاً ${name || ''} 👋 أنا محمد من مضمونة. لاحظت إنك حاولت تحجز عندنا وفيه مشكلة. تم إصلاحها. تقدر تحجز دلوقتي بسهولة، أو أساعدك أنا manually.`
      reasoning = 'fallback (AI call failed)'
    }

    // Build the WhatsApp link with pre-filled message
    const cleanPhone = (v.phone as string).replace(/[^0-9]/g, '')
    const waUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(messageText)}`

    drafted.push({
      visitor_id: v.visitor_id,
      phone: v.phone,
      profile_name: name,
      intent_score: v.intent_score,
      booking_attempts: v.booking_attempts,
      attempted_listings: listings,
      message: messageText,
      reasoning,
      whatsapp_url: waUrl,
    })
  }

  // 5. Save as a single admin_alert with the drafts attached
  await sb.from('admin_alerts').update({ status: 'resolved', resolved_at: new Date().toISOString() })
    .eq('alert_type', 'customer_recovery_drafts').eq('status', 'unread')

  const topDraft = drafted[0] as Record<string, unknown>
  const { data: saved } = await sb.from('admin_alerts').insert({
    alert_type: 'customer_recovery_drafts',
    severity: 'critical',
    title: `🔮 ${drafted.length} رسالة recovery جاهزة للإرسال`,
    summary: `أثلهم: ${topDraft.profile_name} (intent ${topDraft.intent_score}/100, ${topDraft.booking_attempts} محاولة) · الرسالة مصيغة بـ AI`,
    detail: { drafts: drafted },
    action_url: '/admin/command-center#recovery-drafts',
    agent_name: 'customer-recovery-drafter',
    status: 'unread',
  }).select('id').single()

  return new Response(JSON.stringify({
    ok: true,
    alert_id: saved?.id,
    drafted_count: drafted.length,
    drafts: drafted,
  }, null, 2), { headers: { 'Content-Type': 'application/json' } })
})
