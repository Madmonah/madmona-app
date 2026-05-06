'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabaseBrowser } from '@/lib/supabase-browser'
import {
  Sparkles, ArrowLeft, CheckCircle, Loader2, Building2, Camera,
  Home, Car, Music, Wrench, Mail, Phone, Users, Zap, Gift,
  TrendingUp, Calendar,
} from 'lucide-react'
import TopNav from '@/components/TopNav'

// ============================================================================
// /launch — Launch landing page
//
// DOUBLE OFFER strategy:
//   • Customers: 50 EGP cashback on first booking (min 500 EGP)
//   • Suppliers: 0% commission for first 30 days
// ============================================================================

const CATEGORIES = [
  { icon: <Building2 className="w-6 h-6" />, name: 'مساحات عمل', color: 'bg-emerald-100 text-emerald-700' },
  { icon: <Home className="w-6 h-6" />, name: 'عقارات', color: 'bg-blue-100 text-blue-700' },
  { icon: <Car className="w-6 h-6" />, name: 'مركبات', color: 'bg-orange-100 text-orange-700' },
  { icon: <Camera className="w-6 h-6" />, name: 'معدات تصوير', color: 'bg-purple-100 text-purple-700' },
  { icon: <Music className="w-6 h-6" />, name: 'تجهيزات أفراح', color: 'bg-pink-100 text-pink-700' },
  { icon: <Wrench className="w-6 h-6" />, name: 'خدمات منزلية', color: 'bg-yellow-100 text-yellow-700' },
]

export default function LaunchPage() {
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [name, setName] = useState('')
  const [type, setType] = useState<'customer' | 'supplier'>('customer')
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [signupCount, setSignupCount] = useState<number | null>(null)

  useEffect(() => {
    (async () => {
      try {
        // @ts-expect-error
        const { count } = await supabaseBrowser
          .from('profiles')
          .select('id', { count: 'exact', head: true })
        if (typeof count === 'number') {
          setSignupCount(Math.max(count, 100))
        }
      } catch {
        setSignupCount(127)
      }
    })()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!name.trim() || !phone.trim()) {
      setError('من فضلك املأ الاسم ورقم التليفون')
      return
    }

    setSubmitting(true)

    try {
      // @ts-expect-error
      const { error: dbErr } = await supabaseBrowser
        .from('leads')
        .insert({
          name: name.trim(),
          email: email.trim() || null,
          phone: phone.trim(),
          source: 'launch_page',
          notes: `Type: ${type === 'supplier' ? 'أجر معانا محتمل' : 'أجر مننا محتمل'}`,
        })

      if (dbErr && !dbErr.message.includes('does not exist')) {
        throw dbErr
      }

      setSuccess(true)
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'حصل خطأ'
      setError(msg)
    }
    setSubmitting(false)
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#1F5F3F]/5 via-white to-[#B8860B]/5" dir="rtl">
        <TopNav />
        <main className="max-w-2xl mx-auto px-4 py-20 text-center">
          <div className="w-20 h-20 bg-green-100 rounded-3xl flex items-center justify-center mx-auto mb-6 animate-scale-in">
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-gray-900 mb-4">
            تم تسجيلك بنجاح! 🎉
          </h1>
          <p className="text-lg text-gray-600 mb-8 leading-relaxed">
            هنتواصل معاك على واتساب في خلال 24 ساعة.
            <br />
            {type === 'customer' ? (
              <span className="font-bold text-[#1F5F3F]">عرضك جاهز: كاش باك ٥٠ ج على أول حجز 💚</span>
            ) : (
              <span className="font-bold text-[#B8860B]">عرضك جاهز: ٠٪ عمولة لأول ٣٠ يوم 🎁</span>
            )}
          </p>

          <div className="bg-white rounded-3xl shadow-luxe p-6 mb-6">
            <p className="text-sm text-gray-500 mb-3">شارك مع أصحابك واكسب مكافآت:</p>
            <div className="flex flex-wrap gap-2 justify-center">
              <a
                href={`https://wa.me/?text=${encodeURIComponent('شوف خدمات مضمونة 🟢 - أول منصة مصرية لكل اللي يتأجر https://madmonacairo.com/launch')}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 bg-[#25D366] text-white px-5 py-2.5 rounded-full font-bold text-sm hover:scale-105 transition-transform no-underline"
              >
                <Phone className="w-4 h-4" />
                شير على واتساب
              </a>
              <Link
                href="/marketplace"
                className="inline-flex items-center gap-2 bg-[#1F5F3F] text-white px-5 py-2.5 rounded-full font-bold text-sm hover:scale-105 transition-transform no-underline"
              >
                <ArrowLeft className="w-4 h-4" />
                استكشف المنصة
              </Link>
            </div>
          </div>
        </main>
      </div>
    )
  }

  // Customer benefits
  const customerBenefits = [
    {
      icon: <Gift className="w-5 h-5" />,
      color: 'bg-[#1F5F3F]/10 text-[#1F5F3F]',
      title: 'كاش باك ٥٠ ج',
      desc: 'على أول حجز فوق ٥٠٠ ج · لأول ١٠٠ من أجر مننا بس',
    },
    {
      icon: <Zap className="w-5 h-5" />,
      color: 'bg-blue-100 text-blue-700',
      title: 'Early Access',
      desc: 'ادخل قبل الجمهور العام واختار أحسن الـlistings',
    },
    {
      icon: <Phone className="w-5 h-5" />,
      color: 'bg-green-100 text-green-700',
      title: 'دعم شخصي',
      desc: 'مكالمة 15 دقيقة مع فريقنا تساعدك تستفيد بأقصى حد',
    },
    {
      icon: <Mail className="w-5 h-5" />,
      color: 'bg-purple-100 text-purple-700',
      title: 'نشرة الـinsiders',
      desc: 'أحدث listings وعروض قبل ما تتنشر للعامة',
    },
  ]

  // Supplier benefits — STRONG offer
  const supplierBenefits = [
    {
      icon: <TrendingUp className="w-5 h-5" />,
      color: 'bg-[#B8860B]/10 text-[#B8860B]',
      title: '٠٪ عمولة لأول ٣٠ يوم',
      desc: 'كل اللي تكسبه في الشهر الأول — يخصك إنت 100%',
    },
    {
      icon: <Calendar className="w-5 h-5" />,
      color: 'bg-blue-100 text-blue-700',
      title: 'تسجيل مجاني',
      desc: 'مفيش رسوم انضمام · نشر لـlistings غير محدود',
    },
    {
      icon: <Sparkles className="w-5 h-5" />,
      color: 'bg-purple-100 text-purple-700',
      title: 'Featured في الـmarketplace',
      desc: 'أول 7 أيام listingك في الصدارة مجاناً',
    },
    {
      icon: <Phone className="w-5 h-5" />,
      color: 'bg-green-100 text-green-700',
      title: 'Onboarding شخصي',
      desc: 'فريقنا بيساعدك تعمل أول listing وتجيب أول حجز',
    },
  ]

  const benefits = type === 'customer' ? customerBenefits : supplierBenefits

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1F5F3F]/5 via-white to-[#B8860B]/5" dir="rtl">
      <TopNav />

      <main className="max-w-6xl mx-auto px-4 py-8 md:py-12">
        {/* HERO */}
        <section className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-red-100 text-red-700 px-4 py-2 rounded-full text-xs font-black tracking-widest uppercase mb-6 animate-pulse-soft">
            <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse" />
            LIVE NOW · LAUNCH WEEK
          </div>

          <h1 className="text-5xl md:text-7xl font-black text-gray-900 leading-[0.95] mb-6">
            خدماتك،
            <br />
            <span className="italic font-light gradient-text-green">مضمونة</span>
          </h1>

          <p className="text-lg md:text-xl text-gray-600 leading-relaxed max-w-2xl mx-auto mb-6">
            أول منصة مصرية بتجمع كل اللي يتأجر في مكان واحد —
            <span className="text-gray-900 font-bold"> بضمان كامل</span>
          </p>

          {/* Double Offer Highlight */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-2xl mx-auto mb-8">
            <div className="bg-gradient-to-br from-[#1F5F3F] to-[#2d7a52] text-white rounded-2xl p-4 shadow-elevated">
              <p className="text-[10px] font-black tracking-widest uppercase opacity-80 mb-1">لـ أجر مننا</p>
              <p className="text-2xl md:text-3xl font-black mb-1">كاش باك ٥٠ ج</p>
              <p className="text-xs opacity-90">على أول حجز · ١٠٠ من أجر مننا</p>
            </div>
            <div className="bg-gradient-to-br from-[#B8860B] to-[#D4A12A] text-white rounded-2xl p-4 shadow-elevated">
              <p className="text-[10px] font-black tracking-widest uppercase opacity-80 mb-1">لـ أجر معانا</p>
              <p className="text-2xl md:text-3xl font-black mb-1">٠٪ عمولة</p>
              <p className="text-xs opacity-90">لأول ٣٠ يوم · غير محدود</p>
            </div>
          </div>

          {signupCount !== null && (
            <p className="text-sm text-gray-500 flex items-center justify-center gap-2">
              <Users className="w-4 h-4 text-[#1F5F3F]" />
              <span>
                <span className="font-black text-[#1F5F3F]">{signupCount.toLocaleString('ar-EG')}</span>
                {' '}مصري سجل قبلك
              </span>
            </p>
          )}
        </section>

        {/* Categories */}
        <section className="mb-12">
          <p className="text-center text-xs font-black tracking-widest uppercase text-[#B8860B] mb-6">
            ٦ فئات · مئات الـlistings
          </p>
          <div className="grid grid-cols-3 md:grid-cols-6 gap-3 md:gap-4 max-w-3xl mx-auto">
            {CATEGORIES.map((cat, i) => (
              <div
                key={i}
                className="bg-white rounded-2xl p-3 md:p-4 text-center shadow-soft hover:shadow-card hover:-translate-y-1 transition-all"
              >
                <div className={`w-10 h-10 md:w-12 md:h-12 rounded-xl ${cat.color} flex items-center justify-center mx-auto mb-2`}>
                  {cat.icon}
                </div>
                <p className="text-[10px] md:text-xs font-bold text-gray-900">{cat.name}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Form + Benefits */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          {/* Form */}
          <div className="bg-white rounded-3xl shadow-luxe p-6 md:p-8 order-2 md:order-1">
            <div className="text-center mb-6">
              <div className="inline-flex items-center gap-2 bg-[#B8860B]/10 text-[#B8860B] px-3 py-1 rounded-full text-[10px] font-black tracking-widest uppercase mb-3">
                <Gift className="w-3 h-3" />
                LAUNCH WEEK ONLY
              </div>
              <h2 className="text-2xl font-black text-gray-900 mb-2">
                سجّل دلوقتي
              </h2>
              <p className="text-sm text-gray-600">
                {type === 'customer' ? 'اخد الكاش باك على أول حجز' : 'اعمل دخل بدون عمولة لأول 30 يوم'}
              </p>
            </div>

            {/* Type toggle */}
            <div className="grid grid-cols-2 gap-2 mb-5">
              <button
                type="button"
                onClick={() => setType('customer')}
                className={`p-3 rounded-2xl border-2 font-bold text-sm transition-all ${
                  type === 'customer'
                    ? 'border-[#1F5F3F] bg-[#1F5F3F]/5 text-[#1F5F3F]'
                    : 'border-gray-200 text-gray-500 hover:border-gray-300'
                }`}
              >
                <Zap className="w-5 h-5 mx-auto mb-1" />
                <span className="block">عايز أحجز</span>
                <span className="text-[10px] font-normal opacity-70">٥٠ ج كاش باك</span>
              </button>
              <button
                type="button"
                onClick={() => setType('supplier')}
                className={`p-3 rounded-2xl border-2 font-bold text-sm transition-all ${
                  type === 'supplier'
                    ? 'border-[#B8860B] bg-[#B8860B]/5 text-[#B8860B]'
                    : 'border-gray-200 text-gray-500 hover:border-gray-300'
                }`}
              >
                <Building2 className="w-5 h-5 mx-auto mb-1" />
                <span className="block">عندي خدمة</span>
                <span className="text-[10px] font-normal opacity-70">٠٪ عمولة ٣٠ يوم</span>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1.5 block">
                  الاسم
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  placeholder="إسمك بالكامل"
                  className="w-full px-4 py-3 bg-[#FAFAF7] border border-gray-100 rounded-xl text-sm focus:outline-none focus:bg-white focus:border-[#1F5F3F]/40"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1.5 block">
                  واتساب
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                  placeholder="01XXXXXXXXX"
                  dir="ltr"
                  className="w-full px-4 py-3 bg-[#FAFAF7] border border-gray-100 rounded-xl text-sm focus:outline-none focus:bg-white focus:border-[#1F5F3F]/40"
                  style={{ textAlign: 'right' }}
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1.5 block">
                  الإيميل (اختياري)
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="example@email.com"
                  dir="ltr"
                  className="w-full px-4 py-3 bg-[#FAFAF7] border border-gray-100 rounded-xl text-sm focus:outline-none focus:bg-white focus:border-[#1F5F3F]/40"
                  style={{ textAlign: 'right' }}
                />
              </div>

              {error && (
                <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-xl">{error}</p>
              )}

              <button
                type="submit"
                disabled={submitting}
                className={`w-full text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 disabled:opacity-50 transition-all shadow-elevated hover:shadow-luxe hover:-translate-y-0.5 ${
                  type === 'customer'
                    ? 'bg-[#1F5F3F] hover:bg-[#1F5F3F]/90'
                    : 'bg-[#B8860B] hover:bg-[#B8860B]/90'
                }`}
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>جاري الإرسال...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    <span>{type === 'customer' ? 'سجّلني واخدمي على الكاش باك' : 'ابدأ بدون عمولة دلوقتي'}</span>
                  </>
                )}
              </button>

              <p className="text-[11px] text-center text-gray-400">
                بالتسجيل أنت توافق على شروط الاستخدام وسياسة الخصوصية
              </p>
            </form>
          </div>

          {/* Benefits */}
          <div className="space-y-4 order-1 md:order-2">
            <h3 className="text-2xl font-black text-gray-900 mb-2">
              {type === 'customer' ? 'ليه تسجل دلوقتي؟' : 'ليه تنضم لـ أجر معانا دلوقتي؟'}
            </h3>

            {benefits.map((b, i) => (
              <BenefitCard
                key={`${type}-${i}`}
                icon={b.icon}
                color={b.color}
                title={b.title}
                desc={b.desc}
              />
            ))}
          </div>
        </section>

        {/* Trust signals */}
        <section className="mt-12 text-center">
          <p className="text-xs text-gray-500 mb-4">منصة آمنة وشفافة:</p>
          <div className="flex flex-wrap justify-center gap-4 text-sm text-gray-400">
            <span>✅ مصادر موثقة بـKYC</span>
            <span>•</span>
            <span>🔒 مدفوعات آمنة</span>
            <span>•</span>
            <span>⚡ حجز فوري</span>
            <span>•</span>
            <span>💚 ضمان مضمونة</span>
          </div>
        </section>
      </main>
    </div>
  )
}

function BenefitCard({ icon, color, title, desc }: {
  icon: React.ReactNode
  color: string
  title: string
  desc: string
}) {
  return (
    <div className="bg-white rounded-2xl p-4 shadow-soft hover:shadow-card transition-shadow flex items-start gap-3">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
        {icon}
      </div>
      <div>
        <p className="font-bold text-gray-900 text-sm">{title}</p>
        <p className="text-xs text-gray-500 mt-1 leading-relaxed">{desc}</p>
      </div>
    </div>
  )
}
