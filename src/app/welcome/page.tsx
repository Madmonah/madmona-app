'use client'

import { useState, useEffect, type ReactNode } from 'react'
import Link from 'next/link'
import { safeStorage } from '@/lib/safe-storage'
import {
  Sparkles, Shield, Zap, Headphones, ArrowLeft, ArrowRight,
  ChevronLeft, Check, Building2, Search, Wand2, BadgePercent,
  Wallet, PhoneCall,
} from 'lucide-react'

/* ============================================================
   /welcome — Onboarding for new users
   Brand-aligned: 5 locked colors, web app aesthetic
   Two paths: supplier OR customer
   ============================================================ */

type Path = 'pick' | 'supplier' | 'customer'

export default function WelcomePage() {
  const [path, setPath] = useState<Path>('pick')
  const [step, setStep] = useState<number>(0)

  // Mark as seen so we can redirect returning users elsewhere (used by middleware later)
  useEffect(() => {
    try { safeStorage.set('madmona_welcome_seen', '1') } catch {}
  }, [])

  function reset() {
    setPath('pick')
    setStep(0)
  }

  return (
    <div className="min-h-screen bg-[#FAFAF7] flex flex-col" dir="rtl">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-[#2B4521] font-black text-xl tracking-tight">
            <span className="inline-block w-9 h-9 rounded-xl bg-[#2B4521] text-white grid place-items-center font-black">م</span>
            مضمونة
          </Link>
          <Link href="/marketplace" className="text-sm font-bold text-[#6B7280] hover:text-[#2B4521] transition-colors">
            تخطي
          </Link>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 max-w-6xl mx-auto px-4 py-8 md:py-12 w-full">
        {path === 'pick' && <PathPicker onPick={(p) => { setPath(p); setStep(1) }} />}
        {path === 'supplier' && <SupplierFlow step={step} setStep={setStep} onBack={reset} />}
        {path === 'customer' && <CustomerFlow step={step} setStep={setStep} onBack={reset} />}
      </main>

      {/* Footer slogan */}
      <footer className="text-center py-6 text-xs text-[#6B7280]">
        <span className="font-bold tracking-wider">معاملاتك مضمونة</span> · madmonacairo.com
      </footer>
    </div>
  )
}

/* ============================================================
   Path Picker
   ============================================================ */
function PathPicker({ onPick }: { onPick: (p: Path) => void }) {
  return (
    <div className="max-w-4xl mx-auto">
      {/* Hero */}
      <div className="text-center mb-10 md:mb-14">
        <p className="text-[11px] font-bold tracking-[0.3em] uppercase text-[#2B4521] mb-3">
          MADMONA · مضمونة
        </p>
        <h1 className="text-4xl md:text-6xl font-black text-[#1A2E26] leading-[1.1] tracking-tight mb-4">
          أهلاً بيك في مضمونة
        </h1>
        <p className="text-base md:text-xl text-[#6B7280] max-w-2xl mx-auto leading-relaxed">
          سوق مصر المضمون — <span className="text-[#1A2E26] font-bold">كل ما تأجره أو تشتريه أو تحجزه</span> في مكان واحد.
          <br className="hidden md:block" />
          من تأجير وبيع وشراء لخدمات ومطاعم وبيوتي.
        </p>
      </div>

      {/* Two paths */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
        <PathCard
          icon={<Search className="w-8 h-8" />}
          title="بدور على حاجة أأجرها"
          subtitle="شقة · عربية · مكتب · كاميرا · معدات"
          benefits={[
            'تصفح آلاف الـ listings',
            'احجز بحماية كاملة',
            'دفع سهل عبر InstaPay',
          ]}
          cta="ابدأ التصفح"
          onClick={() => onPick('customer')}
        />
        <PathCard
          icon={<Sparkles className="w-8 h-8" />}
          title="عندي حاجة عاوز أأجرها"
          subtitle="حوّل اللي عندك لدخل ثابت"
          benefits={[
            'ضيف المنتج في 3 دقايق',
            'AI يلاقيلك زبون مناسب',
            'دفع سريع · حماية كاملة',
          ]}
          cta="ضيف منتج"
          accent
          onClick={() => onPick('supplier')}
        />
      </div>

      {/* Slogan + trust line */}
      <div className="mt-10 md:mt-14 text-center">
        <p className="text-2xl md:text-3xl font-black text-[#1A2E26] tracking-tight mb-2">
          معاملاتك مضمونة
        </p>
        <p className="text-sm text-[#6B7280]">
          منصة مصرية · أمان كامل · دعم على مدار الساعة
        </p>
      </div>
    </div>
  )
}

function PathCard({
  icon, title, subtitle, benefits, cta, accent, onClick,
}: {
  icon: ReactNode
  title: string
  subtitle: string
  benefits: string[]
  cta: string
  accent?: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`group text-right p-6 md:p-8 rounded-3xl border transition-all duration-200 ${
        accent
          ? 'bg-[#2B4521] text-white border-[#2B4521] hover:shadow-lg hover:-translate-y-0.5'
          : 'bg-white border-gray-200 hover:border-[#2B4521] hover:shadow-md hover:-translate-y-0.5'
      }`}
    >
      <div className={`inline-grid place-items-center w-14 h-14 rounded-2xl mb-5 ${
        accent ? 'bg-white/15 text-white' : 'bg-[#FAFAF7] text-[#2B4521]'
      }`}>
        {icon}
      </div>
      <h2 className={`text-xl md:text-2xl font-black mb-1.5 tracking-tight ${
        accent ? 'text-white' : 'text-[#1A2E26]'
      }`}>
        {title}
      </h2>
      <p className={`text-sm mb-5 ${accent ? 'text-white/80' : 'text-[#6B7280]'}`}>
        {subtitle}
      </p>
      <ul className="space-y-2 mb-6">
        {benefits.map((b, i) => (
          <li key={i} className={`flex items-center gap-2 text-sm ${
            accent ? 'text-white/95' : 'text-[#1A2E26]'
          }`}>
            <Check className={`w-4 h-4 flex-shrink-0 ${accent ? 'text-white' : 'text-[#2B4521]'}`} />
            {b}
          </li>
        ))}
      </ul>
      <div className={`inline-flex items-center gap-2 text-sm font-bold ${
        accent ? 'text-white' : 'text-[#2B4521]'
      }`}>
        {cta}
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
      </div>
    </button>
  )
}

/* ============================================================
   Supplier Flow (3 steps)
   ============================================================ */
function SupplierFlow({
  step, setStep, onBack,
}: { step: number, setStep: (n: number) => void, onBack: () => void }) {
  const steps = [
    {
      icon: <Wand2 className="w-7 h-7" />,
      title: 'ضيف المنتج في 3 دقايق',
      desc: 'الـ wizard بيمشيك خطوة بخطوة — صور، تفاصيل، سعر. AI يساعدك تكتب وصف يجذب الزباين.',
      bullets: [
        '27 فئة مختلفة (شقق، عربيات، مكاتب، معدات، كاميرات)',
        'صور بالموبايل من غير تطبيقات إضافية',
        'مفيش OTP — تسجيل سريع',
      ],
    },
    {
      icon: <Sparkles className="w-7 h-7" />,
      title: 'AI يلاقيلك الزبون المناسب',
      desc: 'مش بس بتـ list — بـ نسوّق منتجك تلقائي على ٥ منصات. والـ AI matching بيلاقي الزبون المهتم.',
      bullets: [
        'نشر تلقائي على Instagram · Facebook · TikTok وأكتر',
        'AI matching بيوصلك للزبون المناسب',
        'تقدر تتابع عدد المهتمين من /supplier dashboard',
      ],
    },
    {
      icon: <Wallet className="w-7 h-7" />,
      title: 'دفع سريع + حماية كاملة + دعم دايم',
      desc: 'بعد كل حجز، فلوسك بتوصلك على InstaPay بسرعة. وأي مشكلة، فيه دعم 24/7.',
      bullets: [
        'فلوسك مأمنة لحد ما الحجز يخلص',
        'InstaPay مباشر على رقمك',
        'دعم 24/7 بالعامية المصرية',
      ],
    },
  ]
  const cur = steps[step - 1]

  return (
    <FlowFrame
      onBack={onBack}
      accent="مضيّف"
      title="ضيف المنتج · اربح دخل ثابت"
      stepIndex={step}
      stepCount={3}
    >
      {step <= 3 && (
        <StepCard {...cur} index={step} total={3} />
      )}

      {/* Pillars */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-6">
        <PillarBadge icon={<Shield />} title="حماية كاملة" desc="فلوسك مأمنة لحد ما الحجز يخلص" />
        <PillarBadge icon={<Zap />} title="دفع مستحقات سريع" desc="InstaPay مباشر بعد كل حجز" />
        <PillarBadge icon={<Headphones />} title="دعم مستمر" desc="24/7 بالعامية المصرية" />
      </div>

      {/* Commission disclosure */}
      <div className="mt-6 p-4 rounded-2xl bg-white border border-gray-200 flex items-start gap-3">
        <BadgePercent className="w-5 h-5 text-[#2B4521] flex-shrink-0 mt-0.5" />
        <div className="text-sm text-[#1A2E26] leading-relaxed">
          <span className="font-bold">العمولة شفافة:</span> 10% ثابتة على الكل. مفيش رسوم خفية، مفيش اشتراك شهري.
          <span className="text-[#6B7280]"> بنكسب لما تكسب أنت.</span>
        </div>
      </div>

      {/* Step navigation */}
      <div className="flex items-center justify-between mt-6 gap-3">
        <button
          onClick={() => setStep(Math.max(1, step - 1))}
          disabled={step === 1}
          className="text-sm font-bold text-[#6B7280] hover:text-[#2B4521] disabled:opacity-30 disabled:pointer-events-none transition-colors"
        >
          <ArrowRight className="inline w-4 h-4 ml-1" />
          السابق
        </button>
        {step < 3 ? (
          <button
            onClick={() => setStep(step + 1)}
            className="px-6 py-3 rounded-xl bg-[#2B4521] text-white font-bold text-sm hover:shadow-md transition-shadow flex items-center gap-2"
          >
            التالي
            <ArrowLeft className="w-4 h-4" />
          </button>
        ) : (
          <Link
            href="/list-your-asset"
            className="px-6 py-3 rounded-xl bg-[#2B4521] text-white font-bold text-sm hover:shadow-md transition-shadow flex items-center gap-2"
          >
            ابدأ ضيف منتج
            <ArrowLeft className="w-4 h-4" />
          </Link>
        )}
      </div>
    </FlowFrame>
  )
}

/* ============================================================
   Customer Flow (3 steps)
   ============================================================ */
function CustomerFlow({
  step, setStep, onBack,
}: { step: number, setStep: (n: number) => void, onBack: () => void }) {
  const steps = [
    {
      icon: <Search className="w-7 h-7" />,
      title: 'اتصفح وابحث',
      desc: 'آلاف الـ listings في 27 فئة — شقق، عربيات، مكاتب، كاميرات، معدات. فلاتر ذكية تلاقي اللي يناسبك.',
      bullets: [
        'بحث بالموقع، السعر، التاريخ',
        'صور حقيقية + تفاصيل كاملة',
        'تقييمات من زباين سابقين',
      ],
    },
    {
      icon: <Building2 className="w-7 h-7" />,
      title: 'احجز بمضمونة',
      desc: 'حدد التاريخ، اكتب أي طلبات خاصة، وادفع InstaPay. الحجز مأمن من البداية للنهاية.',
      bullets: [
        'تأكيد فوري للتوافر',
        'تواصل مباشر مع المؤجر',
        'حماية كاملة لفلوسك',
      ],
    },
    {
      icon: <PhoneCall className="w-7 h-7" />,
      title: 'استخدم وادفع · مع دعم دايم',
      desc: 'لو فيه أي مشكلة قبل أو خلال الحجز، الدعم في خدمتك 24/7. وفلوسك مأمنة لحد ما تتأكد إن كله تمام.',
      bullets: [
        'دعم 24/7 على واتساب',
        'استرداد مضمون لو فيه مشكلة',
        'تقييم المؤجر بعد التجربة',
      ],
    },
  ]
  const cur = steps[step - 1]

  return (
    <FlowFrame
      onBack={onBack}
      accent="مستأجر"
      title="استأجر اللي تحتاج · بحماية كاملة"
      stepIndex={step}
      stepCount={3}
    >
      {step <= 3 && <StepCard {...cur} index={step} total={3} />}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-6">
        <PillarBadge icon={<Shield />} title="حماية كاملة" desc="فلوسك مأمنة لحد ما تستلم" />
        <PillarBadge icon={<Zap />} title="دفع سهل" desc="InstaPay من غير complications" />
        <PillarBadge icon={<Headphones />} title="دعم 24/7" desc="على واتساب بالعامية" />
      </div>

      <div className="flex items-center justify-between mt-6 gap-3">
        <button
          onClick={() => setStep(Math.max(1, step - 1))}
          disabled={step === 1}
          className="text-sm font-bold text-[#6B7280] hover:text-[#2B4521] disabled:opacity-30 disabled:pointer-events-none transition-colors"
        >
          <ArrowRight className="inline w-4 h-4 ml-1" />
          السابق
        </button>
        {step < 3 ? (
          <button
            onClick={() => setStep(step + 1)}
            className="px-6 py-3 rounded-xl bg-[#2B4521] text-white font-bold text-sm hover:shadow-md transition-shadow flex items-center gap-2"
          >
            التالي
            <ArrowLeft className="w-4 h-4" />
          </button>
        ) : (
          <Link
            href="/marketplace"
            className="px-6 py-3 rounded-xl bg-[#2B4521] text-white font-bold text-sm hover:shadow-md transition-shadow flex items-center gap-2"
          >
            تصفح المنصة
            <ArrowLeft className="w-4 h-4" />
          </Link>
        )}
      </div>
    </FlowFrame>
  )
}

/* ============================================================
   Shared sub-components
   ============================================================ */
function FlowFrame({
  onBack, accent, title, stepIndex, stepCount, children,
}: {
  onBack: () => void
  accent: string
  title: string
  stepIndex: number
  stepCount: number
  children: ReactNode
}) {
  return (
    <div className="max-w-3xl mx-auto">
      {/* Top: back + breadcrumb */}
      <div className="flex items-center justify-between mb-6">
        <button onClick={onBack} className="text-sm font-bold text-[#6B7280] hover:text-[#2B4521] flex items-center gap-1.5 transition-colors">
          <ChevronLeft className="w-4 h-4" />
          غيّر المسار
        </button>
        <span className="text-[10px] font-bold tracking-[0.25em] uppercase text-[#2B4521] bg-[#2B4521]/10 px-3 py-1.5 rounded-md">
          {accent}
        </span>
      </div>

      {/* Title + progress */}
      <h1 className="text-2xl md:text-4xl font-black text-[#1A2E26] tracking-tight mb-3 leading-tight">
        {title}
      </h1>

      <div className="flex items-center gap-2 mb-8">
        {Array.from({ length: stepCount }).map((_, i) => (
          <div
            key={i}
            className={`flex-1 h-1.5 rounded-full transition-colors ${
              i + 1 <= stepIndex ? 'bg-[#2B4521]' : 'bg-gray-200'
            }`}
          />
        ))}
        <span className="text-xs font-bold text-[#6B7280] mr-2">
          {stepIndex}/{stepCount}
        </span>
      </div>

      {children}
    </div>
  )
}

function StepCard({
  icon, title, desc, bullets, index, total,
}: {
  icon: ReactNode
  title: string
  desc: string
  bullets: string[]
  index: number
  total: number
}) {
  return (
    <div className="bg-white rounded-3xl p-6 md:p-8 border border-gray-100 shadow-sm">
      <div className="flex items-start gap-4 mb-5">
        <div className="inline-grid place-items-center w-14 h-14 rounded-2xl bg-[#2B4521]/10 text-[#2B4521] flex-shrink-0">
          {icon}
        </div>
        <div className="flex-1">
          <p className="text-[10px] font-bold tracking-[0.25em] uppercase text-[#2B4521] mb-1">
            خطوة {index} من {total}
          </p>
          <h2 className="text-xl md:text-2xl font-black text-[#1A2E26] tracking-tight leading-tight">
            {title}
          </h2>
        </div>
      </div>
      <p className="text-sm md:text-base text-[#6B7280] leading-relaxed mb-5">
        {desc}
      </p>
      <ul className="space-y-2.5">
        {bullets.map((b, i) => (
          <li key={i} className="flex items-start gap-2.5 text-sm text-[#1A2E26]">
            <span className="inline-grid place-items-center w-5 h-5 rounded-full bg-[#2B4521]/10 text-[#2B4521] flex-shrink-0 mt-0.5">
              <Check className="w-3 h-3" />
            </span>
            <span className="leading-relaxed">{b}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function PillarBadge({
  icon, title, desc,
}: { icon: ReactNode, title: string, desc: string }) {
  return (
    <div className="p-4 rounded-2xl bg-white border border-gray-100">
      <div className="inline-grid place-items-center w-9 h-9 rounded-lg bg-[#2B4521]/10 text-[#2B4521] mb-2">
        <span className="[&>svg]:w-4 [&>svg]:h-4">{icon}</span>
      </div>
      <h3 className="text-sm font-black text-[#1A2E26] tracking-tight mb-0.5">{title}</h3>
      <p className="text-[11px] text-[#6B7280] leading-relaxed">{desc}</p>
    </div>
  )
}
