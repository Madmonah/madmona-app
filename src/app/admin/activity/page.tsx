// src/app/admin/activity/page.tsx
// Sales Activity Live Feed — shows everything happening in real-time
// Refreshes every 30s automatically

import { supabase as supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'
export const revalidate = 0

interface ActivityItem {
  type: 'agent_run' | 'whatsapp_out' | 'whatsapp_in' | 'outreach' | 'lead' | 'booking' | 'signup'
  timestamp: string
  title: string
  detail: string
  agent?: string | null
  status?: string
  icon: string
}

function formatTime(iso: string): string {
  const d = new Date(iso)
  const diff = Date.now() - d.getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'الآن'
  if (mins < 60) return `${mins}د`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}س`
  return `${Math.floor(hrs / 24)}ي`
}

async function getActivityFeed(): Promise<ActivityItem[]> {
  const sinceIso = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

  const [runs, waOut, waIn, outreach, leads, bookings, signups] = await Promise.all([
    supabaseAdmin
      .from('agent_runs')
      .select('id, agent_name, status, started_at, output_summary, error_message, duration_ms')
      .gte('started_at', sinceIso)
      .order('started_at', { ascending: false })
      .limit(40),
    supabaseAdmin
      .from('whatsapp_messages')
      .select('id, agent_name, body, created_at, status')
      .eq('direction', 'outbound')
      .gte('created_at', sinceIso)
      .order('created_at', { ascending: false })
      .limit(20),
    supabaseAdmin
      .from('whatsapp_messages')
      .select('id, body, created_at')
      .eq('direction', 'inbound')
      .gte('created_at', sinceIso)
      .order('created_at', { ascending: false })
      .limit(20),
    supabaseAdmin
      .from('outreach_log')
      .select('id, agent_name, channel, target_type, status, sent_at, subject, body, message_text')
      .gte('created_at', sinceIso)
      .order('created_at', { ascending: false })
      .limit(20),
    supabaseAdmin
      .from('sales_leads')
      .select('id, source, contact_name, intent, lead_score, created_at')
      .gte('created_at', sinceIso)
      .order('created_at', { ascending: false })
      .limit(20),
    supabaseAdmin
      .from('marketplace_bookings')
      .select('id, total_amount, created_at')
      .gte('created_at', sinceIso)
      .order('created_at', { ascending: false })
      .limit(10),
    supabaseAdmin
      .from('profiles')
      .select('id, full_name, role, created_at')
      .gte('created_at', sinceIso)
      .order('created_at', { ascending: false })
      .limit(10),
  ])

  const items: ActivityItem[] = []

  type Run = { id: string; agent_name: string; status: string; started_at: string; output_summary: Record<string, unknown> | null; error_message: string | null; duration_ms: number | null }
  for (const r of (runs.data ?? []) as Run[]) {
    const summary = r.output_summary
    let detail = ''
    if (r.status === 'success' && summary) {
      const sent = (summary.sent as number) ?? (summary.scored as number)
      detail = sent !== undefined ? `تم: ${sent}` : (summary.headline as string) ?? (summary.topic as string) ?? 'نجح'
    } else if (r.status === 'error') {
      detail = r.error_message ?? 'فشل'
    } else {
      detail = 'بدأ'
    }
    items.push({
      type: 'agent_run',
      timestamp: r.started_at,
      title: r.agent_name,
      detail,
      agent: r.agent_name,
      status: r.status,
      icon: r.status === 'success' ? '✅' : r.status === 'error' ? '❌' : '⚙️',
    })
  }

  type WAOut = { id: string; agent_name: string | null; body: string; created_at: string; status: string }
  for (const m of (waOut.data ?? []) as WAOut[]) {
    items.push({
      type: 'whatsapp_out',
      timestamp: m.created_at,
      title: 'WhatsApp ⬅',
      detail: m.body.slice(0, 80),
      agent: m.agent_name,
      status: m.status,
      icon: '📤',
    })
  }

  type WAIn = { id: string; body: string; created_at: string }
  for (const m of (waIn.data ?? []) as WAIn[]) {
    items.push({
      type: 'whatsapp_in',
      timestamp: m.created_at,
      title: 'WhatsApp ⮕',
      detail: m.body.slice(0, 80),
      icon: '📥',
    })
  }

  type Lead = { id: string; source: string; contact_name: string | null; intent: string; lead_score: number; created_at: string }
  for (const l of (leads.data ?? []) as Lead[]) {
    items.push({
      type: 'lead',
      timestamp: l.created_at,
      title: 'Lead جديد',
      detail: `${l.contact_name ?? '?'} - ${l.intent} - score ${l.lead_score} - من ${l.source}`,
      icon: '🎯',
    })
  }

  type Booking = { id: string; total_amount: number; created_at: string }
  for (const b of (bookings.data ?? []) as Booking[]) {
    items.push({
      type: 'booking',
      timestamp: b.created_at,
      title: 'حجز جديد',
      detail: `${b.total_amount} ج`,
      icon: '💰',
    })
  }

  type Signup = { id: string; full_name: string; role: string; created_at: string }
  for (const s of (signups.data ?? []) as Signup[]) {
    items.push({
      type: 'signup',
      timestamp: s.created_at,
      title: 'تسجيل جديد',
      detail: `${s.full_name} - ${s.role}`,
      icon: '👤',
    })
  }

  // Sort all by timestamp desc
  items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

  return items.slice(0, 100)
}

export default async function ActivityFeed() {
  const items = await getActivityFeed()

  return (
    <div dir="rtl" style={{
      fontFamily: 'Tahoma, Arial, sans-serif',
      background: '#FAF7F0',
      minHeight: '100vh',
      padding: '24px',
      color: '#1a1a1a',
    }}>
      <div style={{ maxWidth: 800, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div>
            <h1 style={{ color: '#2B4521', margin: 0, fontSize: 24 }}>⚡ النشاط المباشر</h1>
            <p style={{ color: '#666', margin: '4px 0 0', fontSize: 13 }}>كل اللي بيحصل في آخر 24 ساعة</p>
          </div>
          <a href="/admin/agents" style={{ color: '#2B4521', fontSize: 13, textDecoration: 'none' }}>← العودة للداشبورد</a>
        </div>

        <meta httpEquiv="refresh" content="30" />

        <div style={{ background: '#fff', borderRadius: 12, overflow: 'hidden', border: '1px solid #eee' }}>
          {items.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#999' }}>
              لسه مفيش نشاط في الـ 24 ساعة الأخيرة
            </div>
          ) : (
            items.map((item, idx) => (
              <div key={idx} style={{
                padding: '12px 16px',
                borderBottom: idx < items.length - 1 ? '1px solid #f0f0f0' : 'none',
                display: 'flex',
                gap: 12,
                alignItems: 'flex-start',
              }}>
                <div style={{ fontSize: 18, flexShrink: 0 }}>{item.icon}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
                    <strong style={{ color: '#2B4521', fontSize: 13 }}>{item.title}</strong>
                    <span style={{ fontSize: 11, color: '#999' }}>{formatTime(item.timestamp)}</span>
                  </div>
                  <div style={{
                    fontSize: 12,
                    color: '#666',
                    marginTop: 4,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}>
                    {item.detail}
                  </div>
                  {item.agent && item.type === 'agent_run' && (
                    <div style={{ fontSize: 10, color: '#999', marginTop: 4, fontFamily: 'monospace' }}>
                      {item.agent}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        <div style={{ marginTop: 16, textAlign: 'center', fontSize: 11, color: '#999' }}>
          الصفحة بتعمل refresh أوتوماتيكياً كل 30 ثانية
        </div>
      </div>
    </div>
  )
}
