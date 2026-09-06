'use client'

// ============================================================================
// 💼 /pro — «سيستم إدارة بيزنسك: ERP + CRM بـ١٠٠٠ ج بدل كتير» (٦ سبتمبر ٢٠٢٦)
//
// محمد نصًا: «عايز أستهدف أصحاب البيزنس إنهم يشتركوا معانا بـ١٠٠٠ ج فقط لا غير…
// والـ١٠٠٠ نظير السيستم الـERP والـCRM» ثم: «العرض ساري لعدد حساب — هنقول
// بـ١٠٠٠ ج بدل كتيييير، لا هنقول ٢٠٠٠ ولا ٣٠٠٠». الحملة أورجانيك بالكامل.
//
// ⚠️ قواعد النص هنا:
//   · **مفيش رقم قديم** (لا ٢٠٠٠ ولا ٣٠٠٠) — «بدل كتير» بس.
//   · **العرض على السوق مجاني بالعمولة** (قاعدة ٢٠ يوليو) — السيستم هو اللي بـ١٠٠٠.
//   · عدد الحسابات والمدة من site_settings عبر /api/campaign/offer — لو مش
//     متحطين بنقول «لعدد محدود من الحسابات» من غير رقم. المتبقي رقم حقيقي.
//
// الليد: فورم قصير → /api/campaign/lead (campaign=erp1000 + UTM) → CRM + پوش.
// أو واتساب على رقم الاستقبال بنص جاهز. صفر تكلفة.
// ============================================================================
import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { CheckCircle2, MessageCircle, Building2, Users, Bot, Truck, BarChart3, Store } from 'lucide-react'

const INTAKE_WA = '201002229982'
const PRICE_NOW = 1000

const FEATURES: { icon: React.ReactNode; title: string; sub: string }[] = [
  { icon: <Building2 className="w-5 h-5" />, title: 'الفروع والمواعيد', sub: 'كل فرع بعنوانه ومواعيده — العميل بيطلب من أقرب فرع' },
  { icon: <Users className="w-5 h-5" />, title: 'الموظفين والحضور', sub: 'حضور وانصراف بالبصمة/الموبايل · مهام يومية · صلاحيات · مرتبات' },
  { icon: <Store className="w-5 h-5" />, title: 'الكتالوج / المنيو', sub: 'منتجاتك وخدماتك بأسعارها — نفس اللي بيتعرض على مضمونة وفي بوتك' },
  { icon: <BarChart3 className="w-5 h-5" />, title: 'CRM وليدات', sub: 'كل عميل كلّمك بيتسجّل باسمه وطلبه — ومتابعة العملاء في خطر' },
  { icon: <Bot className="w-5 h-5" />, title: 'بوت واتساب بيرد بدالك', sub: 'اربط رقمك بـQR — بيرد على عملائك من كتالوجك وبيسجّل الليد' },
  { icon: <Truck className="w-5 h-5" />, title: 'دليفري بطيارين مضمونة', sub: 'الأوردر بيتسلّم ويتحصّل بطيار مضمونة — السعر بالمسافة' },
]

const TYPES = ['مطعم / كافيه', 'صالون / سبا', 'عيادة', 'محل / متجر', 'مصنع / مورد', 'مقاولات', 'عقارات', 'خدمات', 'تاني']

type Offer = { seats: number | null; remaining: number | null; period: string | null; note: string | null }

export default function ProOfferPage() {
  const [form, setForm] = useState({ name: '', phone: '', business_type: '', city: '', message: '' })
  const [state, setState] = useState<'idle' | 'sending' | 'done' | 'error'>('idle')
  const [err, setErr] = useState<string | null>(null)
  const [offer, setOffer] = useState<Offer>({ seats: null, remaining: null, period: null, note: null })
  const utm = useMemo(() => {
    if (typeof window === 'undefined') return {}
    const q = new URLSearchParams(window.location.search)
    return { utm_source: q.get('utm_source') || '', utm_medium: q.get('utm_medium') || '', utm_content: q.get('utm_content') || '' }
  }, [])

  useEffect(() => {
    fetch('/api/campaign/offer').then((r) => (r.ok ? r.json() : null)).then((j) => { if (j?.ok) setOffer(j) }).catch(() => {})
  }, [])

  const price = PRICE_NOW.toLocaleString('ar-EG')
  const seatsLine = offer.seats
    ? (offer.remaining != null && offer.remaining <= offer.seats
        ? `العرض لـ${offer.seats.toLocaleString('ar-EG')} حساب بس — فاضل ${offer.remaining.toLocaleString('ar-EG')}`
        : `العرض لـ${offer.seats.toLocaleString('ar-EG')} حساب بس`)
    : 'العرض لعدد محدود من الحسابات'

  const waText = encodeURIComponent(`عايز أشترك في سيستم مضمونة (ERP + CRM) بعرض الـ${PRICE_NOW} ج${form.business_type ? ` — نشاطي: ${form.business_type}` : ''}`)
  const waHref = `https://wa.me/${INTAKE_WA}?text=${waText}`

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setState('sending'); setErr(null)
    const r = await fetch('/api/campaign/lead', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ campaign: 'erp1000', ...form, ...utm }),
    }).then((x) => x.json()).catch(() => ({ ok: false, error: 'الشبكة' }))
    if (r.ok) setState('done'); else { setState('error'); setErr(r.error || 'حصل خطأ') }
  }

  return (
    <main dir="rtl" className="min-h-screen bg-[#FAFAF7] text-[#1A2E26]">
      {/* هيرو */}
      <section className="bg-[#04352A] text-white">
        <div className="mx-auto max-w-3xl px-5 pt-8 pb-10">
          <Link href="/" className="inline-flex items-center gap-2 text-white/70 text-xs mb-6 no-underline">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/madmona-logo.png" alt="مضمونة" className="w-7 h-7 rounded-lg bg-white object-contain" />
            مضمونة
          </Link>
          <p className="text-[#6FCF97] font-black text-sm mb-2">لأصحاب البيزنس · {seatsLine}</p>
          <h1 className="text-3xl md:text-4xl font-black leading-[1.25]">
            سيستم يدير بيزنسك كله
            <br />
            <span className="text-[#6FCF97]">ERP + CRM</span> بـ{price} ج
            <span className="block text-lg font-bold text-white/70 mt-1">بدل كتييير 😉{offer.period ? ` · ${offer.period}` : ''}</span>
          </h1>
          <p className="mt-4 text-white/80 leading-relaxed">
            فروع · موظفين وحضور · كتالوج · CRM · بوت واتساب بيرد بدالك · دليفري بطيارين مضمونة — من موبايلك.
            <br />
            <b className="text-white">والعرض على سوق مضمونة مجاني زي ما هو</b> — السعر اللي بتطلبه هو اللي بتاخده.
          </p>
          <div className="mt-6 flex flex-col sm:flex-row gap-3">
            <a href="#subscribe" className="text-center bg-[#6FCF97] text-[#04352A] font-black rounded-2xl px-6 py-3.5 no-underline">احجز حسابك بـ{price} ج ←</a>
            <a href={waHref} target="_blank" rel="noopener noreferrer" className="text-center bg-white/10 text-white font-bold rounded-2xl px-6 py-3.5 no-underline inline-flex items-center justify-center gap-2">
              <MessageCircle className="w-4 h-4" /> كلّمنا واتساب
            </a>
          </div>
        </div>
      </section>

      {/* اللي بتاخده */}
      <section className="mx-auto max-w-3xl px-5 py-10">
        <h2 className="text-xl font-black mb-4">اللي بتاخده بالـ{price} ج</h2>
        <div className="grid sm:grid-cols-2 gap-3">
          {FEATURES.map((f) => (
            <div key={f.title} className="rounded-2xl border border-[#E4DECE] bg-white p-4 flex gap-3">
              <span className="w-10 h-10 rounded-xl bg-[#04352A] text-[#6FCF97] grid place-items-center shrink-0">{f.icon}</span>
              <div>
                <p className="font-black">{f.title}</p>
                <p className="text-xs text-gray-600 mt-0.5 leading-relaxed">{f.sub}</p>
              </div>
            </div>
          ))}
        </div>
        <p className="text-xs text-gray-500 mt-3">كله من لوحة واحدة على الموبايل — ودخولك بواتسابك من غير باسورد.</p>
      </section>

      {/* 🧩 محمد (٦/٩): «ممكن تقول مضمونة بتضم كام أبليكيشن في بعض» — العدّ من الموديولات
          الموجودة فعلًا (erpModules + الماركت + البورصة + البوت + الدليفري)، مش رقم تسويقي */}
      <section className="mx-auto max-w-3xl px-5 pb-10">
        {/* محمد (٦/٩): «أنا بتكلم زي بوكينج وأب وورك وأمازون وواتساب وأوبر وأودو وCRM» —
            كل كارت = موديول موجود عندنا فعلًا + الأبليكيشن المشهور اللي بيعمل نفس الوظيفة (تشبيه، مش شراكة) */}
        <h2 className="text-xl font-black mb-1">مضمونة = <span className="text-[#059669]">١٠ أبليكيشنات</span> في واحد</h2>
        <p className="text-xs text-gray-500 mb-4">بدل ما تشترك في ١٠ برامج وتربطهم بإيدك — كلهم على نفس الداتا ونفس الرقم.</p>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center">
          {[
            ['🛒', 'أمازون', 'سوق بيع وإيجار'], ['📅', 'بوكينج', 'حجوزات ومواعيد'], ['🍽️', 'طلبات', 'منيو QR وأوردرات'], ['🛵', 'أوبر', 'دليفري بطيارين'], ['📒', 'أودو', 'حسابات ومخزون'],
            ['📇', 'هابسبوت', 'CRM وليدات'], ['🕘', 'بامبو HR', 'موظفين وحضور ومرتبات'], ['🤖', 'واتساب بيزنس', 'بوت بيرد بدالك'], ['💼', 'أب وورك', 'خدمات ومحترفين'], ['🌐', 'شوبيفاي', 'موقع لبيزنسك'],
          ].map(([e, brand, l]) => (
            <div key={brand} className="rounded-2xl bg-white border border-[#E4DECE] px-2 py-3">
              <span className="text-2xl block mb-1">{e}</span>
              <span className="block text-sm font-black text-[#0C2B22]">{brand}</span>
              <span className="block text-[11px] text-gray-500">{l}</span>
            </div>
          ))}
        </div>
        <p className="text-[10px] text-gray-400 mt-2">الأسماء للتشبيه بالوظيفة — مضمونة مش تابعة لأي منهم.</p>
      </section>

      {/* إزاي */}
      <section className="mx-auto max-w-3xl px-5 pb-10">
        <h2 className="text-xl font-black mb-4">٣ خطوات وتبقى شغّال</h2>
        <ol className="space-y-2">
          {['سجّل بيزنسك — دقيقة واحدة', 'كمّل شركتك خطوة خطوة: الفرع → الموظفين → الكتالوج', 'اربط واتسابك بـQR — البوت يبدأ يرد ويسجّل ليداتك'].map((s, i) => (
            <li key={s} className="flex items-center gap-3 rounded-2xl bg-white border border-[#E4DECE] px-4 py-3">
              <span className="w-7 h-7 rounded-full bg-[#04352A] text-white text-xs font-black grid place-items-center shrink-0">{i + 1}</span>
              <span className="font-bold text-sm">{s}</span>
            </li>
          ))}
        </ol>
      </section>

      {/* الاشتراك */}
      <section id="subscribe" className="mx-auto max-w-3xl px-5 pb-16">
        <div className="rounded-3xl bg-white border-2 border-[#04352A] p-5">
          <div className="flex items-end justify-between gap-3 mb-4">
            <div>
              <p className="text-xs font-black text-[#059669]">{seatsLine}</p>
              <p className="text-3xl font-black">{price} ج <span className="text-sm text-gray-500 font-bold">بدل كتير{offer.period ? ` · ${offer.period}` : ''}</span></p>
              {offer.note && <p className="text-xs text-gray-500 mt-1">{offer.note}</p>}
            </div>
            <CheckCircle2 className="w-8 h-8 text-[#059669]" />
          </div>
          {state === 'done' ? (
            <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-4 text-center">
              <p className="font-black text-emerald-900">وصلنا ✓ — هنكلّمك على رقمك النهارده</p>
              <a href={waHref} target="_blank" rel="noopener noreferrer" className="inline-block mt-3 text-sm font-bold text-[#059669]">أو ابدأ دلوقتي على واتساب ←</a>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-3">
              <div className="grid sm:grid-cols-2 gap-3">
                <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="اسمك" className="w-full rounded-xl border border-gray-200 px-3 py-3 text-[16px]" />
                <input required value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="رقم موبايلك (واتساب)" dir="ltr" inputMode="tel" className="w-full rounded-xl border border-gray-200 px-3 py-3 text-[16px]" />
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                <select value={form.business_type} onChange={(e) => setForm({ ...form, business_type: e.target.value })} className="w-full rounded-xl border border-gray-200 px-3 py-3 text-[16px] bg-white">
                  <option value="">نوع البيزنس</option>
                  {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
                <input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} placeholder="المدينة" className="w-full rounded-xl border border-gray-200 px-3 py-3 text-[16px]" />
              </div>
              <textarea value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} placeholder="أي حاجة تحب تقولها (اختياري)" rows={2} className="w-full rounded-xl border border-gray-200 px-3 py-3 text-[16px]" />
              {err && <p className="text-xs text-red-600">{err}</p>}
              <button type="submit" disabled={state === 'sending'} className="w-full bg-[#04352A] text-white font-black rounded-2xl py-3.5 disabled:opacity-50">
                {state === 'sending' ? '…' : `احجز حسابك بـ${price} ج`}
              </button>
              <p className="text-[11px] text-gray-400 text-center">من غير دفع دلوقتي — هنكلّمك ونفعّل حسابك ونمشي معاك خطوة خطوة.</p>
            </form>
          )}
        </div>
      </section>

      <footer className="text-center text-[11px] text-gray-400 pb-8">مضمونة · معاملاتك مضمونة · madmonacairo.com</footer>
    </main>
  )
}
