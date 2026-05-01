import Link from 'next/link'
import {
  Star,
  Clock,
  MapPin,
  MessageCircle,
  ArrowLeft,
  Search,
  Building2,
  ShieldCheck,
  Sparkles,
  Compass,
} from 'lucide-react'
import TopNav from '@/components/TopNav'
import InstallPWA from '@/components/InstallPWA'
import FeaturedListings from '@/components/FeaturedListings'

// ============================================================
// Home page — minimalist, Aesop-style:
//   1. TopNav
//   2. Hero — single statement
//   3. Two split cards (Madmona spaces / Marketplace)
//   4. Featured marketplace listings strip (live data)
//   5. Trust signals (compact one row)
//   6. Supplier CTA (compact)
//   7. Contact
//   8. Footer (with About link)
// ============================================================

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[#FAFAF7] text-right" dir="rtl">
      <TopNav />

      <main className="max-w-6xl mx-auto px-4 pb-12">
        <div className="pt-4">
          <InstallPWA />
        </div>

        {/* ========== HERO ========== */}
        <section className="py-12 md:py-20 text-center max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#B8860B]/10 rounded-full mb-5">
            <Star className="w-3 h-3 text-[#B8860B] fill-[#B8860B]" />
            <span className="text-xs font-medium text-[#B8860B]">يومك الأول مجاناً</span>
          </div>
          <h1 className="text-3xl md:text-5xl font-bold text-gray-900 leading-tight mb-4">
            مساحتك اللي بتخصك،
            <br />
            <span className="text-[#1F5F3F]">في القاهرة</span>
          </h1>
          <p className="text-base md:text-lg text-gray-600 leading-relaxed">
            مساحات عمل، عقارات، مركبات، ومعدات — كلها في مكان واحد.
          </p>
        </section>

        {/* ========== TWO BIG CARDS ========== */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-12">
          <Link
            href="/browse"
            className="group block bg-[#1F5F3F] text-white rounded-2xl p-6 md:p-8 hover:bg-[#1F5F3F]/95 no-underline active:scale-[0.99] transition-all relative overflow-hidden"
          >
            <div className="relative z-10">
              <div className="inline-flex items-center gap-1.5 text-[10px] bg-white/15 backdrop-blur px-2.5 py-1 rounded-full font-medium tracking-wide mb-4">
                مصر الجديدة
              </div>
              <h2 className="text-2xl md:text-3xl font-bold mb-2 leading-tight">
                مساحات مضمونة
              </h2>
              <p className="text-sm md:text-base text-white/85 leading-relaxed mb-6">
                مكاتب فردية، غرف اجتماعات، وجاردن. احجز فوراً.
              </p>
              <div className="flex items-center justify-between bg-white text-[#1F5F3F] rounded-xl py-3 px-4 font-semibold text-sm group-hover:bg-gray-50">
                <span>استكشف المساحات</span>
                <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
              </div>
            </div>
          </Link>

          <Link
            href="/marketplace"
            className="group block bg-white border border-gray-100 rounded-2xl p-6 md:p-8 hover:border-[#1F5F3F]/30 hover:shadow-sm no-underline active:scale-[0.99] transition-all"
          >
            <div className="inline-flex items-center gap-1.5 text-[10px] bg-[#B8860B]/10 text-[#B8860B] px-2.5 py-1 rounded-full font-medium tracking-wide mb-4">
              جديد · موردين معتمدين
            </div>
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2 leading-tight">
              <span className="text-[#1F5F3F]">Madmona</span> Marketplace
            </h2>
            <p className="text-sm md:text-base text-gray-600 leading-relaxed mb-6">
              عقارات، مركبات، معدات، ومساحات تنظيم فعاليات.
            </p>
            <div className="flex items-center justify-between bg-[#1F5F3F] text-white rounded-xl py-3 px-4 font-semibold text-sm group-hover:bg-[#1F5F3F]/90">
              <span>اكتشف الـMarketplace</span>
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            </div>
          </Link>
        </section>

        {/* ========== FEATURED LISTINGS (live data) ========== */}
        <FeaturedListings />

        {/* ========== TRUST SIGNALS ========== */}
        <section className="grid grid-cols-3 gap-2 md:gap-3 mb-12">
          <TrustChip
            icon={<ShieldCheck className="w-4 h-4" />}
            title="حجز مضمون"
            accent="text-[#1F5F3F]"
          />
          <TrustChip
            icon={<Clock className="w-4 h-4" />}
            title="مفيش انتظار"
            accent="text-[#B8860B]"
          />
          <TrustChip
            icon={<Sparkles className="w-4 h-4" />}
            title="تجربتك أولاً"
            accent="text-[#C2410C]"
          />
        </section>

        {/* ========== SUPPLIER CTA ========== */}
        <section className="mb-10">
          <div className="bg-gradient-to-l from-[#1F5F3F] to-[#1F5F3F]/90 text-white rounded-2xl p-5 md:p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex-1">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-white/15 rounded-full mb-2">
                <Building2 className="w-3 h-3" />
                <span className="text-[10px] font-medium">للموردين</span>
              </div>
              <h3 className="text-lg md:text-xl font-bold mb-1">عندك مساحة أو خدمة؟</h3>
              <p className="text-xs md:text-sm text-white/85">سجّل عرضك واستقبل حجوزات على Madmona Marketplace.</p>
            </div>
            <div className="flex gap-2 w-full md:w-auto">
              <Link
                href="/supplier/register"
                className="flex-1 md:flex-none flex items-center justify-center gap-1.5 bg-white text-[#1F5F3F] px-4 py-2.5 rounded-xl font-semibold text-sm hover:bg-gray-50 no-underline whitespace-nowrap"
              >
                سجّل دلوقتي
                <ArrowLeft className="w-3.5 h-3.5" />
              </Link>
              <Link
                href="/auth/login?redirect=/supplier/marketplace"
                className="flex-1 md:flex-none flex items-center justify-center border border-white/30 text-white px-4 py-2.5 rounded-xl font-semibold text-sm hover:bg-white/10 no-underline whitespace-nowrap"
              >
                دخول
              </Link>
            </div>
          </div>
        </section>

        {/* ========== CONTACT ========== */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-8">
          <a
            href="https://wa.me/201002229982"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 p-4 bg-white border border-gray-100 rounded-2xl hover:border-[#25D366]/40 no-underline"
          >
            <div className="w-10 h-10 rounded-xl bg-[#25D366] flex items-center justify-center flex-shrink-0">
              <MessageCircle className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1">
              <p className="font-bold text-gray-900 text-sm">واتساب</p>
              <p className="text-xs text-gray-500 mt-0.5">رد فوري — ٢٤/٧</p>
            </div>
          </a>

          <div className="flex items-start gap-3 p-4 bg-white border border-gray-100 rounded-2xl">
            <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center flex-shrink-0">
              <MapPin className="w-5 h-5 text-gray-700" />
            </div>
            <div className="flex-1">
              <p className="font-bold text-gray-900 text-sm">٧ سليمان عظمي، مصر الجديدة</p>
              <p className="text-xs text-gray-500 mt-0.5">يومياً ٩ ص → ١١ م</p>
            </div>
          </div>
        </section>

        {/* ========== FOOTER ========== */}
        <footer className="text-center py-6 border-t border-gray-100">
          <p className="font-bold text-[#1F5F3F] text-sm mb-1">مضمونة</p>
          <p className="text-xs text-gray-500 mb-3">Your space, guaranteed · مساحتك اللي بتخصك</p>
          <div className="flex justify-center items-center gap-3 text-xs">
            <Link href="/about" className="text-gray-500 hover:text-[#1F5F3F] no-underline">
              عن مضمونة
            </Link>
            <span className="text-gray-300">·</span>
            <Link href="/marketplace" className="text-gray-500 hover:text-[#1F5F3F] no-underline">
              Marketplace
            </Link>
            <span className="text-gray-300">·</span>
            <a
              href="https://wa.me/201002229982"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-500 hover:text-[#1F5F3F] no-underline"
            >
              واتساب
            </a>
          </div>
        </footer>
      </main>
    </div>
  )
}

function TrustChip({
  icon,
  title,
  accent,
}: {
  icon: React.ReactNode
  title: string
  accent: string
}) {
  return (
    <div className="flex flex-col md:flex-row items-center md:items-center gap-2 p-3 md:p-4 bg-white rounded-xl border border-gray-100 text-center md:text-right">
      <div className={`flex-shrink-0 ${accent}`}>{icon}</div>
      <p className="text-xs md:text-sm font-medium text-gray-900">{title}</p>
    </div>
  )
}
