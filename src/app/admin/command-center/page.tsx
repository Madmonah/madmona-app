'use client'

// ============================================================
// /admin/command-center — Mohamed's single-screen operations hub
// Pulls from: ceo-command-center, hot-leads-now edge functions
// + ceo_briefs table. Refreshes every 60s.
// ============================================================

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { supabaseBrowser } from '@/lib/supabase-browser'
import {
  Loader2, Lock, Flame, TrendingUp, MessageSquare, DollarSign,
  Users, Package, Activity, RefreshCw, ChevronRight, ChevronLeft,
  Zap, Brain, Send, ListChecks, ShieldAlert, Calendar, ExternalLink,
  ArrowUpRight,
} from 'lucide-react'

interface CommandCenterData {
  headline: {
    hot_leads_now: number
    first_outreach_pending: number
    followup_pending: number
    critical_leads: number
    high_leads: number
    messages_sent_24h: number
    messages_failed_24h: number
    messages_queue_pending: number
    conversations_today: number
    bookings_confirmed_30d: number
    revenue_30d_egp: number
    fraud_open_alerts: number
  }
  leads: {
    total: number
    by_tier: Record<string, number>
    by_action: Record<string, number>
  }
  inventory: { listings: Record<string, number>; suppliers: Record<string, number> }
  conversations: {
    total: number; replied: number; supplier_leads: number;
    customer_leads: number; created_today: number; reply_rate_pct: number
  }
  revenue: { bookings_30d: number; revenue_30d_egp: number }
  alerts: { fraud_open: number; fraud_high_severity: number; messages_failed: number; queue_backlog: number }
  activity_24h: { outbound_sent: number; ai_replies: number }
  generated_at: string
}

interface Lead {
  id: string
  business_name: string
  phone: string
  category: string
  location: string
  score: number
  priority_tier: string
  suggested_action: string
  outreach_count: number
  last_inbound_at: string | null
  lead_type: string
  has_ad_referral: boolean
}

interface CeoBrief {
  id: string
  brief_date: string
  one_liner: string
  good_news: string[]
  concerns: string[]
  top_3_priorities: Array<{ action: string; why: string; urgency: string }>
  full_brief_html: string
}

type Stage = 'loading' | 'unauthenticated' | 'ready'

const TIER_STYLES: Record<string, string> = {
  critical: 'bg-red-100 text-red-800 border-red-300',
  high: 'bg-orange-100 text-orange-800 border-orange-300',
  medium: 'bg-blue-100 text-blue-800 border-blue-300',
  low: 'bg-gray-100 text-gray-700 border-gray-300',
  cold: 'bg-gray-50 text-gray-500 border-gray-200',
}

const CATEGORY_AR: Record<string, string> = {
  apartments: 'شقق', cars: 'عربيات', workspace: 'ورك سبيس', workspaces: 'ورك سبيس',
  chalets: 'شاليهات', cameras: 'كاميرات', equipment: 'معدات', clinics: 'عيادات',
  other: 'أخرى', properties: 'عقارات', vehicles: 'مركبات',
}

function fmtAr(n: number | undefined): string {
  if (n === undefined || n === null) return '—'
  return new Intl.NumberFormat('ar-EG').format(n)
}

function fmtTimeAgo(iso: string | null): string {
  if (!iso) return ''
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'دلوقتي'
  if (mins < 60) return `من ${mins} دقيقة`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `من ${hrs} ساعة`
  return `من ${Math.floor(hrs / 24)} يوم`
}

async function callEdge(path: string, options: RequestInit = {}): Promise<unknown> {
  const { data: { session } } = await supabaseBrowser.auth.getSession()
  if (!session) throw new Error('not_authenticated')
  const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/${path}`
  const r = await fetch(url, {
    ...options,
    headers: {
      'Authorization': `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  })
  if (!r.ok) throw new Error(`${path} → ${r.status}`)
  return r.json()
}

export default function CommandCenterPage() {
  const [stage, setStage] = useState<Stage>('loading')
  const [data, setData] = useState<CommandCenterData | null>(null)
  const [leads, setLeads] = useState<Lead[]>([])
  const [brief, setBrief] = useState<CeoBrief | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [actionFilter, setActionFilter] = useState<string>('reply_now')
  const [error, setError] = useState<string | null>(null)
  const [actionStatus, setActionStatus] = useState<Record<string, string>>({})

  const loadAll = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true)
    setError(null)
    try {
      const [ccData, leadsData, briefRow] = await Promise.all([
        callEdge('ceo-command-center'),
        callEdge(`hot-leads-now?limit=30&action=${actionFilter}`),
        supabaseBrowser.from('ceo_briefs').select('*').order('brief_date', { ascending: false }).limit(1).maybeSingle(),
      ])
      setData(ccData as CommandCenterData)
      setLeads(((leadsData as { leads?: Lead[] }).leads) ?? [])
      setBrief((briefRow as { data?: CeoBrief | null }).data ?? null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'unknown')
    } finally {
      setRefreshing(false)
    }
  }, [actionFilter])

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabaseBrowser.auth.getSession()
      if (!session?.user) { setStage('unauthenticated'); return }
      setStage('ready')
      await loadAll(false)
    }
    init()
    const interval = setInterval(() => { loadAll(true) }, 60_000)
    return () => clearInterval(interval)
  }, [loadAll])

  const runBulkOutreach = async () => {
    setActionStatus(s => ({ ...s, bulk: 'pending' }))
    try {
      const result = await callEdge('bulk-outreach-top-leads', {
        method: 'POST', body: JSON.stringify({ limit: 20 }),
      }) as { ok: boolean; sent?: number; error?: string }
      setActionStatus(s => ({
        ...s, bulk: result.ok ? `✅ تم بعت ${result.sent || 0} رسالة` : `❌ ${result.error}`,
      }))
      setTimeout(() => loadAll(true), 3000)
    } catch (e) {
      setActionStatus(s => ({ ...s, bulk: `❌ ${e instanceof Error ? e.message : 'failed'}` }))
    }
  }

  const runRefreshBrief = async () => {
    setActionStatus(s => ({ ...s, brief: 'pending' }))
    try {
      await callEdge('daily-ai-brief', { method: 'POST', body: '{}' })
      setActionStatus(s => ({ ...s, brief: '✅ تم' }))
      await loadAll(true)
    } catch (e) {
      setActionStatus(s => ({ ...s, brief: `❌ ${e instanceof Error ? e.message : 'failed'}` }))
    }
  }

  if (stage === 'loading') return <LoadingScreen />
  if (stage === 'unauthenticated') return <AuthGate />

  return (
    <div dir="rtl" className="min-h-screen bg-gradient-to-br from-emerald-50 via-stone-50 to-amber-50/30 pb-16">
      <header className="sticky top-0 z-10 border-b border-emerald-900/10 bg-white/80 backdrop-blur-md">
        <div className="mx-auto max-w-7xl px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Link href="/admin/dashboard" className="rounded-lg p-2 hover:bg-emerald-900/5">
                <ChevronRight className="h-5 w-5 text-emerald-900" />
              </Link>
              <div>
                <h1 className="text-xl font-bold text-emerald-900 sm:text-2xl">Command Center</h1>
                <p className="text-xs text-emerald-900/60">
                  مضمونة · live · {data ? new Date(data.generated_at).toLocaleTimeString('ar-EG') : ''}
                </p>
              </div>
            </div>
            <button
              onClick={() => loadAll(true)}
              disabled={refreshing}
              className="flex items-center gap-2 rounded-xl bg-emerald-900 px-4 py-2 text-sm text-white hover:bg-emerald-800 disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              تحديث
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {error && (
          <div className="mb-4 rounded-xl border border-red-300 bg-red-50 p-4 text-red-800">⚠️ {error}</div>
        )}

        <section className="mb-8">
          <h2 className="mb-3 flex items-center gap-2 text-lg font-bold text-emerald-900">
            <Flame className="h-5 w-5 text-red-600" />Action items النهارده
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <ActionCard count={data?.headline?.hot_leads_now ?? 0} label="lead محتاج رد فوري"
              sub="ردوا عليك ولسه ما ردتش" color="alert"
              onClick={() => setActionFilter('reply_now')} />
            <ActionCard count={data?.headline?.followup_pending ?? 0} label="follow-up pending"
              sub="high priority بدون رد" color="warn"
              onClick={() => setActionFilter('followup_high_priority')} />
            <ActionCard count={data?.headline?.first_outreach_pending ?? 0} label="first outreach"
              sub="لسه ما اتواصلش" color="info"
              onClick={() => setActionFilter('first_outreach')} />
            <ActionCard count={data?.headline?.conversations_today ?? 0} label="conversation today"
              sub={`${data?.conversations?.reply_rate_pct ?? 0}% reply rate`} color="ok" />
          </div>
        </section>

        {brief && (
          <section className="mb-8">
            <div className="rounded-2xl border border-emerald-900/10 bg-gradient-to-br from-emerald-900 to-emerald-800 p-6 text-white shadow-xl">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Brain className="h-5 w-5 text-amber-300" />
                  <h2 className="text-lg font-bold">AI Brief · {brief.brief_date}</h2>
                </div>
                <button onClick={runRefreshBrief}
                  className="rounded-lg bg-white/10 px-3 py-1 text-xs hover:bg-white/20">
                  {actionStatus.brief === 'pending' ? '...' : actionStatus.brief || 'تحديث'}
                </button>
              </div>
              <p className="mb-4 text-lg leading-relaxed text-amber-100">{brief.one_liner}</p>
              <div className="grid gap-4 lg:grid-cols-3">
                <div>
                  <div className="mb-2 text-xs font-medium uppercase tracking-wider text-emerald-300/80">
                    ✓ أخبار حلوة
                  </div>
                  <ul className="space-y-1 text-sm">
                    {brief.good_news?.map((g, i) => <li key={i}>• {g}</li>)}
                  </ul>
                </div>
                <div>
                  <div className="mb-2 text-xs font-medium uppercase tracking-wider text-red-300/80">
                    ⚠ مخاوف
                  </div>
                  <ul className="space-y-1 text-sm">
                    {brief.concerns?.map((c, i) => <li key={i}>• {c}</li>)}
                  </ul>
                </div>
                <div>
                  <div className="mb-2 text-xs font-medium uppercase tracking-wider text-amber-300/80">
                    🎯 Top priorities
                  </div>
                  <ol className="space-y-2 text-sm">
                    {brief.top_3_priorities?.map((p, i) => (
                      <li key={i} className="flex gap-2">
                        <span className="rounded bg-amber-500/30 px-1.5 text-xs font-bold">
                          {p.urgency === 'high' ? '🔥' : p.urgency === 'medium' ? '📌' : '💡'}
                        </span>
                        <span>{p.action}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              </div>
            </div>
          </section>
        )}

        <section className="mb-8">
          <h2 className="mb-3 flex items-center gap-2 text-lg font-bold text-emerald-900">
            <TrendingUp className="h-5 w-5" />KPIs الأساسية
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
            <KpiCard icon={<Flame />} label="Critical leads" value={data?.headline?.critical_leads ?? 0} />
            <KpiCard icon={<TrendingUp />} label="High priority" value={data?.headline?.high_leads ?? 0} />
            <KpiCard icon={<Send />} label="Sent 24h" value={data?.headline?.messages_sent_24h ?? 0} />
            <KpiCard icon={<MessageSquare />} label="Conversations" value={data?.conversations?.total ?? 0} />
            <KpiCard icon={<Package />} label="Listings" value={data?.inventory?.listings?.published ?? 0} />
            <KpiCard icon={<Users />} label="Suppliers" value={data?.inventory?.suppliers?.approved ?? 0} />
          </div>
        </section>

        <section className="mb-8" id="leads-table">
          <div className="mb-3 flex items-center justify-between gap-3 flex-wrap">
            <h2 className="flex items-center gap-2 text-lg font-bold text-emerald-900">
              <Flame className="h-5 w-5 text-red-600" />
              {actionFilter === 'reply_now' ? 'Hot leads — رد فوري' :
                actionFilter === 'first_outreach' ? 'First outreach pending' :
                actionFilter === 'followup_high_priority' ? 'Follow-up pending' : 'All leads'}
            </h2>
            <div className="flex gap-2 flex-wrap">
              <FilterPill active={actionFilter === 'reply_now'} onClick={() => setActionFilter('reply_now')}>🔥 رد دلوقتي</FilterPill>
              <FilterPill active={actionFilter === 'first_outreach'} onClick={() => setActionFilter('first_outreach')}>📤 أول رسالة</FilterPill>
              <FilterPill active={actionFilter === 'followup_high_priority'} onClick={() => setActionFilter('followup_high_priority')}>🔁 متابعة</FilterPill>
            </div>
          </div>

          {actionFilter === 'first_outreach' && leads.length > 0 && (
            <div className="mb-3 flex items-center justify-between gap-3 flex-wrap rounded-xl border border-amber-300 bg-amber-50 p-4">
              <div>
                <p className="font-medium text-amber-900">عندك {leads.length} lead جاهز للـ outreach</p>
                <p className="text-xs text-amber-700">هـ ابعتلهم template من غير ما تعمل أي حاجة</p>
              </div>
              <button
                onClick={runBulkOutreach}
                disabled={actionStatus.bulk === 'pending'}
                className="rounded-xl bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-50"
              >
                {actionStatus.bulk === 'pending' ? 'بـ نبعت...' :
                  actionStatus.bulk ? actionStatus.bulk : `ابعت لـ 20 lead ⚡`}
              </button>
            </div>
          )}

          {leads.length === 0 ? (
            <div className="rounded-2xl border border-emerald-900/10 bg-white p-8 text-center text-emerald-900/60">
              مفيش leads في الـ category دي
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-emerald-900/10 bg-white">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-emerald-900/5 text-xs uppercase text-emerald-900/70">
                    <tr>
                      <th className="px-4 py-3 text-right">Score</th>
                      <th className="px-4 py-3 text-right">Lead</th>
                      <th className="px-4 py-3 text-right">Tier</th>
                      <th className="px-4 py-3 text-right">Phone</th>
                      <th className="px-4 py-3 text-right">آخر رد</th>
                      <th className="px-4 py-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-emerald-900/5">
                    {leads.slice(0, 25).map(lead => (
                      <tr key={lead.id} className="hover:bg-emerald-900/3">
                        <td className="px-4 py-3">
                          <div className={`inline-flex h-12 w-12 items-center justify-center rounded-xl font-bold ${
                            lead.score >= 85 ? 'bg-red-100 text-red-700' :
                            lead.score >= 70 ? 'bg-orange-100 text-orange-700' :
                            'bg-blue-100 text-blue-700'
                          }`}>{lead.score}</div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-medium text-emerald-900">{lead.business_name}</div>
                          <div className="text-xs text-emerald-900/60">
                            {CATEGORY_AR[lead.category] || lead.category} · {lead.location}
                            {lead.has_ad_referral && <span className="mr-2 rounded bg-purple-100 px-1.5 text-xs text-purple-700">📢 إعلان</span>}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`rounded-full border px-2 py-0.5 text-xs ${TIER_STYLES[lead.priority_tier] || ''}`}>
                            {lead.priority_tier}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-emerald-900/80">{lead.phone}</td>
                        <td className="px-4 py-3 text-xs text-emerald-900/60">{fmtTimeAgo(lead.last_inbound_at)}</td>
                        <td className="px-4 py-3">
                          <a href={`https://wa.me/${lead.phone.replace(/[^0-9]/g, '')}`}
                            target="_blank" rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs text-white hover:bg-emerald-700"
                          >
                            افتح WhatsApp <ExternalLink className="h-3 w-3" />
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>

        {((data?.alerts?.fraud_open ?? 0) > 0 || (data?.revenue?.bookings_30d ?? 0) === 0) && (
          <section className="mb-8">
            <h2 className="mb-3 flex items-center gap-2 text-lg font-bold text-red-700">
              <ShieldAlert className="h-5 w-5" />Critical blockers
            </h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {(data?.alerts?.fraud_open ?? 0) > 0 && (
                <BlockerCard count={data?.alerts?.fraud_open ?? 0} label="fraud alerts مفتوحة"
                  sub={`${data?.alerts?.fraud_high_severity ?? 0} منهم high severity`}
                  href="/admin/fraud-alerts" />
              )}
              {(data?.revenue?.bookings_30d ?? 0) === 0 && (
                <BlockerCard count={0} label="bookings آخر 30 يوم"
                  sub="فيه listings ومحدش حجز" href="/admin/funnel" />
              )}
            </div>
          </section>
        )}

        <section>
          <h2 className="mb-3 flex items-center gap-2 text-lg font-bold text-emerald-900">
            <Zap className="h-5 w-5" />روابط سريعة
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            <QuickLink href="/admin/wa-review" icon={<MessageSquare />} label="مراجعة الردود" />
            <QuickLink href="/admin/listing-drafts" icon={<ListChecks />} label="مسودات Listings" />
            <QuickLink href="/admin/marketplace-bookings" icon={<Calendar />} label="الحجوزات" />
            <QuickLink href="/admin/marketplace-suppliers" icon={<Users />} label="الموردين" />
            <QuickLink href="/admin/funnel" icon={<TrendingUp />} label="Funnel" />
            <QuickLink href="/admin/ceo-briefs" icon={<Brain />} label="CEO Briefs" />
            <QuickLink href="/admin/fraud-alerts" icon={<ShieldAlert />} label="Fraud alerts" />
            <QuickLink href="/admin/leads-feed" icon={<Activity />} label="Leads feed" />
          </div>
        </section>
      </main>
    </div>
  )
}

function ActionCard({ count, label, sub, color, onClick }: {
  count: number; label: string; sub: string;
  color: 'alert' | 'warn' | 'info' | 'ok'; onClick?: () => void
}) {
  const styles = {
    alert: 'border-red-300 bg-red-50',
    warn: 'border-amber-300 bg-amber-50',
    info: 'border-blue-300 bg-blue-50',
    ok: 'border-emerald-300 bg-emerald-50',
  }[color]
  return (
    <div className={`rounded-2xl border p-4 ${styles} ${onClick ? 'cursor-pointer transition-transform hover:scale-[1.02]' : ''}`} onClick={onClick}>
      <div className="text-3xl font-bold">{fmtAr(count)}</div>
      <div className="mt-1 text-sm font-medium">{label}</div>
      <div className="mt-1 text-xs text-stone-600">{sub}</div>
    </div>
  )
}

function KpiCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="rounded-xl border border-emerald-900/10 bg-white p-4">
      <div className="flex items-start justify-between">
        <div className="text-emerald-900/40">{icon}</div>
        <div className="text-right">
          <div className="text-2xl font-bold text-emerald-900">{fmtAr(value)}</div>
          <div className="text-xs text-emerald-900/60">{label}</div>
        </div>
      </div>
    </div>
  )
}

function BlockerCard({ count, label, sub, href }: { count: number; label: string; sub: string; href: string }) {
  return (
    <a href={href} className="block rounded-2xl border border-red-300 bg-red-50 p-4 transition-transform hover:scale-[1.02]">
      <div className="text-3xl font-bold text-red-700">{fmtAr(count)}</div>
      <div className="mt-1 text-sm font-medium text-red-900">{label}</div>
      <div className="mt-1 text-xs text-red-700">{sub}</div>
      <div className="mt-2 flex items-center gap-1 text-xs text-red-700">افتح <ArrowUpRight className="h-3 w-3" /></div>
    </a>
  )
}

function QuickLink({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
  return (
    <a href={href} className="flex items-center gap-3 rounded-xl border border-emerald-900/10 bg-white p-3 text-sm font-medium text-emerald-900 transition-all hover:border-emerald-900/30 hover:bg-emerald-50">
      <div className="text-emerald-700">{icon}</div><span>{label}</span>
      <ChevronLeft className="ms-auto h-4 w-4 text-emerald-900/40" />
    </a>
  )
}

function LoadingScreen() {
  return (
    <div dir="rtl" className="flex min-h-screen items-center justify-center bg-stone-50">
      <Loader2 className="h-12 w-12 animate-spin text-emerald-700" />
    </div>
  )
}

function AuthGate() {
  return (
    <div dir="rtl" className="flex min-h-screen flex-col items-center justify-center gap-4 bg-stone-50 p-4">
      <Lock className="h-12 w-12 text-emerald-700" />
      <p className="text-emerald-900">يجب تسجيل الدخول كأدمن.</p>
      <Link href="/auth/signin" className="rounded-xl bg-emerald-900 px-6 py-3 text-white">تسجيل الدخول</Link>
    </div>
  )
}
