'use client'

// ============================================================================
// /careers — صفحة التوظيف الرسمية لمضمونة
// Form submissions → submit_careers_application RPC → employee_join_requests
//   (supplier_id = c8b7b9d7 = مضمونة-الشركة)
// ============================================================================

import { useState } from 'react'
import Link from 'next/link'
import { supabaseBrowser } from '@/lib/supabase-browser'
import {
  Sparkles, CheckCircle2, Loader2, ArrowLeft, Rocket, Shield,
  TrendingUp, Users, Phone, Mail, MapPin, Briefcase, Send,
  Zap, Target, Heart,
} from 'lucide-react'

const POSITIONS = [
  { value: 'مندوب مبيعات', label: 'مندوب مبيعات', icon: '🎯', desc: 'تشغيل سبلايرز جدد، عمولة + بونص' },
  { value: 'خدمة عملاء', label: 'خدمة عملاء', icon: '💬', desc: 'دعم الموردين والعملاء عبر واتساب' },
  { value: 'محتوى وسوشيال ميديا', label: 'محتوى وسوشيال ميديا', icon: '📱', desc: 'كتابة وتصوير محتوى للسوشيال' },
  { value: 'تسويق رقمي', label: 'تسويق رقمي', icon: '📊', desc: 'حملات Meta/Google Ads' },
  { value: 'مطور ويب', label: 'مطور ويب (Frontend/Backend)', icon: '💻', desc: 'Next.js + Supabase' },
  { value: 'عمليات', label: 'عمليات (Operations)', icon: '⚙️', desc: 'إدارة العمليات اليومية والشغل اللوجستي' },
  { value: 'تصميم', label: 'تصميم (UI/UX/Graphic)', icon: '🎨', desc: 'تصاميم للموقع والإعلانات' },
  { value: 'حاجة تانية', label: 'حاجة تانية', icon: '✨', desc: 'مهارة تشوف إنها تفيدنا' },
]

const PILLARS = [
  {
    icon: Rocket,
    title: 'منصة بتنمو بسرعة',
    desc: 'مضمونة اتلانشت مايو ٢٠٢٦ وبتزيد كل يوم. هتنضم لفريق صغير قراره سريع وأثره مباشر.',
  },
  {
    icon: TrendingUp,
    title: 'فرص نمو حقيقية',
    desc: 'البيئة بتسمح إنك تطلع وتاخد مسؤولية أكبر. كل واحد عنده مساحة يبني نفسه.',
  },
  {
    icon: Heart,
    title: 'بيئة محترمة',
    desc: 'مرتبات تنافسية، يوم إجازة أسبوعيًا، تأمين، وفريق بيدعم بعض من غير سياسات.',
  },
]

export default function CareersPage() {
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [position, setPosition] = useState('')
  const [city, setCity] = useState('')
  const [experience, setExperience] = useState<string>('')
  const [lastSalary, setLastSalary] = useState<string>('')
  const [expectedSalary, setExpectedSalary] = useState<string>('')
  const [whyJoin, setWhyJoin] = useState('')
  const [cvUrl, setCvUrl] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (!fullName.trim() || fullName.trim().length < 3) {
      setError('من فضلك اكتب اسمك الكامل')
      return
    }
    const phoneClean = phone.replace(/[^0-9]/g, '')
    if (phoneClean.length < 10) {
      setError('من فضلك اكتب رقم تليفون صحيح')
      return
    }
    if (!position) {
      setError('من فضلك اختار الوظيفة اللي بتقدم عليها')
      return
    }
    if (!expectedSalary || parseInt(expectedSalary, 10) < 1000) {
      setError('من فضلك اكتب الراتب المتوقع (1000 جنيه على الأقل)')
      return
    }

    setSubmitting(true)
    try {
      // @ts-expect-error - RPC type
      const { data, error: rpcErr } = await supabaseBrowser.rpc('submit_careers_application', {
        p_full_name: fullName.trim(),
        p_phone: phone.trim(),
        p_email: email.trim() || null,
        p_position: position,
        p_city: city.trim() || null,
        p_experience_years: experience ? parseInt(experience, 10) : null,
        p_why_join: whyJoin.trim() || null,
        p_cv_url: cvUrl.trim() || null,
        p_last_salary_egp: lastSalary ? parseInt(lastSalary, 10) : null,
        p_expected_salary_egp: expectedSalary ? parseInt(expectedSalary, 10) : null,
      })

      if (rpcErr) throw rpcErr
      if (data && (data as any).ok === false) {
        setError((data as any).error || 'حصل خطأ، حاول تاني')
        setSubmitting(false)
        return
      }

      setSuccess(true)
      setSubmitting(false)
    } catch (e: any) {
      setError(e?.message || 'حصل خطأ، حاول تاني بعد شوية')
      setSubmitting(false)
    }
  }

  // ---------- success state ----------
  if (success) {
    return (
      <div className="min-h-screen bg-[#FAFAF7]" dir="rtl">
        <header className="bg-white border-b border-gray-100">
          <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2 text-[#1F6F5F] font-black text-xl">
              <span className="inline-block w-9 h-9 rounded-xl bg-[#1F6F5F] text-white grid place-items-center font-black">م</span>
              مضمونة
            </Link>
          </div>
        </header>

        <main className="max-w-2xl mx-auto px-4 py-16 text-center">
          <div className="w-20 h-20 mx-auto rounded-full bg-emerald-100 grid place-items-center mb-6">
            <CheckCircle2 className="w-12 h-12 text-emerald-600" />
          </div>
          <h1 className="text-3xl md:text-4xl font-black text-[#0A0A0A] mb-4">
            وصلنا طلبك ✨
          </h1>
          <p className="text-lg text-gray-700 mb-2">
            شكرًا إنك حابب تنضم لفريق <span className="font-bold text-[#1F6F5F]">مضمونة</span>.
          </p>
          <p className="text-base text-gray-600 mb-8">
            هنراجع طلبك ونتواصل معاك خلال <span className="font-bold">٤٨ ساعة</span> على نفس الرقم اللي بعتّه.
          </p>

          <div className="bg-white rounded-2xl p-6 border border-gray-100 mb-6 text-right">
            <h3 className="font-bold text-[#0A0A0A] mb-3 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-500" /> في الانتظار:
            </h3>
            <ul className="space-y-2 text-gray-700 text-sm">
              <li className="flex gap-2"><span className="text-[#1F6F5F]">•</span> اتأكد إن رقم الواتساب اللي بعتّه شغّال</li>
              <li className="flex gap-2"><span className="text-[#1F6F5F]">•</span> لو في CV أو LinkedIn، ابعتهم لنا على واتساب ٠١٠٠٢٢٢٩٩٨٢</li>
              <li className="flex gap-2"><span className="text-[#1F6F5F]">•</span> اعرف أكتر عن مضمونة من الموقع الرئيسي</li>
            </ul>
          </div>

          <Link
            href="/"
            className="inline-flex items-center gap-2 bg-[#1F6F5F] text-white px-6 py-3 rounded-xl font-bold hover:bg-[#175a4d] transition-colors"
          >
            <ArrowLeft className="w-4 h-4 rotate-180" />
            ارجع للرئيسية
          </Link>
        </main>
      </div>
    )
  }

  // ---------- main form ----------
  return (
    <div className="min-h-screen bg-[#FAFAF7]" dir="rtl">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-[#1F6F5F] font-black text-xl">
            <span className="inline-block w-9 h-9 rounded-xl bg-[#1F6F5F] text-white grid place-items-center font-black">م</span>
            مضمونة
          </Link>
          <a
            href="https://wa.me/201002229982"
            target="_blank"
            rel="noreferrer"
            className="text-sm font-bold text-gray-600 hover:text-[#1F6F5F]"
          >
            تواصل معانا
          </a>
        </div>
      </header>

      {/* HERO */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#1F6F5F] via-[#2d7a52] to-[#2FA084] text-white">
        <div className="absolute inset-0 opacity-10" style={{
          backgroundImage: 'radial-gradient(circle at 20% 50%, white 1px, transparent 1px), radial-gradient(circle at 80% 20%, white 1px, transparent 1px)',
          backgroundSize: '50px 50px',
        }} />
        <div className="relative max-w-6xl mx-auto px-4 py-16 md:py-24 text-center">
          <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur px-4 py-2 rounded-full text-sm font-bold mb-6">
            <Rocket className="w-4 h-4" />
            وظائف مفتوحة دلوقتي
          </div>
          <h1 className="text-4xl md:text-6xl font-black mb-6 leading-tight">
            انضم لفريق <span className="text-[#FFD700]">مضمونة</span>
          </h1>
          <p className="text-lg md:text-xl text-white/90 max-w-2xl mx-auto mb-8 leading-relaxed">
            احنا منصة جديدة بتنمو بسرعة في مصر، وبندوّر على ناس بجد عايزين يبنوا حاجة كبيرة معانا.
          </p>
          <a
            href="#apply"
            className="inline-flex items-center gap-2 bg-[#FFD700] text-[#0A0A0A] px-8 py-4 rounded-xl font-black text-lg hover:bg-[#FFC700] transition-all shadow-lg hover:shadow-xl"
          >
            <Send className="w-5 h-5" />
            قدّم دلوقتي
          </a>
        </div>
      </section>

      {/* PILLARS */}
      <section className="max-w-6xl mx-auto px-4 py-16">
        <h2 className="text-3xl font-black text-center text-[#0A0A0A] mb-12">
          ليه تشتغل معانا؟
        </h2>
        <div className="grid md:grid-cols-3 gap-6">
          {PILLARS.map((p, i) => {
            const Icon = p.icon
            return (
              <div key={i} className="bg-white rounded-2xl p-6 border border-gray-100 hover:shadow-lg transition-shadow">
                <div className="w-12 h-12 rounded-xl bg-emerald-50 grid place-items-center mb-4">
                  <Icon className="w-6 h-6 text-[#1F6F5F]" />
                </div>
                <h3 className="text-xl font-black text-[#0A0A0A] mb-2">{p.title}</h3>
                <p className="text-gray-600 leading-relaxed">{p.desc}</p>
              </div>
            )
          })}
        </div>
      </section>

      {/* POSITIONS */}
      <section className="bg-white border-y border-gray-100">
        <div className="max-w-6xl mx-auto px-4 py-16">
          <h2 className="text-3xl font-black text-center text-[#0A0A0A] mb-4">
            الوظائف المفتوحة
          </h2>
          <p className="text-center text-gray-600 mb-12">
            مش لاقي وظيفتك؟ اختار &quot;حاجة تانية&quot; وقولنا انت بتعمل إيه.
          </p>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            {POSITIONS.map((p) => (
              <button
                key={p.value}
                onClick={() => {
                  setPosition(p.value)
                  document.getElementById('apply')?.scrollIntoView({ behavior: 'smooth' })
                }}
                className={`text-right p-5 rounded-2xl border-2 transition-all hover:shadow-md ${
                  position === p.value
                    ? 'border-[#1F6F5F] bg-emerald-50'
                    : 'border-gray-100 bg-white hover:border-emerald-200'
                }`}
              >
                <div className="text-3xl mb-2">{p.icon}</div>
                <div className="font-bold text-[#0A0A0A] mb-1">{p.label}</div>
                <div className="text-sm text-gray-500 leading-relaxed">{p.desc}</div>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* APPLICATION FORM */}
      <section id="apply" className="max-w-3xl mx-auto px-4 py-16">
        <div className="bg-white rounded-3xl p-6 md:p-10 border border-gray-100 shadow-sm">
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 bg-emerald-50 text-[#1F6F5F] px-3 py-1 rounded-full text-sm font-bold mb-4">
              <Briefcase className="w-4 h-4" />
              قدّم طلبك
            </div>
            <h2 className="text-3xl font-black text-[#0A0A0A] mb-2">
              املأ البيانات هنبعتلك تاني
            </h2>
            <p className="text-gray-600">كل البيانات سرية وبتوصل لفريقنا الداخلي بس.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Name */}
            <div>
              <label className="block text-sm font-bold text-[#0A0A0A] mb-2">
                الاسم بالكامل <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="مثلاً: محمد أحمد علي"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1F6F5F] focus:border-transparent text-right"
                required
              />
            </div>

            {/* Phone */}
            <div>
              <label className="block text-sm font-bold text-[#0A0A0A] mb-2 flex items-center gap-2">
                <Phone className="w-4 h-4" />
                رقم الواتساب <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="01XXXXXXXXX"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1F6F5F] focus:border-transparent text-right"
                required
                dir="ltr"
              />
              <p className="text-xs text-gray-500 mt-1">هنتواصل معاك على الرقم ده</p>
            </div>

            {/* Position */}
            <div>
              <label className="block text-sm font-bold text-[#0A0A0A] mb-2 flex items-center gap-2">
                <Briefcase className="w-4 h-4" />
                الوظيفة <span className="text-red-500">*</span>
              </label>
              <select
                value={position}
                onChange={(e) => setPosition(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1F6F5F] focus:border-transparent text-right bg-white"
                required
              >
                <option value="">-- اختار وظيفة --</option>
                {POSITIONS.map((p) => (
                  <option key={p.value} value={p.value}>{p.icon} {p.label}</option>
                ))}
              </select>
            </div>

            {/* Email + City row */}
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-[#0A0A0A] mb-2 flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  الإيميل
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1F6F5F] focus:border-transparent"
                  dir="ltr"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-[#0A0A0A] mb-2 flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  المدينة
                </label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="مثلاً: القاهرة، الجيزة، الإسكندرية"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1F6F5F] focus:border-transparent text-right"
                />
              </div>
            </div>

            {/* Experience */}
            <div>
              <label className="block text-sm font-bold text-[#0A0A0A] mb-2">
                سنين الخبرة
              </label>
              <select
                value={experience}
                onChange={(e) => setExperience(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1F6F5F] focus:border-transparent text-right bg-white"
              >
                <option value="">-- اختار --</option>
                <option value="0">من غير خبرة (Fresh)</option>
                <option value="1">أقل من سنة</option>
                <option value="2">سنة - سنتين</option>
                <option value="3">٣ - ٥ سنين</option>
                <option value="6">٥ سنين أو أكتر</option>
              </select>
            </div>

            {/* Salary expectations */}
            <div className="bg-gradient-to-br from-amber-50 to-emerald-50 border border-amber-100 rounded-2xl p-5 space-y-4">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-amber-100 text-amber-700">💰</span>
                <h3 className="font-bold text-[#0A0A0A]">المرتب</h3>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-[#0A0A0A] mb-2">
                    آخر راتب استلمته (جنيه)
                  </label>
                  <input
                    type="number"
                    value={lastSalary}
                    onChange={(e) => setLastSalary(e.target.value)}
                    placeholder="مثلاً: 5000"
                    min="0"
                    max="500000"
                    step="100"
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1F6F5F] focus:border-transparent bg-white"
                    dir="ltr"
                  />
                  <p className="text-xs text-gray-500 mt-1">سيبها فاضية لو إنت Fresh</p>
                </div>
                <div>
                  <label className="block text-sm font-bold text-[#0A0A0A] mb-2">
                    الراتب المتوقع (جنيه) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    value={expectedSalary}
                    onChange={(e) => setExpectedSalary(e.target.value)}
                    placeholder="مثلاً: 8000"
                    min="1000"
                    max="500000"
                    step="100"
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1F6F5F] focus:border-transparent bg-white"
                    dir="ltr"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">إيه الرقم اللي تحب نتفق عليه؟</p>
                </div>
              </div>
            </div>

            {/* Why join */}
            <div>
              <label className="block text-sm font-bold text-[#0A0A0A] mb-2">
                ليه عايز تشتغل في مضمونة؟
              </label>
              <textarea
                value={whyJoin}
                onChange={(e) => setWhyJoin(e.target.value)}
                placeholder="اكتب باختصار ليه تحب تنضم لنا وإيه اللي تقدر تضيفه..."
                rows={4}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1F6F5F] focus:border-transparent text-right resize-none"
              />
            </div>

            {/* CV URL */}
            <div>
              <label className="block text-sm font-bold text-[#0A0A0A] mb-2">
                لينك CV أو LinkedIn (اختياري)
              </label>
              <input
                type="url"
                value={cvUrl}
                onChange={(e) => setCvUrl(e.target.value)}
                placeholder="https://linkedin.com/in/..."
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1F6F5F] focus:border-transparent"
                dir="ltr"
              />
              <p className="text-xs text-gray-500 mt-1">أو ابعت الـ CV على واتساب ٠١٠٠٢٢٢٩٩٨٢</p>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-gradient-to-l from-[#1F6F5F] to-[#2FA084] text-white px-6 py-4 rounded-xl font-black text-lg hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  بنبعت طلبك...
                </>
              ) : (
                <>
                  <Send className="w-5 h-5" />
                  ابعت الطلب
                </>
              )}
            </button>

            <p className="text-xs text-center text-gray-500">
              بتقديمك للطلب، انت موافق إننا نتواصل معاك على رقم الواتساب أو الإيميل اللي كتبتهم.
            </p>
          </form>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-[#0A0A0A] text-white/70 py-8 mt-8">
        <div className="max-w-6xl mx-auto px-4 text-center text-sm">
          <p className="mb-2 font-bold text-white">مضمونة · معاملاتك مضمونة</p>
          <p>٧ شارع سليمان عَزْمي، النزهة، مصر الجديدة، القاهرة</p>
          <p>للاستفسار: <a href="https://wa.me/201002229982" className="underline">٠١٠٠٢٢٢٩٩٨٢</a></p>
        </div>
      </footer>
    </div>
  )
}
