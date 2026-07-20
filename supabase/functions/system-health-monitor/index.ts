// system-health-monitor — nightly check on every critical component.
// Verifies: edge functions, cron jobs, queue backlog, fraud spikes, AI usage.
// Alerts admin via WhatsApp if anything is broken.
import { createClient } from 'jsr:@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const AGENT_SECRET = Deno.env.get('AGENT_SECRET') || 'c9aade438b57204664c496dcd43ab8a640af5061273abc6591522bf96065d0c7'
const ADMIN_PHONE = '+201002229982'

interface Check { name: string; ok: boolean; detail: string; severity: 'info' | 'warn' | 'alert' }

Deno.serve(async (req) => {
  const auth = req.headers.get('authorization') || ''
  const agentSecret = req.headers.get('x-agent-secret') || ''
  const vercelCron = req.headers.get('x-vercel-cron')
  const isAuthorized = vercelCron === '1' || agentSecret === AGENT_SECRET || auth.includes(AGENT_SECRET) || auth.includes(SUPABASE_SERVICE_ROLE_KEY)
  if (!isAuthorized) return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401 })

  const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
  const checks: Check[] = []

  // ============== 1. WhatsApp queue backlog ==============
  const { count: queuePending } = await sb
    .from('whatsapp_outbound_queue').select('*', { count: 'exact', head: true })
    .eq('status', 'pending')
  const { count: queueFailed } = await sb
    .from('whatsapp_outbound_queue').select('*', { count: 'exact', head: true })
    .eq('status', 'failed').gte('created_at', new Date(Date.now() - 24 * 3600 * 1000).toISOString())

  checks.push({
    name: 'whatsapp_queue',
    ok: (queuePending || 0) < 50 && (queueFailed || 0) < 20,
    detail: `pending=${queuePending || 0}, failed_24h=${queueFailed || 0}`,
    severity: (queuePending || 0) > 100 ? 'alert' : (queuePending || 0) > 50 ? 'warn' : 'info',
  })

  // ============== 2. Pending review drafts (admin needs to action) ==============
  const { count: pendingReview } = await sb
    .from('whatsapp_messages').select('*', { count: 'exact', head: true })
    .eq('status', 'pending_review')
    .gte('created_at', new Date(Date.now() - 7 * 86400 * 1000).toISOString())

  checks.push({
    name: 'pending_review_drafts',
    ok: (pendingReview || 0) < 30,
    detail: `${pendingReview || 0} drafts awaiting admin review (last 7d)`,
    severity: (pendingReview || 0) > 50 ? 'alert' : (pendingReview || 0) > 30 ? 'warn' : 'info',
  })

  // ============== 3. Fraud alerts spike ==============
  const { count: fraudHigh } = await sb
    .from('fraud_alerts').select('*', { count: 'exact', head: true })
    .in('severity', ['high', 'critical']).in('status', ['open', 'new'])
  checks.push({
    name: 'fraud_alerts',
    ok: (fraudHigh || 0) < 20,
    detail: `${fraudHigh || 0} high/critical alerts open`,
    severity: (fraudHigh || 0) > 50 ? 'alert' : (fraudHigh || 0) > 20 ? 'warn' : 'info',
  })

  // ============== 4. Lead intelligence freshness ==============
  const { data: liView } = await sb.from('lead_intelligence_view').select('computed_at').limit(1)
  const liFresh = liView?.[0]?.computed_at ? Date.now() - new Date((liView[0] as { computed_at: string }).computed_at).getTime() : Infinity
  checks.push({
    name: 'lead_intelligence_freshness',
    ok: liFresh < 30 * 60 * 1000, // 30 min
    detail: `last refreshed ${Math.round(liFresh / 60000)} min ago`,
    severity: liFresh > 60 * 60 * 1000 ? 'alert' : liFresh > 30 * 60 * 1000 ? 'warn' : 'info',
  })

  // ============== 5. Webhook responsiveness (last inbound recency) ==============
  const { data: lastIn } = await sb
    .from('whatsapp_messages').select('created_at')
    .eq('direction', 'inbound').order('created_at', { ascending: false }).limit(1)
  const lastInTs = lastIn?.[0]?.created_at ? new Date((lastIn[0] as { created_at: string }).created_at).getTime() : 0
  const sinceLastIn = lastInTs ? Date.now() - lastInTs : Infinity
  checks.push({
    name: 'webhook_inbound',
    ok: sinceLastIn < 12 * 3600 * 1000, // last 12 hours should have at least one
    detail: `last inbound ${Math.round(sinceLastIn / 60000)} min ago`,
    severity: sinceLastIn > 24 * 3600 * 1000 ? 'alert' : sinceLastIn > 12 * 3600 * 1000 ? 'warn' : 'info',
  })

  // ============== 6. Cron jobs active ==============
  // ⚠️ كان بينادي exec_sql_returning_json — دالة مش موجودة أصلاً،
  //    فكان بيرجّع صفر ويقول «٠ مهام مجدولة» وهو غلط.
  //    إنذار كاذب متكرر بيخلّي الكل يتجاهل التنبيهات — أخطر من مفيش تنبيه.
  const { data: cronCnt } = await sb.rpc('active_cron_count').then(
    (r: { data: unknown }) => r,
    () => ({ data: null }),
  )
  const crons = cronCnt != null ? { cnt: Number(cronCnt) } : null
  const cronCount = (crons as { cnt: number } | null)?.cnt || 0
  checks.push({
    name: 'cron_jobs',
    ok: cronCount >= 5,
    detail: `${cronCount} cron jobs active`,
    severity: cronCount < 3 ? 'alert' : cronCount < 5 ? 'warn' : 'info',
  })

  // ============== 7. AI usage (last 24h) ==============
  const { count: aiReplies } = await sb
    .from('whatsapp_messages').select('*', { count: 'exact', head: true })
    .eq('ai_generated', true).eq('direction', 'outbound')
    .gte('created_at', new Date(Date.now() - 24 * 3600 * 1000).toISOString())
  checks.push({
    name: 'ai_replies_24h',
    ok: true,
    detail: `${aiReplies || 0} AI replies in last 24h`,
    severity: 'info',
  })

  // ============== 8. رسايل مستنية رد ==============
  // ٢٠ يوليو: عبده بعت الساعة ٦:٤٣ ومحدش رد عليه، وماحدش عرف
  // إلا لما محمد سأل بعد ٣ ساعات. أي رسالة عدّى عليها ٢٠ دقيقة
  // من غير رد = عطل، مش تأخير.
  const { data: waiting } = await sb.rpc('wa_unanswered_since', { minutes: 20 })
    .then((r: { data: unknown }) => r)
    .catch(() => ({ data: null }))

  let waitingCount = 0
  if (Array.isArray(waiting)) {
    waitingCount = waiting.length
  } else {
    // مفيش الدالة؟ نحسبها هنا — الفحص أهم من الشكل
    const since = new Date(Date.now() - 20 * 60 * 1000).toISOString()
    const { data: recent } = await sb
      .from('whatsapp_messages')
      .select('conversation_id, direction, created_at, body')
      .gte('created_at', new Date(Date.now() - 6 * 3600 * 1000).toISOString())
      .order('created_at', { ascending: false })
      .limit(500)

    // ⚠️ الرسالة الفاضية مش «مستنية رد» — دي ضوضاء بروتوكول.
    //    من غير الشرط ده الفحص بيعد الضوضاء كإنذار، وأول ما
    //    يطلع إنذار كاذب واحد بيبقى كل الباقي بيتتجاهل.
    const lastByConv = new Map<string, { dir: string; at: string }>()
    for (const m of (recent || []) as {
      conversation_id: string
      direction: string
      created_at: string
      body: string | null
    }[]) {
      if (m.direction === 'inbound' && !(m.body || '').trim()) continue
      if (!lastByConv.has(m.conversation_id)) {
        lastByConv.set(m.conversation_id, { dir: m.direction, at: m.created_at })
      }
    }
    for (const [, v] of lastByConv) {
      if (v.dir === 'inbound' && v.at < since) waitingCount++
    }
  }

  checks.push({
    name: 'unanswered_messages',
    ok: waitingCount === 0,
    detail: `${waitingCount} رسالة مستنية رد من أكتر من ٢٠ دقيقة`,
    severity: waitingCount > 2 ? 'alert' : waitingCount > 0 ? 'warn' : 'info',
  })

  // ============== 9. خدمة المارد شغّالة؟ ==============
  // الرقم ممكن يفصل والدنيا تفضل ساكتة. بنسأل الخدمة نفسها.
  try {
    const waUrl = Deno.env.get('WA_SERVICE_URL')
    if (waUrl) {
      const h = await fetch(`${waUrl.replace(/\/$/, '')}/health`, {
        signal: AbortSignal.timeout(8000),
      })
      const hd = await h.json().catch(() => ({}))
      const connected = hd?.connected === true || hd?.status === 'connected'
      checks.push({
        name: 'marid_service',
        ok: connected,
        detail: connected ? `متصل · ${hd?.version?.commit ?? '?'}` : 'مفصول عن واتساب',
        severity: connected ? 'info' : 'alert',
      })
    }
  } catch (e) {
    checks.push({
      name: 'marid_service',
      ok: false,
      detail: `الخدمة مش بترد: ${e instanceof Error ? e.message : 'خطأ'}`,
      severity: 'alert',
    })
  }

  // ============== Build alert message if needed ==============
  const alerts = checks.filter(c => c.severity === 'alert')
  const warns = checks.filter(c => c.severity === 'warn')
  const sendAlert = alerts.length > 0

  if (sendAlert) {
    const msg = `🚨 *Madmona Health Alert*\n\n` +
      alerts.map(a => `❗ *${a.name}*: ${a.detail}`).join('\n') +
      (warns.length > 0 ? `\n\n⚠️ Warnings:\n` + warns.map(w => `• ${w.name}: ${w.detail}`).join('\n') : '')

    await sb.from('whatsapp_outbound_queue').insert({
      recipient_phone: ADMIN_PHONE,
      recipient_name: 'مدير مضمونة',
      message: msg,
      status: 'pending',
      scheduled_at: new Date().toISOString(),
      agent_name: 'system-health-monitor',
      campaign: 'system_health_alerts',
      metadata: { alerts, warns, checked_at: new Date().toISOString() }
    })
  }

  return new Response(JSON.stringify({
    ok: true,
    overall_status: alerts.length > 0 ? 'unhealthy' : warns.length > 0 ? 'degraded' : 'healthy',
    alerts_count: alerts.length,
    warns_count: warns.length,
    alert_sent: sendAlert,
    checks,
    checked_at: new Date().toISOString(),
  }, null, 2), { headers: { 'Content-Type': 'application/json' } })
})
