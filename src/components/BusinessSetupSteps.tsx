'use client'
// 🧭 (٥ سبتمبر ٢٠٢٦) خطوات استكمال حساب الشركة.
//    محمد: «لما أي مورد يستلم حسابه نمشي معاه بخطوات استكمال حساب الشركة
//    (فروع · موظفين …) لحد ما يخلص بناء الشركة بالكامل».
//    كل خطوة بتتحسب من الداتا الحقيقية في `business_setup_progress()` —
//    مفيش تشيك-بوكس يدوي، والخطوة بتتقفل لوحدها أول ما الداتا تتحط.
//    بتتعرض في لوحة الإدارة (فوق الموديولات) وفي كارت «بيزنسي» في حسابي.
//    النداء عبر financeRpc (p_token تلقائي) — الدرس الأكبر ٢٥/٨.
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { CheckCircle2, Circle, ChevronLeft, PartyPopper } from 'lucide-react'
import { financeRpc } from '@/lib/financeRpc'

type Step = { key: string; label: string; hint: string; href: string; done: boolean; detail?: string; optional?: boolean }
type Progress = { ok: boolean; error?: string; pct: number; done: number; total: number; steps: Step[]; business_name?: string }

function stepHref(supplierId: string, href: string) {
  return href.startsWith('/') ? href : `/admin/business-finance/${supplierId}/${href}`
}

export default function BusinessSetupSteps({ supplierId, compact = false }: { supplierId: string; compact?: boolean }) {
  const [p, setP] = useState<Progress | null>(null)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    let alive = true
    financeRpc('business_setup_progress', { p_supplier_id: supplierId }).then(({ data }) => {
      if (alive && data && data.ok) setP(data as Progress)
    })
    return () => { alive = false }
  }, [supplierId])

  if (!p) return null
  const required = p.steps.filter((s) => !s.optional)
  const reqDone = required.filter((s) => s.done).length
  const complete = reqDone === required.length
  const next = p.steps.find((s) => !s.done)

  // 📱 نسخة مختصرة لكارت «بيزنسي»: سطر واحد + الخطوة الجاية
  if (compact) {
    if (complete && !next) return null
    return (
      <Link
        href={next ? stepHref(supplierId, next.href) : `/admin/business-finance/${supplierId}`}
        className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 no-underline"
      >
        <div className="relative w-9 h-9 flex-shrink-0">
          <svg viewBox="0 0 36 36" className="w-9 h-9 -rotate-90">
            <circle cx="18" cy="18" r="15" fill="none" stroke="#FDE68A" strokeWidth="4" />
            <circle cx="18" cy="18" r="15" fill="none" stroke="#059669" strokeWidth="4" strokeDasharray={`${(2 * Math.PI * 15 * p.pct) / 100} 999`} strokeLinecap="round" />
          </svg>
          <span className="absolute inset-0 grid place-items-center text-[10px] font-black text-[#1A2E26]">{p.pct}٪</span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-black text-[#1A2E26]">استكمال بناء الشركة — {reqDone} من {required.length}</p>
          {next && <p className="text-[11px] text-amber-800 truncate">الخطوة الجاية: {next.label}{next.detail ? ` · ${next.detail}` : ''}</p>}
        </div>
        <ChevronLeft className="w-4 h-4 text-amber-700 flex-shrink-0" />
      </Link>
    )
  }

  if (complete && !open) {
    return (
      <section className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 flex items-center gap-3">
        <PartyPopper className="w-5 h-5 text-emerald-700" />
        <p className="text-sm font-black text-emerald-900 flex-1">شركتك مكتملة على مضمونة — كل الخطوات الأساسية اتعملت</p>
        {next && (
          <button onClick={() => setOpen(true)} className="text-xs font-bold text-emerald-800 underline">
            خطوة إضافية: {next.label}
          </button>
        )}
      </section>
    )
  }

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-4">
      <div className="flex items-center justify-between gap-3 mb-3">
        <div>
          <h2 className="text-sm font-black text-[#1A2E26]">استكمال بناء الشركة</h2>
          <p className="text-[11px] text-gray-500">{reqDone} من {required.length} خطوات أساسية — كل خطوة بتتقفل لوحدها أول ما بياناتها تتحط</p>
        </div>
        <span className="text-lg font-black text-[#059669] tabular-nums">{p.pct}٪</span>
      </div>
      <div className="h-2 rounded-full bg-gray-100 overflow-hidden mb-4">
        <div className="h-full rounded-full bg-[#059669] transition-all" style={{ width: `${p.pct}%` }} />
      </div>
      <ol className="space-y-2">
        {p.steps.map((s, i) => (
          <li key={s.key}>
            <Link
              href={stepHref(supplierId, s.href)}
              className={`flex items-start gap-3 rounded-xl px-3 py-2.5 no-underline border ${s.done ? 'border-emerald-100 bg-emerald-50/60' : 'border-gray-100 bg-[#FAFAF7] hover:bg-white'}`}
            >
              {s.done
                ? <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                : <Circle className="w-5 h-5 text-gray-300 flex-shrink-0 mt-0.5" />}
              <div className="min-w-0 flex-1">
                <p className={`text-sm font-bold ${s.done ? 'text-emerald-900 line-through decoration-emerald-300' : 'text-[#1A2E26]'}`}>
                  {i + 1}. {s.label}
                  {s.optional && <span className="ms-1 text-[10px] font-normal text-gray-400">(اختياري)</span>}
                </p>
                <p className="text-[11px] text-gray-500 leading-relaxed">{s.done && s.detail ? s.detail : s.hint}</p>
                {!s.done && s.detail && <p className="text-[11px] font-bold text-amber-700 mt-0.5">{s.detail}</p>}
              </div>
              {!s.done && <ChevronLeft className="w-4 h-4 text-gray-400 flex-shrink-0 mt-1" />}
            </Link>
          </li>
        ))}
      </ol>
    </section>
  )
}
