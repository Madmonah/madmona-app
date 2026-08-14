'use client'

// =====================================================================
// /admin/email-queue — Monitor both customer + admin email outboxes
// Phase Ω.11 (May 18 2026)
// =====================================================================

import { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import { supabaseBrowser } from '@/lib/supabase-browser'
import {
  ArrowRight, Loader2, Lock, ShieldAlert, Mail, RefreshCw, Zap,
  CheckCircle, AlertCircle, Clock, Send, Inbox, Users,
} from 'lucide-react'

type Stage = 'loading' | 'unauthenticated' | 'forbidden' | 'ready'
type Queue = 'admin' | 'customer'
type Status = 'pending' | 'sending' | 'sent' | 'failed' | 'cancelled' | 'bounced' | 'all'

interface QueueRow {
  id: string
  queue: Queue
  to_email: string
  to_name: string | null
  subject: string
  status: string
  attempts: number
  error: string | null
  scheduled_at: string
  sent_at: string | null
  created_at: string
  template_key: string | null
  category: string | null
  source: string | null
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  pending:   { label: 'انتظار',   color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200' },
  sending:   { label: 'بيتبعت',   color: 'text-blue-700',  bg: 'bg-blue-50 border-blue-200' },
  sent:      { label: 'اتبعت',    color: 'text-green-700', bg: 'bg-green-50 border-green-200' },
  failed:    { label: 'فشل',      color: 'text-red-700',   bg: 'bg-red-50 border-red-200' },
  cancelled: { label: 'ملغي',     color: 'text-gray-700',  bg: 'bg-gray-50 border-gray-200' },
  bounced:   { label: 'مرفوض',    color: 'text-purple-700', bg: 'bg-purple-50 border-purple-200' },
}

function timeAgo(iso: string): string {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (mins < 1) return 'الآن'
  if (mins < 60) return `${mins} د`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs} س`
  return `${Math.floor(hrs / 24)} ي`
}

export default function EmailQueuePage() {
  const [stage, setStage] = useState<Stage>('loading')
  const [rows, setRows] = useState<QueueRow[]>([])
  const [queue, setQueue] = useState<Queue | 'both'>('both')
  const [status, setStatus] = useState<Status>('all')
  const [refreshing, setRefreshing] = useState(false)
  const [firing, setFiring] = useState(false)
  const [retrying, setRetrying] = useState<string | null>(null)
  const [flash, setFlash] = useState<{ ok: boolean; text: string } | null>(null)

  useEffect(() => { init() }, [])
  useEffect(() => { if (stage === 'ready') loadRows() }, [queue, status, stage])

  async function init() {
    const { data: { session } } = await supabaseBrowser.auth.getSession()
    if (!session?.user) { setStage('unauthenticated'); return }
    const { data: prof } = await supabaseBrowser.from('profiles').select('role').eq('id', session.user.id).maybeSingle()
    if (prof?.role !== 'admin') { setStage('forbidden'); return }
    await loadRows()
    setStage('ready')
  }

  async function loadRows() {
    setRefreshing(true)
    const all: QueueRow[] = []

    if (queue === 'both' || queue === 'admin') {
      let q = supabaseBrowser.from('admin_email_outbox')
        .select('id, to_email, subject, status, attempts, error, scheduled_at, sent_at, created_at, source')
        .order('created_at', { ascending: false }).limit(50)
      if (status !== 'all') q = q.eq('status', status)
      const { data } = await q
      ;(data || []).forEach((r: any) => all.push({
        id: r.id, queue: 'admin' as Queue, to_email: r.to_email, to_name: null,
        subject: r.subject, status: r.status, attempts: r.attempts, error: r.error,
        scheduled_at: r.scheduled_at, sent_at: r.sent_at, created_at: r.created_at,
        template_key: null, category: null, source: r.source,
      }))
    }

    if (queue === 'both' || queue === 'customer') {
      let q = supabaseBrowser.from('customer_email_outbox')
        .select('id, to_email, to_name, subject, status, attempts, error, scheduled_at, sent_at, created_at, template_key, category')
        .order('created_at', { ascending: false }).limit(50)
      if (status !== 'all') q = q.eq('status', status)
      const { data } = await q
      ;(data || []).forEach((r: any) => all.push({
        id: r.id, queue: 'customer' as Queue, to_email: r.to_email, to_name: r.to_name,
        subject: r.subject, status: r.status, attempts: r.attempts, error: r.error,
        scheduled_at: r.scheduled_at, sent_at: r.sent_at, created_at: r.created_at,
        template_key: r.template_key, category: r.category, source: null,
      }))
    }

    all.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    setRows(all)
    setRefreshing(false)
  }

  async function fireProcessor() {
    setFiring(true)
    const { data, error } = await supabaseBrowser.rpc('process_email_outbox', { p_limit: 10 })
    setFiring(false)
    if (error) {
      setFlash({ ok: false, text: `فشل: ${error.message}` })
    } else {
      const r = data as { queued_for_send?: number; completed_sent?: number; completed_failed?: number }
      setFlash({ ok: true, text: `بعت ${r?.queued_for_send || 0}، خلص ${r?.completed_sent || 0} نجاح + ${r?.completed_failed || 0} فشل` })
      setTimeout(loadRows, 1500)
    }
    setTimeout(() => setFlash(null), 4500)
  }

  async function retryRow(row: QueueRow) {
    setRetrying(row.id)
    const table = row.queue === 'admin' ? 'admin_email_outbox' : 'customer_email_outbox'
    const { error } = await supabaseBrowser.from(table).update({
      status: 'pending', error: null, attempts: 0,
      ...(row.queue === 'customer' ? { provider_request_id: null, updated_at: new Date().toISOString() } : { provider_request_id: null }),
    }).eq('id', row.id)
    setRetrying(null)
    if (error) {
      setFlash({ ok: false, text: `فشل: ${error.message}` })
    } else {
      setFlash({ ok: true, text: 'الـ row رجعت لـ pending. شغّل المعالج أو استنى ١ دقيقة.' })
      setTimeout(loadRows, 1000)
    }
    setTimeout(() => setFlash(null), 4500)
  }

  const summary = useMemo(() => {
    const cnt: Record<string, number> = { all: rows.length }
    rows.forEach(r => { cnt[r.status] = (cnt[r.status] || 0) + 1 })
    return cnt
  }, [rows])

  if (stage === 'loading') return <div className="min-h-screen bg-[#FAFAF7] flex items-center justify-center" dir="rtl"><Loader2 className="w-6 h-6 text-[#059669] animate-spin" /></div>
  if (stage === 'unauthenticated') return (
    <div className="min-h-screen bg-[#FAFAF7] flex items-center justify-center p-4" dir="rtl">
      <div className="bg-white rounded-2xl border p-8 text-center max-w-sm">
        <Lock className="w-8 h-8 text-[#059669] mx-auto mb-3" />
        <h1 className="font-bold mb-4">سجّل دخول الأول</h1>
        <Link href="/auth/login?redirect=/admin/email-queue" className="block bg-[#34D399] text-[#04352A] py-3 rounded-xl font-semibold">دخول</Link>
      </div>
    </div>
  )
  if (stage === 'forbidden') return (
    <div className="min-h-screen bg-[#FAFAF7] flex items-center justify-center p-4" dir="rtl">
      <div className="bg-white rounded-2xl border p-8 text-center max-w-sm">
        <ShieldAlert className="w-8 h-8 text-red-500 mx-auto mb-3" />
        <h1 className="font-bold">الصفحة دي للأدمن فقط</h1>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-[#FAFAF7] pb-20" dir="rtl">
      <header className="sticky top-0 z-40 bg-white border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center gap-3">
          <Link href="/admin/dashboard" className="w-9 h-9 bg-white shadow rounded-full flex items-center justify-center">
            <ArrowRight className="w-4 h-4 text-gray-700" />
          </Link>
          <Mail className="w-5 h-5 text-[#059669]" />
          <h1 className="text-lg font-black text-gray-900 flex-1">طابور الإيميلات</h1>
          <button onClick={loadRows} disabled={refreshing} className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200">
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
          <button onClick={fireProcessor} disabled={firing} className="bg-[#34D399] text-[#04352A] px-3 py-2 rounded-xl text-sm font-bold flex items-center gap-1.5 hover:bg-[#34D399]/90 disabled:opacity-50">
            {firing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            <span>تشغيل المعالج</span>
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-4 space-y-3">
        {flash && (
          <div className={`p-3 rounded-xl border flex items-start gap-2 text-sm ${
            flash.ok ? 'bg-green-50 border-green-200 text-green-900' : 'bg-red-50 border-red-200 text-red-900'
          }`}>
            {flash.ok ? <CheckCircle className="w-4 h-4 mt-0.5" /> : <AlertCircle className="w-4 h-4 mt-0.5" />}
            <span>{flash.text}</span>
          </div>
        )}

        {/* Queue switcher */}
        <div className="flex gap-2">
          {([
            { k: 'both', label: 'الكل', icon: Mail },
            { k: 'admin', label: 'أدمن', icon: ShieldAlert },
            { k: 'customer', label: 'عملاء', icon: Users },
          ] as const).map(({ k, label, icon: Icon }) => (
            <button key={k} onClick={() => setQueue(k as any)}
              className={`flex-1 py-2.5 rounded-xl border text-sm font-bold flex items-center justify-center gap-1.5 transition ${
                queue === k ? 'bg-[#34D399] text-[#04352A] border-[#059669]' : 'bg-white border-gray-200 text-gray-700'
              }`}>
              <Icon className="w-4 h-4" /> {label}
            </button>
          ))}
        </div>

        {/* Status filter chips */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {(['all','pending','sending','sent','failed','bounced','cancelled'] as Status[]).map(s => {
            const cnt = summary[s] || 0
            const isActive = status === s
            const cfg = s === 'all' ? { label: 'الكل', color: 'text-gray-700', bg: 'bg-white' } : STATUS_CONFIG[s]
            return (
              <button key={s} onClick={() => setStatus(s)}
                className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-bold border ${
                  isActive ? 'bg-[#34D399] text-[#04352A] border-[#059669]' : `${cfg.bg} ${cfg.color}`
                }`}>
                {cfg.label} {cnt > 0 && <span className="ms-1 opacity-75">({cnt})</span>}
              </button>
            )
          })}
        </div>

        {/* Rows */}
        <div className="space-y-2">
          {rows.length === 0 && (
            <div className="text-center py-12 bg-white rounded-2xl border border-gray-100 text-sm text-gray-500">
              <Inbox className="w-10 h-10 mx-auto mb-3 text-gray-300" />
              مفيش رسائل
            </div>
          )}
          {rows.map(r => {
            const cfg = STATUS_CONFIG[r.status] || STATUS_CONFIG.pending
            const isRetrying = retrying === r.id
            const canRetry = r.status === 'failed' || r.status === 'cancelled' || r.status === 'bounced'
            return (
              <div key={`${r.queue}_${r.id}`} className="bg-white rounded-2xl border border-gray-100 p-4">
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.color} border font-bold`}>{cfg.label}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                        r.queue === 'admin' ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-purple-50 text-purple-700 border-purple-200'
                      } border`}>{r.queue === 'admin' ? 'admin' : 'customer'}</span>
                      {r.template_key && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 font-mono">
                          {r.template_key}
                        </span>
                      )}
                      {r.attempts > 0 && (
                        <span className="text-[10px] text-gray-500">محاولة #{r.attempts}</span>
                      )}
                    </div>
                    <h3 className="font-bold text-gray-900 text-sm mb-1">{r.subject}</h3>
                    <p className="text-xs text-gray-600 font-mono mb-1">→ {r.to_email}{r.to_name ? ` (${r.to_name})` : ''}</p>
                    {r.error && (
                      <p className="text-xs text-red-700 bg-red-50 px-2 py-1.5 rounded-lg mt-2 line-clamp-2 font-mono">{r.error}</p>
                    )}
                    <div className="flex items-center gap-3 mt-2 text-[11px] text-gray-500">
                      <span>أُنشئ: {timeAgo(r.created_at)}</span>
                      {r.sent_at && <span>· أُرسل: {timeAgo(r.sent_at)}</span>}
                      {r.source && <span>· {r.source}</span>}
                      {r.category && <span>· {r.category}</span>}
                    </div>
                  </div>
                  {canRetry && (
                    <button onClick={() => retryRow(r)} disabled={isRetrying}
                      className="flex-shrink-0 px-3 py-1.5 rounded-lg bg-[#34D399] text-[#04352A] text-xs font-bold flex items-center gap-1 disabled:opacity-50">
                      {isRetrying ? <Loader2 className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3" />}
                      <span>إعادة</span>
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </main>
    </div>
  )
}
