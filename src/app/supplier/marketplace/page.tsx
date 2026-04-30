'use client'

import { Suspense, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabaseBrowser } from '@/lib/supabase-browser'
import {
  Plus, Building2, Edit2, Trash2, Eye, EyeOff, AlertCircle,
  Loader2, ArrowRight, CheckCircle, Clock, Lock, MapPin,
  Image as ImageIcon, ExternalLink,
} from 'lucide-react'

// ============================================================================
// /supplier/marketplace
// Marketplace dashboard for approved suppliers.
// ============================================================================

type Stage = 'loading' | 'unauthenticated' | 'no-supplier' | 'pending' | 'rejected' | 'ready'

interface SupplierState {
  id: string
  business_name: string
  kyc_status: 'pending' | 'approved' | 'rejected' | 'suspended'
  kyc_rejection_reason: string | null
}

interface ListingSummary {
  id: string
  title_ar: string
  slug: string
  city: string | null
  district: string | null
  starting_price: number | string
  status: string
  bookings_count: number
  view_count: number
  created_at: string
  category: { name_ar: string; icon: string | null } | null
  photos: { photo_url: string; is_primary: boolean }[] | null
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  draft: { label: 'مسودة', color: 'bg-gray-100 text-gray-700' },
  pending_review: { label: 'قيد المراجعة', color: 'bg-yellow-100 text-yellow-800' },
  published: { label: 'منشور', color: 'bg-green-100 text-green-800' },
  paused: { label: 'موقوف', color: 'bg-orange-100 text-orange-800' },
  rejected: { label: 'مرفوض', color: 'bg-red-100 text-red-800' },
  archived: { label: 'مؤرشف', color: 'bg-gray-100 text-gray-500' },
}

function SupplierMarketplaceContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const justCreated = searchParams.get('success') === '1'

  const [stage, setStage] = useState<Stage>('loading')
  const [supplier, setSupplier] = useState<SupplierState | null>(null)
  const [listings, setListings] = useState<ListingSummary[]>([])
  const [loadingListings, setLoadingListings] = useState(false)
  const [actioningId, setActioningId] = useState<string | null>(null)

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabaseBrowser.auth.getSession()
      if (!session?.user) {
        setStage('unauthenticated')
        return
      }

      // @ts-expect-error new schema
      const { data: sup } = await supabaseBrowser
        .from('marketplace_suppliers')
        .select('id, business_name, kyc_status, kyc_rejection_reason')
        .eq('profile_id', session.user.id)
        .maybeSingle()

      if (!sup) {
        setStage('no-supplier')
        return
      }

      setSupplier(sup as SupplierState)

      if (sup.kyc_status === 'pending') {
        setStage('pending')
      } else if (sup.kyc_status === 'rejected' || sup.kyc_status === 'suspended') {
        setStage('rejected')
      } else {
        setStage('ready')
        loadListings(sup.id)
      }
    }
    init()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const loadListings = async (supId: string) => {
    setLoadingListings(true)
    // @ts-expect-error
    const { data } = await supabaseBrowser
      .from('listings')
      .select(`
        id, title_ar, slug, city, district, starting_price, status,
        bookings_count, view_count, created_at,
        category:categories(name_ar, icon),
        photos:listing_photos(photo_url, is_primary)
      `)
      .eq('supplier_id', supId)
      .order('created_at', { ascending: false })

    setListings((data || []) as ListingSummary[])
    setLoadingListings(false)
  }

  const togglePublished = async (listing: ListingSummary) => {
    const newStatus = listing.status === 'published' ? 'paused' : 'published'
    setActioningId(listing.id)
    // @ts-expect-error
    const { error } = await supabaseBrowser
      .from('listings')
      .update({ status: newStatus })
      .eq('id', listing.id)
    if (!error && supplier) await loadListings(supplier.id)
    setActioningId(null)
  }

  const deleteListing = async (listing: ListingSummary) => {
    if (!confirm(`متأكد إنك عاوز تمسح "${listing.title_ar}"؟ مينفعش تتراجع.`)) return
    setActioningId(listing.id)
    // @ts-expect-error
    const { error } = await supabaseBrowser
      .from('listings')
      .delete()
      .eq('id', listing.id)
    if (!error && supplier) await loadListings(supplier.id)
    setActioningId(null)
  }

  // ----- Stage rendering -----

  if (stage === 'loading') {
    return (
      <div className="min-h-screen bg-[#FAFAF7] flex items-center justify-center" dir="rtl">
        <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
      </div>
    )
  }

  if (stage === 'unauthenticated') {
    return (
      <div className="min-h-screen bg-[#FAFAF7] flex items-center justify-center p-4" dir="rtl">
        <div className="w-full max-w-sm bg-white rounded-2xl border border-gray-100 p-8 shadow-sm text-center">
          <Lock className="w-8 h-8 text-[#1F5F3F] mx-auto mb-3" />
          <h1 className="text-xl font-bold mb-2">سجّل دخول الأول</h1>
          <p className="text-sm text-gray-500 mb-6">عشان توصل لـmarketplace dashboard، لازم تسجل دخول.</p>
          <Link
            href={`/login?redirect=${encodeURIComponent('/supplier/marketplace')}`}
            className="block w-full bg-[#1F5F3F] text-white py-3 rounded-xl font-semibold hover:bg-[#1F5F3F]/90"
          >
            تسجيل دخول
          </Link>
        </div>
      </div>
    )
  }

  if (stage === 'no-supplier') {
    return (
      <div className="min-h-screen bg-[#FAFAF7] flex items-center justify-center p-4" dir="rtl">
        <div className="w-full max-w-md bg-white rounded-2xl border border-gray-100 p-8 shadow-sm text-center">
          <Building2 className="w-12 h-12 text-[#1F5F3F] mx-auto mb-4" />
          <h1 className="text-xl font-bold mb-2">سجّل كمورد على Madmona</h1>
          <p className="text-sm text-gray-600 mb-6">
            عشان تقدر تضيف listings وتستقبل حجوزات، لازم تسجّل نفسك كمورد الأول.
          </p>
          <Link
            href="/supplier/register"
            className="block w-full bg-[#1F5F3F] text-white py-3 rounded-xl font-semibold hover:bg-[#1F5F3F]/90"
          >
            ابدأ التسجيل
          </Link>
        </div>
      </div>
    )
  }

  if (stage === 'pending' && supplier) {
    return (
      <div className="min-h-screen bg-[#FAFAF7] p-4" dir="rtl">
        <div className="max-w-md mx-auto pt-12">
          <div className="bg-white rounded-2xl border border-gray-100 p-8 shadow-sm text-center">
            <Clock className="w-12 h-12 text-yellow-600 mx-auto mb-4" />
            <h1 className="text-xl font-bold mb-2">طلبك قيد المراجعة</h1>
            <p className="text-sm text-gray-600 mb-2">
              <strong>{supplier.business_name}</strong>
            </p>
            <p className="text-sm text-gray-600 mb-6">
              لما الإدارة توافق على حسابك، هتقدر تبدأ تضيف listings.
            </p>
            <Link href="/" className="text-sm text-[#1F5F3F] hover:underline">
              ارجع للرئيسية
            </Link>
          </div>
        </div>
      </div>
    )
  }

  if (stage === 'rejected' && supplier) {
    return (
      <div className="min-h-screen bg-[#FAFAF7] p-4" dir="rtl">
        <div className="max-w-md mx-auto pt-12">
          <div className="bg-white rounded-2xl border border-gray-100 p-8 shadow-sm text-center">
            <AlertCircle className="w-12 h-12 text-red-600 mx-auto mb-4" />
            <h1 className="text-xl font-bold mb-2">
              {supplier.kyc_status === 'rejected' ? 'الطلب مرفوض' : 'الحساب موقوف'}
            </h1>
            {supplier.kyc_rejection_reason && (
              <p className="text-sm text-gray-700 bg-red-50 rounded-lg p-3 mb-4">
                {supplier.kyc_rejection_reason}
              </p>
            )}
            <p className="text-sm text-gray-600">للتواصل مع الإدارة:</p>
            <a
              href="https://wa.me/201002229982"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-[#1F5F3F] hover:underline"
            >
              واتساب +20 100 222 9982
            </a>
          </div>
        </div>
      </div>
    )
  }

  // ============== Approved supplier view ==============

  return (
    <div className="min-h-screen bg-[#FAFAF7]" dir="rtl">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="p-1 hover:bg-gray-50 rounded-full">
              <ArrowRight className="w-4 h-4 text-gray-600" />
            </Link>
            <div>
              <h1 className="text-lg font-bold text-gray-900">{supplier?.business_name}</h1>
              <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
                <CheckCircle className="w-3 h-3 text-green-600" /> مورد موثّق
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        {justCreated && (
          <div className="mb-4 flex items-start gap-2 p-3 bg-green-50 border border-green-200 rounded-xl text-sm text-green-900">
            <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>تم حفظ الـlisting بنجاح!</span>
          </div>
        )}

        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-gray-900">
            Listings بتاعتك ({listings.length})
          </h2>
          <Link
            href="/supplier/marketplace/new"
            className="flex items-center gap-1 px-4 py-2 bg-[#1F5F3F] text-white rounded-lg text-sm font-semibold hover:bg-[#1F5F3F]/90"
          >
            <Plus className="w-4 h-4" /> ضيف listing جديد
          </Link>
        </div>

        {loadingListings ? (
          <div className="text-center py-12"><Loader2 className="w-6 h-6 text-gray-400 animate-spin mx-auto" /></div>
        ) : listings.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
            <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-gray-700 mb-1">مفيش listings لسه</h3>
            <p className="text-sm text-gray-500 mb-6">ابدأ بإضافة أول listing عشان تستقبل حجوزات</p>
            <Link
              href="/supplier/marketplace/new"
              className="inline-flex items-center gap-1 px-5 py-2.5 bg-[#1F5F3F] text-white rounded-lg text-sm font-semibold hover:bg-[#1F5F3F]/90"
            >
              <Plus className="w-4 h-4" /> ضيف أول listing
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {listings.map(listing => {
              const status = STATUS_LABELS[listing.status] || STATUS_LABELS.draft
              const photos = listing.photos || []
              const primary = photos.find(p => p.is_primary) || photos[0]
              const photoUrl = primary?.photo_url

              return (
                <div key={listing.id} className="bg-white rounded-xl border border-gray-100 overflow-hidden flex flex-col sm:flex-row">
                  <div className="sm:w-40 sm:h-32 bg-gray-100 flex-shrink-0">
                    {photoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={photoUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ImageIcon className="w-8 h-8 text-gray-300" />
                      </div>
                    )}
                  </div>

                  <div className="flex-1 p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          {listing.category && (
                            <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-700 rounded-full flex items-center gap-1">
                              {listing.category.icon} {listing.category.name_ar}
                            </span>
                          )}
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${status.color}`}>
                            {status.label}
                          </span>
                        </div>
                        <h3 className="font-bold text-gray-900 mt-1 truncate">{listing.title_ar}</h3>
                        {(listing.district || listing.city) && (
                          <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {[listing.district, listing.city].filter(Boolean).join(', ')}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
                      <div className="text-sm text-gray-700">
                        <span className="font-bold">{Number(listing.starting_price).toLocaleString('ar-EG')}</span>
                        <span className="text-xs text-gray-500"> ج.م</span>
                      </div>

                      <div className="flex gap-1">
                        {listing.status === 'published' && (
                          <Link
                            href={`/marketplace/${listing.slug}`}
                            target="_blank"
                            className="p-1.5 text-gray-600 hover:bg-gray-50 rounded"
                            title="عرض الصفحة"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </Link>
                        )}
                        <button
                          onClick={() => togglePublished(listing)}
                          disabled={actioningId === listing.id}
                          className="p-1.5 text-gray-600 hover:bg-gray-50 rounded disabled:opacity-50"
                          title={listing.status === 'published' ? 'إيقاف النشر' : 'نشر'}
                        >
                          {listing.status === 'published'
                            ? <EyeOff className="w-3.5 h-3.5" />
                            : <Eye className="w-3.5 h-3.5" />
                          }
                        </button>
                        <Link
                          href={`/supplier/marketplace/${listing.id}/edit`}
                          className="p-1.5 text-[#1F5F3F] hover:bg-[#1F5F3F]/10 rounded"
                          title="تعديل"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </Link>
                        <button
                          onClick={() => deleteListing(listing)}
                          disabled={actioningId === listing.id}
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded disabled:opacity-50"
                          title="حذف"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
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

// Force dynamic rendering (page depends on session + searchParams)
export const dynamic = 'force-dynamic'

export default function SupplierMarketplacePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#FAFAF7] flex items-center justify-center" dir="rtl">
        <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
      </div>
    }>
      <SupplierMarketplaceContent />
    </Suspense>
  )
}
