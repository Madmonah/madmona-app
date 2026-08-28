'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabaseBrowser } from '@/lib/supabase-browser'
import {
  Star, Loader2, ArrowRight, Lock, AlertCircle, MessageSquare,
  Edit2, Check, X, Building2, User, ImageIcon, Users,
} from 'lucide-react'

// ============================================================================
// /supplier/marketplace/reviews
// Allows owner + staff with can_respond_reviews. Staff without permission
// to respond can still view (if can_view) but the response button is hidden.
// ============================================================================

type Stage = 'loading' | 'unauthenticated' | 'no-supplier' | 'no-permission' | 'ready'

interface Review {
  id: string
  rating: number
  comment: string | null
  supplier_response: string | null
  supplier_responded_at: string | null
  created_at: string
  customer: { full_name: string | null } | null
  listing: {
    id: string
    title: string
    slug: string
    photos: { url: string; is_primary: boolean }[] | null
  } | null
}

export default function SupplierReviewsPage() {
  const [stage, setStage] = useState<Stage>('loading')
  const [reviews, setReviews] = useState<Review[]>([])
  const [supplierName, setSupplierName] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [responseText, setResponseText] = useState('')
  const [saving, setSaving] = useState(false)
  const [filter, setFilter] = useState<'all' | 'unanswered' | 'answered'>('all')
  const [canRespond, setCanRespond] = useState(true)
  const [isStaff, setIsStaff] = useState(false)
  const [roleLabel, setRoleLabel] = useState<string | null>(null)

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabaseBrowser.auth.getSession()
      if (!session?.user) {
        setStage('unauthenticated')
        return
      }

      // Owner check
      let { data: sup } = await supabaseBrowser
        .from('marketplace_suppliers')
        .select('id, business_name')
        .eq('profile_id', session.user.id)
        .maybeSingle()

      // Staff fallback
      if (!sup) {
        const { data: staff } = await supabaseBrowser
          .from('supplier_staff')
          .select(`
            role_label, can_respond_reviews,
            supplier:marketplace_suppliers(id, business_name)
          `)
          .eq('profile_id', session.user.id)
          .eq('is_active', true)
          .eq('can_view', true)
          .maybeSingle()

        if (staff && staff.supplier) {
          sup = staff.supplier as unknown as typeof sup
          setIsStaff(true)
          setRoleLabel(staff.role_label)
          setCanRespond(!!staff.can_respond_reviews)
        }
      }

      if (!sup) {
        setStage('no-supplier')
        return
      }
      setSupplierName(sup.business_name)

      const { data } = await supabaseBrowser
        .from('reviews')
        .select(`
          id, rating, comment, supplier_response, supplier_responded_at, created_at,
          customer:profiles!reviews_customer_id_fkey(full_name),
          listing:listings(id, title, slug, photos:listing_photos(url, is_primary))
        `)
        .eq('supplier_id', sup.id)
        .eq('is_published', true)
        .order('created_at', { ascending: false })

      setReviews((data || []) as Review[])
      setStage('ready')
    }
    init()
  }, [])

  const startEditing = (review: Review) => {
    if (!canRespond) {
      alert('مفيش صلاحية للرد على التقييمات')
      return
    }
    setEditingId(review.id)
    setResponseText(review.supplier_response || '')
  }

  const cancelEditing = () => {
    setEditingId(null)
    setResponseText('')
  }

  const saveResponse = async (reviewId: string) => {
    const trimmed = responseText.trim()
    if (!trimmed) {
      alert('اكتب ردك الأول')
      return
    }
    if (trimmed.length > 1000) {
      alert('الرد طويل جداً (الحد الأقصى 1000 حرف)')
      return
    }
    setSaving(true)
    const { error } = await supabaseBrowser
      .from('reviews')
      .update({
        supplier_response: trimmed,
        supplier_responded_at: new Date().toISOString(),
      })
      .eq('id', reviewId)

    if (error) {
      alert('فشل حفظ الرد: ' + error.message)
      setSaving(false)
      return
    }

    setReviews(prev => prev.map(r =>
      r.id === reviewId
        ? { ...r, supplier_response: trimmed, supplier_responded_at: new Date().toISOString() }
        : r
    ))
    setEditingId(null)
    setResponseText('')
    setSaving(false)
  }

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
        <div className="bg-white rounded-2xl border p-8 text-center max-w-sm">
          <Lock className="w-8 h-8 text-[#059669] mx-auto mb-3" />
          <h1 className="font-bold mb-4">سجّل دخول الأول</h1>
          <Link
            href="/auth/login?redirect=/supplier/marketplace/reviews"
            className="block bg-[#34D399] text-[#04352A] py-3 rounded-xl font-semibold"
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
        <div className="bg-white rounded-2xl border p-8 text-center max-w-sm">
          <AlertCircle className="w-8 h-8 text-yellow-600 mx-auto mb-3" />
          <h1 className="font-bold mb-2">مش مسجّل كأجر معانا</h1>
          <Link href="/supplier/register" className="inline-block bg-[#34D399] text-[#04352A] px-5 py-2.5 rounded-xl font-semibold mt-4">
            سجّل كأجر معانا
          </Link>
        </div>
      </div>
    )
  }

  const filtered = filter === 'all'
    ? reviews
    : filter === 'unanswered'
    ? reviews.filter(r => !r.supplier_response)
    : reviews.filter(r => r.supplier_response)

  const unansweredCount = reviews.filter(r => !r.supplier_response).length
  const avgRating = reviews.length > 0
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
    : 0

  return (
    <div className="min-h-screen bg-[#FAFAF7]" dir="rtl">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-40">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3 mb-3">
            <Link href="/supplier/marketplace" className="p-1 hover:bg-gray-50 rounded-full">
              <ArrowRight className="w-5 h-5 text-gray-700" />
            </Link>
            <div className="flex-1">
              <h1 className="text-lg font-bold text-gray-900">التقييمات</h1>
              <p className="text-xs text-gray-500 flex items-center gap-2">
                <span>{reviews.length} تقييم</span>
                {avgRating > 0 && (
                  <>
                    <span>·</span>
                    <span className="flex items-center gap-1">
                      <Star className="w-3 h-3 fill-[#2FA084] text-[#2FA084]" />
                      <strong className="text-gray-700">{avgRating.toFixed(1)}</strong>
                    </span>
                  </>
                )}
              </p>
            </div>
          </div>

          {isStaff && (
            <div className="mb-3 p-2 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-900 flex items-center gap-2">
              <Users className="w-3.5 h-3.5" />
              <span>إنت بتشوف بصفتك &ldquo;{roleLabel || 'موظف'}&rdquo;
                {!canRespond && ' — مفيش صلاحية للرد'}</span>
            </div>
          )}

          <div className="flex gap-2">
            <button
              onClick={() => setFilter('all')}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                filter === 'all'
                  ? 'bg-[#34D399] text-[#04352A]'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              الكل ({reviews.length})
            </button>
            <button
              onClick={() => setFilter('unanswered')}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors flex items-center gap-1 ${
                filter === 'unanswered'
                  ? 'bg-[#34D399] text-[#04352A]'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              بدون رد
              {unansweredCount > 0 && (
                <span className={`rounded-full px-1.5 text-[10px] font-bold ${
                  filter === 'unanswered' ? 'bg-white text-[#059669]' : 'bg-yellow-400 text-gray-900'
                }`}>
                  {unansweredCount}
                </span>
              )}
            </button>
            <button
              onClick={() => setFilter('answered')}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                filter === 'answered'
                  ? 'bg-[#34D399] text-[#04352A]'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              تم الرد
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6">
        {filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
            <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-gray-700 mb-1">
              {filter === 'all'
                ? 'مفيش تقييمات لسه'
                : filter === 'unanswered'
                ? 'كل التقييمات تم الرد عليها 👏'
                : 'مفيش ردود لسه'}
            </h3>
            <p className="text-sm text-gray-500">
              {filter === 'all'
                ? 'لما اللي بيأجروا مننا يقيّموا حجوزاتهم، هتلاقيها هنا.'
                : 'الرد على التقييمات بيخليك تبان أكتر احترافية.'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(review => {
              const photos = review.listing?.photos || []
              const primary = photos.find(p => p.is_primary) || photos[0]
              const photoUrl = primary?.url
              const isEditing = editingId === review.id
              const hasResponse = !!review.supplier_response

              return (
                <div key={review.id} className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                  {review.listing && (
                    <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 border-b border-gray-100">
                      <div className="w-8 h-8 bg-gray-100 rounded-md flex-shrink-0 overflow-hidden">
                        {photoUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={photoUrl} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <ImageIcon className="w-4 h-4 text-gray-300" />
                          </div>
                        )}
                      </div>
                      <Link
                        href={`/marketplace/${review.listing.slug}`}
                        target="_blank"
                        className="flex-1 text-xs font-medium text-gray-700 hover:text-[#059669] truncate"
                      >
                        {review.listing.title}
                      </Link>
                    </div>
                  )}

                  <div className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-blue-50 rounded-full flex items-center justify-center flex-shrink-0">
                          <User className="w-4 h-4 text-blue-600" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {review.customer?.full_name || 'أجر مننا'}
                          </p>
                          <p className="text-[10px] text-gray-400">
                            {new Date(review.created_at).toLocaleDateString('ar-EG', {
                              day: 'numeric', month: 'short', year: 'numeric',
                            })}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-0.5">
                        {[1, 2, 3, 4, 5].map(s => (
                          <Star
                            key={s}
                            className={`w-3.5 h-3.5 ${s <= review.rating ? 'fill-[#2FA084] text-[#2FA084]' : 'text-gray-200'}`}
                          />
                        ))}
                      </div>
                    </div>

                    {review.comment && (
                      <p className="text-sm text-gray-700 mb-3 leading-relaxed pr-10">
                        {review.comment}
                      </p>
                    )}

                    {isEditing ? (
                      <div className="bg-[#34D399]/5 border border-[#059669]/20 rounded-xl p-3 mt-3">
                        <div className="flex items-center gap-2 mb-2">
                          <Building2 className="w-3.5 h-3.5 text-[#059669]" />
                          <span className="text-xs font-semibold text-[#059669]">ردك كـ{supplierName}</span>
                        </div>
                        <textarea
                          value={responseText}
                          onChange={(e) => setResponseText(e.target.value)}
                          placeholder="اكتب ردك على التقييم ده..."
                          maxLength={1000}
                          rows={3}
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#059669]/30 focus:border-[#059669] resize-y"
                          autoFocus
                        />
                        <div className="flex items-center justify-between mt-2">
                          <p className="text-[10px] text-gray-400">{responseText.length}/1000</p>
                          <div className="flex gap-2">
                            <button
                              onClick={cancelEditing}
                              disabled={saving}
                              className="flex items-center gap-1 px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-xs font-medium hover:bg-gray-200 disabled:opacity-50"
                            >
                              <X className="w-3 h-3" />
                              إلغاء
                            </button>
                            <button
                              onClick={() => saveResponse(review.id)}
                              disabled={saving || !responseText.trim()}
                              className="flex items-center gap-1 px-3 py-1.5 bg-[#34D399] text-[#04352A] rounded-lg text-xs font-semibold hover:bg-[#34D399]/90 disabled:opacity-50"
                            >
                              {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                              {saving ? 'جاري الحفظ...' : 'حفظ الرد'}
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : hasResponse ? (
                      <div className="bg-[#34D399]/5 border border-[#059669]/20 rounded-xl p-3 mt-3">
                        <div className="flex items-start justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <Building2 className="w-3.5 h-3.5 text-[#059669]" />
                            <span className="text-xs font-semibold text-[#059669]">رد {supplierName}</span>
                          </div>
                          {canRespond && (
                            <button
                              onClick={() => startEditing(review)}
                              className="text-[10px] text-gray-500 hover:text-[#059669] flex items-center gap-1"
                            >
                              <Edit2 className="w-3 h-3" />
                              تعديل
                            </button>
                          )}
                        </div>
                        <p className="text-sm text-gray-700 leading-relaxed">{review.supplier_response}</p>
                        {review.supplier_responded_at && (
                          <p className="text-[10px] text-gray-400 mt-1.5">
                            {new Date(review.supplier_responded_at).toLocaleDateString('ar-EG', {
                              day: 'numeric', month: 'short', year: 'numeric',
                            })}
                          </p>
                        )}
                      </div>
                    ) : canRespond ? (
                      <button
                        onClick={() => startEditing(review)}
                        className="mt-3 flex items-center gap-1.5 text-xs font-medium text-[#059669] hover:bg-[#34D399]/5 px-3 py-2 rounded-lg border border-[#059669]/20 hover:border-[#059669]/40"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        اكتب رد
                      </button>
                    ) : null}
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
