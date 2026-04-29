import Link from 'next/link'
import { Star, Users, Coffee, Clock, MapPin, Phone, MessageCircle, ArrowLeft, Calendar, Search, Building2 } from 'lucide-react'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[#FAFAF7] text-right" dir="rtl">
      {/* Header */}
      <header className="bg-[#FAFAF7] sticky top-0 z-40 border-b border-gray-100">
        <div className="max-w-md mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-[#1F5F3F]">مضمونة</h1>
            <div className="text-xs text-gray-500">MADMONA</div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-md mx-auto pb-20 px-4">
        {/* Welcome Section */}
        <section className="py-6">
          <p className="text-sm text-gray-600 mb-2">أهلاً بك في</p>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            مساحة العمل المشترك مضمونة
          </h2>

          {/* Free Trial Banner */}
          <div className="bg-gradient-to-r from-[#B8860B]/10 to-[#C2410C]/10 rounded-xl p-4 mb-6">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#B8860B] text-white flex items-center justify-center flex-shrink-0">
                <Star className="w-4 h-4 fill-white" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-800 mb-1">يومك الأول مجاناً</h3>
                <p className="text-xs text-gray-700">جرب مضمونة اليوم بدون تكلفة</p>
              </div>
            </div>
          </div>
        </section>

        {/*
          Primary CTA — book a meeting room online.
          This is the only space with full online booking (calendar + payment),
          so we surface it as the hero action above all other cards.
        */}
        <section className="mb-6">
          <Link
            href="/reserve/meeting-room"
            className="block bg-[#1F5F3F] text-white rounded-2xl p-6 hover:bg-[#1F5F3F]/95 transition-colors active:scale-[0.99] no-underline"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <span className="inline-flex items-center gap-1.5 text-xs bg-[#B8860B] text-white px-2.5 py-1 rounded-full font-medium tracking-wide mb-3">
                  <Calendar className="w-3 h-3" />
                  جديد
                </span>
                <h3 className="text-xl font-semibold mb-2">احجز غرفة الاجتماعات أونلاين</h3>
                <p className="text-sm text-white/85 leading-relaxed">
                  اختار وقتك، ادفع كاش أو InstaPay، تأكيد فوري على واتساب.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="bg-white/15 rounded-lg p-3">
                <p className="text-xs text-white/75">حتى ٤ أشخاص</p>
                <p className="font-semibold mt-0.5">٣٠٠ ج.م/ساعة</p>
              </div>
              <div className="bg-white/15 rounded-lg p-3">
                <p className="text-xs text-white/75">حتى ٨ أشخاص</p>
                <p className="font-semibold mt-0.5">٥٠٠ ج.م/ساعة</p>
              </div>
            </div>

            <div className="flex items-center justify-between bg-white text-[#1F5F3F] rounded-xl py-3 px-4 font-semibold">
              <span>ابدأ الحجز دلوقتي</span>
              <ArrowLeft className="w-4 h-4" />
            </div>
          </Link>
        </section>

        {/* Other Spaces — these still use the WhatsApp lead-capture flow */}
        <section className="mb-6">
          <h3 className="text-sm font-medium text-gray-500 mb-3">باقي المساحات</h3>

          {/* Indoor Coworking */}
          <Link
            href="/reserve/indoor-coworking"
            className="block bg-white rounded-xl border border-gray-100 hover:border-[#1F5F3F]/30 hover:shadow-sm transition-all p-4 mb-3 no-underline active:scale-[0.99]"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 mb-1">المساحة المشتركة الداخلية</h3>
                <p className="text-xs text-gray-600">مكيف · واي فاي عالي السرعة · كافيه</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-[#1F5F3F]/10 flex items-center justify-center flex-shrink-0">
                <Coffee className="w-5 h-5 text-[#1F5F3F]" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-gray-50 rounded-lg p-2">
                <p className="text-[10px] text-gray-500">ساعة</p>
                <p className="text-sm font-semibold text-gray-900 mt-0.5">٥٠ ج.م</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-2">
                <p className="text-[10px] text-gray-500">يوم</p>
                <p className="text-sm font-semibold text-gray-900 mt-0.5">١٢٠ ج.م</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-2">
                <p className="text-[10px] text-gray-500">شهر</p>
                <p className="text-sm font-semibold text-gray-900 mt-0.5">٢٠٠٠ ج.م</p>
              </div>
            </div>
          </Link>

          <div className="grid grid-cols-2 gap-3 mb-3">
            {/* Outdoor Garden */}
            <Link
              href="/reserve/outdoor-garden"
              className="block bg-white rounded-xl border border-gray-100 hover:border-[#1F5F3F]/30 transition-all p-4 no-underline active:scale-[0.99]"
            >
              <div className="w-9 h-9 rounded-lg bg-green-100 flex items-center justify-center mb-3">
                <Coffee className="w-5 h-5 text-green-700" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-1">الجنينة</h3>
              <p className="text-xs text-gray-600">٦٥ ج.م/يوم</p>
              <p className="text-xs text-gray-500 mt-1">في الهواء الطلق</p>
            </Link>

            {/* Private Office */}
            <Link
              href="/reserve/private-office"
              className="block bg-white rounded-xl border border-gray-100 hover:border-[#1F5F3F]/30 transition-all p-4 no-underline active:scale-[0.99]"
            >
              <div className="w-9 h-9 rounded-lg bg-[#B8860B]/10 flex items-center justify-center mb-3">
                <Users className="w-5 h-5 text-[#B8860B]" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-1">المكتب الخاص</h3>
              <p className="text-xs text-gray-600">من ١٢٠٠٠ ج.م/شهر</p>
              <p className="text-xs text-gray-500 mt-1">حتى ٨ أشخاص</p>
            </Link>
          </div>
        </section>

        {/*
          Marketplace section — explore all spaces (Madmona + future suppliers)
          and the supplier signup CTA. Shown after Madmona's own spaces because
          most visitors are coming for Madmona, but those who want a different
          venue (or to list their own) can find it here.
        */}
        <section className="mb-8">
          <h3 className="text-sm font-medium text-gray-500 mb-3">المنصة</h3>
          <div className="grid grid-cols-1 gap-3">
            <Link
              href="/browse"
              className="flex items-center gap-3 p-4 bg-white rounded-xl border border-gray-100 hover:border-[#1F5F3F]/30 transition-all no-underline active:scale-[0.99]"
            >
              <div className="w-10 h-10 rounded-full bg-[#1F5F3F]/10 flex items-center justify-center flex-shrink-0">
                <Search className="w-5 h-5 text-[#1F5F3F]" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-gray-900 text-sm">استكشف كل المساحات</p>
                <p className="text-xs text-gray-600 mt-0.5">مساحات عمل في كل أنحاء القاهرة</p>
              </div>
              <ArrowLeft className="w-4 h-4 text-gray-400" />
            </Link>

            <Link
              href="/supplier/signup"
              className="flex items-center gap-3 p-4 bg-white rounded-xl border border-gray-100 hover:border-[#B8860B]/40 transition-all no-underline active:scale-[0.99]"
            >
              <div className="w-10 h-10 rounded-full bg-[#B8860B]/10 flex items-center justify-center flex-shrink-0">
                <Building2 className="w-5 h-5 text-[#B8860B]" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-gray-900 text-sm">عندك مساحة عمل؟ انضم لينا</p>
                <p className="text-xs text-gray-600 mt-0.5">سجّل واعرض مساحتك على آلاف العملاء</p>
              </div>
              <ArrowLeft className="w-4 h-4 text-gray-400" />
            </Link>
          </div>
        </section>

        {/* Contact Section */}
        <section className="mb-8">
          <h3 className="font-semibold text-gray-900 mb-3">تواصل معنا</h3>
          <div className="grid grid-cols-2 gap-3">
            <a
              href="https://wa.me/201002229982"
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col items-center p-4 bg-[#25D366]/10 rounded-xl hover:bg-[#25D366]/20 transition-colors no-underline"
            >
              <div className="w-10 h-10 rounded-full bg-[#25D366] flex items-center justify-center mb-2">
                <MessageCircle className="w-5 h-5 text-white" />
              </div>
              <p className="font-medium text-gray-900 text-sm">واتساب</p>
              <p className="text-xs text-gray-600 mt-1">رد فوري</p>
            </a>

            <a
              href="tel:01002229982"
              className="flex flex-col items-center p-4 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors no-underline"
            >
              <div className="w-10 h-10 rounded-full bg-gray-600 flex items-center justify-center mb-2">
                <Phone className="w-5 h-5 text-white" />
              </div>
              <p className="font-medium text-gray-900 text-sm">اتصل بنا</p>
              <p className="text-xs text-gray-600 mt-1" dir="ltr">01002229982</p>
            </a>
          </div>
        </section>

        {/* Location & Hours */}
        <section className="mb-8">
          <div className="bg-white rounded-xl border border-gray-100 p-4">
            <h3 className="font-semibold text-gray-900 mb-3">معلومات مهمة</h3>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <MapPin className="w-4 h-4 text-gray-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">٧ شارع سليمان، مصر الجديدة</p>
                  <p className="text-xs text-gray-600 mt-1">متفرع من عبد الحميد بدوي</p>
                  <p className="text-xs text-gray-600">بجوار Modern School</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Clock className="w-4 h-4 text-gray-600 flex-shrink-0" />
                <p className="text-sm text-gray-900">٢٤/٧ · Smart Lock للأعضاء</p>
              </div>

              <div className="flex items-center gap-3">
                <Phone className="w-4 h-4 text-gray-600 flex-shrink-0" />
                <p className="text-sm text-gray-900" dir="ltr">01002229982</p>
              </div>
            </div>
          </div>
        </section>

        <div className="text-center text-xs text-gray-500 py-4 border-t border-gray-100">
          <p className="font-medium text-[#1F5F3F] mb-1">مضمونة</p>
          <p>Your space, guaranteed</p>
        </div>
      </main>
    </div>
  )
}
