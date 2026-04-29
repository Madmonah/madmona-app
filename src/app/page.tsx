import Link from 'next/link'
import {
  Star,
  Users,
  Coffee,
  Clock,
  MapPin,
  Phone,
  MessageCircle,
  ArrowLeft,
  Calendar,
  Search,
  Building2,
  Monitor,
  ShieldCheck,
  Sparkles,
  Camera,
} from 'lucide-react'
import TopNav from '@/components/TopNav'

// ============================================================
// Home page — restructured for clarity:
//   1. TopNav (logo + browse + supplier auth + customer login)
//   2. Hero — single CTA "احجز مساحتك"
//   3. Categories quick browse (5 chips)
//   4. Madmona's spaces (featured)
//   5. Why us (trust signals)
//   6. Supplier CTA (join as supplier)
//   7. Contact + location
// ============================================================

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[#FAFAF7] text-right" dir="rtl">
      <TopNav />

      <main className="max-w-6xl mx-auto px-4 pb-12">
        {/* ========== HERO ========== */}
        <section className="py-10 md:py-16">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#B8860B]/10 rounded-full mb-4">
              <Star className="w-3 h-3 text-[#B8860B] fill-[#B8860B]" />
              <span className="text-xs font-medium text-[#B8860B]">يومك الأول مجاناً</span>
            </div>
            <h1 className="text-3xl md:text-5xl font-bold text-gray-900 leading-tight mb-4">
              مساحتك اللي بتخصك،
              <br />
              <span className="text-[#1F5F3F]">في القاهرة</span>
            </h1>
            <p className="text-base md:text-lg text-gray-600 leading-relaxed mb-8 max-w-xl">
              مكاتب فردية، غرف اجتماعات، ومساحات عمل في كل أنحاء المدينة. احجز فوراً، ادفع كاش أو InstaPay.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Link
                href="/browse"
                className="flex items-center justify-center gap-2 bg-[#1F5F3F] text-white px-6 py-3.5 rounded-xl font-semibold hover:bg-[#1F5F3F]/90 no-underline"
              >
                <Search className="w-4 h-4" />
                استكشف المساحات
              </Link>
              <Link
                href="/reserve/meeting-room"
                className="flex items-center justify-center gap-2 bg-white border border-gray-200 text-gray-900 px-6 py-3.5 rounded-xl font-semibold hover:border-[#1F5F3F]/40 no-underline"
              >
                <Calendar className="w-4 h-4" />
                احجز غرفة اجتماعات
              </Link>
            </div>
          </div>
        </section>

        {/* ========== CATEGORIES ========== */}
        <section className="mb-12">
          <h2 className="text-lg font-bold text-gray-900 mb-4">تصفح حسب النوع</h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <CategoryCard
              href="/browse?category=workstation"
              icon={<Monitor className="w-5 h-5" />}
              label="مكاتب فردية"
              accent="bg-[#1F5F3F]/10 text-[#1F5F3F]"
            />
            <CategoryCard
              href="/browse?category=meeting_room"
              icon={<Users className="w-5 h-5" />}
              label="غرف اجتماعات"
              accent="bg-[#B8860B]/10 text-[#B8860B]"
            />
            <CategoryCard
              href="/browse?category=office"
              icon={<Building2 className="w-5 h-5" />}
              label="مكاتب خاصة"
              accent="bg-[#C2410C]/10 text-[#C2410C]"
            />
            <CategoryCard
              href="/browse?category=amenity"
              icon={<Coffee className="w-5 h-5" />}
              label="وسائل راحة"
              accent="bg-blue-100 text-blue-700"
            />
            <CategoryCard
              href="/browse?category=equipment"
              icon={<Camera className="w-5 h-5" />}
              label="معدات"
              accent="bg-purple-100 text-purple-700"
            />
          </div>
        </section>

        {/* ========== MADMONA'S SPACES ========== */}
        <section className="mb-12">
          <div className="flex items-end justify-between mb-4">
            <div>
              <h2 className="text-lg font-bold text-gray-900">مساحات مضمونة</h2>
              <p className="text-sm text-gray-500 mt-0.5">في مصر الجديدة</p>
            </div>
            <Link
              href="/browse"
              className="text-sm text-[#1F5F3F] font-semibold hover:underline no-underline flex items-center gap-1"
            >
              <span>الكل</span>
              <ArrowLeft className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Meeting Room — primary */}
            <Link
              href="/reserve/meeting-room"
              className="md:col-span-2 block bg-[#1F5F3F] text-white rounded-2xl p-6 hover:bg-[#1F5F3F]/95 no-underline active:scale-[0.99] transition-all"
            >
              <div className="flex items-center gap-1.5 text-xs bg-[#B8860B] text-white px-2.5 py-1 rounded-full font-medium tracking-wide mb-3 w-fit">
                <Calendar className="w-3 h-3" />
                الأكثر طلباً
              </div>
              <h3 className="text-xl font-bold mb-2">غرفة الاجتماعات</h3>
              <p className="text-sm text-white/85 leading-relaxed mb-4">
                اختار وقتك، احجز فوري، تأكيد على واتساب. ٤ أو ٨ أشخاص.
              </p>
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-white/15 rounded-lg p-3">
                  <p className="text-xs text-white/75">حتى ٤ أشخاص</p>
                  <p className="font-semibold mt-0.5">٣٠٠ ج/ساعة</p>
                </div>
                <div className="bg-white/15 rounded-lg p-3">
                  <p className="text-xs text-white/75">حتى ٨ أشخاص</p>
                  <p className="font-semibold mt-0.5">٥٠٠ ج/ساعة</p>
                </div>
              </div>
              <div className="flex items-center justify-between bg-white text-[#1F5F3F] rounded-xl py-2.5 px-4 font-semibold text-sm">
                <span>ابدأ الحجز</span>
                <ArrowLeft className="w-4 h-4" />
              </div>
            </Link>

            {/* Indoor */}
            <Link
              href="/reserve/indoor-coworking"
              className="block bg-white rounded-2xl border border-gray-100 p-5 hover:border-[#1F5F3F]/30 no-underline transition-all"
            >
              <div className="w-10 h-10 rounded-xl bg-[#1F5F3F]/10 flex items-center justify-center mb-3">
                <Coffee className="w-5 h-5 text-[#1F5F3F]" />
              </div>
              <h3 className="font-bold text-gray-900 mb-1">المساحة الداخلية</h3>
              <p className="text-xs text-gray-500 mb-3">مكيف · واي فاي · كافيه</p>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">من</span>
                <span className="font-bold text-[#1F5F3F]">٥٠ ج/ساعة</span>
              </div>
            </Link>

            {/* Garden */}
            <Link
              href="/reserve/outdoor-garden"
              className="block bg-white rounded-2xl border border-gray-100 p-5 hover:border-[#1F5F3F]/30 no-underline transition-all"
            >
              <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center mb-3">
                <Sparkles className="w-5 h-5 text-green-700" />
              </div>
              <h3 className="font-bold text-gray-900 mb-1">الجاردن</h3>
              <p className="text-xs text-gray-500 mb-3">في الهواء الطلق</p>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">يوم كامل</span>
                <span className="font-bold text-[#1F5F3F]">٦٥ ج</span>
              </div>
            </Link>

            {/* Private Office */}
            <Link
              href="/reserve/private-office"
              className="md:col-span-2 block bg-white rounded-2xl border border-gray-100 p-5 hover:border-[#1F5F3F]/30 no-underline transition-all"
            >
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-[#B8860B]/10 flex items-center justify-center flex-shrink-0">
                  <Building2 className="w-5 h-5 text-[#B8860B]" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-gray-900 mb-1">المكتب الخاص</h3>
                  <p className="text-xs text-gray-500">حتى ٨ أشخاص · تكييف منفصل · خزانة</p>
                </div>
                <div className="text-left flex-shrink-0">
                  <p className="text-xs text-gray-500">شهرياً</p>
                  <p className="font-bold text-[#1F5F3F]">١٢,٠٠٠ ج</p>
                </div>
              </div>
            </Link>
          </div>
        </section>

        {/* ========== WHY US ========== */}
        <section className="mb-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <FeatureCard
              icon={<ShieldCheck className="w-5 h-5" />}
              title="حجز مضمون"
              description="ما حدش يقدر يحجز نفس المكان قبلك. التأكيد فوري."
              accent="bg-[#1F5F3F]/10 text-[#1F5F3F]"
            />
            <FeatureCard
              icon={<Clock className="w-5 h-5" />}
              title="مفيش انتظار"
              description="احجز أونلاين، ادفع كاش أو InstaPay، خلاص."
              accent="bg-[#B8860B]/10 text-[#B8860B]"
            />
            <FeatureCard
              icon={<Sparkles className="w-5 h-5" />}
              title="تجربتك أولاً"
              description="يومك الأول مجاناً. جرّب قبل ما تلتزم."
              accent="bg-[#C2410C]/10 text-[#C2410C]"
            />
          </div>
        </section>

        {/* ========== SUPPLIER CTA ========== */}
        <section className="mb-12">
          <div className="bg-gradient-to-l from-[#1F5F3F] to-[#1F5F3F]/90 text-white rounded-2xl p-6 md:p-8 overflow-hidden relative">
            <div className="relative z-10 max-w-xl">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/15 rounded-full mb-3">
                <Building2 className="w-3 h-3" />
                <span className="text-xs font-medium">للموردين</span>
              </div>
              <h2 className="text-2xl md:text-3xl font-bold mb-3">
                عندك مساحة عمل؟ انضم لينا
              </h2>
              <p className="text-sm md:text-base text-white/85 leading-relaxed mb-5">
                سجّل مساحتك على مضمونة، اعرضها على آلاف العملاء، واستقبل حجوزات. احنا نتولى التسويق والدفع.
              </p>
              <div className="flex flex-col sm:flex-row gap-2">
                <Link
                  href="/supplier/signup"
                  className="flex items-center justify-center gap-2 bg-white text-[#1F5F3F] px-5 py-3 rounded-xl font-semibold hover:bg-gray-50 no-underline"
                >
                  سجّل دلوقتي
                  <ArrowLeft className="w-4 h-4" />
                </Link>
                <Link
                  href="/supplier/login"
                  className="flex items-center justify-center gap-2 border border-white/30 text-white px-5 py-3 rounded-xl font-semibold hover:bg-white/10 no-underline"
                >
                  عندي حساب
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* ========== CONTACT + LOCATION ========== */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-8">
          <a
            href="https://wa.me/201002229982"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 p-5 bg-white border border-gray-100 rounded-2xl hover:border-[#25D366]/40 no-underline"
          >
            <div className="w-12 h-12 rounded-xl bg-[#25D366] flex items-center justify-center flex-shrink-0">
              <MessageCircle className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <p className="font-bold text-gray-900">واتساب</p>
              <p className="text-xs text-gray-500 mt-0.5">رد فوري — ٢٤/٧</p>
            </div>
          </a>

          <div className="flex items-start gap-3 p-5 bg-white border border-gray-100 rounded-2xl">
            <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center flex-shrink-0">
              <MapPin className="w-6 h-6 text-gray-700" />
            </div>
            <div className="flex-1">
              <p className="font-bold text-gray-900">الموقع</p>
              <p className="text-xs text-gray-500 mt-0.5">٧ شارع سليمان، مصر الجديدة</p>
              <p className="text-xs text-gray-500">بجوار Modern School</p>
            </div>
          </div>
        </section>

        {/* ========== FOOTER ========== */}
        <footer className="text-center text-xs text-gray-500 py-6 border-t border-gray-100">
          <p className="font-bold text-[#1F5F3F] text-sm mb-1">مضمونة</p>
          <p>Your space, guaranteed · مساحتك اللي بتخصك</p>
        </footer>
      </main>
    </div>
  )
}

// ============================================================
// Helper components
// ============================================================

function CategoryCard({
  href,
  icon,
  label,
  accent,
}: {
  href: string
  icon: React.ReactNode
  label: string
  accent: string
}) {
  return (
    <Link
      href={href}
      className="flex flex-col items-center gap-2 p-4 bg-white rounded-xl border border-gray-100 hover:border-gray-200 hover:shadow-sm no-underline transition-all text-center"
    >
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${accent}`}>
        {icon}
      </div>
      <p className="text-xs font-medium text-gray-900">{label}</p>
    </Link>
  )
}

function FeatureCard({
  icon,
  title,
  description,
  accent,
}: {
  icon: React.ReactNode
  title: string
  description: string
  accent: string
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${accent}`}>
        {icon}
      </div>
      <h3 className="font-bold text-gray-900 mb-1">{title}</h3>
      <p className="text-sm text-gray-600 leading-relaxed">{description}</p>
    </div>
  )
}
