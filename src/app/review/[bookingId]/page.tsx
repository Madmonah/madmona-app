'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import { Loader2, Star, CheckCircle2, Scissors, MapPin, Heart } from 'lucide-react'

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

export default function ReviewPage({ params }: { params: { bookingId: string } }) {
  const { bookingId } = params
  const [booking, setBooking] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [rating, setRating] = useState(0)
  const [hoverRating, setHoverRating] = useState(0)
  const [stylistRating, setStylistRating] = useState(0)
  const [comment, setComment] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [alreadyReviewed, setAlreadyReviewed] = useState(false)

  async function load() {
    setLoading(true)
    // @ts-expect-error
    const { data } = await supabase.rpc('public_get_booking_for_review', { p_booking_id: bookingId })
    setBooking(data)
    setLoading(false)
  }

  useEffect(() => { load() /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [bookingId])

  async function submit() {
    if (rating === 0) return
    setSubmitting(true)
    // @ts-expect-error
    const { data, error } = await supabase.rpc('public_submit_review', {
      p_booking_id: bookingId,
      p_rating: rating,
      p_comment: comment || null,
      p_stylist_rating: stylistRating || null,
    })
    if (error) {
      alert('خطأ: ' + error.message)
    } else if (data?.already_reviewed) {
      setAlreadyReviewed(true)
    } else if (data?.success) {
      setDone(true)
    }
    setSubmitting(false)
  }

  if (loading) return <Loader />

  if (!booking || booking.error) {
    return (
      <div className="min-h-screen bg-[#FAFAF7] flex items-center justify-center p-4" dir="rtl">
        <div className="text-center"><Scissors className="w-12 h-12 text-[#6B7280] opacity-30 mx-auto mb-2" /><p className="text-[#1A2E26] font-bold">الحجز مش موجود</p></div>
      </div>
    )
  }

  if (alreadyReviewed) {
    return (
      <div className="min-h-screen bg-[#FAFAF7] flex items-center justify-center p-4" dir="rtl">
        <div className="bg-white rounded-3xl border border-gray-100 p-8 max-w-md text-center">
          <CheckCircle2 className="w-16 h-16 text-[#1F6F5F] mx-auto mb-3" />
          <h2 className="text-xl font-black text-[#1A2E26]">تم التقييم قبل كده</h2>
          <p className="text-sm text-[#6B7280] mt-2">شكراً لتقييمك! استلمنا رأيك بالفعل.</p>
        </div>
      </div>
    )
  }

  if (done) {
    return (
      <div className="min-h-screen bg-[#FAFAF7] flex items-center justify-center p-4" dir="rtl">
        <div className="bg-white rounded-3xl border border-gray-100 p-8 max-w-md text-center">
          <div className="w-20 h-20 rounded-full bg-[#1F6F5F] grid place-items-center mx-auto mb-4">
            <Heart className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-2xl font-black text-[#1A2E26]">شكراً لتقييمك! 💚</h2>
          <p className="text-sm text-[#6B7280] mt-2">رأيك بيساعدنا نطور خدماتنا. نتشرف بزيارتك مرة تانية في {booking.business_name}.</p>
          {rating >= 4 && (
            <a href="https://maps.google.com" target="_blank" rel="noopener" className="inline-block mt-4 px-5 py-2.5 rounded-xl bg-[#1F6F5F] text-white text-sm font-bold">
              قيّمنا على Google كمان ⭐
            </a>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#FAFAF7]" dir="rtl">
      <header className="bg-[#1F6F5F] text-white">
        <div className="max-w-lg mx-auto px-4 py-6 text-center">
          <p className="text-[10px] font-bold tracking-[0.3em] uppercase text-white/80 mb-1">CUSTOMER FEEDBACK</p>
          <h1 className="text-2xl font-black">{booking.business_name}</h1>
          <p className="text-sm text-white/90 mt-1 flex items-center justify-center gap-1"><MapPin className="w-3.5 h-3.5" /> {booking.branch_name}</p>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6 space-y-4">
        <div className="bg-white rounded-2xl border border-gray-100 p-5 text-center">
          <p className="text-sm text-[#6B7280]">إزاي كانت تجربتك مع</p>
          <p className="text-lg font-black text-[#1A2E26] mt-1">{booking.service_name}؟</p>
          {booking.stylist_name && <p className="text-xs text-[#6B7280] mt-1">مع {booking.stylist_name}</p>}

          {/* Star rating */}
          <div className="flex justify-center gap-2 mt-5">
            {[1, 2, 3, 4, 5].map(s => (
              <button
                key={s}
                onMouseEnter={() => setHoverRating(s)}
                onMouseLeave={() => setHoverRating(0)}
                onClick={() => setRating(s)}
                className="transition-transform hover:scale-110"
              >
                <Star className={`w-10 h-10 ${(hoverRating || rating) >= s ? 'fill-[#1F6F5F] text-[#1F6F5F]' : 'text-gray-300'}`} />
              </button>
            ))}
          </div>
          {rating > 0 && (
            <p className="text-sm font-bold text-[#1F6F5F] mt-3">
              {rating === 5 ? 'ممتاز! 🤩' : rating === 4 ? 'كويس جداً 😊' : rating === 3 ? 'كويس 🙂' : rating === 2 ? 'مش بطال 😐' : 'محتاجين نتحسن 😔'}
            </p>
          )}
        </div>

        {/* Stylist rating (optional) */}
        {booking.stylist_name && rating > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 p-5 text-center">
            <p className="text-sm text-[#6B7280] mb-3">تقييمك لـ {booking.stylist_name}</p>
            <div className="flex justify-center gap-1.5">
              {[1, 2, 3, 4, 5].map(s => (
                <button key={s} onClick={() => setStylistRating(s)} className="transition-transform hover:scale-110">
                  <Star className={`w-7 h-7 ${stylistRating >= s ? 'fill-[#1F6F5F] text-[#1F6F5F]' : 'text-gray-300'}`} />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Comment */}
        {rating > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <label className="text-xs font-bold text-[#6B7280] mb-2 block">عاوزة تضيفي حاجة؟ (اختياري)</label>
            <textarea value={comment} onChange={e => setComment(e.target.value)} rows={3} placeholder="رأيك يهمنا..." className="w-full px-3 py-2 rounded-xl bg-[#FAFAF7] text-sm" />
          </div>
        )}

        {rating > 0 && (
          <button onClick={submit} disabled={submitting} className="w-full py-3 rounded-xl bg-[#1F6F5F] text-white font-black disabled:opacity-50 flex items-center justify-center gap-2">
            {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> جاري الإرسال...</> : <><CheckCircle2 className="w-4 h-4" /> ابعتي التقييم</>}
          </button>
        )}
      </main>
    </div>
  )
}

function Loader() { return <div className="min-h-screen bg-[#FAFAF7] flex items-center justify-center" dir="rtl"><Loader2 className="w-8 h-8 text-[#1F6F5F] animate-spin" /></div> }
