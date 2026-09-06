'use client'

// ============================================================================
// 🧭 «كمّل شركتك» — ويزارد خطوة بخطوة لصاحب البيزنس الجديد (٦ سبتمبر ٢٠٢٦)
//
// محمد: «هو محتاج توجيه لأنه مش هيعرف يضيف موظف إلا لما يضيف فرع».
// خطوات الاستكمال (business_setup_progress) كانت تشيك ليست — كل اللينكات جنب
// بعض وهو حر. هنا خطوة واحدة على الشاشة بالترتيب، والفورم جوّاها:
//   الهوية ← الفرع (بعنوانه ومواعيده) ← الموظفين (لازم فرع الأول) ← الكتالوج
//   ← إعلان منشور ← بوت الواتساب (اختياري).
// المصدر الواحد للحالة: business_setup_state (التقدم + الفروع + الموظفين).
// الكتابة: business_branch_save / business_employee_save — نفس دوال الفروع
// والفريق (مفيش مسار موازي). كله عبر financeRpc (p_token تلقائي — نظامين الدخول).
// ============================================================================
import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { CheckCircle2, ChevronLeft, ChevronRight, PartyPopper } from 'lucide-react'
import { financeRpc } from '@/lib/financeRpc'

type Step = { key: string; label: string; hint: string; href: string; done: boolean; detail?: string; optional?: boolean }
type Progress = { ok: boolean; error?: string; pct: number; done: number; total: number; steps: Step[]; business_name?: string }
type Branch = { id: string; name: string; code: string | null; address: string | null; city: string | null; phone: string | null; opens_at: string | null; closes_at: string | null }
type Employee = { id: string; full_name: string; phone: string | null; role_ar: string | null; branch_id: string | null; status: string | null }
type State = { ok: boolean; error?: string; progress: Progress; branches: Branch[]; employees: Employee[] }

// ترتيب الويزارد — «hours» بتتقفل مع الفرع (المواعيد جوّه فورم الفرع)
const ORDER = ['identity', 'branches', 'hours', 'team', 'menu', 'catalog', 'published', 'wa_bot']

const input = 'mt-1 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-[16px] bg-white focus:outline-none focus:ring-2 focus:ring-[#059669]/30'

export default function BusinessSetupWizardPage({ params }: { params: { supplierId: string } }) {
  const { supplierId } = params
  const search = useSearchParams()
  const welcome = search?.get('welcome') === '1'
  const base = `/admin/business-finance/${supplierId}`

  const [st, setSt] = useState<State | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [idx, setIdx] = useState<number | null>(null)     // الخطوة المفتوحة (null = أول ناقصة)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  const [branch, setBranch] = useState({ name: '', address: '', city: '', phone: '', opens_at: '09:00', closes_at: '18:00' })
  const [emp, setEmp] = useState({ full_name: '', phone: '', role_ar: '', branch_id: '' })

  const load = useCallback(async () => {
    const { data, error } = await financeRpc('business_setup_state', { p_supplier_id: supplierId })
    if (error || !data?.ok) { setErr(error?.message || data?.error || 'مش قادرين نحمّل الحالة'); return }
    setSt(data as State)
    if (!emp.branch_id && (data as State).branches[0]) setEmp((e) => ({ ...e, branch_id: (data as State).branches[0].id }))
  }, [supplierId, emp.branch_id])

  useEffect(() => { load() }, [load])

  if (err) return <main dir="rtl" className="p-6 text-center text-sm text-red-600">{err}</main>
  if (!st) return <main dir="rtl" className="p-6 text-center text-sm text-gray-500">⏳ بنحمّل…</main>

  const steps = [...st.progress.steps].sort((a, b) => ORDER.indexOf(a.key) - ORDER.indexOf(b.key))
    .filter((s) => s.key !== 'hours')   // المواعيد جزء من فورم الفرع
  const required = steps.filter((s) => !s.optional)
  const reqDone = required.filter((s) => s.done).length
  const firstOpen = steps.findIndex((s) => !s.done)
  const cur = idx ?? (firstOpen === -1 ? steps.length - 1 : firstOpen)
  const step = steps[cur]
  const complete = reqDone === required.length

  async function saveBranch() {
    if (!branch.name.trim()) { setMsg('اكتب اسم الفرع'); return }
    setBusy(true); setMsg(null)
    const { data } = await financeRpc('business_branch_save', { p_supplier_id: supplierId, p_branch: branch })
    setBusy(false)
    if (!data?.ok) { setMsg(data?.error || 'مااتحفظش'); return }
    setBranch({ name: '', address: '', city: '', phone: '', opens_at: '09:00', closes_at: '18:00' })
    setMsg('✅ الفرع اتضاف'); await load()
  }
  async function saveEmployee() {
    if (!emp.full_name.trim()) { setMsg('اكتب اسم الموظف'); return }
    if (!emp.branch_id) { setMsg('اختار الفرع'); return }
    setBusy(true); setMsg(null)
    const { data } = await financeRpc('business_employee_save', { p_supplier_id: supplierId, p_employee: emp })
    setBusy(false)
    if (!data?.ok) { setMsg(data?.error || 'مااتحفظش'); return }
    setEmp((e) => ({ ...e, full_name: '', phone: '', role_ar: '' }))
    setMsg('✅ الموظف اتضاف'); await load()
  }

  const go = (n: number) => { setMsg(null); setIdx(Math.max(0, Math.min(steps.length - 1, n))) }
  const hrefOf = (h: string) => (h.startsWith('/') ? h : `${base}/${h}`)

  return (
    <main dir="rtl" className="mx-auto max-w-2xl p-4 space-y-4">
      <header>
        {welcome && (
          <div className="rounded-2xl bg-[#04352A] text-white px-4 py-3 mb-3">
            <p className="font-black">🎉 مبروك — حسابك على مضمونة جاهز</p>
            <p className="text-xs text-white/75 mt-1">هنمشي معاك خطوة خطوة لحد ما شركتك تبقى كاملة. كل خطوة دقيقة.</p>
          </div>
        )}
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-lg font-black text-[#0C2B22]">🧭 كمّل شركتك{st.progress.business_name ? ` — ${st.progress.business_name}` : ''}</h1>
            <p className="text-xs text-gray-500">{reqDone} من {required.length} خطوات أساسية</p>
          </div>
          <Link href={base} className="text-xs font-bold text-[#059669]">لوحة الإدارة ←</Link>
        </div>
        <div className="mt-2 h-2 rounded-full bg-gray-100 overflow-hidden">
          <div className="h-full rounded-full bg-[#059669] transition-all" style={{ width: `${st.progress.pct}%` }} />
        </div>
        {/* شريط الخطوات — نقط */}
        <ol className="mt-3 flex items-center gap-1.5 overflow-x-auto">
          {steps.map((s, i) => (
            <li key={s.key}>
              <button onClick={() => go(i)}
                className={`whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-bold border ${i === cur ? 'bg-[#04352A] text-white border-[#04352A]' : s.done ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-white text-gray-500 border-gray-200'}`}>
                {s.done ? '✓ ' : `${i + 1}. `}{s.label}
              </button>
            </li>
          ))}
        </ol>
      </header>

      {complete && cur === steps.length - 1 && step?.done && (
        <section className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 flex items-center gap-3">
          <PartyPopper className="w-5 h-5 text-emerald-700" />
          <p className="text-sm font-black text-emerald-900">شركتك مكتملة على مضمونة 🎉</p>
        </section>
      )}

      {msg && <div className="rounded-xl bg-[#F3F6F4] border border-[#E4DECE] px-3 py-2 text-sm">{msg}</div>}

      {step && (
        <section className="rounded-2xl border border-[#E4DECE] bg-white p-4">
          <div className="flex items-start gap-3 mb-3">
            {step.done ? <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" /> : <span className="w-6 h-6 grid place-items-center rounded-full bg-[#04352A] text-white text-xs font-black shrink-0">{cur + 1}</span>}
            <div>
              <h2 className="font-black text-[#0C2B22]">{step.label}{step.optional && <span className="ms-1 text-[10px] font-normal text-gray-400">(اختياري)</span>}</h2>
              <p className="text-xs text-gray-500 mt-0.5">{step.done && step.detail ? step.detail : step.hint}</p>
            </div>
          </div>

          {/* ── الفرع: فورم جوّه الخطوة ── */}
          {step.key === 'branches' && (
            <div className="space-y-3">
              {st.branches.length > 0 && (
                <ul className="text-xs text-gray-600 space-y-1">
                  {st.branches.map((b) => <li key={b.id}>✓ {b.name}{b.address ? ` — ${b.address}` : ''}{b.opens_at ? ` · ${b.opens_at.slice(0, 5)}–${(b.closes_at || '').slice(0, 5)}` : ''}</li>)}
                </ul>
              )}
              <label className="block text-xs text-gray-600">اسم الفرع *<input value={branch.name} onChange={(e) => setBranch({ ...branch, name: e.target.value })} placeholder="الفرع الرئيسي" className={input} /></label>
              <label className="block text-xs text-gray-600">العنوان<input value={branch.address} onChange={(e) => setBranch({ ...branch, address: e.target.value })} placeholder="الشارع · الحي" className={input} /></label>
              <div className="grid grid-cols-2 gap-2">
                <label className="block text-xs text-gray-600">المدينة<input value={branch.city} onChange={(e) => setBranch({ ...branch, city: e.target.value })} className={input} /></label>
                <label className="block text-xs text-gray-600">تليفون الفرع<input value={branch.phone} onChange={(e) => setBranch({ ...branch, phone: e.target.value })} dir="ltr" className={input} /></label>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <label className="block text-xs text-gray-600">بيفتح<input type="time" value={branch.opens_at} onChange={(e) => setBranch({ ...branch, opens_at: e.target.value })} className={input} /></label>
                <label className="block text-xs text-gray-600">بيقفل<input type="time" value={branch.closes_at} onChange={(e) => setBranch({ ...branch, closes_at: e.target.value })} className={input} /></label>
              </div>
              <button onClick={saveBranch} disabled={busy} className="w-full bg-[#04352A] text-white font-black rounded-2xl py-3 text-sm disabled:opacity-50">{busy ? '…' : st.branches.length ? 'ضيف فرع تاني' : 'ضيف الفرع'}</button>
            </div>
          )}

          {/* ── الموظفين: لازم فرع الأول ── */}
          {step.key === 'team' && (
            st.branches.length === 0 ? (
              <div className="rounded-xl bg-amber-50 border border-amber-200 px-3 py-3 text-sm">
                <p className="font-bold text-amber-900">الموظف بيتربط بفرع — ضيف فرعك الأول.</p>
                <button onClick={() => go(steps.findIndex((s) => s.key === 'branches'))} className="mt-2 text-xs font-black text-[#059669] underline">→ ارجع لخطوة الفرع</button>
              </div>
            ) : (
              <div className="space-y-3">
                {st.employees.length > 0 && (
                  <ul className="text-xs text-gray-600 space-y-1">
                    {st.employees.map((e) => <li key={e.id}>✓ {e.full_name}{e.role_ar ? ` — ${e.role_ar}` : ''}</li>)}
                  </ul>
                )}
                <label className="block text-xs text-gray-600">اسم الموظف *<input value={emp.full_name} onChange={(e) => setEmp({ ...emp, full_name: e.target.value })} className={input} /></label>
                <div className="grid grid-cols-2 gap-2">
                  <label className="block text-xs text-gray-600">موبايله<input value={emp.phone} onChange={(e) => setEmp({ ...emp, phone: e.target.value })} dir="ltr" placeholder="01… أو +9715…" className={input} /></label>
                  <label className="block text-xs text-gray-600">وظيفته<input value={emp.role_ar} onChange={(e) => setEmp({ ...emp, role_ar: e.target.value })} placeholder="كاشير · مندوب · مدير" className={input} /></label>
                </div>
                <label className="block text-xs text-gray-600">الفرع *
                  <select value={emp.branch_id} onChange={(e) => setEmp({ ...emp, branch_id: e.target.value })} className={input}>
                    {st.branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                </label>
                <button onClick={saveEmployee} disabled={busy} className="w-full bg-[#04352A] text-white font-black rounded-2xl py-3 text-sm disabled:opacity-50">{busy ? '…' : st.employees.length ? 'ضيف موظف تاني' : 'ضيف الموظف'}</button>
                <p className="text-[11px] text-gray-400">الباسورد والصلاحيات من تاب «الفريق» بعدين.</p>
              </div>
            )
          )}

          {/* ── باقي الخطوات: شاشتها الموجودة + رجوع للتأكيد ── */}
          {!['branches', 'team'].includes(step.key) && (
            <div className="space-y-2">
              <Link href={hrefOf(step.href)} className="block text-center bg-[#04352A] text-white font-black rounded-2xl py-3 text-sm no-underline">
                {step.done ? 'افتح الشاشة' : `افتح: ${step.label}`} ↗
              </Link>
              {!step.done && <button onClick={() => load()} className="w-full text-xs font-bold text-[#059669] py-1">عملتها؟ اتأكد ✓</button>}
            </div>
          )}

          <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100">
            <button onClick={() => go(cur - 1)} disabled={cur === 0} className="inline-flex items-center gap-1 text-xs font-bold text-gray-500 disabled:opacity-30"><ChevronRight className="w-4 h-4" /> السابق</button>
            <button onClick={() => go(cur + 1)} disabled={cur === steps.length - 1} className="inline-flex items-center gap-1 text-xs font-black text-[#059669] disabled:opacity-30">{step.done ? 'التالي' : step.optional ? 'بعدين' : 'كمّلها بعدين'} <ChevronLeft className="w-4 h-4" /></button>
          </div>
        </section>
      )}
    </main>
  )
}
