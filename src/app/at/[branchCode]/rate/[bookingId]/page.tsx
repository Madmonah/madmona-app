'use client'

import { useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import { Star, Loader2, Check, Heart } from 'lucide-react'
// 🔴 rpcSafe: نفس السلوك، بس الخطأ مبيعدّيش في صمت (13 Jul 2026)
import { rpcSafe } from '@/lib/rpc'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function RatePage({
  params,
}: {
  params: { branchCode: string; bookingId: string }
}) {
  const { bookingId } = params
  const [rating, setRating] = useState(0)
  const [hover, setHover] = useState(0)
  const [comment, setComment] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)

  async function submit() {
    if (rating === 0) return
    setSubmitting(true)
    await rpcSafe(supabase, 'customer_rate_service', {
      p_booking_id: bookingId,
      p_rating: rating,
      p_comment: comment.trim() || null,
    })
    setDone(true)
    setSubmitting(false)
  }

  if (done) {
    return (
      <div className="min-h-screen bg-[#FAFAF7] flex items-center justify-center p-4" dir="rtl">
        <div className="bg-white rounded-3xl p-8 text-center max-w-sm">
          <div className="inline-grid place-items-center w-16 h-16 rounded-2xl bg-[#1F6F5F]/10 text-[#1F6F5F] mb-4">
            <Heart className="w-8 h-8 fill-[#1F6F5F]" />
          </div>
          <h1 className="text-2xl font-black text-[#1A2E26] mb-2">شكراً ليكي ❤️</h1>
          <p className="text-sm text-[#6B7280] leading-relaxed">
            تقييمك وصل لـ Madmona وصاحب المكان. تقييماتكم بـ تساعدنا نطور الخدمة.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#FAFAF7] flex items-center justify-center p-4" dir="rtl">
      <div className="bg-white rounded-3xl p-6 md:p-8 max-w-md w-full">
        <div className="text-center mb-6">
          <p className="text-[10px] font-bold tracking-[0.3em] uppercase text-[#1F6F5F] mb-1">
            تقييم الخدمة
          </p>
          <h1 className="text-2xl font-black text-[#1A2E26]">إيه رأيك في تجربتك؟</h1>
          <p className="text-sm text-[#6B7280] mt-2">قيّمي من ١ لـ ٥ نجوم</p>
        </div>

        {/* Stars */}
        <div className="flex items-center justify-center gap-2 mb-6">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              onClick={() => setRating(n)}
              onMouseEnter={() => setHover(n)}
              onMouseLeave={() => setHover(0)}
              className="transition-transform active:scale-90 hover:scale-110"
            >
              <Star
                className={`w-12 h-12 transition-colors ${
                  n <= (hover || rating) ? 'text-amber-400 fill-amber-400' : 'text-gray-200'
                }`}
              />
            </button>
          ))}
        </div>

        {/* Rating label */}
        {rating > 0 && (
          <p className="text-center text-sm font-bold text-[#1A2E26] mb-4">
            {rating === 5 ? '⭐ ممتاز!' :
             rating === 4 ? '👍 كويس جداً' :
             rating === 3 ? '😊 كويس' :
             rating === 2 ? '😕 متوسط' :
             '😞 محتاج تحسين'}
          </p>
        )}

        {/* Comment */}
        <div className="mb-6">
          <label className="text-xs font-bold text-[#1A2E26] mb-1.5 block">
            تعليق (اختياري)
          </label>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="شاركينا تجربتك..."
            rows={3}
            className="w-full px-4 py-3 rounded-xl bg-[#FAFAF7] border border-gray-200 text-[#1A2E26] focus:outline-none focus:border-[#1F6F5F] resize-none text-sm"
          />
        </div>

        <button
          onClick={submit}
          disabled={rating === 0 || submitting}
          className="w-full bg-[#1F6F5F] text-white rounded-xl px-5 py-3.5 font-black disabled:opacity-50 hover:shadow-md transition-shadow flex items-center justify-center gap-2"
        >
          {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : (
            <>
              <Check className="w-5 h-5" />
              إرسال التقييم
            </>
          )}
        </button>

        <p className="text-[11px] text-[#6B7280] text-center mt-3">
          تقييمك يظهر لـ Madmona وصاحب المكان
        </p>
      </div>
    </div>
  )
}
