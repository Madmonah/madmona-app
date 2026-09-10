'use client'

// ============================================================================
// 💼 /pro — «برنامج إدارة البيزنس بـ١٠٠٠ ج بدل كتير» (٧ سبتمبر ٢٠٢٦ · إعادة كتابة ٩/٩ بليل)
//
// محمد نصًا (٧/٩): «الاشتراك لبرامج الإدارة فقط، لكن الباقي بعمولة أو نسبة أو رقم
// ثابت — إحنا عايزين نقول مضمونة إيه، وإن الـ١٠٠٠ ج لبرنامج الإدارة».
// محمد (٩/٩): «زبّط صفحة البرو بحيث تكون كويسة وشكلها كويس وتشرح الموضوع بشكل أفضل».
//
// الصفحة بتشرح بالترتيب: (١) إيه اللي بتاخده بالـ١٠٠٠ ج — بالوظيفة والنتيجة مش بالأسماء ·
// (٢) شكله على نشاطك (عيادة · مطعم · صالون · محل/مصنع · مقاولات · عقارات) ·
// (٣) الفرق بين السوق (بعمولة على الصفقة — من غير رقم) وبرنامج الإدارة (الاشتراك الوحيد) ·
// (٤) ٣ خطوات · (٥) أسئلة · (٦) الفورم.
// ⛔ مفيش سعر قديم (لا ٢٠٠٠ ولا ٣٠٠٠) · مفيش رقم عمولة · مفيش إحصائية مخترعة.
//    العدد والمدة من site_settings عبر /api/campaign/offer — لو مش متحطين مابننطقش برقم.
// الليد: فورم → /api/campaign/lead (campaign=erp1000 + UTM) → CRM + پوش، أو واتساب.
// ============================================================================
import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { CheckCircle2, MessageCircle, Wallet, Users, Boxes, Bot, Globe, ClipboardList, ShieldCheck, ChevronDown } from 'lucide-react'

const INTAKE_WA = '201002229982'
const PRICE_NOW = 1000

// 🔗 (١٠/٩/٢٠٢٦) محمد: «خلي ده اللينك اللي يتحط في صفحة برو» — التسجيل الذاتي /start (→ /supplier/register):
//    صاحب البيزنس بيدخل بجوجل/واتساب ويضيف شركته بنفسه ويتحوّل على «كمّل شركتك». الحد: مالك + موظف واحد.
const START_PATH = '/start'

// لقطات حقيقية من اللوحة (نفس صور الريلز في scripts/reels/playwright/bg) — «شوف اللوحة بنفسك»
const SHOTS: { src: string; label: string }[] = [
  { src: '/pro/erp-crm.jpg', label: 'متابعة العملاء (CRM)' },
  { src: '/pro/erp-attendance.jpg', label: 'الحضور بالبصمة من الموبايل' },
  { src: '/pro/erp-monitor.jpg', label: 'المونيتور — مين شغّال دلوقتي' },
  { src: '/pro/erp-whatsapp.jpg', label: 'بوت الواتساب' },
  { src: '/pro/erp-atrisk.jpg', label: 'عملاء في خطر' },
  { src: '/pro/erp-setup.jpg', label: 'كمّل شركتك خطوة خطوة' },
]

// (١) بتاخد إيه بالـ١٠٠٠ ج — كل بند = موديول موجود فعلًا في لوحة الإدارة (erpModules)
const MODULES: { icon: React.ReactNode; title: string; does: string; wins: string[] }[] = [
  { icon: <Wallet className="w-5 h-5" />, title: 'الحسابات والمصاريف', does: 'كل بيعة ومصروف بيتقيّد لوحده — من غير دفتر ولا إكسيل.',
    wins: ['قائمة دخل جاهزة أي وقت', 'جرد الكاش آخر اليوم', 'الموردين وطلبات الشراء في مكان واحد'] },
  { icon: <ClipboardList className="w-5 h-5" />, title: 'متابعة العملاء (CRM)', does: 'كل عميل ليه ملف: كلّمناه إمتى، عايز إيه، وهنرجعله إمتى.',
    wins: ['قايمة مكالمات يومية لكل موظف', 'عملاء في خطر قبل ما يمشوا', 'الليد اللي جاي من الواتساب بيتسجّل لوحده'] },
  { icon: <Users className="w-5 h-5" />, title: 'الموظفين والحضور والمرتبات', does: 'كل موظف بيسجّل حضوره من موبايله وبيشوف مهامه.',
    wins: ['مهام يومية بتتولد أوتوماتيك', 'إثبات إتمام المهمة بصورة', 'العهدة والسلف والمرتب بحساب واضح'] },
  { icon: <Boxes className="w-5 h-5" />, title: 'المنتجات والخدمات والمخزون', does: 'منتجاتك وخدماتك بأسعارها، والخامات اللي بتدخل فيها.',
    wins: ['بيع يدوي بضغطة والمخزون بيتخصم', 'استيراد من إكسيل بدل واحد واحد', 'تنبيه قبل ما الصنف يخلص'] },
  { icon: <Bot className="w-5 h-5" />, title: 'بوت واتساب بيزنسك', does: 'بيرد على عملائك من كتالوجك ومواعيدك، وبيسجّل الطلب في الـCRM.',
    wins: ['امسح QR وخلاص — من رقمك إنت', 'بيرد بأسعارك وخدماتك الحقيقية', 'بيحوّل الطلب الجاد لموظفك'] },
  { icon: <Globe className="w-5 h-5" />, title: 'صفحتك وحجوزاتك', does: 'صفحة لبيزنسك برابط تبعته لأي حد — بيحجز أو بيطلب منها مباشرة.',
    wins: ['كتالوج أو منيو بصورك', 'حجز يوم وساعة أو أوردر توصيل', 'من غير ما يشترط يكون عميل من مضمونة'] },
]

// (٢) شكله على نشاطك — كل سطر = موديول موجود لنفس النشاط في erpModules (مفيش وعد بحاجة مش مبنية)
const BY_TYPE: { key: string; label: string; emoji: string; lines: string[] }[] = [
  { key: 'clinic', label: 'عيادة', emoji: '🩺', lines: ['المواعيد وقائمة الانتظار — والمريض بيحجز يوم وساعة من صفحتك', 'قائمة الخدمات بأسعارها + المخزون والأدوية', 'السكرتيرة بتسجّل الكشف بضغطة، وكل مريض ليه ملف', 'بوت الواتساب بيرد بمواعيدك ويسجّل الحجز'] },
  { key: 'restaurant', label: 'مطعم / كافيه', emoji: '🍽️', lines: ['منيو QR بصورك وأسعارك — العميل يطلب من الترابيزة أو من البيت', 'الأوردرات والتوصيل بطيارين مضمونة', 'الخامات بتتخصم من المخزون مع كل صنف بيتباع', 'حضور الشيفات والويترز بالبصمة'] },
  { key: 'salon', label: 'صالون / بيوتي', emoji: '💇', lines: ['حجز الخدمات بميعاد — وكل موظفة ليها جدولها', 'عمولة الموظفة على كل خدمة بتتحسب لوحدها', 'الخامات (صبغة · كريمات) بتتخصم مع الخدمة', 'عملاء ماجوش من فترة بيتعلّموا «في خطر»'] },
  { key: 'shop', label: 'محل / مصنع / مورد', emoji: '🏭', lines: ['المنتجات بأقسامها الصح واستيراد من إكسيل', 'أوامر تشغيل وخامات لكل منتج نهائي', 'طلبات شراء وموردين وحسابات', 'كتالوج على صفحتك — بيع يدوي أو أونلاين'] },
  { key: 'contracting', label: 'مقاولات', emoji: '🏗️', lines: ['المشاريع والتحصيل والجدول الزمني', 'ربحية كل مشروع لوحده', 'العهد والسلف للفنيين والمشرفين', 'مهام يومية بإثبات بالصور من الموقع'] },
  { key: 'realestate', label: 'عقارات', emoji: '🏢', lines: ['الوحدات والمشاريع والحجوزات', 'CRM للعملاء والمعاينات والمتابعة', 'التحصيل والأقساط', 'صفحة للشركة بوحداتها'] },
]

const FAQ: { q: string; a: string }[] = [
  { q: 'لازم أعرض في سوق مضمونة عشان أستخدم برنامج الإدارة؟', a: 'لا. برنامج الإدارة بيشتغل لبيزنسك مع عملائك إنت — من غير ما تعرض حاجة في السوق. والعرض في السوق اختياري ومجاني.' },
  { q: 'الداتا بتاعتي ملك مين؟', a: 'ملكك ١٠٠٪. كل اللي بيتسجّل عندك — عملاء، مبيعات، حسابات — بتاعك ومحدش بياخد منه حاجة. وتقدر تصدّر تقاريرك أي وقت.' },
  { q: 'محتاج كمبيوتر أو حد يركّبلي حاجة؟', a: 'لا. كل حاجة من الموبايل: إنت وموظفينك. وبنمشي معاك خطوة خطوة في «كمّل شركتك» لحد ما البيزنس يبقى شغّال على السيستم.' },
  { q: 'الموظفين بيدخلوا إزاي؟', a: 'كل موظف بيدخل بـرقمه وباسورده من موبايله: بيسجّل حضوره، يشوف مهامه، يوثّق شغله بصورة، ويطلب سلفة أو عهدة من نفس الشاشة.' },
  { q: 'إيه اللي بيتم بالـ' + PRICE_NOW.toLocaleString('ar-EG') + ' ج بالظبط؟', a: 'برنامج الإدارة كامل: الحسابات والمصاريف · متابعة العملاء · الموظفين والحضور والمرتبات · المنتجات والمخزون · بوت الواتساب · صفحتك وحجوزاتك. «بدل كتير» — والعرض لعدد محدود من الحسابات.' },
  { q: 'وإيه الفرق بينه وبين السوق؟', a: 'السوق مجاني وبيشتغل بعمولة على الصفقة اللي بتتم فعلًا — والسعر اللي بتطلبه هو اللي بتاخده، إحنا في النص بنضمن الطرفين. برنامج الإدارة هو الاشتراك الوحيد، وبيشتغل مع عملائك من أي مكان.' },
]

const TYPES = ['مطعم / كافيه', 'صالون / سبا', 'عيادة', 'محل / متجر', 'مصنع / مورد', 'مقاولات', 'عقارات', 'خدمات', 'تاني']

type Offer = { seats: number | null; remaining: number | null; period: string | null; note: string | null }

export default function ProOfferPage() {
  const [form, setForm] = useState({ name: '', phone: '', business_type: '', city: '', message: '' })
  const [state, setState] = useState<'idle' | 'sending' | 'done' | 'error'>('idle')
  const [err, setErr] = useState<string | null>(null)
  const [offer, setOffer] = useState<Offer>({ seats: null, remaining: null, period: null, note: null })
  const [type, setType] = useState(BY_TYPE[0].key)
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
  const cur = BY_TYPE.find((t) => t.key === type) || BY_TYPE[0]
  const startHref = useMemo(() => {
    const q = new URLSearchParams()
    Object.entries(utm).forEach(([k, v]) => { if (v) q.set(k, v as string) })
    if (!q.get('utm_campaign')) q.set('utm_campaign', 'erp1000')
    return `${START_PATH}?${q.toString()}`
  }, [utm])

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
    <main dir="rtl" className="min-h-screen bg-[#FAFAF7] text-[#1A2E26] pb-24 md:pb-0">
      {/* هيرو */}
      <section className="bg-[#04352A] text-white relative overflow-hidden">
        <div className="absolute -top-24 -left-24 w-80 h-80 rounded-full bg-[#34D399]/10 blur-3xl" />
        <div className="absolute -bottom-32 -right-16 w-96 h-96 rounded-full bg-[#6FCF97]/10 blur-3xl" />
        <div className="relative mx-auto max-w-3xl px-5 pt-8 pb-12">
          <Link href="/" className="inline-flex items-center gap-2 text-white/70 text-xs mb-8 no-underline">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/madmona-logo.png" alt="مضمونة" className="w-7 h-7 rounded-lg bg-white object-contain" />
            مضمونة
          </Link>
          <span className="inline-block rounded-full bg-[#34D399]/15 text-[#6FCF97] text-xs font-black px-3 py-1 mb-4">برنامج إدارة البيزنس · {seatsLine}</span>
          <h1 className="text-[2rem] md:text-5xl font-black leading-[1.2]">
            بيزنسك كله على سيستم واحد
            <br />
            <span className="text-[#6FCF97]">بـ{price} ج بدل كتير</span>
          </h1>
          <p className="mt-5 text-white/85 text-base md:text-lg leading-relaxed max-w-xl">
            من موبايلك: <b className="text-white">الحسابات</b> · <b className="text-white">متابعة العملاء</b> · <b className="text-white">الموظفين والحضور</b> ·
            <b className="text-white"> المخزون</b> · <b className="text-white">بوت واتساب</b> · <b className="text-white">صفحتك وحجوزاتك</b>.
            كل اللي بيتسجّل عندك ملكك ١٠٠٪.
          </p>
          <div className="mt-7 flex flex-col sm:flex-row gap-3">
            <a href={startHref} className="text-center bg-[#34D399] text-[#04352A] font-black rounded-2xl px-6 py-4 no-underline text-base shadow-lg shadow-[#34D399]/20">ضيف شركتك دلوقتي — بـ{price} ج ←</a>
            <a href={waHref} target="_blank" rel="noopener noreferrer" className="text-center bg-white/10 border border-white/15 text-white font-bold rounded-2xl px-6 py-4 no-underline inline-flex items-center justify-center gap-2">
              <MessageCircle className="w-4 h-4" /> اسأل على واتساب
            </a>
          </div>
          <p className="mt-4 text-xs text-white/60">دقيقة واحدة: تدخل بجوجل أو الواتساب، تكتب اسم شركتك، وتبدأ. من غير دفع دلوقتي.</p>
        </div>
      </section>

      {/* (١) بتاخد إيه */}
      <section className="mx-auto max-w-3xl px-5 py-12">
        <p className="text-[#059669] font-black text-sm mb-1">بتاخد إيه بالـ{price} ج؟</p>
        <h2 className="text-2xl font-black mb-2">٦ حاجات كانت محتاجة ٦ برامج — في واحد</h2>
        <p className="text-sm text-gray-500 mb-6">كل بند تحت ده شاشة موجودة فعلًا في لوحة إدارتك — مش وعد.</p>
        <div className="grid sm:grid-cols-2 gap-3">
          {MODULES.map((m) => (
            <div key={m.title} className="rounded-3xl bg-white border border-[#E8E4D8] p-5 shadow-sm">
              <div className="flex items-center gap-3 mb-2">
                <span className="w-10 h-10 rounded-2xl bg-[#04352A] text-[#6FCF97] grid place-items-center shrink-0">{m.icon}</span>
                <h3 className="font-black text-base">{m.title}</h3>
              </div>
              <p className="text-sm text-[#1A2E26]/80 leading-relaxed mb-3">{m.does}</p>
              <ul className="space-y-1.5">
                {m.wins.map((w) => (
                  <li key={w} className="flex items-start gap-2 text-[13px] text-gray-600"><CheckCircle2 className="w-4 h-4 text-[#059669] shrink-0 mt-0.5" /> {w}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* لقطات حقيقية من اللوحة */}
      <section className="bg-[#04352A] text-white">
        <div className="mx-auto max-w-3xl px-5 py-12">
          <p className="text-[#6FCF97] font-black text-sm mb-1">مش كلام — شاشات حقيقية</p>
          <h2 className="text-2xl font-black mb-5">شوف اللوحة بنفسك</h2>
          <div className="flex gap-3 overflow-x-auto pb-3 -mx-5 px-5 snap-x">
            {SHOTS.map((sh) => (
              <figure key={sh.src} className="snap-start shrink-0 w-[78%] sm:w-[46%] rounded-2xl overflow-hidden border border-white/10 bg-white/5">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={sh.src} alt={sh.label} loading="lazy" className="w-full aspect-[16/10] object-cover object-top" />
                <figcaption className="px-3 py-2 text-xs font-bold text-white/85">{sh.label}</figcaption>
              </figure>
            ))}
          </div>
          <a href={startHref} className="mt-4 block text-center bg-[#34D399] text-[#04352A] font-black rounded-2xl px-6 py-3.5 no-underline">ضيف شركتك وجرّبها بنفسك ←</a>
        </div>
      </section>

      {/* (٢) على نشاطك */}
      <section className="bg-white border-y border-[#E8E4D8]">
        <div className="mx-auto max-w-3xl px-5 py-12">
          <p className="text-[#059669] font-black text-sm mb-1">بيتشكّل على نشاطك</p>
          <h2 className="text-2xl font-black mb-5">هيبقى شكله إيه عندك؟</h2>
          <div className="flex gap-2 overflow-x-auto pb-2 -mx-5 px-5 snap-x">
            {BY_TYPE.map((t) => (
              <button key={t.key} onClick={() => setType(t.key)}
                className={`snap-start shrink-0 rounded-full px-4 py-2 text-sm font-black border transition ${type === t.key ? 'bg-[#04352A] text-white border-[#04352A]' : 'bg-[#FAFAF7] text-[#1A2E26] border-[#E8E4D8]'}`}>
                {t.emoji} {t.label}
              </button>
            ))}
          </div>
          <div className="mt-4 rounded-3xl bg-[#FAFAF7] border border-[#E8E4D8] p-5">
            <p className="font-black text-lg mb-3">{cur.emoji} {cur.label}</p>
            <ul className="space-y-2">
              {cur.lines.map((l) => (
                <li key={l} className="flex items-start gap-2 text-sm"><CheckCircle2 className="w-4 h-4 text-[#059669] shrink-0 mt-0.5" /> {l}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* (٣) السوق vs برنامج الإدارة */}
      <section className="mx-auto max-w-3xl px-5 py-12">
        <p className="text-[#059669] font-black text-sm mb-1">عشان ماتتلخبطش</p>
        <h2 className="text-2xl font-black mb-5">مضمونة حاجتين — والاشتراك على واحدة بس</h2>
        <div className="grid sm:grid-cols-2 gap-3">
          <div className="rounded-3xl bg-white border border-[#E8E4D8] p-5">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-black text-lg">السوق</h3>
              <span className="text-[11px] font-black text-[#059669] bg-[#E6F4EE] rounded-full px-3 py-1">مجاني · بعمولة على الصفقة</span>
            </div>
            <ul className="space-y-2 text-sm text-gray-700">
              <li className="flex gap-2"><ShieldCheck className="w-4 h-4 text-[#059669] shrink-0 mt-0.5" /> إحنا الوسيط في النص — بنضمن للطرفين</li>
              <li className="flex gap-2"><ShieldCheck className="w-4 h-4 text-[#059669] shrink-0 mt-0.5" /> السعر اللي بتطلبه هو اللي بتاخده</li>
              <li className="flex gap-2"><ShieldCheck className="w-4 h-4 text-[#059669] shrink-0 mt-0.5" /> بيع · إيجار · حجز عيادات وصالونات · أوردرات · دليفري · محترفين</li>
              <li className="flex gap-2"><ShieldCheck className="w-4 h-4 text-[#059669] shrink-0 mt-0.5" /> مفيش رسوم تسجيل ولا مقابل للعرض</li>
            </ul>
          </div>
          <div className="rounded-3xl bg-[#04352A] text-white p-5 shadow-lg">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-black text-lg">برنامج الإدارة</h3>
              <span className="text-[11px] font-black text-[#04352A] bg-[#6FCF97] rounded-full px-3 py-1">{price} ج بدل كتير</span>
            </div>
            <ul className="space-y-2 text-sm text-white/90">
              <li className="flex gap-2"><CheckCircle2 className="w-4 h-4 text-[#6FCF97] shrink-0 mt-0.5" /> الاشتراك الوحيد عندنا</li>
              <li className="flex gap-2"><CheckCircle2 className="w-4 h-4 text-[#6FCF97] shrink-0 mt-0.5" /> بيشتغل مع عملائك إنت — حتى لو ماعرضتش في السوق</li>
              <li className="flex gap-2"><CheckCircle2 className="w-4 h-4 text-[#6FCF97] shrink-0 mt-0.5" /> حسابات · CRM · موظفين · مخزون · بوت واتساب · صفحتك</li>
              <li className="flex gap-2"><CheckCircle2 className="w-4 h-4 text-[#6FCF97] shrink-0 mt-0.5" /> {seatsLine}</li>
            </ul>
          </div>
        </div>
        <a href="/system" className="mt-4 block rounded-2xl border border-[#1F6F5F] px-4 py-3 text-center text-sm font-extrabold text-[#1F6F5F] no-underline">
          الشرح الكامل للسيستم شاشة شاشة ←
        </a>
      </section>

      {/* (٤) ٣ خطوات */}
      <section className="bg-white border-y border-[#E8E4D8]">
        <div className="mx-auto max-w-3xl px-5 py-12">
          <h2 className="text-2xl font-black mb-5">٣ خطوات وتبقى شغّال</h2>
          <ol className="grid sm:grid-cols-3 gap-3">
            {[
              ['سجّل بيزنسك', 'دقيقة واحدة — بالواتساب أو جوجل'],
              ['كمّل شركتك', 'الفرع → الموظفين → المنتجات والخدمات — خطوة خطوة ومعاك'],
              ['اربط واتسابك', 'امسح QR — البوت يبدأ يرد ويسجّل عملاءك'],
            ].map(([t, s], i) => (
              <li key={t} className="rounded-3xl bg-[#FAFAF7] border border-[#E8E4D8] p-5">
                <span className="w-9 h-9 rounded-full bg-[#04352A] text-[#6FCF97] text-sm font-black grid place-items-center mb-3">{i + 1}</span>
                <p className="font-black">{t}</p>
                <p className="text-sm text-gray-600 mt-1 leading-relaxed">{s}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* (٥) أسئلة */}
      <section className="mx-auto max-w-3xl px-5 py-12">
        <h2 className="text-2xl font-black mb-5">أسئلة بتتسأل كتير</h2>
        <div className="space-y-2">
          {FAQ.map((f) => (
            <details key={f.q} className="group rounded-2xl bg-white border border-[#E8E4D8] px-4 py-3">
              <summary className="flex items-center justify-between gap-3 cursor-pointer list-none font-black text-sm">
                {f.q}
                <ChevronDown className="w-4 h-4 text-gray-400 shrink-0 transition group-open:rotate-180" />
              </summary>
              <p className="mt-2 text-sm text-gray-600 leading-relaxed">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* (٦) الاشتراك */}
      <section id="subscribe" className="mx-auto max-w-3xl px-5 pb-16">
        <div className="rounded-3xl bg-white border-2 border-[#04352A] p-5 md:p-7 shadow-xl">
          <div className="flex items-end justify-between gap-3 mb-5">
            <div>
              <p className="text-xs font-black text-[#059669]">برنامج الإدارة · {seatsLine}</p>
              <p className="text-4xl font-black mt-1">{price} ج <span className="text-sm text-gray-500 font-bold">بدل كتير{offer.period ? ` · ${offer.period}` : ''}</span></p>
              {offer.note && <p className="text-xs text-gray-500 mt-1">{offer.note}</p>}
            </div>
            <CheckCircle2 className="w-9 h-9 text-[#059669]" />
          </div>
          <a href={startHref} className="block text-center bg-[#34D399] text-[#04352A] font-black rounded-2xl px-6 py-4 no-underline text-base mb-3">ضيف شركتك بنفسك دلوقتي ←</a>
          <p className="text-[11px] text-gray-400 text-center mb-4">تدخل بجوجل أو الواتساب · تكتب اسم شركتك · وتكمّل خطوة خطوة. أو سيب رقمك تحت ونكلّمك إحنا:</p>
          {state === 'done' ? (
            <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-5 text-center">
              <p className="font-black text-emerald-900 text-lg">وصلنا ✓ — هنكلّمك على رقمك النهارده</p>
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
              <button type="submit" disabled={state === 'sending'} className="w-full bg-[#04352A] text-white font-black rounded-2xl py-4 text-base disabled:opacity-50">
                {state === 'sending' ? '…' : 'كلّموني وفعّلولي حسابي'}
              </button>
              <p className="text-[11px] text-gray-400 text-center">من غير دفع دلوقتي — هنكلّمك ونفعّل حسابك ونمشي معاك خطوة خطوة.</p>
            </form>
          )}
        </div>
      </section>

      <footer className="text-center text-[11px] text-gray-400 pb-8">مضمونة · معاملاتك مضمونة · madmonacairo.com</footer>

      {/* شريط ثابت على الموبايل */}
      {state !== 'done' && (
        <div className="fixed bottom-0 inset-x-0 md:hidden bg-white/95 backdrop-blur border-t border-[#E8E4D8] px-4 py-3 flex items-center gap-3 z-20">
          <div className="flex-1 min-w-0">
            <p className="text-[11px] text-gray-500 truncate">برنامج الإدارة · لعدد محدود</p>
            <p className="font-black text-lg leading-tight">{price} ج <span className="text-xs text-gray-500 font-bold">بدل كتير</span></p>
          </div>
          <a href={startHref} className="bg-[#04352A] text-white font-black rounded-2xl px-5 py-3 text-sm no-underline shrink-0">ضيف شركتك</a>
        </div>
      )}
    </main>
  )
}
