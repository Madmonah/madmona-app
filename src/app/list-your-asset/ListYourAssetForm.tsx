'use client'

import { useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Home, Car, Briefcase, Camera, Wrench, Heart, Palmtree, Gamepad2, Ship,
  ArrowRight, Loader2, CheckCircle, AlertCircle, ShieldCheck, Zap, Users,
} from 'lucide-react'
import { supabaseBrowser } from '@/lib/supabase-browser'
import { normalizePhone } from '@/lib/auth-helpers'

// Public guest form. No login required. The asset draft is saved to cold_leads
// (already in the DB) with a 'list_your_asset' source, then we redirect to
// /auth/signup with the contact info pre-filled. After signup completes,
// the team converts the draft into a proper listing via /admin/listings.

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

  const [category, setCategory] = useState<string>('')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [price, setPrice] = useState('')
  const [location, setLocation] = useState('')

  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)

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

    setSubmitting(true)

    const fullPhone = '+' + normalizedPhone
    const draftPayload = {
      category,
      title: title.trim(),
      description: description.trim(),
      price: price.trim() ? Number(price) : null,
      location: location.trim(),
      name: name.trim(),
      phone: fullPhone,
      email: trimmedEmail,
      submitted_at: new Date().toISOString(),
    }

    // Persist locally so signup page can offer to attach it after the account exists.
    try {
      localStorage.setItem('madmona_pending_listing', JSON.stringify(draftPayload))
    } catch { /* localStorage might be disabled — non-fatal */ }

    // Save lead row so the ops team can follow up even if signup is abandoned.
    try {
      // @ts-expect-error — cold_leads is in the public schema, types may lag
      await supabaseBrowser.from('cold_leads').insert({
        business_name: title.trim().slice(0, 100),
        phone: fullPhone,
        category,
        location: location.trim() || null,
        source: 'list_your_asset_form',
        source_url: typeof window !== 'undefined' ? window.location.href : null,
        status: 'new',
        notes: `الاسم: ${name.trim()} | إيميل: ${trimmedEmail}\n` +
               `سعر تقريبي: ${price.trim() || 'لم يحدد'}\n` +
               `الوصف: ${description.trim() || 'لا يوجد'}`,
      })
    } catch (err) {
      // Non-fatal — we still want to redirect the user
      console.warn('[list-your-asset] cold_leads insert failed:', err)
    }

    const params = new URLSearchParams({
      from: 'listing',
      name: name.trim(),
      phone: normalizedPhone,
      email: trimmedEmail,
      redirect: '/supplier/marketplace',
    })
    router.push(`/auth/signup?${params.toString()}`)
  }

  return (
    <div className="min-h-screen bg-[#FAFAF7]" dir="rtl">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-40">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-9 h-9 bg-[#1F5F3F] rounded-full flex items-center justify-center text-white font-bold text-lg">م</div>
            <span className="font-bold text-gray-900">مضمونة</span>
          </Link>
          <Link href="/auth/login" className="text-sm text-[#1F5F3F] font-semibold hover:underline">
            عندك حساب؟ سجل دخول
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="bg-gradient-to-b from-[#1F5F3F] to-[#164d32] text-white">
        <div className="max-w-3xl mx-auto px-4 py-10 text-center">
          <h1 className="text-3xl sm:text-4xl font-bold mb-3">أجر معانا في 60 ثانية</h1>
          <p className="text-white/90 text-base sm:text-lg mb-6 leading-relaxed">
            احنا بتوع التشغيل، مش الإعلانات.<br />
            تيمنا يقفل الصفقة — انت بتاخد فلوسك.
          </p>
          <div className="grid grid-cols-3 gap-3 max-w-xl mx-auto text-xs sm:text-sm">
            <div className="bg-white/10 rounded-xl py-3 px-2">
              <ShieldCheck className="w-5 h-5 mx-auto mb-1.5 text-[#B8860B]" />
              <div className="font-semibold">10% عمولة بس</div>
              <div className="text-white/70 text-[11px]">5% للشركات</div>
            </div>
            <div className="bg-white/10 rounded-xl py-3 px-2">
              <Zap className="w-5 h-5 mx-auto mb-1.5 text-[#B8860B]" />
              <div className="font-semibold">AI matching</div>
              <div className="text-white/70 text-[11px]">العميل المظبوط</div>
            </div>
            <div className="bg-white/10 rounded-xl py-3 px-2">
              <Users className="w-5 h-5 mx-auto mb-1.5 text-[#B8860B]" />
              <div className="font-semibold">تيم بيشغّلك</div>
              <div className="text-white/70 text-[11px]">من 2019</div>
            </div>
          </div>
        </div>
      </section>

      {/* Form */}
      <main className="max-w-3xl mx-auto px-4 py-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Step 1: Category */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-7 h-7 bg-[#1F5F3F] text-white rounded-full flex items-center justify-center text-sm font-bold">1</div>
              <h2 className="font-bold text-gray-900">إيه نوع الأصل؟</h2>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-3 gap-2">
              {CATEGORIES.map(c => {
                const Icon = c.Icon
                const selected = category === c.slug
                return (
                  <button
                    key={c.slug}
                    type="button"
                    onClick={() => setCategory(c.slug)}
                    className={`p-3 rounded-xl border-2 text-center transition-all ${
                      selected
                        ? 'border-[#1F5F3F] bg-[#1F5F3F]/5'
                        : 'border-gray-200 hover:border-gray-300 bg-white'
                    }`}
                  >
                    <Icon className={`w-6 h-6 mx-auto mb-1.5 ${selected ? 'text-[#1F5F3F]' : 'text-gray-500'}`} />
                    <div className={`text-sm font-semibold ${selected ? 'text-[#1F5F3F]' : 'text-gray-900'}`}>{c.label}</div>
                    <div className="text-[11px] text-gray-500 mt-0.5">{c.example}</div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Step 2: Asset details */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-7 h-7 bg-[#1F5F3F] text-white rounded-full flex items-center justify-center text-sm font-bold">2</div>
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
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#1F5F3F]/50 focus:ring-2 focus:ring-[#1F5F3F]/10"
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
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#1F5F3F]/50 focus:ring-2 focus:ring-[#1F5F3F]/10 resize-none"
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
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#1F5F3F]/50 focus:ring-2 focus:ring-[#1F5F3F]/10"
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
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#1F5F3F]/50 focus:ring-2 focus:ring-[#1F5F3F]/10"
                    maxLength={80}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Step 3: Contact */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-7 h-7 bg-[#1F5F3F] text-white rounded-full flex items-center justify-center text-sm font-bold">3</div>
              <h2 className="font-bold text-gray-900">بياناتك للتواصل</h2>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">اسمك الكامل *</label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="محمد أحمد"
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#1F5F3F]/50 focus:ring-2 focus:ring-[#1F5F3F]/10"
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
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#1F5F3F]/50 focus:ring-2 focus:ring-[#1F5F3F]/10"
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
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#1F5F3F]/50 focus:ring-2 focus:ring-[#1F5F3F]/10"
                  dir="ltr"
                  required
                />
              </div>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-900">{error}</p>
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-[#1F5F3F] hover:bg-[#164d32] text-white py-3.5 rounded-xl font-bold text-base shadow-lg disabled:opacity-60 transition-all flex items-center justify-center gap-2"
          >
            {submitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                لحظة...
              </>
            ) : (
              <>
                سجل الأصل وأكمل التسجيل
                <ArrowRight className="w-5 h-5 rotate-180" />
              </>
            )}
          </button>

          <p className="text-center text-xs text-gray-500 leading-relaxed">
            بإرسال البيانات، أنت توافق على شروط مضمونة. الخطوة الجاية: تكمل تسجيل الحساب (دقيقتين) عشان نقدر ننشر الأصل على المنصة.
          </p>
        </form>

        {/* Trust strip */}
        <section className="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="bg-white rounded-xl border border-gray-100 p-4 text-center">
            <CheckCircle className="w-5 h-5 text-[#1F5F3F] mx-auto mb-2" />
            <div className="text-sm font-semibold mb-0.5">الفلوس مضمونة</div>
            <div className="text-xs text-gray-500">الدفع أونلاين من العميل</div>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 p-4 text-center">
            <CheckCircle className="w-5 h-5 text-[#1F5F3F] mx-auto mb-2" />
            <div className="text-sm font-semibold mb-0.5">تيم بيشغّلك</div>
            <div className="text-xs text-gray-500">احنا بنقفل الصفقة</div>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 p-4 text-center">
            <CheckCircle className="w-5 h-5 text-[#1F5F3F] mx-auto mb-2" />
            <div className="text-sm font-semibold mb-0.5">دفع سريع</div>
            <div className="text-xs text-gray-500">بعد كل إيجار</div>
          </div>
        </section>
      </main>
    </div>
  )
}
