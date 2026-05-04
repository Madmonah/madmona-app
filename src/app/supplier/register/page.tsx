'use client'

import { useEffect, useState, type FormEvent } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabaseBrowser } from '@/lib/supabase-browser'
import {
  ArrowRight,
  Building2,
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

interface ExistingSupplier {
  id: string
  business_name: string
  kyc_status: 'pending' | 'approved' | 'rejected' | 'suspended'
  kyc_rejection_reason: string | null
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
        setExisting(supplier as ExistingSupplier)
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
            عشان تتقدم لتبقى مورد على Madmona، لازم تسجل دخول بحسابك أولاً.
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

            {canAccessDashboard && (
              <Link
                href="/supplier/marketplace"
                className="block w-full mt-6 bg-[#1F5F3F] text-white py-3 rounded-xl font-semibold text-center hover:bg-[#1F5F3F]/90"
              >
                روح للوحة التحكم
              </Link>
            )}
          </div>
        </div>
      </div>
    )
  }

  // ============================================================================
  // Render: success
  // ============================================================================
  if (stage === 'success') {
    return (
      <div className="min-h-screen bg-[#FAFAF7] p-4" dir="rtl">
        <div className="max-w-xl mx-auto pt-12">
          <div className="bg-white rounded-2xl border border-gray-100 p-8 shadow-sm text-center">
            <div className="flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4 mx-auto">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">تم استلام طلبك</h1>
            <p className="text-sm text-gray-600 mb-6">
              تقدر تبدأ تضيف listings على طول. الموافقة النهائية على الحساب بتيجي قبل أول حجز ياخده عميل منك.
            </p>
            <div className="flex gap-3 justify-center">
              <Link
                href="/supplier/marketplace"
                className="px-6 py-2.5 bg-[#1F5F3F] text-white rounded-lg text-sm font-semibold hover:bg-[#1F5F3F]/90"
              >
                ابدأ ضيف listings
              </Link>
              <Link href="/" className="px-6 py-2.5 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200">
                الرئيسية
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
            <h1 className="text-xl font-bold text-gray-900">تسجيل مورد جديد</h1>
          </div>
          <p className="text-sm text-gray-500 mb-6">
            املا البيانات دي عشان تقدم لتبقى مورد على Madmona Marketplace.
          </p>

          {error && (
            <div className="mb-4 flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-900">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Business Info Section */}
            <div>
              <h2 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-[#1F5F3F]" />
                بيانات النشاط
              </h2>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">اسم النشاط بالعربي *</label>
                  <input
                    type="text"
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    required
                    maxLength={200}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1F5F3F]/30 focus:border-[#1F5F3F]"
                    placeholder="مثلاً: شركة النيل لتأجير السيارات"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Business name (English)</label>
                  <input
                    type="text"
                    value={businessNameEn}
                    onChange={(e) => setBusinessNameEn(e.target.value)}
                    maxLength={200}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1F5F3F]/30 focus:border-[#1F5F3F]"
                    placeholder="Nile Car Rentals"
                    dir="ltr"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">وصف مختصر للنشاط</label>
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
                  <label className="block text-xs font-medium text-gray-700 mb-1">رابط لوجو النشاط (اختياري)</label>
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

            {/* KYC Section */}
            <div className="pt-4 border-t border-gray-100">
              <h2 className="text-sm font-semibold text-gray-900 mb-1 flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#1F5F3F]" />
                بيانات التحقق (KYC)
              </h2>
              <p className="text-xs text-gray-500 mb-3">
                البيانات دي بتساعدنا نتحقق من نشاطك. كلها اختيارية دلوقتي بس بتسرّع الموافقة قبل أول حجز.
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
                'قدّم طلب التسجيل'
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
