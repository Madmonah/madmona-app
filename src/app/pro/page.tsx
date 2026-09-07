'use client'

// ============================================================================
// 💼 /pro — «مضمونة إيه؟» + «برنامج الإدارة بـ١٠٠٠ ج بدل كتير» (٧ سبتمبر ٢٠٢٦)
//
// محمد نصًا (٧/٩): «الاشتراك لبرامج الإدارة فقط، لكن الباقي بعمولة أو نسبة أو رقم
// ثابت — إحنا عايزين نقول مضمونة إيه، وإن الـ١٠٠٠ ج لبرنامج الإدارة».
//
// فالصفحة كتلتين واضحتين:
//   (أ) مضمونة إيه — الوسيط الضامن في النص: سوق · حجوزات · أوردرات · دليفري ·
//       محترفين — بتشتغل **بعمولة على المعاملة، من غير اشتراك** (مفيش رقم عمولة
//       هنا — قاعدة ٤/٩).
//   (ب) برنامج الإدارة — أودو + CRM + HR + بوت واتساب + موقعك — **ده اللي بـ١٠٠٠ ج
//       بدل كتير**، ولعدد محدود من الحسابات.
// ⛔ مفيش سعر قديم (لا ٢٠٠٠ ولا ٣٠٠٠). العدد والمدة من site_settings عبر
//    /api/campaign/offer — لو مش متحطين مابننطقش برقم.
// الليد: فورم → /api/campaign/lead (campaign=erp1000 + UTM) → CRM + پوش، أو واتساب.
// ============================================================================
import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { CheckCircle2, MessageCircle } from 'lucide-react'

const INTAKE_WA = '201002229982'
const PRICE_NOW = 1000

// (أ) المنصة — بعمولة على المعاملة (الأبليكيشن المشهور اللي بيعمل نفس الوظيفة، للتشبيه)
const PLATFORM: [string, string, string][] = [
  ['🛒', 'أمازون', 'سوق بيع'],
  ['🏖️', 'بوكينج', 'إيجار وشاليهات'],
  ['🩺', 'فيزيتا', 'حجز عيادات'],
  ['💇', 'فريشا', 'حجز صالون وبيوتي'],
  ['🍽️', 'طلبات', 'منيو QR وأوردرات'],
  ['🛵', 'أوبر', 'دليفري بطيارين مضمونة'],
  ['💼', 'أب وورك', 'خدمات ومحترفين'],
]

// (ب) برنامج الإدارة — الاشتراك
const MANAGEMENT: [string, string, string][] = [
  ['📒', 'أودو', 'حسابات · مخزون · مصاريف · موردين'],
  ['📇', 'هابسبوت', 'CRM وليدات ومتابعة العملاء'],
  ['🕘', 'بامبو HR', 'موظفين · حضور بالبصمة · مهام · مرتبات'],
  ['🤖', 'واتساب بيزنس', 'بوت بيرد على عملائك ويسجّل الليد'],
  ['🌐', 'شوبيفاي', 'موقع وصفحة كلاود لبيزنسك'],
]

const TYPES = ['مطعم / كافيه', 'صالون / سبا', 'عيادة', 'محل / متجر', 'مصنع / مورد', 'مقاولات', 'عقارات', 'خدمات', 'تاني']

type Offer = { seats: number | null; remaining: number | null; period: string | null; note: string | null }

function AppGrid({ items, cols }: { items: [string, string, string][]; cols: string }) {
  return (
    <div className={`grid grid-cols-2 ${cols} gap-2 text-center`}>
      {items.map(([e, brand, l]) => (
        <div key={brand} className="rounded-2xl bg-white border border-[#E4DECE] px-2 py-3">
          <span className="text-2xl block mb-1">{e}</span>
          <span className="block text-sm font-black text-[#0C2B22]">{brand}</span>
          <span className="block text-[11px] text-gray-500 leading-snug">{l}</span>
        </div>
      ))}
    </div>
  )
}

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

  const waText = encodeURIComponent(`عايز أشترك في برنامج إدارة مضمونة (ERP + CRM) بعرض الـ${PRICE_NOW} ج${form.business_type ? ` — نشاطي: ${form.business_type}` : ''}`)
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
      {/* هيرو: مضمونة إيه */}
      <section className="bg-[#04352A] text-white">
        <div className="mx-auto max-w-3xl px-5 pt-8 pb-10">
          <Link href="/" className="inline-flex items-center gap-2 text-white/70 text-xs mb-6 no-underline">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/madmona-logo.png" alt="مضمونة" className="w-7 h-7 rounded-lg bg-white object-contain" />
            مضمونة
          </Link>
          <p className="text-[#6FCF97] font-black text-sm mb-2">مضمونة إيه؟</p>
          <h1 className="text-3xl md:text-4xl font-black leading-[1.25]">
            <span className="text-[#6FCF97]">١٢ أبليكيشن</span> في واحد —
            <br />
            وإحنا في النص بنضمن الصفقة
          </h1>
          <p className="mt-4 text-white/80 leading-relaxed">
            سوق · حجوزات · أوردرات · دليفري · محترفين — <b className="text-white">بتشتغل بعمولة على المعاملة، من غير اشتراك</b>:
            بتدفع بس لما تبيع أو تحجز أو توصّل، والسعر اللي بتطلبه هو اللي بتاخده.
            <br />
            <b className="text-white">وبرنامج الإدارة</b> (حسابات · CRM · موظفين · بوت واتساب · موقعك) — ده اللي بـ{price} ج.
          </p>
          <div className="mt-6 flex flex-col sm:flex-row gap-3">
            <a href="#subscribe" className="text-center bg-[#6FCF97] text-[#04352A] font-black rounded-2xl px-6 py-3.5 no-underline">برنامج الإدارة بـ{price} ج ←</a>
            <a href={waHref} target="_blank" rel="noopener noreferrer" className="text-center bg-white/10 text-white font-bold rounded-2xl px-6 py-3.5 no-underline inline-flex items-center justify-center gap-2">
              <MessageCircle className="w-4 h-4" /> كلّمنا واتساب
            </a>
          </div>
        </div>
      </section>

      {/* (أ) المنصة — بعمولة */}
      <section className="mx-auto max-w-3xl px-5 py-10">
        <div className="flex items-end justify-between gap-3 mb-1">
          <h2 className="text-xl font-black">المنصة — بعمولة على المعاملة</h2>
          <span className="text-[11px] font-black text-[#059669] bg-[#E6F4EE] rounded-full px-3 py-1 whitespace-nowrap">من غير اشتراك</span>
        </div>
        <p className="text-xs text-gray-500 mb-4">مضمونة الوسيط في النص — بتضمن للطرفين، وبتاخد نصيبها من الصفقة اللي بتتم فعلًا. مفيش رسوم تسجيل ولا مقابل للعرض.</p>
        <AppGrid items={PLATFORM} cols="sm:grid-cols-4" />
      </section>

      {/* (ب) برنامج الإدارة — الاشتراك */}
      <section className="mx-auto max-w-3xl px-5 pb-10">
        <div className="flex items-end justify-between gap-3 mb-1">
          <h2 className="text-xl font-black">برنامج الإدارة — بـ{price} ج</h2>
          <span className="text-[11px] font-black text-[#B4552F] bg-[#FDECE4] rounded-full px-3 py-1 whitespace-nowrap">بدل كتير</span>
        </div>
        <p className="text-xs text-gray-500 mb-4">ده الاشتراك الوحيد: سيستم يدير بيزنسك من موبايلك — {seatsLine}.</p>
        <AppGrid items={MANAGEMENT} cols="sm:grid-cols-5" />
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
              <p className="text-xs font-black text-[#059669]">برنامج الإدارة · {seatsLine}</p>
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
                {state === 'sending' ? '…' : `احجز برنامج الإدارة بـ${price} ج`}
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
