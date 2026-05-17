import Link from 'next/link'
import { Metadata } from 'next'
import {
  ArrowLeft, MessageCircle, MapPin, Clock, ShieldCheck,
  Users, Building2, Compass, Sparkles, ExternalLink,
} from 'lucide-react'
import TopNav from '@/components/TopNav'

const MADMONA_MAPS_URL = 'https://share.google/QbWskGlQ49AUTJrTc'
const MADMONA_PLUS_CODE = '4974+XX'

export const metadata: Metadata = {
  title: 'عن مضمونة | Madmona',
  description: 'مضمونة منصة مصرية لحجز المساحات والخدمات بضمان كامل. مساحات عمل، عقارات، مركبات، معدات — كلها في مكان واحد.',
  openGraph: {
    title: 'عن مضمونة | Madmona',
    description: 'مضمونة منصة مصرية لحجز المساحات والخدمات بضمان كامل.',
    url: 'https://madmonacairo.com/about',
    siteName: 'Madmona',
    locale: 'ar_EG',
    type: 'website',
  },
}

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-[#FAFAF7] text-right" dir="rtl">
      <TopNav />

      <main className="max-w-3xl mx-auto px-4 pb-12">
        {/* Hero */}
        <section className="py-10 md:py-16 text-center">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#1F6F5F]/10 rounded-full mb-4">
            <Sparkles className="w-3 h-3 text-[#1F6F5F]" />
            <span className="text-xs font-medium text-[#1F6F5F]">عن مضمونة</span>
          </div>
          <h1 className="text-3xl md:text-5xl font-bold text-gray-900 leading-tight mb-4">
            مساحتك اللي بتخصك،
            <br />
            <span className="text-[#1F6F5F]">بضمان كامل</span>
          </h1>
          <p className="text-base md:text-lg text-gray-600 leading-relaxed max-w-2xl mx-auto">
            مضمونة بدأت كمساحة عمل مشتركة في مصر الجديدة، وكبرت لتكون منصة لحجز كل أنواع المساحات والخدمات من مصادر معتمدة في القاهرة.
          </p>
        </section>

        {/* Story */}
        <section className="bg-white rounded-2xl border border-gray-100 p-6 md:p-8 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">القصة</h2>
          <div className="space-y-3 text-gray-700 leading-relaxed text-sm md:text-base">
            <p>
              في 2025، فتحنا أول فرع لمضمونة في ٧ شارع سليمان عَزْمي بالنزهة، مصر الجديدة — مساحة هادية مصممة بعناية للفريلانسرز وأصحاب الأعمال والطلاب.
            </p>
            <p>
              لاحظنا إن أجر مننا بيسألونا عن أماكن تانية يحجزوا فيها — استوديوهات، شقق، عربيات، معدات تصوير. فقلنا ليه ما نبنيش منصة تجمعهم كلهم في مكان واحد، بنفس مستوى الضمان والثقة اللي بنقدمه؟
            </p>
            <p>
              <strong>Madmona Marketplace</strong> هو الجواب: منصة حجز شاملة تربط العملاء بأصحاب الإعلانات اللي بنراجع مستنداتهم وضمان كامل لكل حجز.
            </p>
          </div>
        </section>

        {/* What we offer */}
        <section className="mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4 px-1">إيه اللي بنقدمه</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <FeatureCard
              icon={<Building2 className="w-5 h-5" />}
              title="مساحات مضمونة"
              description="مكاتب فردية، غرف اجتماعات، وجاردن في النزهة، مصر الجديدة. احجز فوراً."
              accent="bg-[#1F6F5F]/10 text-[#1F6F5F]"
              href="/browse"
              cta="استكشف المساحات"
            />
            <FeatureCard
              icon={<Compass className="w-5 h-5" />}
              title="Madmona Marketplace"
              description="عقارات، مركبات، معدات، وفعاليات من مصادر معتمدة."
              accent="bg-[#2FA084]/10 text-[#2FA084]"
              href="/marketplace"
              cta="اكتشف الـMarketplace"
            />
          </div>
        </section>

        {/* Why us */}
        <section className="bg-white rounded-2xl border border-gray-100 p-6 md:p-8 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">ليه مضمونة</h2>
          <div className="space-y-4">
            <ValueRow
              icon={<ShieldCheck className="w-5 h-5" />}
              title="حجز مضمون"
              description="ما حدش يقدر يحجز نفس المكان قبلك. نظام تأكيد فوري بحماية كاملة."
            />
            <ValueRow
              icon={<Users className="w-5 h-5" />}
              title="مصادر معتمدة"
              description="بنراجع مستندات كل حد بيعرض خدماته معانا. كل حد على Madmona موثّق."
            />
            <ValueRow
              icon={<Clock className="w-5 h-5" />}
              title="رد فوري"
              description="فريقنا متاح ٢٤/٧ على واتساب لأي استفسار أو مشكلة."
            />
          </div>
        </section>

        {/* Contact */}
        <section className="bg-white rounded-2xl border border-gray-100 p-6 md:p-8 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">تواصل معنا</h2>
          <div className="space-y-3">
            <a
              href="https://wa.me/201002229982"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 p-3 bg-[#25D366]/5 rounded-xl hover:bg-[#25D366]/10 no-underline"
            >
              <div className="w-10 h-10 rounded-xl bg-[#25D366] flex items-center justify-center flex-shrink-0">
                <MessageCircle className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1">
                <p className="font-bold text-gray-900 text-sm">واتساب</p>
                <p className="text-xs text-gray-500" dir="ltr">+20 100 222 9982</p>
              </div>
            </a>
            <a
              href={MADMONA_MAPS_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl hover:bg-gray-100 no-underline transition-colors"
            >
              <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center flex-shrink-0">
                <MapPin className="w-5 h-5 text-gray-700" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-1.5">
                  <p className="font-bold text-gray-900 text-sm">العنوان</p>
                  <ExternalLink className="w-3 h-3 text-gray-400" />
                </div>
                <p className="text-xs text-gray-700 mt-1">٧ شارع سليمان عَزْمي، النزهة، مصر الجديدة، القاهرة</p>
                <p className="text-[10px] text-gray-500 mt-0.5" dir="ltr">Plus Code: {MADMONA_PLUS_CODE} El Nozha</p>
                <p className="text-xs text-gray-500 mt-0.5">يومياً ٩ ص → ١١ م</p>
              </div>
            </a>
          </div>
        </section>

        {/* CTA */}
        <section className="bg-[#1F6F5F] text-white rounded-2xl p-6 md:p-8 text-center mb-8">
          <h3 className="text-xl md:text-2xl font-bold mb-2">جاهز تجرب؟</h3>
          <p className="text-sm md:text-base text-white/85 mb-5">يومك الأول مجاناً في مساحاتنا — بدون التزام.</p>
          <Link
            href="/browse"
            className="inline-flex items-center gap-2 bg-white text-[#1F6F5F] px-6 py-3 rounded-xl font-semibold hover:bg-gray-50 no-underline"
          >
            استكشف المساحات
            <ArrowLeft className="w-4 h-4" />
          </Link>
        </section>

        <footer className="text-center text-xs text-gray-500 py-6 border-t border-gray-100">
          <p className="font-bold text-[#1F6F5F] text-sm mb-1">مضمونة</p>
          <p>Your space, guaranteed · مساحتك اللي بتخصك</p>
        </footer>
      </main>
    </div>
  )
}

function FeatureCard({
  icon, title, description, accent, href, cta,
}: {
  icon: React.ReactNode
  title: string
  description: string
  accent: string
  href: string
  cta: string
}) {
  return (
    <Link
      href={href}
      className="group block bg-white rounded-2xl border border-gray-100 p-5 hover:border-[#1F6F5F]/30 hover:shadow-sm no-underline transition-all"
    >
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${accent}`}>
        {icon}
      </div>
      <h3 className="font-bold text-gray-900 mb-1">{title}</h3>
      <p className="text-sm text-gray-600 leading-relaxed mb-3">{description}</p>
      <p className="text-xs text-[#1F6F5F] font-semibold flex items-center gap-1 group-hover:gap-2 transition-all">
        {cta}
        <ArrowLeft className="w-3 h-3" />
      </p>
    </Link>
  )
}

function ValueRow({
  icon, title, description,
}: {
  icon: React.ReactNode
  title: string
  description: string
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-9 h-9 rounded-lg bg-[#1F6F5F]/10 text-[#1F6F5F] flex items-center justify-center flex-shrink-0">
        {icon}
      </div>
      <div className="flex-1">
        <h3 className="font-bold text-gray-900 text-sm mb-0.5">{title}</h3>
        <p className="text-sm text-gray-600 leading-relaxed">{description}</p>
      </div>
    </div>
  )
}
