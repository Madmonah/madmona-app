'use client'

import { useEffect, useState, type FormEvent } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabaseBrowser } from '@/lib/supabase-browser'
import {
  ArrowRight,
  Building2,
  User as UserIcon,
  FileText,
  CheckCircle,
  AlertCircle,
  Lock,
  Loader2,
} from 'lucide-react'

// ============================================================================
// /supplier/register
//
// Marketplace supplier registration. Requires the user to be signed in
// (auth.users session). Inserts directly into marketplace_suppliers via RLS
// (policy "marketplace_suppliers_self_apply" allows self-insert with kyc_status='pending').
//
// FLOW (relaxed gate v2):
// - Anyone with a session can register as a supplier
// - On registration, kyc_status='pending' (default)
// - Pending suppliers CAN proceed to the dashboard, add and publish listings
// - The KYC approval gate is enforced ONLY at booking time (see /marketplace/[slug]/book)
// ============================================================================

type Stage = 'loading' | 'unauthenticated' | 'has-supplier' | 'form' | 'success'
type AccountType = 'individual' | 'business'

interface ExistingSupplier {
  id: string
  business_name: string
  kyc_status: 'pending' | 'approved' | 'rejected' | 'suspended'
  kyc_rejection_reason: string | null
  listings_count: number  // <-- NEW: track if they've created any listing yet
}

const STATUS_LABELS = {
  pending: { label: 'قيد المراجعة', color: 'bg-yellow-50 text-yellow-800 border-yellow-200', icon: AlertCircle },
  approved: { label: 'موافق عليه', color: 'bg-green-50 text-green-800 border-green-200', icon: CheckCircle },
  rejected: { label: 'مرفوض', color: 'bg-red-50 text-red-800 border-red-200', icon: AlertCircle },
  suspended: { label: 'موقوف', color: 'bg-gray-50 text-gray-700 border-gray-200', icon: AlertCircle },
} as const

export default function SupplierRegisterPage() {
  const router = useRouter()

  const [stage, setStage] = useState<Stage>('loading')
  const [userId, setUserId] = useState<string | null>(null)
  const [existing, setExisting] = useState<ExistingSupplier | null>(null)

  // Form fields
  const [accountType, setAccountType] = useState<AccountType>('business')
  const [businessName, setBusinessName] = useState('')
  const [businessNameEn, setBusinessNameEn] = useState('')
  const [description, setDescription] = useState('')
  const [logoUrl, setLogoUrl] = useState('')
  const [nationalId, setNationalId] = useState('')
  const [commercialReg, setCommercialReg] = useState('')
  const [taxId, setTaxId] = useState('')

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // ----- Check auth + existing supplier on mount -----
  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabaseBrowser.auth.getSession()
      if (!session?.user) {
        setStage('unauthenticated')
        return
      }
      setUserId(session.user.id)

      // Check if this user already has a supplier record
      // @ts-expect-error new schema not in types
      const { data: supplier } = await supabaseBrowser
        .from('marketplace_suppliers')
        .select('id, business_name, kyc_status, kyc_rejection_reason')
        .eq('profile_id', session.user.id)
        .maybeSingle()

      if (supplier) {
        // Count their listings to know if they finished onboarding
        // @ts-expect-error
        const { count } = await supabaseBrowser
          .from('listings')
          .select('id', { count: 'exact', head: true })
          .eq('supplier_id', supplier.id)
        setExisting({ ...(supplier as Omit<ExistingSupplier, 'listings_count'>), listings_count: count || 0 })
        setStage('has-supplier')
      } else {
        setStage('form')
      }
    }
    init()
  }, [])

  // ----- Submit -----
  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!userId) return
    setError(null)
    setSubmitting(true)

    const insert: Record<string, unknown> = {
      profile_id: userId,
      business_name: businessName.trim(),
      kyc_status: 'pending',
    }
    // Note: account_type is captured in UI for conditional field display.
    // To persist it, add column to DB:
    //   ALTER TABLE marketplace_suppliers ADD COLUMN account_type TEXT DEFAULT 'business' CHECK (account_type IN ('individual', 'business'));
    // Then uncomment the next line:
    // insert.account_type = accountType
    void accountType  // suppress unused warning until DB migration is applied
    if (businessNameEn) insert.business_name_en = businessNameEn.trim()
    if (description) insert.description = description.trim()
    if (logoUrl) insert.logo_url = logoUrl.trim()
    if (nationalId) insert.national_id = nationalId.trim()
    if (commercialReg) insert.commercial_registration = commercialReg.trim()
    if (taxId) insert.tax_id = taxId.trim()

    // @ts-expect-error
    const { error: insertError } = await supabaseBrowser
      .from('marketplace_suppliers')
      .insert(insert)

    setSubmitting(false)

    if (insertError) {
      console.error('[supplier/register] insert error:', insertError)
      if (insertError.code === '23505') {
        setError('عندك طلب تسجيل قبل كده')
      } else {
        setError(insertError.message || 'حصل خطأ، جرب تاني')
      }
      return
    }

    setStage('success')
  }

  // Auto-redirect to listing creation after success (3s delay so they read the message)
  useEffect(() => {
    if (stage !== 'success') return
    const t = setTimeout(() => {
      router.push('/supplier/marketplace/new?welcome=1')
    }, 3500)
    return () => clearTimeout(t)
  }, [stage, router])

  // ============================================================================
  // Render: loading
  // ============================================================================
  if (stage === 'loading') {
    return (
      <div className="min-h-screen bg-[#FAFAF7] flex items-center justify-center" dir="rtl">
        <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
      </div>
    )
  }

  // ============================================================================
  // Render: unauthenticated
  // ============================================================================
  if (stage === 'unauthenticated') {
    return (
      <div className="min-h-screen bg-[#FAFAF7] flex items-center justify-center p-4" dir="rtl">
        <div className="w-full max-w-sm bg-white rounded-2xl border border-gray-100 p-8 shadow-sm text-center">
          <div className="flex items-center justify-center w-12 h-12 bg-[#1F5F3F]/10 rounded-full mb-4 mx-auto">
            <Lock className="w-5 h-5 text-[#1F5F3F]" />
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-1">سجّل دخول الأول</h1>
          <p className="text-sm text-gray-500 mb-6">
            عشان تسجل في أجر معانا على Madmona، لازم تسجل دخول بحسابك أولاً.
          </p>
          <Link
            href={`/auth/login?redirect=${encodeURIComponent('/supplier/register')}`}
            className="inline-block w-full bg-[#1F5F3F] text-white py-3 rounded-xl font-semibold hover:bg-[#1F5F3F]/90"
          >
            تسجيل دخول
          </Link>
          <Link
            href={`/auth/signup?redirect=${encodeURIComponent('/supplier/register')}`}
            className="inline-block mt-2 text-sm text-gray-600 hover:text-[#1F5F3F]"
          >
            مفيش حساب؟ اعمل حساب جديد
          </Link>
        </div>
      </div>
    )
  }

  // ============================================================================
  // Render: already has supplier (any status)
  // ============================================================================
  if (stage === 'has-supplier' && existing) {
    const status = STATUS_LABELS[existing.kyc_status]
    const StatusIcon = status.icon
    // Pending and approved suppliers can both proceed to dashboard.
    // Rejected/suspended cannot.
    const canAccessDashboard = existing.kyc_status === 'approved' || existing.kyc_status === 'pending'
    return (
      <div className="min-h-screen bg-[#FAFAF7] p-4" dir="rtl">
        <div className="max-w-xl mx-auto pt-8">
          <Link href="/" className="inline-flex items-center gap-1 text-sm text-gray-600 mb-6 hover:text-[#1F5F3F]">
            <ArrowRight className="w-4 h-4" /> الرئيسية
          </Link>

          <div className="bg-white rounded-2xl border border-gray-100 p-8 shadow-sm">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">{existing.business_name}</h1>
            <p className="text-sm text-gray-500 mb-6">حالة طلب التسجيل بتاعك:</p>

            <div className={`flex items-start gap-3 p-4 rounded-xl border ${status.color}`}>
              <StatusIcon className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold mb-1">{status.label}</p>
                {existing.kyc_status === 'pending' && (
                  <p className="text-sm">
                    تقدر تبدأ تضيف listings دلوقتي وتجهّز عرضك. الموافقة النهائية بتيجي قبل أول حجز.
                  </p>
                )}
                {existing.kyc_status === 'approved' && (
                  <p className="text-sm">
                    تم الموافقة على حسابك. ابدأ ضيف الـlistings بتاعتك.
                  </p>
                )}
                {existing.kyc_status === 'rejected' && existing.kyc_rejection_reason && (
                  <p className="text-sm">
                    <strong>السبب:</strong> {existing.kyc_rejection_reason}
                  </p>
                )}
                {existing.kyc_status === 'suspended' && (
                  <p className="text-sm">
                    حسابك موقوف مؤقتاً. تواصل مع الإدارة للتفاصيل.
                  </p>
                )}
              </div>
            </div>

            {canAccessDashboard && existing.listings_count === 0 && (
              <div className="mt-6 p-4 bg-gradient-to-br from-[#B8860B]/10 to-amber-50 border-2 border-[#B8860B]/30 rounded-xl">
                <p className="text-sm font-bold text-gray-900 mb-1">⚠️ خطوة ناقصة!</p>
                <p className="text-xs text-gray-700 mb-3 leading-relaxed">
                  حسابك مسجل بس لسّه مفيش إعلانات ليه — عشان تستقبل حجوزات، لازم تضيف إعلان واحد على الأقل.
                </p>
                <Link
                  href="/supplier/marketplace/new?welcome=1"
                  className="block w-full bg-[#B8860B] text-white py-3 rounded-xl font-bold text-center hover:bg-[#B8860B]/90 shadow-sm"
                >
                  ضيف أول إعلان دلوقتي →
                </Link>
              </div>
            )}

            {canAccessDashboard && existing.listings_count > 0 && (
              <Link
                href="/supplier/marketplace"
                className="block w-full mt-6 bg-[#1F5F3F] text-white py-3 rounded-xl font-semibold text-center hover:bg-[#1F5F3F]/90"
              >
                روح للوحة التحكم ({existing.listings_count} إعلان)
              </Link>
            )}
          </div>
        </div>
      </div>
    )
  }

  // ============================================================================
  // Render: success — auto-redirects to /supplier/marketplace/new after 3.5s
  // ============================================================================
  if (stage === 'success') {
    return (
      <div className="min-h-screen bg-[#FAFAF7] p-4" dir="rtl">
        <div className="max-w-xl mx-auto pt-12">
          <div className="bg-white rounded-2xl border border-gray-100 p-8 shadow-sm text-center">
            <div className="flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4 mx-auto">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">تم تسجيل حسابك ✅</h1>
            <p className="text-sm text-gray-700 mb-2 font-semibold">
              دلوقتي الخطوة الأهم: ضيف أول listing (إعلان)
            </p>
            <p className="text-xs text-gray-500 mb-6">
              حسابك لوحده مابيظهرش للعملاء — لازم تضيف إعلان واحد على الأقل عشان تستقبل حجوزات.
            </p>
            <div className="flex items-center justify-center gap-2 text-xs text-gray-500 mb-4">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              بنحولك لإضافة أول إعلان...
            </div>
            <div className="flex gap-3 justify-center">
              <Link
                href="/supplier/marketplace/new?welcome=1"
                className="px-6 py-2.5 bg-[#1F5F3F] text-white rounded-lg text-sm font-semibold hover:bg-[#1F5F3F]/90"
              >
                ضيف إعلانك الأول دلوقتي
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ============================================================================
  // Render: form
  // ============================================================================
  return (
    <div className="min-h-screen bg-[#FAFAF7] p-4" dir="rtl">
      <div className="max-w-xl mx-auto pt-8 pb-12">
        <Link href="/" className="inline-flex items-center gap-1 text-sm text-gray-600 mb-6 hover:text-[#1F5F3F]">
          <ArrowRight className="w-4 h-4" /> الرئيسية
        </Link>

        <div className="bg-white rounded-2xl border border-gray-100 p-6 sm:p-8 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="flex items-center justify-center w-10 h-10 bg-[#1F5F3F]/10 rounded-full">
              <Building2 className="w-5 h-5 text-[#1F5F3F]" />
            </div>
            <h1 className="text-xl font-bold text-gray-900">أجر معانا - الخطوة 1 من 2: تسجيل حساب</h1>
          </div>
          <div className="mb-6 p-3 bg-blue-50 border border-blue-100 rounded-xl">
            <p className="text-xs text-blue-900 leading-relaxed">
              💡 <strong>دي خطوة حساب واحد بس</strong> — دي مش خانة تسجيل إعلان. بعد ما تسجل حسابك، هناخدك تلقائياً لخانة إضافة الإعلان (خطوة 2).
            </p>
          </div>
          <p className="text-sm text-gray-500 mb-6">
            املا بياناتك الأساسية عشان نعرف مين إنت (فرد ولا شركة).
          </p>

          {error && (
            <div className="mb-4 flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-900">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Account Type Toggle */}
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-3">
                بتسجل بصفتك
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setAccountType('individual')}
                  className={`relative flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                    accountType === 'individual'
                      ? 'border-[#1F5F3F] bg-[#1F5F3F]/5 shadow-sm'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    accountType === 'individual' ? 'bg-[#1F5F3F] text-white' : 'bg-gray-100 text-gray-500'
                  }`}>
                    <UserIcon className="w-5 h-5" />
                  </div>
                  <div className="text-center">
                    <p className={`text-sm font-bold ${
                      accountType === 'individual' ? 'text-[#1F5F3F]' : 'text-gray-700'
                    }`}>فرد</p>
                    <p className="text-[10px] text-gray-500 mt-0.5">بصفتك الشخصية</p>
                  </div>
                  {accountType === 'individual' && (
                    <CheckCircle className="absolute top-2 left-2 w-4 h-4 text-[#1F5F3F]" />
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setAccountType('business')}
                  className={`relative flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                    accountType === 'business'
                      ? 'border-[#1F5F3F] bg-[#1F5F3F]/5 shadow-sm'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    accountType === 'business' ? 'bg-[#1F5F3F] text-white' : 'bg-gray-100 text-gray-500'
                  }`}>
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div className="text-center">
                    <p className={`text-sm font-bold ${
                      accountType === 'business' ? 'text-[#1F5F3F]' : 'text-gray-700'
                    }`}>شركة</p>
                    <p className="text-[10px] text-gray-500 mt-0.5">نشاط تجاري</p>
                  </div>
                  {accountType === 'business' && (
                    <CheckCircle className="absolute top-2 left-2 w-4 h-4 text-[#1F5F3F]" />
                  )}
                </button>
              </div>
            </div>
            {/* Business Info Section */}
            <div>
              <h2 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                {accountType === 'individual' ? (
                  <><UserIcon className="w-4 h-4 text-[#1F5F3F]" /> بياناتك الشخصية</>
                ) : (
                  <><Building2 className="w-4 h-4 text-[#1F5F3F]" /> بيانات النشاط</>
                )}
              </h2>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    {accountType === 'individual' ? 'اسمك بالعربي *' : 'اسم النشاط بالعربي *'}
                  </label>
                  <input
                    type="text"
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    required
                    maxLength={200}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1F5F3F]/30 focus:border-[#1F5F3F]"
                    placeholder={accountType === 'individual' ? 'مثلاً: أحمد محمد' : 'مثلاً: شركة النيل لتأجير السيارات'}
                  />
                  <p className="text-[10px] text-gray-400 mt-1">
                    {accountType === 'individual'
                      ? 'ده اسمك إنت، مش اسم الإعلان (مثل: "أحمد" مش "شاليه 70 متر")'
                      : 'ده اسم نشاطك (مثل "شركة أحمد للتأجير")، مش اسم إعلان واحد. الإعلانات هتضيفها بعدين.'}
                  </p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    {accountType === 'individual' ? 'Your name (English)' : 'Business name (English)'}
                  </label>
                  <input
                    type="text"
                    value={businessNameEn}
                    onChange={(e) => setBusinessNameEn(e.target.value)}
                    maxLength={200}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1F5F3F]/30 focus:border-[#1F5F3F]"
                    placeholder={accountType === 'individual' ? 'Ahmed Mohamed' : 'Nile Car Rentals'}
                    dir="ltr"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    {accountType === 'individual' ? 'وصف مختصر للخدمة' : 'وصف مختصر للنشاط'}
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                    maxLength={1000}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1F5F3F]/30 focus:border-[#1F5F3F]"
                    placeholder="ايه نوع الخدمة اللي بتقدمها وفين"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    {accountType === 'individual' ? 'رابط صورتك (اختياري)' : 'رابط لوجو النشاط (اختياري)'}
                  </label>
                  <input
                    type="url"
                    value={logoUrl}
                    onChange={(e) => setLogoUrl(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1F5F3F]/30 focus:border-[#1F5F3F]"
                    placeholder="https://..."
                    dir="ltr"
                  />
                </div>
              </div>
            </div>

            {/* KYC Section - shown differently for individual vs business */}
            <div className="pt-4 border-t border-gray-100">
              <h2 className="text-sm font-semibold text-gray-900 mb-1 flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#1F5F3F]" />
                بيانات التحقق (KYC)
              </h2>
              <p className="text-xs text-gray-500 mb-3">
                {accountType === 'individual'
                  ? 'بيانات اختيارية بتسرّع الموافقة على حسابك. رقم البطاقة بس كفاية.'
                  : 'البيانات دي بتساعدنا نتحقق من نشاطك. كلها اختيارية دلوقتي بس بتسرّع الموافقة قبل أول حجز.'}
              </p>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">رقم البطاقة الشخصية</label>
                  <input
                    type="text"
                    value={nationalId}
                    onChange={(e) => setNationalId(e.target.value.replace(/\D/g, ''))}
                    maxLength={14}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1F5F3F]/30 focus:border-[#1F5F3F]"
                    placeholder="14 رقم"
                    dir="ltr"
                  />
                </div>
                {/* Commercial Reg + Tax ID only for businesses */}
                {accountType === 'business' && (
                  <>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">رقم السجل التجاري</label>
                      <input
                        type="text"
                        value={commercialReg}
                        onChange={(e) => setCommercialReg(e.target.value)}
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1F5F3F]/30 focus:border-[#1F5F3F]"
                        placeholder="(لو عندك سجل تجاري)"
                        dir="ltr"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">الرقم الضريبي</label>
                      <input
                        type="text"
                        value={taxId}
                        onChange={(e) => setTaxId(e.target.value)}
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1F5F3F]/30 focus:border-[#1F5F3F]"
                        placeholder="(لو مسجّل ضريبياً)"
                        dir="ltr"
                      />
                    </div>
                  </>
                )}
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting || !businessName}
              className="w-full bg-[#1F5F3F] text-white py-3 rounded-xl font-semibold hover:bg-[#1F5F3F]/90 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  جاري الإرسال...
                </>
              ) : (
                'سجل حسابي وروح لإضافة الإعلان (خطوة 2)'
              )}
            </button>

            <p className="text-xs text-center text-gray-400">
              بإرسال الطلب، أنت موافق على شروط الخدمة وسياسة الخصوصية.
            </p>
          </form>
        </div>
      </div>
    </div>
  )
}
