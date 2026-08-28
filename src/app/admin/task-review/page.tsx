'use client'
// ============================================================================
// ✅ /admin/task-review — مراجعة التاسكات
//
// (٢٧ أغسطس ٢٠٢٦) محمد: «عايزين يكون فيه مراجعة للتاسكات أوتوماتيك
//   مش الموظف يقفل وخلاص».
//
// ليه: لما ربطنا التاسكات بالمرتب بقى فيه حافز مباشر إن حد يقفل تاسكات
// من غير ما ينفذها. فكل تاسك بيتقفل بيعدي على مراجعة:
//   • 🤖 auto_verified — النظام لقى دليل موضوعي (حجز اتم / الإقفال حصل
//     جوّه جلسة حضور فعلية)
//   • 🚩 مشبوه — اتقفل والموظف مش مسجّل حضور خالص في اليوم ده
//   • 👤 pending_review — مالوش دليل، المدير هو اللي يقرر
// والمرتب بيحسب **المتحقّق منه بس**.
// ============================================================================
import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import { CheckCircle2, XCircle, Loader2, RefreshCw, ShieldCheck, AlertTriangle, Bot } from 'lucide-react'

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
const MADMONA = 'c8b7b9d7-6178-4d0c-abdf-66f34b628e9d'

type Task = {
  id: string; employee_id: string; title_ar: string; task_date: string
  completed_at: string | null; review_status: string; task_kind: string | null
  evidence: Record<string, unknown> | null
  employee?: { full_name: string; role_ar: string | null } | null
}

export default function TaskReviewPage() {
  const [rows, setRows] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<string | null>(null)
  const [stats, setStats] = useState<{ auto: number; manual: number; flagged: number } | null>(null)

  async function load() {
    setLoading(true)
    const { data } = await supabase
      .from('daily_tasks')
      .select('id, employee_id, title_ar, task_date, completed_at, review_status, task_kind, evidence, employee:business_employees(full_name, role_ar)')
      .eq('status', 'completed').eq('review_status', 'pending_review')
      .order('task_date', { ascending: false }).limit(200)
    setRows((data as unknown as Task[]) || [])
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  async function runAuto() {
    setBusy('auto')
    const { data } = await supabase.rpc('auto_review_tasks' as never, { p_supplier_id: MADMONA } as never)
    const r = (data as { auto_verified: number; needs_review: number; flagged: number }[] | null)?.[0]
    if (r) setStats({ auto: r.auto_verified, manual: r.needs_review, flagged: r.flagged })
    setBusy(null); load()
  }

  async function decide(id: string, ok: boolean) {
    setBusy(id)
    await supabase.from('daily_tasks')
      .update({ review_status: ok ? 'verified' : 'rejected', reviewed_at: new Date().toISOString() } as never)
      .eq('id', id)
    setRows((v) => v.filter((t) => t.id !== id))
    setBusy(null)
  }

  const isFlagged = (t: Task) => !!(t.evidence && (t.evidence as { flag?: string }).flag)

  return (
    <div className="max-w-4xl mx-auto p-4" dir="rtl">
      <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
        <h1 className="text-lg font-black text-gray-900 flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-[#059669]" /> مراجعة التاسكات
        </h1>
        <div className="flex gap-2">
          <button onClick={runAuto} disabled={busy === 'auto'}
            className="px-3 py-2 rounded-xl bg-[#34D399] text-[#04352A] text-sm font-bold flex items-center gap-1.5 disabled:opacity-50">
            {busy === 'auto' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Bot className="w-4 h-4" />} مراجعة أوتوماتيك
          </button>
          <button onClick={load} className="px-3 py-2 rounded-xl bg-[#F1EEE6] text-sm font-bold flex items-center gap-1.5">
            <RefreshCw className="w-4 h-4" /> حدّث
          </button>
        </div>
      </div>

      <p className="text-xs text-gray-500 mb-3 leading-relaxed">
        التاسكات اللي النظام لقى لها <b>دليل موضوعي</b> بتتأكد لوحدها. اللي هنا مالهاش دليل —
        إنت اللي تقرر. المرتب بيحسب <b>المتحقّق منه بس</b>.
      </p>

      {stats && (
        <div className="rounded-xl bg-green-50 text-green-900 text-xs font-bold p-3 mb-3">
          🤖 اتأكد تلقائيًا: <b>{stats.auto}</b> · محتاج مراجعتك: <b>{stats.manual}</b>
          {stats.flagged > 0 && <> · 🚩 مشبوه: <b>{stats.flagged}</b></>}
        </div>
      )}

      {loading ? (
        <div className="py-16 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-gray-400" /></div>
      ) : rows.length === 0 ? (
        <div className="py-16 text-center text-gray-500 font-bold">
          مفيش تاسكات مستنية مراجعة ✓
        </div>
      ) : (
        <div className="space-y-2">
          {rows.map((t) => (
            <div key={t.id} className={`rounded-2xl border p-3 bg-white ${isFlagged(t) ? 'border-amber-300' : 'border-gray-200'}`}>
              {isFlagged(t) && (
                <div className="flex items-center gap-1.5 text-[11px] font-black text-amber-700 mb-1.5">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  {String((t.evidence as { flag?: string }).flag)}
                </div>
              )}
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-bold text-sm text-gray-900">{t.title_ar}</p>
                  <p className="text-[11px] text-gray-500 mt-0.5">
                    {t.employee?.full_name || '—'}
                    {t.employee?.role_ar ? ` · ${t.employee.role_ar}` : ''}
                    {' · '}{t.task_date}
                    {t.completed_at ? ` · اتقفل ${new Date(t.completed_at).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}` : ''}
                  </p>
                </div>
                <div className="flex gap-1.5 shrink-0">
                  <button onClick={() => decide(t.id, true)} disabled={busy === t.id}
                    title="اتنفذ فعلاً" aria-label="اتنفذ فعلاً"
                    className="w-9 h-9 rounded-xl bg-[#34D399]/15 text-[#059669] flex items-center justify-center disabled:opacity-50">
                    <CheckCircle2 className="w-4.5 h-4.5" />
                  </button>
                  <button onClick={() => decide(t.id, false)} disabled={busy === t.id}
                    title="مااتنفذش" aria-label="مااتنفذش"
                    className="w-9 h-9 rounded-xl bg-red-50 text-red-600 flex items-center justify-center disabled:opacity-50">
                    <XCircle className="w-4.5 h-4.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
