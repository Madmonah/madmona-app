import Link from 'next/link'
import {
  ArrowLeft, Building2, ShoppingBag, Camera, Home, Car, Plane, Truck,
  Heart, Trophy, Anchor, Briefcase, Newspaper, Bell, Calendar, ShieldCheck,
  Clock, MessageCircle, CreditCard, Sparkles, Search, Star, Phone,
} from 'lucide-react'
import TopNav from '@/components/TopNav'
import BottomNav from '@/components/BottomNav'

// ============================================================
// /services — Full description of every service Madmona offers
// Organized into 4 main groups:
//   1. Rental categories (10 main, browse via /marketplace)
//   2. Booking experience (search, book, pay, support)
//   3. Live news & market signals
//   4. For suppliers (list with us, get bookings)
// ============================================================

export const metadata = {
  title: 'خدمات مضمونة - كل اللي بنوفره',
  description: 'مضمونة بتجمع كل اللي يتأجر في مصر — مساحات، عقارات، عربيات، معدات، وأكتر. مع نظام حجز فوري، أخبار حية، ودعم ٢٤/٧.',
}

const RENTAL_CATEGORIES = [
  { slug: 'workspaces', icon: Building2, name: 'مساحات عمل', desc: 'Coworking ومكاتب وقاعات اجتماعات بالساعة أو اليوم — مناسبة للشغل والمذاكرة والميتنجز.' },
  { slug: 'properties', icon: Home, name: 'عقارات للإيجار', desc: 'شقق وفيلات وشاليهات في القاهرة، الساحل، السخنة، ومدن مصر — للإيجار اليومي أو الشهري.' },
  { slug: 'vehicles', icon: Car, name: 'مركبات ونقل', desc: 'عربيات بسائق أو بدون، موتوسيكلات، أوتوبيسات سياحية، ونقل خاص لكل المناسبات.' },
  { slug: 'media', icon: Camera, name: 'معدات ميديا', desc: 'كاميرات، عدسات، إضاءة، مايكروفونات، ومعدات تصوير احترافية للفيديو والفوتوغرافيا.' },
  { slug: 'equipment', icon: Truck, name: 'معدات ثقيلة', desc: 'لوادر، حفارات، روافع، ومعدات بناء — مع سائقين متخصصين أو بدون.' },
  { slug: 'tourism', icon: Plane, name: 'السياحة', desc: 'باكدجات سفر، رحلات يومية، تذاكر فعاليات، وتجارب سياحية في كل أنحاء مصر.' },
  { slug: 'weddings', icon: Heart, name: 'أعراس وتجهيزات', desc: 'قاعات، ديكور، تنسيق، وكل لوازم الأعراس والمناسبات — في مكان واحد.' },
  { slug: 'recreation', icon: Trophy, name: 'ترفيه ورياضة', desc: 'ملاعب، صالات جيم، أنشطة بحرية، ومرافق ترفيهية — احجز بالساعة أو اليوم.' },
  { slug: 'marine', icon: Anchor, name: 'مركبات بحرية', desc: 'يخوت، قوارب، جت سكي، ومركبات بحرية للنزهات والمناسبات الخاصة.' },
  { slug: 'professionals', icon: Briefcase, name: 'خدمات احترافية', desc: 'مصورين، DJs، طهاة، مدربين، ومقدمي خدمات بخبرة موثقة.' },
]

const PLATFORM_FEATURES = [
  { icon: Search, name: 'بحث ذكي', desc: 'فلاتر متقدمة بالمنطقة، السعر، التاريخ، والتقييمات — تلاقي اللي تدور عليه في ثواني.' },
  { icon: Calendar, name: 'حجز فوري', desc: 'اختار الوقت اللي يناسبك واحجز في ضغطة. تأكيد فوري على الواتساب من المورد مباشرة.' },
  { icon: CreditCard, name: 'دفع آمن', desc: 'فيزا، ماستركارد، إنستاباي، أو كاش عند الاستلام — اختار اللي يريحك.' },
  { icon: ShieldCheck, name: 'ضمان كامل', desc: 'كل الخدمات من مصادر موثقة. لو في مشكلة، فلوسك مرجوعة — بدون أسئلة.' },
  { icon: MessageCircle, name: 'دعم ٢٤/٧', desc: 'فريق دعم على الواتساب يرد فوراً. مساعدة في الحجز، الشكاوى، أو أي استفسار.' },
  { icon: Star, name: 'تقييمات حقيقية', desc: 'كل الـreviews من عملاء فعلاً حجزوا — مفيش أسماء وهمية، مفيش غش.' },
]

const NEWS_FEATURES = [
  { icon: Newspaper, name: 'أخبار لحظية', desc: 'آخر أخبار العقارات، السياحة، الاقتصاد المصري — تتجدد كل ٣ دقايق من أكبر المصادر.' },
  { icon: Bell, name: 'تنبيهات ذكية', desc: 'فعّل التنبيهات وأعرف أول ما تنزل خدمة جديدة في فئتك المفضلة، أو سعر يفرق معاك.' },
  { icon: Sparkles, name: 'مؤشرات السوق', desc: 'متابعة أسعار العقارات، التذاكر، الإيجارات — قرارك أحسن لما تكون عارف الأسعار الحقيقية.' },
]

const SUPPLIER_FEATURES = [
  { icon: ShoppingBag, name: 'انضم وتأجير', desc: 'سجّل خدمتك في دقايق. ٠٪ عمولة لأول ٣٠ يوم لأول ١٠٠ مورد.' },
  { icon: Calendar, name: 'إدارة الحجوزات', desc: 'لوحة مورد كاملة لمتابعة الطلبات، التأكيدات، والمواعيد. WhatsApp تنبيهات على كل حجز.' },
  { icon: CreditCard, name: 'تحويل فوري', desc: 'استلم فلوسك على إنستاباي أو حساب البنك بعد كل حجز — بدون انتظار.' },
  { icon: Sparkles, name: 'تسويق مجاني', desc: 'خدمتك بتظهر في الـmarketplace، Facebook، Instagram — كل ده بدون تكلفة إضافية.' },
]

export default function ServicesPage() {
  return (
    <div className="min-h-screen bg-[#FAFAF7] text-right pb-20 md:pb-0" dir="rtl">
      <TopNav />

      <main className="relative">
        {/* HERO */}
        <section className="relative py-12 md:py-20 bg-gradient-to-br from-[#1F5F3F]/5 via-[#FAFAF7] to-[#B8860B]/5">
          <div className="max-w-5xl mx-auto px-4 text-center">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white shadow-soft border border-gray-100 mb-5">
              <Sparkles className="w-3.5 h-3.5 text-[#B8860B]" />
              <span className="text-[10px] md:text-xs font-bold tracking-[0.3em] uppercase text-[#1F5F3F]">خدمات مضمونة</span>
            </div>
            <h1 className="text-4xl md:text-6xl font-black text-gray-900 leading-[0.95] tracking-tight">
              <span className="block">كل ما يتأجر،</span>
              <span className="block italic font-light gradient-text-green mt-2">في مكان واحد</span>
            </h1>
            <p className="text-base md:text-lg text-gray-600 mt-6 max-w-2xl mx-auto leading-relaxed">
              مضمونة منصة مصرية بتجمع كل خدمات التأجير في مصر — من الـCoworking للعقارات للعربيات،
              مع نظام حجز فوري، أخبار لحظية، ودعم ٢٤/٧.
            </p>

            {/* Quick CTA */}
            <div className="flex flex-wrap items-center justify-center gap-3 mt-8">
              <Link
                href="/marketplace"
                className="inline-flex items-center gap-2 px-6 py-3 bg-[#1F5F3F] text-white font-black rounded-full shadow-elevated hover:-translate-y-0.5 transition-all no-underline"
              >
                <ShoppingBag className="w-4 h-4" />
                <span>أجر مننا</span>
                <ArrowLeft className="w-4 h-4" />
              </Link>
              <Link
                href="/supplier/register"
                className="inline-flex items-center gap-2 px-6 py-3 bg-[#B8860B] text-white font-black rounded-full shadow-elevated hover:-translate-y-0.5 transition-all no-underline"
              >
                <Building2 className="w-4 h-4" />
                <span>أجر معانا</span>
                <ArrowLeft className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </section>

        {/* RENTAL CATEGORIES */}
        <section className="py-14 md:py-20 bg-white">
          <div className="max-w-7xl mx-auto px-4">
            <div className="text-center mb-12">
              <p className="text-[10px] md:text-xs font-bold tracking-[0.3em] uppercase text-[#B8860B] mb-3">١٠ فئات رئيسية</p>
              <h2 className="text-3xl md:text-5xl font-black text-gray-900 leading-tight">كل اللي يتأجر</h2>
              <p className="text-sm md:text-base text-gray-600 mt-3 max-w-xl mx-auto">
                من المساحات الصغيرة للمعدات الثقيلة — مضمونة بتغطي كل احتياجاتك.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
              {RENTAL_CATEGORIES.map((cat) => {
                const Icon = cat.icon
                return (
                  <Link
                    key={cat.slug}
                    href={`/categories/${cat.slug}`}
                    className="group bg-[#FAFAF7] hover:bg-white border border-gray-100 hover:border-[#1F5F3F]/20 hover:shadow-elevated rounded-2xl p-6 transition-all no-underline"
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-[#1F5F3F]/10 flex items-center justify-center flex-shrink-0 group-hover:bg-[#1F5F3F]/20 group-hover:scale-105 transition-all">
                        <Icon className="w-6 h-6 text-[#1F5F3F]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-black text-gray-900 text-lg mb-1.5 group-hover:text-[#1F5F3F] transition-colors">
                          {cat.name}
                        </h3>
                        <p className="text-sm text-gray-600 leading-relaxed">{cat.desc}</p>
                        <div className="inline-flex items-center gap-1 mt-3 text-xs font-bold text-[#1F5F3F] group-hover:gap-2 transition-all">
                          <span>اتصفح</span>
                          <ArrowLeft className="w-3 h-3" />
                        </div>
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>
        </section>

        {/* PLATFORM FEATURES — booking experience */}
        <section className="py-14 md:py-20 bg-gradient-to-br from-[#1F5F3F]/5 to-[#B8860B]/5">
          <div className="max-w-7xl mx-auto px-4">
            <div className="text-center mb-12">
              <p className="text-[10px] md:text-xs font-bold tracking-[0.3em] uppercase text-[#1F5F3F] mb-3">تجربة الحجز</p>
              <h2 className="text-3xl md:text-5xl font-black text-gray-900 leading-tight">من البحث للحجز</h2>
              <p className="text-sm md:text-base text-gray-600 mt-3 max-w-xl mx-auto">
                كل خطوة مدروسة عشان تكون رحلتك سلسة — من أول ضغطة لحد التأكيد.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
              {PLATFORM_FEATURES.map((f) => {
                const Icon = f.icon
                return (
                  <div key={f.name} className="bg-white rounded-2xl p-6 shadow-soft hover:shadow-elevated transition-all">
                    <div className="w-12 h-12 rounded-2xl bg-[#B8860B]/10 flex items-center justify-center mb-4">
                      <Icon className="w-6 h-6 text-[#B8860B]" />
                    </div>
                    <h3 className="font-black text-gray-900 text-lg mb-2">{f.name}</h3>
                    <p className="text-sm text-gray-600 leading-relaxed">{f.desc}</p>
                  </div>
                )
              })}
            </div>
          </div>
        </section>

        {/* NEWS & MARKET SIGNALS */}
        <section className="py-14 md:py-20 bg-white">
          <div className="max-w-7xl mx-auto px-4">
            <div className="text-center mb-12">
              <p className="text-[10px] md:text-xs font-bold tracking-[0.3em] uppercase text-[#B8860B] mb-3">معلوماتك أهم</p>
              <h2 className="text-3xl md:text-5xl font-black text-gray-900 leading-tight">أخبار ومؤشرات حية</h2>
              <p className="text-sm md:text-base text-gray-600 mt-3 max-w-xl mx-auto">
                مش بس منصة حجز — مضمونة بتديك معلومات السوق اللي بتحتاجها.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
              {NEWS_FEATURES.map((f) => {
                const Icon = f.icon
                return (
                  <div key={f.name} className="border border-gray-100 rounded-2xl p-6 hover:border-[#1F5F3F]/20 hover:shadow-soft transition-all">
                    <div className="w-12 h-12 rounded-2xl bg-[#1F5F3F]/10 flex items-center justify-center mb-4">
                      <Icon className="w-6 h-6 text-[#1F5F3F]" />
                    </div>
                    <h3 className="font-black text-gray-900 text-lg mb-2">{f.name}</h3>
                    <p className="text-sm text-gray-600 leading-relaxed">{f.desc}</p>
                  </div>
                )
              })}
            </div>
          </div>
        </section>

        {/* FOR SUPPLIERS */}
        <section className="py-14 md:py-20 bg-gradient-to-br from-gray-900 to-[#1F2937] text-white">
          <div className="max-w-7xl mx-auto px-4">
            <div className="text-center mb-12">
              <p className="text-[10px] md:text-xs font-bold tracking-[0.3em] uppercase text-[#B8860B] mb-3">للموردين</p>
              <h2 className="text-3xl md:text-5xl font-black leading-tight">عندك خدمة؟ أجر معانا</h2>
              <p className="text-sm md:text-base text-white/80 mt-3 max-w-xl mx-auto">
                مضمونة بتساعدك تكسب أكتر — ٠٪ عمولة لأول ٣٠ يوم، تسويق مجاني، ولوحة إدارة كاملة.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-10">
              {SUPPLIER_FEATURES.map((f) => {
                const Icon = f.icon
                return (
                  <div key={f.name} className="bg-white/5 backdrop-blur border border-white/10 rounded-2xl p-6 hover:bg-white/10 transition-all">
                    <div className="w-12 h-12 rounded-2xl bg-[#B8860B]/20 flex items-center justify-center mb-4">
                      <Icon className="w-6 h-6 text-[#B8860B]" />
                    </div>
                    <h3 className="font-black text-lg mb-2">{f.name}</h3>
                    <p className="text-sm text-white/75 leading-relaxed">{f.desc}</p>
                  </div>
                )
              })}
            </div>

            <div className="text-center">
              <Link
                href="/supplier/register"
                className="inline-flex items-center gap-2 px-8 py-4 bg-[#B8860B] text-white font-black rounded-full shadow-elevated hover:-translate-y-0.5 transition-all no-underline text-base"
              >
                <Building2 className="w-5 h-5" />
                <span>سجّل وابدأ تأجير دلوقتي</span>
                <ArrowLeft className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </section>

        {/* CONTACT */}
        <section className="py-14 md:py-20 bg-[#FAFAF7]">
          <div className="max-w-3xl mx-auto px-4 text-center">
            <h2 className="text-3xl md:text-4xl font-black text-gray-900 mb-3">محتاج مساعدة؟</h2>
            <p className="text-gray-600 mb-8">فريق مضمونة على الواتساب ٢٤/٧ — رد فوري على كل استفساراتك.</p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <a
                href="https://wa.me/201002229982"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-6 py-3 bg-[#25D366] text-white font-black rounded-full shadow-elevated hover:-translate-y-0.5 transition-all no-underline"
              >
                <MessageCircle className="w-5 h-5" />
                <span>واتساب · رد فوري</span>
              </a>
              <a
                href="tel:+201002229982"
                className="inline-flex items-center gap-2 px-6 py-3 bg-white text-gray-900 border border-gray-200 font-bold rounded-full hover:shadow-soft transition-all no-underline"
              >
                <Phone className="w-5 h-5" />
                <span>+20 100 222 9982</span>
              </a>
            </div>
            <div className="flex items-center justify-center gap-2 mt-6 text-xs text-gray-500">
              <Clock className="w-3.5 h-3.5" />
              <span>متاحين ٢٤ ساعة · ٧ أيام في الأسبوع</span>
            </div>
          </div>
        </section>
      </main>

      <BottomNav />
    </div>
  )
}
