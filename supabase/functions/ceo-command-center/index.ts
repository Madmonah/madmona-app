// ceo-command-center — single endpoint with all KPIs, funnel state, and intelligence.
// GET: returns everything Mohamed needs to know in one call.
import { createClient } from 'jsr:@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

Deno.serve(async (_req) => {
  const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
  const t0 = Date.now()

  // --- Run all queries in parallel ---
  const [
    leadsByTier,
    leadsByAction,
    leadsByCategory,
    listingsState,
    suppliersState,
    messagesState,
    bookingsState,
    contentState,
    fraudState,
    convState,
    todayActivity,
  ] = await Promise.all([
    sb.rpc('exec_kpi_query', { q: 'tier_dist' }).then(r => r, () => null),
    sb.from('lead_intelligence_view').select('suggested_action'),
    sb.from('lead_intelligence_view').select('category, priority_tier'),
    sb.from('listings').select('status'),
    sb.from('marketplace_suppliers').select('approval_status'),
    sb.from('whatsapp_outbound_queue').select('status, sent_at, created_at').gte('created_at', new Date(Date.now() - 24 * 3600 * 1000).toISOString()),
    sb.from('marketplace_bookings').select('status, created_at, total_amount_egp').gte('created_at', new Date(Date.now() - 30 * 86400 * 1000).toISOString()),
    sb.from('content_calendar').select('status').gte('created_at', new Date(Date.now() - 7 * 86400 * 1000).toISOString()),
    sb.from('fraud_alerts').select('severity, status').gte('created_at', new Date(Date.now() - 7 * 86400 * 1000).toISOString()),
    sb.from('whatsapp_conversations').select('contact_type, last_inbound_at, created_at'),
    sb.from('whatsapp_messages').select('direction, ai_generated, status').gte('created_at', new Date(Date.now() - 24 * 3600 * 1000).toISOString()),
  ])

  // --- Aggregate lead intelligence ---
  const tierCount: Record<string, number> = {}
  const actionCount: Record<string, number> = {}
  for (const r of (leadsByAction.data as Array<{ suggested_action: string }>) || []) {
    actionCount[r.suggested_action] = (actionCount[r.suggested_action] || 0) + 1
  }
  const categoryDist: Record<string, { total: number; critical: number; high: number }> = {}
  for (const r of (leadsByCategory.data as Array<{ category: string; priority_tier: string }>) || []) {
    if (!categoryDist[r.category]) categoryDist[r.category] = { total: 0, critical: 0, high: 0 }
    categoryDist[r.category].total++
    if (r.priority_tier === 'critical') categoryDist[r.category].critical++
    if (r.priority_tier === 'high') categoryDist[r.category].high++
    tierCount[r.priority_tier] = (tierCount[r.priority_tier] || 0) + 1
  }

  // --- Listings ---
  const listingsCount: Record<string, number> = {}
  for (const r of (listingsState.data as Array<{ status: string }>) || []) {
    listingsCount[r.status || 'unknown'] = (listingsCount[r.status || 'unknown'] || 0) + 1
  }

  // --- Suppliers ---
  const suppliersCount: Record<string, number> = {}
  for (const r of (suppliersState.data as Array<{ approval_status: string }>) || []) {
    suppliersCount[r.approval_status || 'unknown'] = (suppliersCount[r.approval_status || 'unknown'] || 0) + 1
  }

  // --- Messages 24h ---
  let msgSent24h = 0, msgFailed24h = 0, msgPending = 0
  for (const r of (messagesState.data as Array<{ status: string }>) || []) {
    if (r.status === 'sent') msgSent24h++
    else if (r.status === 'failed') msgFailed24h++
    else if (r.status === 'pending') msgPending++
  }

  // --- Bookings 30d ---
  let revenue30d = 0, bookingsConfirmed = 0, bookingsCancelled = 0
  for (const r of (bookingsState.data as Array<{ status: string; total_amount_egp: number }>) || []) {
    if (r.status === 'confirmed' || r.status === 'completed') {
      bookingsConfirmed++
      revenue30d += r.total_amount_egp || 0
    } else if (r.status === 'cancelled') bookingsCancelled++
  }

  // --- Content 7d ---
  const contentCount: Record<string, number> = {}
  for (const r of (contentState.data as Array<{ status: string }>) || []) {
    contentCount[r.status || 'unknown'] = (contentCount[r.status || 'unknown'] || 0) + 1
  }

  // --- Fraud alerts (7d) ---
  let fraudOpen = 0, fraudHigh = 0
  for (const r of (fraudState.data as Array<{ severity: string; status: string }>) || []) {
    if (r.status === 'open' || r.status === 'new') fraudOpen++
    if (r.severity === 'high' || r.severity === 'critical') fraudHigh++
  }

  // --- Conversation funnel ---
  let convTotal = 0, convReplied = 0, convSupplier = 0, convCustomer = 0, convToday = 0
  const today = new Date().toISOString().slice(0, 10)
  for (const c of (convState.data as Array<{ contact_type: string; last_inbound_at: string; created_at: string }>) || []) {
    convTotal++
    if (c.last_inbound_at) convReplied++
    if (c.contact_type === 'supplier_lead') convSupplier++
    else if (c.contact_type === 'customer_lead') convCustomer++
    if (c.created_at?.startsWith(today)) convToday++
  }

  // --- Today activity ---
  let activitySent = 0, activityAiReplies = 0
  for (const m of (todayActivity.data as Array<{ direction: string; ai_generated: boolean; status: string }>) || []) {
    if (m.direction === 'outbound') activitySent++
    if (m.ai_generated) activityAiReplies++
  }

  // --- Build response ---
  return new Response(JSON.stringify({
    ok: true,
    generated_at: new Date().toISOString(),
    elapsed_ms: Date.now() - t0,
    headline: {
      hot_leads_now: actionCount['reply_now'] || 0,
      first_outreach_pending: actionCount['first_outreach'] || 0,
      followup_pending: actionCount['followup_high_priority'] || 0,
      critical_leads: tierCount['critical'] || 0,
      high_leads: tierCount['high'] || 0,
      messages_sent_24h: msgSent24h,
      messages_failed_24h: msgFailed24h,
      messages_queue_pending: msgPending,
      conversations_today: convToday,
      bookings_confirmed_30d: bookingsConfirmed,
      revenue_30d_egp: revenue30d,
      fraud_open_alerts: fraudOpen,
    },
    leads: {
      total: Object.values(tierCount).reduce((a, b) => a + b, 0),
      by_tier: tierCount,
      by_action: actionCount,
      by_category: categoryDist,
    },
    inventory: {
      listings: listingsCount,
      suppliers: suppliersCount,
    },
    conversations: {
      total: convTotal,
      replied: convReplied,
      supplier_leads: convSupplier,
      customer_leads: convCustomer,
      created_today: convToday,
      reply_rate_pct: convTotal > 0 ? Math.round((convReplied / convTotal) * 100) : 0,
    },
    revenue: {
      bookings_30d: bookingsConfirmed,
      cancelled_30d: bookingsCancelled,
      revenue_30d_egp: revenue30d,
      avg_booking_value_egp: bookingsConfirmed > 0 ? Math.round(revenue30d / bookingsConfirmed) : 0,
    },
    content: {
      last_7d: contentCount,
    },
    alerts: {
      fraud_open: fraudOpen,
      fraud_high_severity: fraudHigh,
      messages_failed: msgFailed24h,
      queue_backlog: msgPending,
    },
    activity_24h: {
      outbound_sent: activitySent,
      ai_replies: activityAiReplies,
    },
  }, null, 2), { headers: { 'Content-Type': 'application/json' } })
})
