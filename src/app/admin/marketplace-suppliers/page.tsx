'use client'

// src/app/admin/marketplace-suppliers/page.tsx
// Suppliers management — uses Supabase RPCs directly (no API endpoint, no env vars needed)

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  RefreshCw, ArrowRight, CheckCircle, XCircle, AlertCircle, Clock,
  Phone, Mail, FileText, IdCard, Building2, Tag, Loader2, ShieldAlert,
} from 'lucide-react'
import { supabaseBrowser } from '@/lib/supabase-browser'

type KycStatus = 'pending' | 'approved' | 'rejected' | 'suspended'

interface ProfileSummary {
  id: string
  phone: string | null
  email: string | null
  full_name: string | null
  avatar_url: string | null
}

interface MarketplaceSupplier {
  id: string
  profile_id: string
  business_name: string
  business_name_en: string | null
  description: string | null
  logo_url: string | null
  national_id: string | null
  commercial_registration: string | null
  tax_id: string | null
  kyc_status: KycStatus
  kyc_rejection_reason: string | null
  kyc_reviewed_at: string | null
  commission_rate: number | string
  rating: number | null
  reviews_count: number
  listings_count: number
  bookings_count: number
  total_revenue: number | string
  created_at: string
  profile: ProfileSummary | null
}

const STATUS_LABELS: Record<KycStatus, { label: string; color: string }> = {
  pending: { label: 'قيد المراجعة', color: 'bg-yellow-100 text-yellow-800' },
  approved: { label: 'موافق عليه', color: 'bg-green-100 text-green-800' },
  rejected: { label: 'مرفوض', color: 'bg-red-100 text-red-800' },
  suspended: { label: 'موقوف', color: 'bg-gray-100 text-gray-700' },
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('ar-EG', { day: 'numeric', month: 'short', year: 'numeric' })
  } catch { return iso }
}

type Stage = 'checking' | 'unauth' | 'not_admin' | 'ready' | 'error'

export default function AdminMarketplaceSuppliersPage() {
  const [stage, setStage] = useState<Stage>('checking')
  const [suppliers, setSuppliers] = useState<MarketplaceSupplier[]>([])
  const [loading, setLoading] = useState(false)
  const [filter, setFilter] = useState<'all' | KycStatus>('all')
  const [actioning, setActioning] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string>('')

  useEffect(() => {
    init()
  }, [])

  const init = async () => {
    try {
      const { data: { session } } = await supabaseBrowser.auth.getSession()
      if (!session?.user) {
        setStage('unauth')
        return
      }

      // @ts-expect-error
      const { data: profile, error: profileError } = await supabaseBrowser
        .from('profiles').select('role').eq('id', session.user.id).maybeSingle()

      if (profileError) {
        setErrorMsg(profileError.message)
        setStage('error')
        return
      }

      if (profile?.role !== 'admin') {
        setStage('not_admin')
        return
      }

      await fetchSuppliers()
      setStage('ready')
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : 'حصلت مشكلة')
      setStage('error')
    }
  }

  const fetchSuppliers = async () => {
    setLoading(true)
    try {
      // @ts-expect-error
      const { data, error } = await supabaseBrowser.rpc('get_marketplace_suppliers_admin')
      if (error) {
        const msg = (error.message || '').toLowerCase()
        if (msg.includes('forbidden')) { setStage('not_admin'); return }
        if (msg.includes('unauthenticated')) { setStage('unauth'); return }
        setErrorMsg(error.message)
        setStage('error')
        return
      }
      setSuppliers((data as MarketplaceSupplier[]) || [])
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : 'حصلت مشكلة')
    } finally {
      setLoading(false)
    }
  }

  const updateSupplier = async (
    id: string,
    kycStatus: KycStatus,
    rejectionReason?: string,
  ) => {
    setActioning(id)
    try {
      // @ts-expect-error
      const { error } = await supabaseBrowser.rpc('update_supplier_kyc_admin', {
        p_supplier_id: id,
        p_kyc_status: kycStatus,
        p_rejection_reason: rejectionReason || null,
      })
      if (error) {
        alert(`فشل: ${error.message}`)
        return
      }
      await fetchSuppliers()
    } finally {
      setActioning(null)
    }
  }

  const handleApprove = (id: string) => {
    if (!confirm('تأكيد الموافقة على المؤجر؟ هيقدر يضيف إعلانات ويستقبل حجوزات.')) return
    updateSupplier(id, 'approved')
  }

  const handleReject = (id: string) => {
    const reason = prompt('سبب الرفض (يبعت للمؤجر):')
    if (reason === null) return
    updateSupplier(id, 'rejected', reason || 'لم يتم استيفاء متطلبات التحقق')
  }

  const handleSuspend = (id: string) => {
    if (!confirm('إيقاف المؤجر؟ هتختفي إعلاناته من الموقع لحد ما ترجعه.')) return
    updateSupplier(id, 'suspended')
  }

  const filtered = filter === 'all' ? suppliers : suppliers.filter(s => s.kyc_status === filter)
  const counts = {
    all: suppliers.length,
    pending: suppliers.filter(s => s.kyc_status === 'pending').length,
    approved: suppliers.filter(s => s.kyc_status === 'approved').length,
    rejected: suppliers.filter(s => s.kyc_status === 'rejected').length,
    suspended: suppliers.filter(s => s.kyc_status === 'suspended').length,
  }

  // ============ STATES ============
  if (stage === 'checking') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAFAF7]" dir="rtl">
        <Loader2 className="w-6 h-6 text-[#1F5F3F] animate-spin" />
      </div>
    )
  }

  if (stage === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAFAF7] p-4" dir="rtl">
        <div className="max-w-sm w-full bg-white rounded-2xl border border-gray-100 p-8 shadow-sm text-center">
          <div className="w-12 h-12 bg-red-50 rounded-full mx-auto mb-4 flex items-center justify-center">
            <AlertCircle className="w-5 h-5 text-red-600" />
          </div>
          <h1 className="text-lg font-bold text-gray-900 mb-2">حصلت مشكلة</h1>
          <p className="text-sm text-gray-600 mb-4">{errorMsg}</p>
          <button
            onClick={() => { setStage('checking'); init() }}
            className="block w-full bg-[#1F5F3F] text-white py-3 rounded-xl font-bold"
          >
            حاول تاني
          </button>
        </div>
      </div>
    )
  }

  if (stage === 'unauth') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAFAF7] p-4" dir="rtl">
        <div className="max-w-sm w-full bg-white rounded-2xl border border-gray-100 p-8 shadow-sm text-center">
          <div className="w-12 h-12 bg-[#1F5F3F]/10 rounded-full mx-auto mb-4 flex items-center justify-center">
            <ShieldAlert className="w-5 h-5 text-[#1F5F3F]" />
          </div>
          <h1 className="text-lg font-bold text-gray-900 mb-2">لازم تسجل دخول الأول</h1>
          <p className="text-sm text-gray-600 mb-5">
            عشان توصل لإدارة المؤجرين، لازم تكون داخل بحساب أدمن.
          </p>
          <Link
            href={`/auth/login?redirect=${encodeURIComponent('/admin/marketplace-suppliers')}`}
            className="block w-full bg-[#1F5F3F] text-white py-3 rounded-xl font-bold"
          >
            دخول
          </Link>
        </div>
      </div>
    )
  }

  if (stage === 'not_admin') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAFAF7] p-4" dir="rtl">
        <div className="max-w-sm w-full bg-white rounded-2xl border border-gray-100 p-8 shadow-sm text-center">
          <div className="w-12 h-12 bg-red-50 rounded-full mx-auto mb-4 flex items-center justify-center">
            <ShieldAlert className="w-5 h-5 text-red-600" />
          </div>
          <h1 className="text-lg font-bold text-gray-900 mb-2">صفحة الأدمن بس</h1>
          <p className="text-sm text-gray-600">
            الحساب اللي إنت داخل بيه مش أدمن.
          </p>
        </div>
      </div>
    )
  }

  // ============ MAIN UI ============
  return (
    <div className="min-h-screen bg-[#FAFAF7]" dir="rtl">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/admin/dashboard" className="p-1 hover:bg-gray-50 rounded-full">
              <ArrowRight className="w-4 h-4 text-gray-600" />
            </Link>
            <div>
              <h1 className="text-lg font-bold text-gray-900">المؤجرين - أجر معانا</h1>
              <p className="text-xs text-gray-500 mt-0.5">{counts.all} مسجل</p>
            </div>
          </div>
          <button
            onClick={fetchSuppliers}
            disabled={loading}
            className="p-2 hover:bg-gray-50 rounded-full"
          >
            <RefreshCw className={`w-4 h-4 text-gray-600 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        <div className="max-w-4xl mx-auto px-4 pb-3 flex gap-2 overflow-x-auto">
          {(['all', 'pending', 'approved', 'rejected', 'suspended'] as const).map((f) => {
            const labels = {
              all: 'الكل', pending: 'قيد المراجعة', approved: 'موافق', rejected: 'مرفوض', suspended: 'موقوف',
            }
            return (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  filter === f ? 'bg-[#1F5F3F] text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {labels[f]} ({counts[f]})
              </button>
            )
          })}
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        {counts.pending > 0 && filter === 'all' && (
          <div className="mb-4 flex items-start gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-xl text-sm text-yellow-900">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>عندك <strong>{counts.pending} طلب</strong> قيد المراجعة</span>
          </div>
        )}

        {loading && suppliers.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <Loader2 className="w-5 h-5 mx-auto animate-spin mb-2" />
            بنحمّل البيانات...
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-gray-500">مفيش بيانات</div>
        ) : (
          <div className="space-y-3">
            {filtered.map((s) => {
              const statusInfo = STATUS_LABELS[s.kyc_status]
              const phone = s.profile?.phone || ''
              const phoneClean = phone.replace(/\D/g, '')
              return (
                <div key={s.id} className="bg-white rounded-xl border border-gray-100 p-5">
                  <div className="flex items-start gap-3 mb-3">
                    {s.logo_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={s.logo_url} alt={s.business_name} className="w-12 h-12 rounded-lg object-cover" />
                    ) : (
                      <div className="w-12 h-12 rounded-lg bg-[#1F5F3F]/10 flex items-center justify-center flex-shrink-0">
                        <Building2 className="w-5 h-5 text-[#1F5F3F]" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-gray-900 mb-0.5 truncate">{s.business_name}</h3>
                      {s.business_name_en && (
                        <p className="text-xs text-gray-400 truncate" dir="ltr">{s.business_name_en}</p>
                      )}
                      {s.profile?.full_name && (
                        <p className="text-xs text-gray-500 mt-0.5">{s.profile.full_name}</p>
                      )}
                    </div>
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium flex-shrink-0 ${statusInfo.color}`}>
                      {statusInfo.label}
                    </span>
                  </div>

                  {s.description && (
                    <p className="text-sm text-gray-700 mb-3">{s.description}</p>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm mb-3">
                    {phone && (
                      <a
                        href={`https://wa.me/${phoneClean}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-gray-700 hover:text-[#1F5F3F]"
                      >
                        <Phone className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                        <span dir="ltr">{phone}</span>
                      </a>
                    )}
                    {s.profile?.email && (
                      <a
                        href={`mailto:${s.profile.email}`}
                        className="flex items-center gap-2 text-gray-700 hover:text-[#1F5F3F]"
                      >
                        <Mail className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                        <span className="truncate">{s.profile.email}</span>
                      </a>
                    )}
                  </div>

                  {(s.national_id || s.commercial_registration || s.tax_id) && (
                    <div className="text-xs bg-gray-50 rounded-lg p-3 mb-3 space-y-1.5">
                      {s.national_id && (
                        <div className="flex items-center gap-2 text-gray-700">
                          <IdCard className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                          <span>بطاقة: <span dir="ltr">{s.national_id}</span></span>
                        </div>
                      )}
                      {s.commercial_registration && (
                        <div className="flex items-center gap-2 text-gray-700">
                          <FileText className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                          <span>سجل تجاري: <span dir="ltr">{s.commercial_registration}</span></span>
                        </div>
                      )}
                      {s.tax_id && (
                        <div className="flex items-center gap-2 text-gray-700">
                          <Tag className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                          <span>رقم ضريبي: <span dir="ltr">{s.tax_id}</span></span>
                        </div>
                      )}
                    </div>
                  )}

                  {s.kyc_rejection_reason && s.kyc_status === 'rejected' && (
                    <div className="text-xs text-red-700 bg-red-50 rounded-lg p-2 mb-3">
                      <strong>سبب الرفض:</strong> {s.kyc_rejection_reason}
                    </div>
                  )}

                  {s.kyc_status === 'approved' && (
                    <div className="grid grid-cols-3 gap-2 text-xs bg-green-50 rounded-lg p-3 mb-3">
                      <div>
                        <p className="text-gray-500">listings</p>
                        <p className="font-bold text-gray-900">{s.listings_count}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">حجوزات</p>
                        <p className="font-bold text-gray-900">{s.bookings_count}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">عمولة</p>
                        <p className="font-bold text-gray-900">{Number(s.commission_rate)}%</p>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                    <span className="text-xs text-gray-400 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatDate(s.created_at)}
                    </span>
                    <div className="flex gap-2">
                      {s.kyc_status === 'pending' && (
                        <>
                          <button
                            onClick={() => handleApprove(s.id)}
                            disabled={actioning === s.id}
                            className="px-3 py-1.5 bg-green-50 text-green-800 rounded-lg text-xs font-medium hover:bg-green-100 disabled:opacity-50 flex items-center gap-1"
                          >
                            <CheckCircle className="w-3 h-3" /> موافقة
                          </button>
                          <button
                            onClick={() => handleReject(s.id)}
                            disabled={actioning === s.id}
                            className="px-3 py-1.5 bg-red-50 text-red-800 rounded-lg text-xs font-medium hover:bg-red-100 disabled:opacity-50 flex items-center gap-1"
                          >
                            <XCircle className="w-3 h-3" /> رفض
                          </button>
                        </>
                      )}
                      {s.kyc_status === 'approved' && (
                        <button
                          onClick={() => handleSuspend(s.id)}
                          disabled={actioning === s.id}
                          className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-xs font-medium hover:bg-gray-200 disabled:opacity-50"
                        >
                          إيقاف
                        </button>
                      )}
                      {(s.kyc_status === 'rejected' || s.kyc_status === 'suspended') && (
                        <button
                          onClick={() => handleApprove(s.id)}
                          disabled={actioning === s.id}
                          className="px-3 py-1.5 bg-green-50 text-green-800 rounded-lg text-xs font-medium hover:bg-green-100 disabled:opacity-50"
                        >
                          إعادة تفعيل
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
