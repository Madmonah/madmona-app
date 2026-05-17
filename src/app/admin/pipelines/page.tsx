'use client'

// src/app/admin/pipelines/page.tsx
// Pipelines Command Center — luxury Madmona-branded admin UI

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import {
  Activity, Play, Clock, CheckCircle2, XCircle, Loader2,
  ChevronLeft, Workflow, Zap, TrendingUp, Layers, AlertCircle,
  Sparkles, ArrowRight, Calendar, Network, Target, Shield,
  DollarSign, Megaphone, Database, RefreshCw, X,
} from 'lucide-react'

// ============================================================================
// Types
// ============================================================================

interface Step {
  agent: string
  output_key: string
  uses_context: boolean
  required: boolean
  description?: string
}

interface PipelineRun {
  id: string
  pipeline_name?: string
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'
  started_at: string
  completed_at: string | null
  total_steps: number
  current_step: number
  error: string | null
  triggered_by: string | null
}

interface Pipeline {
  id: string
  name: string
  description: string
  steps: Step[]
  schedule_cron: string
  enabled: boolean
  last_run: PipelineRun | null
  total_runs: number
  success_runs: number
}

interface RunDetail {
  run: PipelineRun & { shared_context: Record<string, unknown>; pipeline_name: string }
  steps: Array<{
    id: string
    step_index: number
    agent_name: string
    status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped'
    started_at: string | null
    completed_at: string | null
    duration_ms: number | null
    output: unknown
    output_key: string | null
    error: string | null
  }>
}

// ============================================================================
// Pipeline metadata (icon + theme per pipeline)
// ============================================================================

const PIPELINE_META: Record<string, { icon: typeof Megaphone; gradient: string; emoji: string; arabicName: string }> = {
  'daily-content': { icon: Megaphone, gradient: 'from-[#1F6F5F] to-[#2d7a52]', emoji: '🎬', arabicName: 'محتوى اليوم' },
  'lead-funnel': { icon: Target, gradient: 'from-[#2FA084] to-[#d4a017]', emoji: '🎯', arabicName: 'تأهيل وقفل العملاء' },
  'quality-trust': { icon: Shield, gradient: 'from-[#6FCF97] to-[#ea580c]', emoji: '🛡️', arabicName: 'الجودة والأمان' },
  'pricing-strategy': { icon: DollarSign, gradient: 'from-purple-700 to-indigo-600', emoji: '💎', arabicName: 'استراتيجية التسعير' },
}

const SCHEDULE_LABEL: Record<string, string> = {
  '0 6 * * *': 'كل يوم 6:00 ص',
  '0 */2 * * *': 'كل ساعتين',
  '0 */6 * * *': 'كل 6 ساعات',
  '0 10 * * *': 'كل يوم 10:00 ص',
}

// ============================================================================
// Page
// ============================================================================

export default function PipelinesPage() {
  const [adminPw, setAdminPw] = useState<string>(() => {
    if (typeof window !== 'undefined') return sessionStorage.getItem('madmona_admin_pw') ?? ''
    return ''
  })
  const [pipelines, setPipelines] = useState<Pipeline[]>([])
  const [recentRuns, setRecentRuns] = useState<PipelineRun[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [triggering, setTriggering] = useState<string | null>(null)
  const [selectedRun, setSelectedRun] = useState<RunDetail | null>(null)
  const [loadingRun, setLoadingRun] = useState(false)

  // ----- Fetch pipelines -----
  const fetchPipelines = useCallback(async (pw: string) => {
    try {
      const res = await fetch('/api/admin/pipelines', { headers: { 'x-admin-pw': pw } })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        throw new Error(d.error ?? 'فشل')
      }
      const data = await res.json()
      setPipelines(data.pipelines ?? [])
      setRecentRuns(data.recent_runs ?? [])
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'خطأ')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    let pw = adminPw
    if (!pw) {
      const entered = typeof window !== 'undefined' ? prompt('كلمة سر الـ admin:') : ''
      if (!entered) {
        setError('مطلوب كلمة سر')
        setLoading(false)
        return
      }
      sessionStorage.setItem('madmona_admin_pw', entered)
      setAdminPw(entered)
      pw = entered
    }
    fetchPipelines(pw)
    const interval = setInterval(() => fetchPipelines(pw), 15000) // poll every 15s
    return () => clearInterval(interval)
  }, [adminPw, fetchPipelines])

  // ----- Trigger pipeline -----
  const handleTrigger = async (name: string) => {
    if (!adminPw) return
    setTriggering(name)
    try {
      const res = await fetch('/api/admin/pipelines/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-pw': adminPw },
        body: JSON.stringify({ pipeline_name: name }),
      })
      await res.json()
      // immediate refresh
      await fetchPipelines(adminPw)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'خطأ')
    } finally {
      setTriggering(null)
    }
  }

  // ----- View run details -----
  const handleViewRun = async (runId: string) => {
    setLoadingRun(true)
    try {
      const res = await fetch(`/api/admin/pipelines/runs/${runId}`, { headers: { 'x-admin-pw': adminPw } })
      const data = await res.json()
      setSelectedRun(data)
    } catch {
      // ignore
    } finally {
      setLoadingRun(false)
    }
  }

  // ----- Stats -----
  const totalRuns = pipelines.reduce((s, p) => s + p.total_runs, 0)
  const totalSuccess = pipelines.reduce((s, p) => s + p.success_runs, 0)
  const successRate = totalRuns > 0 ? Math.round((totalSuccess / totalRuns) * 100) : 0
  const todayRuns = recentRuns.filter(r => {
    const d = new Date(r.started_at)
    const now = new Date()
    return d.toDateString() === now.toDateString()
  }).length
  const activeRuns = pipelines.filter(p => p.last_run?.status === 'running').length

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#FAF7F0] to-[#f5efe1] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-[#1F6F5F] animate-spin mx-auto mb-4" />
          <p className="text-[#1F6F5F] font-bold">جاري تحميل النظام...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#FAF7F0] to-[#f5efe1] flex items-center justify-center p-6">
        <div className="bg-white rounded-3xl p-8 shadow-2xl max-w-md text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-black text-gray-900 mb-2">حصل خطأ</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => { sessionStorage.removeItem('madmona_admin_pw'); window.location.reload() }}
            className="px-6 py-3 bg-[#1F6F5F] text-white rounded-xl font-bold hover:bg-[#164a30] transition-colors"
          >
            حاول تاني
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#FAF7F0] via-[#f5efe1] to-[#FAF7F0]" dir="rtl">
      {/* ============== HERO ============== */}
      <header className="relative overflow-hidden bg-gradient-to-br from-[#0F3324] via-[#1F6F5F] to-[#2d7a52] text-white">
        <div className="absolute inset-0 opacity-10" style={{
          backgroundImage: `radial-gradient(circle at 20% 50%, white 0, transparent 50%), radial-gradient(circle at 80% 80%, white 0, transparent 50%)`,
        }} />
        <div className="relative max-w-7xl mx-auto px-6 py-12">
          <Link href="/admin/dashboard" className="inline-flex items-center gap-2 text-white/70 hover:text-white text-sm mb-6 transition-colors">
            <ChevronLeft className="w-4 h-4" /> رجوع للـ Dashboard
          </Link>

          <div className="flex items-start justify-between flex-wrap gap-6">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-14 h-14 bg-[#2FA084]/20 backdrop-blur rounded-2xl flex items-center justify-center border border-[#2FA084]/30">
                  <Workflow className="w-7 h-7 text-[#2FA084]" />
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-[3px] text-[#2FA084] font-bold">PIPELINE OS</p>
                  <h1 className="text-4xl md:text-5xl font-black leading-none">مركز التشغيل</h1>
                </div>
              </div>
              <p className="text-lg text-white/80 max-w-2xl leading-relaxed">
                نظام تشغيل لـ <span className="font-bold text-[#2FA084]">47 agent</span> بيشتغلوا كفريق واحد متناسق.
                كل pipeline = سلسلة من الأجينتس بتمرّر شغلها لبعض أوتوماتيك.
              </p>
            </div>

            {activeRuns > 0 && (
              <div className="flex items-center gap-3 bg-green-500/20 backdrop-blur border border-green-400/40 rounded-2xl px-5 py-3">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-green-400" />
                </span>
                <span className="font-bold">{activeRuns} pipeline شغّال دلوقتي</span>
              </div>
            )}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-10">
            <StatTile icon={<Workflow className="w-5 h-5" />} label="Pipelines" value={pipelines.length} accent="bg-white/10" />
            <StatTile icon={<Activity className="w-5 h-5" />} label="إجمالي الـ runs" value={totalRuns} accent="bg-white/10" />
            <StatTile icon={<TrendingUp className="w-5 h-5" />} label="معدل النجاح" value={`${successRate}%`} accent="bg-[#2FA084]/20" />
            <StatTile icon={<Calendar className="w-5 h-5" />} label="runs اليوم" value={todayRuns} accent="bg-white/10" />
          </div>
        </div>
      </header>

      {/* ============== PIPELINES GRID ============== */}
      <main className="max-w-7xl mx-auto px-6 py-10">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xs font-black text-gray-500 uppercase tracking-[3px] flex items-center gap-2">
            <Layers className="w-3 h-3" /> الـ Pipelines المتاحة
          </h2>
          <button
            onClick={() => fetchPipelines(adminPw)}
            className="flex items-center gap-2 text-xs text-gray-500 hover:text-[#1F6F5F] transition-colors"
          >
            <RefreshCw className="w-3 h-3" /> تحديث
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-12">
          {pipelines.map(p => (
            <PipelineCard
              key={p.id}
              pipeline={p}
              onTrigger={() => handleTrigger(p.name)}
              triggering={triggering === p.name}
              onViewRun={(id) => handleViewRun(id)}
            />
          ))}
        </div>

        {/* ============== RECENT RUNS TIMELINE ============== */}
        <div>
          <h2 className="text-xs font-black text-gray-500 uppercase tracking-[3px] flex items-center gap-2 mb-4">
            <Activity className="w-3 h-3" /> آخر العمليات
          </h2>
          <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-100">
            {recentRuns.length === 0 ? (
              <div className="p-12 text-center text-gray-400">مفيش runs لسة</div>
            ) : (
              <div className="divide-y divide-gray-100">
                {recentRuns.map(run => (
                  <RunRow key={run.id} run={run} onClick={() => handleViewRun(run.id)} />
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* ============== RUN DETAIL MODAL ============== */}
      {(selectedRun || loadingRun) && (
        <RunDetailModal
          detail={selectedRun}
          loading={loadingRun}
          onClose={() => setSelectedRun(null)}
        />
      )}
    </div>
  )
}

// ============================================================================
// Components
// ============================================================================

function StatTile({ icon, label, value, accent }: { icon: React.ReactNode; label: string; value: string | number; accent: string }) {
  return (
    <div className={`${accent} backdrop-blur rounded-2xl p-4 border border-white/10`}>
      <div className="flex items-center gap-2 mb-2 text-white/70">{icon}<span className="text-[11px] uppercase tracking-widest font-bold">{label}</span></div>
      <p className="text-3xl font-black tabular">{value}</p>
    </div>
  )
}

function PipelineCard({ pipeline, onTrigger, triggering, onViewRun }: {
  pipeline: Pipeline
  onTrigger: () => void
  triggering: boolean
  onViewRun: (id: string) => void
}) {
  const meta = PIPELINE_META[pipeline.name] ?? { icon: Workflow, gradient: 'from-gray-700 to-gray-600', emoji: '⚙️', arabicName: pipeline.name }
  const Icon = meta.icon
  const isRunning = pipeline.last_run?.status === 'running'
  const lastStatus = pipeline.last_run?.status
  const successRate = pipeline.total_runs > 0 ? Math.round((pipeline.success_runs / pipeline.total_runs) * 100) : 0

  return (
    <div className={`relative bg-white rounded-3xl shadow-xl overflow-hidden border-2 transition-all duration-300 ${
      isRunning ? 'border-green-400 shadow-green-200/50' : 'border-transparent hover:shadow-2xl hover:-translate-y-1'
    }`}>
      {/* Header gradient */}
      <div className={`bg-gradient-to-br ${meta.gradient} p-6 text-white relative overflow-hidden`}>
        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: `radial-gradient(circle at 80% 20%, white 0, transparent 50%)` }} />
        <div className="relative flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="text-3xl">{meta.emoji}</div>
            <div>
              <h3 className="text-xl font-black leading-tight">{meta.arabicName}</h3>
              <p className="text-xs text-white/70 font-mono">{pipeline.name}</p>
            </div>
          </div>
          {isRunning && (
            <div className="flex items-center gap-1.5 bg-green-500 rounded-full px-3 py-1 shadow-lg">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-white" />
              </span>
              <span className="text-[11px] font-bold">شغّال</span>
            </div>
          )}
        </div>
      </div>

      <div className="p-6">
        <p className="text-sm text-gray-600 leading-relaxed mb-5">{pipeline.description}</p>

        {/* Pipeline visualization: chain of agents */}
        <div className="mb-5">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">الفريق ({pipeline.steps.length} agent)</p>
          <div className="flex items-center gap-1 overflow-x-auto pb-2">
            {pipeline.steps.map((step, i) => (
              <div key={i} className="flex items-center gap-1 flex-shrink-0">
                <div className={`relative px-3 py-1.5 rounded-lg text-[10px] font-bold whitespace-nowrap ${
                  step.required
                    ? 'bg-[#1F6F5F] text-white'
                    : 'bg-gray-100 text-gray-700 border border-gray-200'
                }`}>
                  {step.agent}
                  {!step.required && <span className="text-[9px] opacity-60 mr-1">(اختياري)</span>}
                </div>
                {i < pipeline.steps.length - 1 && (
                  <ArrowRight className="w-3.5 h-3.5 text-gray-300 flex-shrink-0 rotate-180" />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Last run + stats */}
        <div className="grid grid-cols-3 gap-3 mb-5 pb-5 border-b border-gray-100">
          <div>
            <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold mb-1">الجدولة</p>
            <p className="text-sm font-bold text-gray-900">{SCHEDULE_LABEL[pipeline.schedule_cron] ?? pipeline.schedule_cron}</p>
          </div>
          <div>
            <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold mb-1">إجمالي الـ runs</p>
            <p className="text-sm font-bold text-gray-900">{pipeline.total_runs}</p>
          </div>
          <div>
            <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold mb-1">معدل النجاح</p>
            <p className={`text-sm font-bold ${successRate >= 80 ? 'text-green-600' : successRate >= 50 ? 'text-amber-600' : 'text-red-600'}`}>
              {pipeline.total_runs > 0 ? `${successRate}%` : '—'}
            </p>
          </div>
        </div>

        {/* Last run status */}
        {pipeline.last_run ? (
          <button
            onClick={() => onViewRun(pipeline.last_run!.id)}
            className="w-full mb-3 text-right p-3 bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold mb-1">آخر تشغيل</p>
                <div className="flex items-center gap-2">
                  <StatusBadge status={lastStatus ?? 'pending'} />
                  <span className="text-xs text-gray-500">{relativeTime(pipeline.last_run.started_at)}</span>
                </div>
              </div>
              <ChevronLeft className="w-4 h-4 text-gray-400" />
            </div>
          </button>
        ) : (
          <div className="mb-3 text-xs text-gray-400 p-3 bg-gray-50 rounded-xl text-center">لسة ما اشتغلش</div>
        )}

        {/* Trigger button */}
        <button
          onClick={onTrigger}
          disabled={triggering || isRunning}
          className={`w-full bg-gradient-to-br ${meta.gradient} text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 shadow-lg hover:shadow-xl hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          {triggering ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> جاري التشغيل...</>
          ) : isRunning ? (
            <><Activity className="w-4 h-4" /> شغّال دلوقتي</>
          ) : (
            <><Play className="w-4 h-4 fill-white" /> شغّل دلوقتي</>
          )}
        </button>
      </div>
    </div>
  )
}

function RunRow({ run, onClick }: { run: PipelineRun; onClick: () => void }) {
  const meta = run.pipeline_name ? PIPELINE_META[run.pipeline_name] : null
  const duration = run.completed_at
    ? Math.round((new Date(run.completed_at).getTime() - new Date(run.started_at).getTime()) / 1000)
    : null

  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-4 p-4 hover:bg-gray-50 transition-colors text-right"
    >
      <div className="text-2xl">{meta?.emoji ?? '⚙️'}</div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <p className="font-bold text-gray-900 text-sm truncate">{meta?.arabicName ?? run.pipeline_name}</p>
          <StatusBadge status={run.status} />
        </div>
        <div className="flex items-center gap-3 text-xs text-gray-500">
          <span>{relativeTime(run.started_at)}</span>
          {duration !== null && <span>· {duration}s</span>}
          {run.triggered_by && <span>· {run.triggered_by === 'cron' ? '🕐 جدولة' : run.triggered_by === 'admin-manual' ? '👤 يدوي' : '🔌 API'}</span>}
        </div>
      </div>
      <div className="flex items-center gap-1 text-xs text-gray-500">
        <span>{run.current_step}/{run.total_steps}</span>
        <ChevronLeft className="w-3 h-3" />
      </div>
    </button>
  )
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; bg: string; icon: React.ReactNode }> = {
    completed: { label: 'تم', bg: 'bg-green-100 text-green-700', icon: <CheckCircle2 className="w-3 h-3" /> },
    running: { label: 'شغّال', bg: 'bg-blue-100 text-blue-700', icon: <Loader2 className="w-3 h-3 animate-spin" /> },
    failed: { label: 'فشل', bg: 'bg-red-100 text-red-700', icon: <XCircle className="w-3 h-3" /> },
    pending: { label: 'معلّق', bg: 'bg-gray-100 text-gray-600', icon: <Clock className="w-3 h-3" /> },
    cancelled: { label: 'ملغي', bg: 'bg-gray-100 text-gray-500', icon: <X className="w-3 h-3" /> },
  }
  const c = config[status] ?? config.pending
  return (
    <span className={`inline-flex items-center gap-1 ${c.bg} text-[10px] font-bold px-2 py-0.5 rounded-full`}>
      {c.icon} {c.label}
    </span>
  )
}

function RunDetailModal({ detail, loading, onClose }: { detail: RunDetail | null; loading: boolean; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto" onClick={onClose}>
      <div
        className="bg-white rounded-3xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl my-8"
        onClick={(e) => e.stopPropagation()}
        dir="rtl"
      >
        {loading ? (
          <div className="p-20 text-center">
            <Loader2 className="w-12 h-12 text-[#1F6F5F] animate-spin mx-auto mb-4" />
            <p className="text-gray-500">جاري التحميل...</p>
          </div>
        ) : detail ? (
          <>
            <div className="sticky top-0 bg-white border-b border-gray-100 p-6 flex items-center justify-between rounded-t-3xl">
              <div>
                <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold mb-1">تفاصيل التشغيل</p>
                <h2 className="text-xl font-black text-gray-900">
                  {PIPELINE_META[detail.run.pipeline_name]?.arabicName ?? detail.run.pipeline_name}
                </h2>
              </div>
              <button onClick={onClose} className="w-10 h-10 rounded-full hover:bg-gray-100 flex items-center justify-center">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="p-6">
              {/* Summary */}
              <div className="grid grid-cols-3 gap-3 mb-6">
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold mb-1">الحالة</p>
                  <StatusBadge status={detail.run.status} />
                </div>
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold mb-1">المدة</p>
                  <p className="text-sm font-black text-gray-900">
                    {detail.run.completed_at
                      ? `${Math.round((new Date(detail.run.completed_at).getTime() - new Date(detail.run.started_at).getTime()) / 1000)}s`
                      : '—'}
                  </p>
                </div>
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold mb-1">الخطوات</p>
                  <p className="text-sm font-black text-gray-900">{detail.run.current_step}/{detail.run.total_steps}</p>
                </div>
              </div>

              {detail.run.error && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
                  <p className="text-xs font-bold text-red-700 mb-1">الخطأ:</p>
                  <p className="text-sm text-red-600 font-mono">{detail.run.error}</p>
                </div>
              )}

              {/* Steps */}
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">سجل الخطوات</p>
              <div className="space-y-3 mb-6">
                {detail.steps.map((step) => (
                  <StepCard key={step.id} step={step} />
                ))}
              </div>

              {/* Shared context */}
              {Object.keys(detail.run.shared_context ?? {}).length > 0 && (
                <>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-1">
                    <Database className="w-3 h-3" /> الـ Context المشترك (اللي اتمرر بين الأجينتس)
                  </p>
                  <pre className="bg-[#0F3324] text-[#FAF7F0] text-[11px] font-mono p-4 rounded-xl overflow-x-auto leading-relaxed">
                    {JSON.stringify(detail.run.shared_context, null, 2)}
                  </pre>
                </>
              )}
            </div>
          </>
        ) : null}
      </div>
    </div>
  )
}

function StepCard({ step }: { step: RunDetail['steps'][number] }) {
  const colors: Record<string, string> = {
    completed: 'border-green-200 bg-green-50',
    failed: 'border-red-200 bg-red-50',
    running: 'border-blue-200 bg-blue-50',
    pending: 'border-gray-200 bg-gray-50',
    skipped: 'border-gray-200 bg-gray-50',
  }
  return (
    <div className={`border rounded-xl p-4 ${colors[step.status] ?? colors.pending}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-white text-xs font-bold flex items-center justify-center shadow-sm">{step.step_index + 1}</span>
          <span className="font-bold text-gray-900 text-sm font-mono">{step.agent_name}</span>
          <StatusBadge status={step.status} />
        </div>
        {step.duration_ms !== null && (
          <span className="text-[11px] text-gray-500 font-mono">{Math.round(step.duration_ms / 1000)}s</span>
        )}
      </div>
      {step.error && (
        <p className="text-xs text-red-600 font-mono mt-2">{step.error}</p>
      )}
      {step.output_key && step.status === 'completed' && (
        <p className="text-[10px] text-gray-500 mt-2">
          <Sparkles className="w-3 h-3 inline ml-1" />
          خرج المخرجات تحت <code className="bg-white px-1.5 py-0.5 rounded font-mono text-[10px]">context.{step.output_key}</code>
        </p>
      )}
    </div>
  )
}

// ============================================================================
// Helpers
// ============================================================================

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const secs = Math.floor(diff / 1000)
  if (secs < 60) return `منذ ${secs} ثانية`
  const mins = Math.floor(secs / 60)
  if (mins < 60) return `منذ ${mins} دقيقة`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `منذ ${hours} ساعة`
  const days = Math.floor(hours / 24)
  return `منذ ${days} يوم`
}
