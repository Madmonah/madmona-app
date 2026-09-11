'use client'
// ============================================================================
// 💳 /pro/pay — ادفع برنامج الإدارة بتحويل يدوي (١١ سبتمبر ٢٠٢٦)
// محمد: «لهجتي عاملين آلية دفع بإنستاباي وفودافون كاش — ممكن نعمل آلية زيهم بالظبط».
// نفس الأربع خطوات: ① اختار الطريقة → ② بيانات التحويل + المبلغ + مؤقت ساعة →
// ③ اسم صاحب الحساب المُحوِّل + صورة الإثبات → ④ «استلمنا — بيتفعّل بعد المراجعة».
// السعر وبيانات التحويل كلها من السيرفر (/api/subscription/pay?config=1) — مفيش رقم مكتوب هنا.
// ============================================================================
import { useEffect, useMemo, useRef, useState } from 'react'

type Method = { key: string; label: string; lines: { k: string; v: string }[]; hint: string }
type Cfg = { price: number; currency: string; methods: Method[] }
const ICON: Record<string, string> = { instapay: '⚡', vodafone_cash: '📱', bank_transfer: '🏦' }

export default function PayPage() {
  const [cfg, setCfg] = useState<Cfg | null>(null)
  const [method, setMethod] = useState<string>('')
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1)
  const [left, setLeft] = useState(3600)
  const [form, setForm] = useState({ sender_name: '', phone: '', business_name: '', reference: '' })
  const [file, setFile] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [doneId, setDoneId] = useState('')
  const [status, setStatus] = useState('pending')
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetch('/api/subscription/pay?config=1').then((r) => r.json()).then((j) => { if (j?.ok) setCfg(j) }).catch(() => {})
    try {
      const saved = localStorage.getItem('madmona_pay_pending')
      if (saved) { setDoneId(saved); setStep(4) }
    } catch { /* لا تخزين */ }
  }, [])

  // ⏱ مؤقت ساعة من لحظة اختيار الطريقة (زي لهجتي) — تنبيه بس، مابيمنعش الإرسال
  useEffect(() => {
    if (step < 2 || step > 3) return
    const t = setInterval(() => setLeft((s) => Math.max(0, s - 1)), 1000)
    return () => clearInterval(t)
  }, [step])

  // 🔄 polling على الحالة بعد الإرسال
  useEffect(() => {
    if (step !== 4 || !doneId) return
    let alive = true
    const tick = async () => {
      const r = await fetch(`/api/subscription/pay?id=${doneId}`, { cache: 'no-store' }).then((x) => x.json()).catch(() => null)
      if (!alive || !r?.ok) return
      setStatus(r.status)
      if (r.status !== 'pending') { try { localStorage.removeItem('madmona_pay_pending') } catch { /* */ } }
    }
    tick()
    const t = setInterval(tick, 20000)
    return () => { alive = false; clearInterval(t) }
  }, [step, doneId])

  const m = useMemo(() => cfg?.methods.find((x) => x.key === method) || null, [cfg, method])
  const price = cfg ? cfg.price.toLocaleString('ar-EG') : '…'
  const mm = String(Math.floor(left / 60)).padStart(2, '0'), ss = String(left % 60).padStart(2, '0')

  async function submit() {
    setErr('')
    if (!file) { setErr('ارفع صورة إثبات الدفع'); return }
    setBusy(true)
    const fd = new FormData()
    fd.set('method', method)
    Object.entries(form).forEach(([k, v]) => fd.set(k, v))
    fd.set('proof', file)
    try {
      const q = new URLSearchParams(window.location.search)
      for (const k of ['utm_source', 'utm_medium', 'utm_content', 'supplier_id']) if (q.get(k)) fd.set(k, q.get(k) as string)
    } catch { /* */ }
    const r = await fetch('/api/subscription/pay', { method: 'POST', body: fd })
    const j = await r.json().catch(() => ({}))
    setBusy(false)
    if (!r.ok || !j.ok) { setErr(j.error || 'حصل خطأ — جرّب تاني'); return }
    setDoneId(j.id); setStep(4)
    try { localStorage.setItem('madmona_pay_pending', j.id) } catch { /* */ }
  }

  const card = 'bg-white rounded-3xl border border-gray-200 shadow-sm'

  return (
    <main dir="rtl" className="min-h-screen bg-[#FAFAF7] text-[#0b1f1a]">
      <header className="bg-[#04352A] text-white">
        <div className="max-w-2xl mx-auto px-4 py-5 flex items-center justify-between">
          <a href="/pro" className="text-white/80 no-underline text-sm">← برنامج الإدارة</a>
          <div className="font-black">مضمونة</div>
        </div>
        <div className="max-w-2xl mx-auto px-4 pb-8 pt-2">
          <h1 className="text-2xl md:text-3xl font-black leading-snug">فعّل برنامج الإدارة</h1>
          <p className="text-white/80 mt-2 text-sm">حوّل بالطريقة اللي تريحك، ارفع إثبات الدفع، والفريق يفعّل حسابك بعد المراجعة.</p>
          <ol className="mt-5 grid grid-cols-4 gap-1 text-[11px] text-white/70">
            {['الطريقة', 'التحويل', 'الإثبات', 'التفعيل'].map((s, i) => (
              <li key={s} className={`text-center rounded-lg py-1.5 ${step >= i + 1 ? 'bg-[#34D399] text-[#04352A] font-bold' : 'bg-white/10'}`}>{i + 1}. {s}</li>
            ))}
          </ol>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 -mt-4 pb-16 grid gap-4">
        {/* ملخص الطلب */}
        <section className={`${card} p-4 flex items-center justify-between`}>
          <div>
            <div className="text-xs text-gray-500">الخطة</div>
            <div className="font-black text-[#04352A]">برنامج إدارة مضمونة</div>
            <div className="text-xs text-gray-500 mt-0.5">لعدد محدود من الحسابات</div>
          </div>
          <div className="text-left">
            <div className="text-xs text-gray-500">المبلغ</div>
            <div className="text-2xl font-black text-[#059669]">{price} <span className="text-sm">ج</span></div>
            <div className="text-[11px] text-gray-500">بدل كتير · من غير رسوم</div>
          </div>
        </section>

        {step === 1 && (
          <section className={`${card} p-4`}>
            <h2 className="font-black mb-3">① اختار طريقة الدفع</h2>
            {!cfg && <div className="text-sm text-gray-500">بنحمّل الطرق المتاحة…</div>}
            {cfg && cfg.methods.length === 0 && <div className="text-sm text-amber-700">طرق الدفع مش متاحة دلوقتي — كلّمنا واتساب.</div>}
            <div className="grid gap-2">
              {cfg?.methods.map((x) => (
                <button key={x.key} onClick={() => { setMethod(x.key); setLeft(3600); setStep(2) }} className="flex items-center gap-3 border rounded-2xl p-3.5 text-right hover:border-[#059669] hover:bg-emerald-50/40">
                  <span className="text-2xl">{ICON[x.key] || '💳'}</span>
                  <span className="flex-1"><b className="block">{x.label}</b><span className="text-xs text-gray-500">دفع محلي · التفعيل بعد المراجعة</span></span>
                  <span className="text-gray-400">←</span>
                </button>
              ))}
            </div>
          </section>
        )}

        {step >= 2 && step <= 3 && m && (
          <section className={`${card} p-4`}>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-black">② حوّل {price} ج على {m.label}</h2>
              <span className={`text-xs font-mono px-2 py-1 rounded-lg ${left < 300 ? 'bg-red-50 text-red-700' : 'bg-gray-100 text-gray-700'}`}>⏱ {mm}:{ss}</span>
            </div>
            <div className="rounded-2xl bg-[#F3FBF7] border border-emerald-100 p-3 grid gap-2">
              {m.lines.map((l) => (
                <div key={l.k} className="flex items-center justify-between gap-3 text-sm">
                  <span className="text-gray-500">{l.k}</span>
                  <button type="button" onClick={() => { navigator.clipboard?.writeText(l.v).catch(() => {}) }} className="font-mono font-bold text-[#04352A] select-all bg-white border rounded-lg px-2 py-1" title="اضغط للنسخ">{l.v} ⧉</button>
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-600 mt-3 leading-relaxed">{m.hint}</p>
            <ul className="text-xs text-gray-500 mt-2 list-disc pr-5 leading-relaxed">
              <li>الصورة لازم يبان فيها رقم المعاملة وتاريخها ووقتها.</li>
              <li>اسم المُحوِّل اللي هتكتبه لازم يطابق اسم الحساب اللي اتحوّل منه.</li>
            </ul>
            <div className="flex gap-2 mt-3">
              <button onClick={() => setStep(1)} className="text-sm text-gray-500 px-3 py-2">تغيير الطريقة</button>
              {step === 2 && <button onClick={() => setStep(3)} className="flex-1 bg-[#04352A] text-white font-black rounded-2xl px-5 py-3">حوّلت — ارفع الإثبات ←</button>}
            </div>
          </section>
        )}

        {step === 3 && (
          <section className={`${card} p-4 grid gap-3`}>
            <h2 className="font-black">③ أكّد الدفع</h2>
            <label className="grid gap-1 text-sm"><span className="text-gray-600">الاسم الكامل للحساب اللي حوّلت منه *</span>
              <input value={form.sender_name} onChange={(e) => setForm({ ...form, sender_name: e.target.value })} className="border rounded-xl px-3 py-3 text-base" placeholder="زي ما هو مكتوب في تطبيق البنك/المحفظة" /></label>
            <label className="grid gap-1 text-sm"><span className="text-gray-600">رقم موبايلك (واتساب) *</span>
              <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} inputMode="tel" className="border rounded-xl px-3 py-3 text-base" placeholder="01xxxxxxxxx" /></label>
            <label className="grid gap-1 text-sm"><span className="text-gray-600">اسم شركتك / نشاطك</span>
              <input value={form.business_name} onChange={(e) => setForm({ ...form, business_name: e.target.value })} className="border rounded-xl px-3 py-3 text-base" placeholder="زي ما سجّلته على مضمونة" /></label>
            <label className="grid gap-1 text-sm"><span className="text-gray-600">رقم المعاملة / المرجع (لو ظاهر)</span>
              <input value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} className="border rounded-xl px-3 py-3 text-base font-mono" /></label>
            <div className="grid gap-1 text-sm">
              <span className="text-gray-600">صورة إثبات الدفع *</span>
              <button type="button" onClick={() => fileRef.current?.click()} className={`border-2 border-dashed rounded-2xl p-5 text-center ${file ? 'border-[#059669] bg-emerald-50/40' : 'border-gray-300'}`}>
                {file ? <span className="font-bold text-[#04352A]">✓ {file.name} <span className="text-xs text-gray-500">({Math.round(file.size / 1024)} ك.ب)</span></span> : <span className="text-gray-600">اضغط لاختيار الصورة<br /><span className="text-xs text-gray-400">JPG · PNG · PDF — حتى ٥ ميجا</span></span>}
              </button>
              <input ref={fileRef} type="file" accept="image/*,.pdf" className="hidden" onChange={(e) => setFile(e.target.files?.[0] || null)} />
            </div>
            {err && <div className="bg-red-50 text-red-700 text-sm rounded-xl p-3">{err}</div>}
            <button disabled={busy} onClick={submit} className="bg-[#34D399] text-[#04352A] font-black rounded-2xl px-5 py-3.5 disabled:opacity-60">{busy ? 'بنرفع الإثبات…' : 'أكّد الدفع وابعت الطلب'}</button>
            <button onClick={() => setStep(2)} className="text-sm text-gray-500">← رجوع لبيانات التحويل</button>
          </section>
        )}

        {step === 4 && (
          <section className={`${card} p-6 text-center`}>
            {status === 'pending' && (<>
              <div className="text-4xl">⏳</div>
              <h2 className="font-black text-lg mt-2">استلمنا إثبات الدفع</h2>
              <p className="text-sm text-gray-600 mt-2 leading-relaxed">الفريق بيراجع التحويل وبيفعّل حسابك. هنكلّمك على واتساب أول ما يتفعّل، والصفحة دي بتتحدّث لوحدها.</p>
              <div className="text-[11px] text-gray-400 mt-3 font-mono">رقم الطلب: {doneId.slice(0, 8)}</div>
            </>)}
            {status === 'approved' && (<>
              <div className="text-4xl">✅</div>
              <h2 className="font-black text-lg mt-2">اتفعّل برنامج الإدارة</h2>
              <p className="text-sm text-gray-600 mt-2">ادخل على حسابك وابدأ من «كمّل شركتك».</p>
              <a href="/login?next=__auto" className="inline-block mt-4 bg-[#04352A] text-white font-black rounded-2xl px-6 py-3 no-underline">ادخل على لوحتك ←</a>
            </>)}
            {status === 'rejected' && (<>
              <div className="text-4xl">⚠️</div>
              <h2 className="font-black text-lg mt-2">محتاجين نراجع معاك</h2>
              <p className="text-sm text-gray-600 mt-2">مقدرناش نأكّد التحويل من الإثبات ده. كلّمنا على واتساب وهنحلّها معاك.</p>
              <a href="https://wa.me/201002229982" className="inline-block mt-4 bg-[#25D366] text-white font-black rounded-2xl px-6 py-3 no-underline">واتساب مضمونة</a>
              <button onClick={() => { setStep(1); setDoneId(''); setStatus('pending'); setFile(null) }} className="block mx-auto mt-3 text-sm text-gray-500">ابعت إثبات تاني</button>
            </>)}
          </section>
        )}

        <p className="text-center text-[11px] text-gray-400">دفع محلي آمن · التفعيل بعد مراجعة الفريق · الدعم على واتساب ٠١٠٠٢٢٢٩٩٨٢</p>
      </div>
    </main>
  )
}
