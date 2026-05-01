import Link from 'next/link'
import {
  Sparkles,
  ArrowLeft,
  Building2,
  Compass,
  ShieldCheck,
  Clock,
  Zap,
  MapPin,
  MessageCircle,
  Star,
} from 'lucide-react'
import TopNav from '@/components/TopNav'
import InstallPWA from '@/components/InstallPWA'
import FeaturedListings from '@/components/FeaturedListings'

// ============================================================
// Home page — premium, cinematic, professional
// ============================================================

export default function HomePage() {
  return (
    <div className="min-h-screen gradient-mesh text-right overflow-x-hidden" dir="rtl">
      <TopNav />

      <main className="relative">
        {/* Decorative gradient blobs */}
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-[#1F5F3F]/5 rounded-full blur-3xl -z-0 animate-float pointer-events-none" />
        <div className="absolute top-40 left-20 w-[400px] h-[400px] bg-[#B8860B]/5 rounded-full blur-3xl -z-0 animate-float pointer-events-none" style={{ animationDelay: '2s' }} />

        <div className="max-w-6xl mx-auto px-4 relative">
          <div className="pt-4">
            <InstallPWA />
          </div>

          {/* ========== HERO ========== */}
          <section className="pt-16 pb-20 md:pt-28 md:pb-32 text-center relative">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/80 backdrop-blur rounded-full mb-8 shadow-soft animate-slide-down">
              <Sparkles className="w-4 h-4 text-[#B8860B]" />
              <span className="text-xs font-bold text-gray-700 tracking-wide">
                أول منصة حجز شاملة في مصر
              </span>
            </div>

            <h1 className="text-5xl md:text-7xl lg:text-8xl font-black text-gray-900 leading-[0.95] mb-6 tracking-tight animate-slide-up">
              مساحتك،
              <br />
              <span className="gradient-text-green">
                خدمتك،
              </span>
              <br />
              <span className="text-gray-900">مضمونة</span>
            </h1>

            <p className="text-base md:text-xl text-gray-600 leading-relaxed max-w-2xl mx-auto mb-10 animate-slide-up delay-200">
              مساحات عمل، عقارات، مركبات، ومعدات.
              <br className="hidden sm:block" />
              من موردين معتمدين، بضمان كامل، في مكان واحد.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 justify-center animate-slide-up delay-300">
              <Link
                href="/marketplace"
                className="group inline-flex items-center justify-center gap-2 bg-[#1F5F3F] text-white px-8 py-4 rounded-2xl font-bold text-base shadow-elevated hover:shadow-luxe transition-all duration-300 hover:-translate-y-0.5 no-underline"
              >
                <Compass className="w-5 h-5" />
                <span>اكتشف الـMarketplace</span>
                <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
              </Link>
              <Link
                href="/browse"
                className="group inline-flex items-center justify-center gap-2 bg-white/80 backdrop-blur text-gray-900 px-8 py-4 rounded-2xl font-bold text-base shadow-soft hover:shadow-card transition-all duration-300 hover:-translate-y-0.5 border border-gray-100 no-underline"
              >
                <Building2 className="w-5 h-5" />
                <span>مساحات مضمونة</span>
              </Link>
            </div>

            {/* Trust ribbon */}
            <div className="flex items-center justify-center gap-6 md:gap-8 mt-12 animate-fade-in delay-500 flex-wrap">
              <TrustBadge icon={<ShieldCheck className="w-3.5 h-3.5" />} label="حجز مضمون" />
              <TrustBadge icon={<Clock className="w-3.5 h-3.5" />} label="رد فوري ٢٤/٧" />
              <TrustBadge icon={<Star className="w-3.5 h-3.5" />} label="موردين موثّقين" />
            </div>
          </section>

          {/* ========== TWO BIG SHOWCASE CARDS ========== */}
          <section className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-20 md:mb-28">
            {/* Marketplace — featured first */}
            <Link
              href="/marketplace"
              className="group relative block bg-white rounded-3xl p-8 md:p-10 hover:-translate-y-1 transition-all duration-500 no-underline overflow-hidden shadow-card hover:shadow-luxe animate-slide-up delay-100"
            >
              {/* Gradient accent */}
              <div className="absolute top-0 left-0 w-32 h-32 bg-gradient-to-br from-[#B8860B]/10 to-transparent rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700" />
              <div className="absolute bottom-0 right-0 w-40 h-40 bg-gradient-to-tl from-[#1F5F3F]/10 to-transparent rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700" />

              <div className="relative z-10">
                <div className="inline-flex items-center gap-1.5 text-[10px] bg-[#B8860B] text-white px-3 py-1 rounded-full font-bold tracking-widest uppercase mb-6">
                  <Sparkles className="w-3 h-3" />
                  جديد
                </div>

                <h2 className="text-3xl md:text-5xl font-black text-gray-900 mb-3 leading-[0.95]">
                  <span className="gradient-text-green">Madmona</span>
                  <br />
                  Marketplace
                </h2>

                <p className="text-sm md:text-base text-gray-600 leading-relaxed mb-8 max-w-md">
                  عقارات، مركبات، معدات تصوير، ومساحات تنظيم فعاليات — من موردين معتمدين على المنصة.
                </p>

                <div className="flex items-center gap-3 mb-6 flex-wrap">
                  <CategoryPill emoji="🏠" label="عقارات" />
                  <CategoryPill emoji="🚗" label="مركبات" />
                  <CategoryPill emoji="🎬" label="معدات" />
                  <CategoryPill emoji="🎉" label="فعاليات" />
                </div>

                <div className="inline-flex items-center gap-2 text-[#1F5F3F] font-bold text-sm group-hover:gap-3 transition-all">
                  <span>اكتشف الكل</span>
                  <ArrowLeft className="w-4 h-4" />
                </div>
              </div>
            </Link>

            {/* Madmona spaces */}
            <Link
              href="/browse"
              className="group relative block rounded-3xl p-8 md:p-10 hover:-translate-y-1 transition-all duration-500 no-underline overflow-hidden text-white animate-slide-up delay-200"
              style={{ background: 'linear-gradient(135deg, #1F5F3F 0%, #2d7a52 50%, #1F5F3F 100%)' }}
            >
              {/* Decorative geometric */}
              <div className="absolute -top-12 -left-12 w-48 h-48 border border-white/10 rounded-full" />
              <div className="absolute -bottom-20 -right-20 w-72 h-72 border border-white/10 rounded-full" />
              <div className="absolute top-1/2 left-1/3 w-3 h-3 bg-[#B8860B] rounded-full animate-pulse-soft" />

              <div className="relative z-10">
                <div className="inline-flex items-center gap-1.5 text-[10px] bg-[#B8860B] text-white px-3 py-1 rounded-full font-bold tracking-widest uppercase mb-6">
                  <Star className="w-3 h-3 fill-white" />
                  الأصلي
                </div>

                <h2 className="text-3xl md:text-5xl font-black mb-3 leading-[0.95]">
                  مساحات
                  <br />
                  مضمونة
                </h2>

                <p className="text-sm md:text-base text-white/80 leading-relaxed mb-8 max-w-md">
                  مكاتب فردية، غرف اجتماعات، وجاردن في قلب مصر الجديدة. يومك الأول مجاناً.
                </p>

                <div className="grid grid-cols-3 gap-2 mb-6">
                  <SpaceMini label="مكاتب" sublabel="من ٥٠ ج/ساعة" />
                  <SpaceMini label="اجتماعات" sublabel="من ٣٠٠ ج" />
                  <SpaceMini label="جاردن" sublabel="٦٥ ج/يوم" />
                </div>

                <div className="inline-flex items-center gap-2 bg-white text-[#1F5F3F] px-5 py-2.5 rounded-xl font-bold text-sm group-hover:gap-3 transition-all">
                  <span>احجز دلوقتي</span>
                  <ArrowLeft className="w-4 h-4" />
                </div>
              </div>
            </Link>
          </section>

          {/* ========== FEATURED LISTINGS ========== */}
          <section className="mb-20 md:mb-28">
            <FeaturedListings />
          </section>

          {/* ========== HOW IT WORKS — premium 3-step ========== */}
          <section className="mb-20 md:mb-28">
            <div className="text-center mb-12">
              <p className="text-xs font-bold text-[#B8860B] uppercase tracking-widest mb-2">إزاي بيشتغل</p>
              <h2 className="text-3xl md:text-5xl font-black text-gray-900 leading-tight">
                ٣ خطوات،
                <br />
                <span className="gradient-text-green">حجز مضمون</span>
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
              <Step
                num="01"
                title="استكشف"
                description="اتصفّح الـMarketplace أو ابحث في فئة معينة. شوف الأسعار والصور قبل أي قرار."
                icon={<Compass className="w-6 h-6" />}
                accent="from-[#1F5F3F]/10 to-[#1F5F3F]/5"
                iconAccent="text-[#1F5F3F] bg-[#1F5F3F]/10"
              />
              <Step
                num="02"
                title="احجز"
                description="اختار الوقت اللي يناسبك واحجز فوراً. تأكيد على واتساب من المورد مباشرة."
                icon={<Zap className="w-6 h-6" />}
                accent="from-[#B8860B]/10 to-[#B8860B]/5"
                iconAccent="text-[#B8860B] bg-[#B8860B]/10"
              />
              <Step
                num="03"
                title="استمتع"
                description="ادفع كاش أو InstaPay. مفيش هيدن فيز. ومتأمن إنك مش هتلاقي مفاجآت."
                icon={<ShieldCheck className="w-6 h-6" />}
                accent="from-[#C2410C]/10 to-[#C2410C]/5"
                iconAccent="text-[#C2410C] bg-[#C2410C]/10"
              />
            </div>
          </section>

          {/* ========== PREMIUM SUPPLIER CTA ========== */}
          <section className="mb-20 md:mb-28 relative">
            <div className="relative bg-gray-900 text-white rounded-3xl p-8 md:p-14 overflow-hidden shadow-luxe">
              {/* Decorative elements */}
              <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#1F5F3F]/30 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
              <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-[#B8860B]/20 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />

              <div className="relative z-10 max-w-2xl">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/10 backdrop-blur rounded-full mb-5 border border-white/10">
                  <Building2 className="w-3 h-3 text-[#B8860B]" />
                  <span className="text-[10px] font-bold uppercase tracking-widest text-white/90">للموردين</span>
                </div>

                <h2 className="text-3xl md:text-5xl font-black mb-4 leading-[0.95]">
                  عندك مساحة أو خدمة؟
                  <br />
                  <span className="gradient-text-gold">خلّيها تكسبلك</span>
                </h2>

                <p className="text-sm md:text-lg text-white/80 leading-relaxed mb-8 max-w-xl">
                  انضم لـMadmona Marketplace، اعرض خدمتك على آلاف العملاء، واستقبل حجوزات بدون عمولة جانبية.
                  لوحة كاملة، إشعارات لايف، وعمولة شفافة.
                </p>

                <div className="flex flex-col sm:flex-row gap-3">
                  <Link
                    href="/supplier/register"
                    className="group inline-flex items-center justify-center gap-2 bg-white text-gray-900 px-7 py-3.5 rounded-2xl font-bold text-sm hover:bg-gray-100 transition-all duration-300 hover:-translate-y-0.5 no-underline"
                  >
                    <span>سجّل دلوقتي</span>
                    <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                  </Link>
                  <Link
                    href="/auth/login?redirect=/supplier/marketplace"
                    className="inline-flex items-center justify-center gap-2 border border-white/30 backdrop-blur text-white px-7 py-3.5 rounded-2xl font-bold text-sm hover:bg-white/10 transition-all no-underline"
                  >
                    عندي حساب
                  </Link>
                </div>
              </div>
            </div>
          </section>

          {/* ========== CONTACT ========== */}
          <section className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-12">
            <a
              href="https://wa.me/201002229982"
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center gap-4 p-5 bg-white rounded-2xl shadow-soft hover:shadow-card transition-all duration-300 hover:-translate-y-0.5 no-underline border border-gray-100"
            >
              <div className="w-12 h-12 rounded-2xl bg-[#25D366] flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                <MessageCircle className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <p className="font-bold text-gray-900">واتساب</p>
                <p className="text-xs text-gray-500 mt-0.5" dir="ltr">+20 100 222 9982 · 24/7</p>
              </div>
              <ArrowLeft className="w-4 h-4 text-gray-400 group-hover:text-[#25D366] group-hover:-translate-x-1 transition-all" />
            </a>

            <div className="flex items-center gap-4 p-5 bg-white rounded-2xl shadow-soft border border-gray-100">
              <div className="w-12 h-12 rounded-2xl bg-gray-900 flex items-center justify-center flex-shrink-0">
                <MapPin className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <p className="font-bold text-gray-900">٧ سليمان عظمي</p>
                <p className="text-xs text-gray-500 mt-0.5">مصر الجديدة، القاهرة · ٩ ص → ١١ م</p>
              </div>
            </div>
          </section>

          {/* ========== FOOTER ========== */}
          <footer className="text-center py-10 border-t border-gray-200">
            <p className="font-black text-2xl gradient-text-green mb-2">مضمونة</p>
            <p className="text-xs text-gray-500 mb-4 tracking-wide">Your space, guaranteed · مساحتك اللي بتخصك</p>
            <div className="flex justify-center items-center gap-4 text-xs">
              <Link href="/about" className="text-gray-600 hover:text-[#1F5F3F] font-medium no-underline transition-colors">
                عن مضمونة
              </Link>
              <span className="text-gray-300">·</span>
              <Link href="/marketplace" className="text-gray-600 hover:text-[#1F5F3F] font-medium no-underline transition-colors">
                Marketplace
              </Link>
              <span className="text-gray-300">·</span>
              <a
                href="https://wa.me/201002229982"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-600 hover:text-[#1F5F3F] font-medium no-underline transition-colors"
              >
                واتساب
              </a>
            </div>
            <p className="text-[10px] text-gray-400 mt-6">© 2025 Madmona. جميع الحقوق محفوظة.</p>
          </footer>
        </div>
      </main>
    </div>
  )
}

// ============================================================
// Sub-components
// ============================================================

function TrustBadge({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-1.5 text-xs text-gray-600">
      <span className="text-[#1F5F3F]">{icon}</span>
      <span className="font-medium">{label}</span>
    </div>
  )
}

function CategoryPill({ emoji, label }: { emoji: string; label: string }) {
  return (
    <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#FAFAF7] rounded-full text-xs font-medium text-gray-700 border border-gray-100">
      <span>{emoji}</span>
      <span>{label}</span>
    </div>
  )
}

function SpaceMini({ label, sublabel }: { label: string; sublabel: string }) {
  return (
    <div className="bg-white/10 backdrop-blur rounded-xl p-2.5 text-center">
      <p className="text-xs font-bold text-white">{label}</p>
      <p className="text-[10px] text-white/70 mt-0.5">{sublabel}</p>
    </div>
  )
}

function Step({
  num,
  title,
  description,
  icon,
  accent,
  iconAccent,
}: {
  num: string
  title: string
  description: string
  icon: React.ReactNode
  accent: string
  iconAccent: string
}) {
  return (
    <div className={`relative bg-white rounded-3xl p-6 md:p-8 shadow-soft hover:shadow-card hover:-translate-y-1 transition-all duration-500 overflow-hidden bg-gradient-to-br ${accent}`}>
      <div className="absolute top-4 left-6 text-7xl md:text-8xl font-black text-gray-100 leading-none -z-0 select-none">
        {num}
      </div>
      <div className="relative z-10">
        <div className={`w-12 h-12 rounded-2xl ${iconAccent} flex items-center justify-center mb-4`}>
          {icon}
        </div>
        <h3 className="text-xl md:text-2xl font-black text-gray-900 mb-2">{title}</h3>
        <p className="text-sm text-gray-600 leading-relaxed">{description}</p>
      </div>
    </div>
  )
}
