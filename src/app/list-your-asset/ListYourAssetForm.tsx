'use client'

import { useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Home, Car, Briefcase, Camera, Wrench, Heart, Palmtree, Gamepad2, Ship,
  ArrowRight, Loader2, CheckCircle, AlertCircle, ShieldCheck, Zap, Users,
  Lock,
} from 'lucide-react'
import { supabaseBrowser } from '@/lib/supabase-browser'
import { normalizePhone, phoneToEmail } from '@/lib/auth-helpers'

// Single-step guest flow:
//   user fills asset details + contact + password in ONE form.
//   on submit: create the account (Supabase auth) + save the asset draft
//   to cold_leads, then redirect to /supplier/marketplace so they can
//   add the rest of their assets after the team approves the first one.

type Category = {
  slug: string
  label: string
  Icon: typeof Home
  example: string
}

const CATEGORIES: Category[] = [
  { slug: 'properties', label: 'عقار', Icon: Home, example: 'شقة، فيلا، شاليه' },
  { slug: 'vehicles', label: 'عربية', Icon: Car, example: 'سيارة، ميكروباص، موتوسيكل' },
  { slug: 'workspaces', label: 'مساحة شغل', Icon: Briefcase, example: 'مكتب، قاعة اجتماعات' },
  { slug: 'media', label: 'معدات ميديا', Icon: Camera, example: 'كاميرا، إضاءة، sound' },
  { slug: 'equipment', label: 'معدات ثقيلة', Icon: Wrench, example: 'لودر، ونش، مولد' },
  { slug: 'weddings', label: 'أفراح', Icon: Heart, example: 'فستان، كوش، DJ' },
  { slug: 'tourism', label: 'سياحة', Icon: Palmtree, example: 'كامب، سفاري، رحلات' },
  { slug: 'recreation', label: 'ترفيه', Icon: Gamepad2, example: 'بلايستيشن، ملاعب' },
  { slug: 'marine', label: 'بحري', Icon: Ship, example: 'يخت، لانش، جيت سكي' },
]

export default function ListYourAssetForm() {
  const router = useRouter()

  // Asset details
  const [category, setCategory] = useState<string>('')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [price, setPrice] = useState('')
  const [location, setLocation] = useState('')

  // Contact + password
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)

    // ── Validation ───────────────────────────────────────────────
    if (!category) {
      setError('اختار نوع الأصل')
      return
    }
    if (!title.trim() || title.trim().length < 4) {
      setError('اكتب عنوان مختصر للأصل (4 حروف على الأقل)')
      return
    }
    if (!name.trim()) {
      setError('اكتب اسمك')
      return
    }
    const normalizedPhone = normalizePhone(phone)
    if (!normalizedPhone) {
      setError('رقم التليفون مش صحيح. اكتبه بالشكل ده: 01XXXXXXXXX')
      return
    }
    const trimmedEmail = email.trim().toLowerCase()
    if (!trimmedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setError('اكتب إيميل صحيح')
      return
    }
    if (password.length < 6) {
      setError('كلمة السر قصيرة جداً (6 حروف على الأقل)')
      return
    }
    if (password !== confirmPassword) {
      setError('كلمتين السر مش متطابقتين')
      return
    }

    setSubmitting(true)
    const fullPhone = '+' + normalizedPhone
    const authEmail = phoneToEmail(normalizedPhone)

    // ── Step 1: Create account ───────────────────────────────────
    const { data: authData, error: signUpErr } = await supabaseBrowser.auth.signUp({
      email: authEmail,
      password,
      options: {
        data: {
          phone: normalizedPhone,
          full_name: name.trim(),
          recovery_email: trimmedEmail,
        },
      },
    })

    if (signUpErr) {
      if (
        signUpErr.message.includes('already registered') ||
        signUpErr.message.includes('User already')
      ) {
        setError('فيه حساب موجود بالرقم ده. سجّل دخول أو اعمل reset لكلمة السر من /auth/login')
      } else {
        setError(signUpErr.message || 'حصل خطأ في إنشاء الحساب — جرّب تاني')
      }
      setSubmitting(false)
      return
    }

    // Save recovery email on the profile (best-effort)
    if (authData?.user?.id) {
      try {
        await supabaseBrowser.from('profiles').update({ email: trimmedEmail }).eq('id', authData.user.id)
      } catch {
        /* non-fatal */
      }
    }

    // ── Step 2: Save asset draft to cold_leads ───────────────────
    // The ops team converts these into proper listings via /admin.
    try {
      await supabaseBrowser.from('cold_leads').insert({
        business_name: title.trim().slice(0, 100),
        phone: fullPhone,
        category,
        location: location.trim() || null,
        source: 'list_your_asset_form',
        source_url: typeof window !== 'undefined' ? window.location.href : null,
        status: 'new',
        notes:
          `الاسم: ${name.trim()} | إيميل: ${trimmedEmail}\n` +
          `سعر تقريبي: ${price.trim() || 'لم يحدد'}\n` +
          `الوصف: ${description.trim() || 'لا يوجد'}\n` +
          (authData?.user?.id ? `User ID: ${authData.user.id}` : ''),
      })
    } catch {
      /* non-fatal — account was created, draft can be added later */
    }

    // ── Step 3: Sign in if session not auto-created, then redirect
    if (!authData.session) {
      await supabaseBrowser.auth
        .signInWithPassword({ email: authEmail, password })
        .catch(() => null)
    }

    router.push('/supplier/marketplace')
    router.refresh()
  }

  return (
    <div className="min-h-screen bg-[#FAFAF7]" dir="rtl">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-40">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-9 h-9 bg-[#34D399] rounded-full flex items-center justify-center text-[#04352A] font-bold text-lg">م</div>
            <span className="font-bold text-gray-900">مضمونة</span>
          </Link>
          <Link href="/auth/login" className="text-sm text-[#059669] font-semibold hover:underline">
            عندك حساب؟ سجل دخول
          </Link>
        </div>
      </header>

      <section className="bg-gradient-to-b from-[#34D399] to-[#164d32] text-white">
        <div className="max-w-3xl mx-auto px-4 py-10 text-center">
          <h1 className="text-3xl sm:text-4xl font-bold mb-3">أجر معانا في 60 ثانية</h1>
          <p className="text-white/90 text-base sm:text-lg mb-6 leading-relaxed">
            احنا بتوع التشغيل، مش الإعلانات.<br />
            تيمنا يقفل الصفقة — انت بتاخد فلوسك.
          </p>
          <div className="grid grid-cols-3 gap-3 max-w-xl mx-auto text-xs sm:text-sm">
            <div className="bg-white/10 rounded-xl py-3 px-2">
              <ShieldCheck className="w-5 h-5 mx-auto mb-1.5 text-[#2FA084]" />
              <div className="font-semibold">10% عمولة بس</div>
              <div className="text-white/70 text-[11px]">ثابتة على الكل</div>
            </div>
            <div className="bg-white/10 rounded-xl py-3 px-2">
              <Zap className="w-5 h-5 mx-auto mb-1.5 text-[#2FA084]" />
              <div className="font-semibold">AI matching</div>
              <div className="text-white/70 text-[11px]">العميل المظبوط</div>
            </div>
            <div className="bg-white/10 rounded-xl py-3 px-2">
              <Users className="w-5 h-5 mx-auto mb-1.5 text-[#2FA084]" />
              <div className="font-semibold">تيم بيشغّلك</div>
              <div className="text-white/70 text-[11px]">من 2019</div>
            </div>
          </div>
        </div>
      </section>

      <main className="max-w-3xl mx-auto px-4 py-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Step 1: Category */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-7 h-7 bg-[#34D399] text-[#04352A] rounded-full flex items-center justify-center text-sm font-bold">1</div>
              <h2 className="font-bold text-gray-900">إيه نوع الأصل؟</h2>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {CATEGORIES.map(c => {
                const Icon = c.Icon
                const selected = category === c.slug
                return (
                  <button
                    key={c.slug}
                    type="button"
                    onClick={() => setCategory(c.slug)}
                    className={`p-3 rounded-xl border-2 text-center transition-all ${
                      selected ? 'border-[#059669] bg-[#34D399]/5' : 'border-gray-200 hover:border-gray-300 bg-white'
                    }`}
                  >
                    <Icon className={`w-6 h-6 mx-auto mb-1.5 ${selected ? 'text-[#059669]' : 'text-gray-500'}`} />
                    <div className={`text-sm font-semibold ${selected ? 'text-[#059669]' : 'text-gray-900'}`}>{c.label}</div>
                    <div className="text-[11px] text-gray-500 mt-0.5">{c.example}</div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Step 2: Asset details */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-7 h-7 bg-[#34D399] text-[#04352A] rounded-full flex items-center justify-center text-sm font-bold">2</div>
              <h2 className="font-bold text-gray-900">تفاصيل الأصل</h2>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">عنوان مختصر *</label>
                <input
                  type="text"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="مثلاً: شقة مفروشة في الساحل الشمالي"
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#059669]/50 focus:ring-2 focus:ring-[#059669]/10"
                  maxLength={100}
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">وصف (اختياري)</label>
                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="حجم الأصل، الموجودات، الحالة..."
                  rows={3}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#059669]/50 focus:ring-2 focus:ring-[#059669]/10 resize-none"
                  maxLength={500}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">سعر تقريبي (جنيه)</label>
                  <input
                    type="number"
                    value={price}
                    onChange={e => setPrice(e.target.value)}
                    placeholder="مثلاً 5000"
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#059669]/50 focus:ring-2 focus:ring-[#059669]/10"
                    min={0}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">الموقع</label>
                  <input
                    type="text"
                    value={location}
                    onChange={e => setLocation(e.target.value)}
                    placeholder="مدينة نصر، الساحل..."
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#059669]/50 focus:ring-2 focus:ring-[#059669]/10"
                    maxLength={80}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Step 3: Account creation in same step */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-7 h-7 bg-[#34D399] text-[#04352A] rounded-full flex items-center justify-center text-sm font-bold">3</div>
              <h2 className="font-bold text-gray-900">بياناتك للحساب</h2>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">اسمك الكامل *</label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="محمد أحمد"
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#059669]/50 focus:ring-2 focus:ring-[#059669]/10"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">رقم الواتساب *</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="01XXXXXXXXX"
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#059669]/50 focus:ring-2 focus:ring-[#059669]/10"
                  dir="ltr"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">الإيميل *</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#059669]/50 focus:ring-2 focus:ring-[#059669]/10"
                  dir="ltr"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5 flex items-center gap-1">
                    <Lock className="w-3 h-3" /> كلمة السر *
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="6 حروف على الأقل"
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#059669]/50 focus:ring-2 focus:ring-[#059669]/10"
                    dir="ltr"
                    autoComplete="new-password"
                    minLength={6}
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5 flex items-center gap-1">
                    <Lock className="w-3 h-3" /> أكّد كلمة السر *
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#059669]/50 focus:ring-2 focus:ring-[#059669]/10"
                    dir="ltr"
                    autoComplete="new-password"
                    minLength={6}
                    required
                  />
                </div>
              </div>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-900">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-[#34D399] hover:bg-[#164d32] text-[#04352A] py-3.5 rounded-xl font-bold text-base shadow-lg disabled:opacity-60 transition-all flex items-center justify-center gap-2"
          >
            {submitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                لحظة...
              </>
            ) : (
              <>
                اعمل الحساب وسجل الأصل
                <ArrowRight className="w-5 h-5 rotate-180" />
              </>
            )}
          </button>

          <p className="text-center text-xs text-gray-500 leading-relaxed">
            بإرسال البيانات، أنت توافق على شروط مضمونة. هنعمل لك حساب فوراً وفريقنا هينشر الأصل خلال 24 ساعة.
          </p>
        </form>

        <section className="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="bg-white rounded-xl border border-gray-100 p-4 text-center">
            <CheckCircle className="w-5 h-5 text-[#059669] mx-auto mb-2" />
            <div className="text-sm font-semibold mb-0.5">الفلوس مضمونة</div>
            <div className="text-xs text-gray-500">الدفع أونلاين من العميل</div>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 p-4 text-center">
            <CheckCircle className="w-5 h-5 text-[#059669] mx-auto mb-2" />
            <div className="text-sm font-semibold mb-0.5">تيم بيشغّلك</div>
            <div className="text-xs text-gray-500">احنا بنقفل الصفقة</div>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 p-4 text-center">
            <CheckCircle className="w-5 h-5 text-[#059669] mx-auto mb-2" />
            <div className="text-sm font-semibold mb-0.5">دفع سريع</div>
            <div className="text-xs text-gray-500">بعد كل إيجار</div>
          </div>
        </section>
      </main>
    </div>
  )
}
