'use client'

// src/components/marketplace/LocationPicker.tsx
// ============================================================================
// 📍 التقاط إحداثيات الإعلان — زرار موقعي الحالي، أو لصق لينك خرايط جوجل.
//
// 🐞 (١٥ أغسطس ٢٠٢٦ — محمد: «شاشات الإضافة لازم تطابق شاشات العرض»)
//
//    صفحة الإعلان بتعرض خريطة من `listings.latitude/longitude`. السباكة
//    كلها موجودة وشغالة من زمان:
//      ✓ `listing_drafts` فيها العمودين
//      ✓ `claim_listing_draft` و`publish_unclaimed_draft` بينقلوهم للإعلان
//      ✓ `listings.latitude/longitude` عليهم INSERT/UPDATE للمستخدم المسجّل
//    وبرضه **مفيش ولا فورم ولا راوت بيلمسهم** — صفر إشارة ليهم في
//    `ListingForm.tsx` و`AddListingClient.tsx` و`/api/listing-drafts`.
//
//    النتيجة: **٣٧٤ من ٣٧٨ إعلان منشور من غير إحداثيات** — الخريطة عمرها
//    ما ظهرت لعميل.
//
// ⚠️ من غير مفتاح خرايط مدفوع: الـembed بتاع `maps.google.com/maps?q=..&output=embed`
//    اللي صفحة العرض بتستخدمه مابيطلبش مفتاح — فبنستخدم نفس الحاجة للمعاينة.
//    والالتقاط بيتم بـ`navigator.geolocation` (مدمج في المتصفح) أو بلصق
//    لينك — لأن المورد المصري غالبًا معاه لينك خرايط، مش إحداثيات.
// ============================================================================

import { useState } from 'react'
import { MapPin, Crosshair, X, Loader2, AlertCircle } from 'lucide-react'

// 📍 (٦/٩/٢٠٢٦) parseLatLng/LatLng عايشين في lib/geo.ts (نقية — الراوتات بتستوردها) — إعادة تصدير للي بيستوردهم من هنا
export { parseLatLng, type LatLng } from '@/lib/geo'
import { parseLatLng, type LatLng } from '@/lib/geo'

export default function LocationPicker({
  value,
  onChange,
  compact = false,
}: {
  value: LatLng
  onChange: (v: LatLng) => void
  /** نسخة مضغوطة للفورم العام */
  compact?: boolean
}) {
  const [locating, setLocating] = useState(false)
  const [linkInput, setLinkInput] = useState('')
  const [error, setError] = useState<string | null>(null)

  const has = value.latitude !== null && value.longitude !== null

  const useMyLocation = () => {
    setError(null)
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setError('المتصفح ده مابيدعمش تحديد الموقع — الصق لينك خرايط جوجل بدل كده')
      return
    }
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        onChange({ latitude: pos.coords.latitude, longitude: pos.coords.longitude })
        setLocating(false)
      },
      (err) => {
        setLocating(false)
        setError(
          err.code === err.PERMISSION_DENIED
            ? 'مارضيتش تدي إذن الموقع — الصق لينك خرايط جوجل بدل كده'
            : 'مقدرناش نحدد الموقع — الصق لينك خرايط جوجل بدل كده',
        )
      },
      { enableHighAccuracy: true, timeout: 10000 },
    )
  }

  const applyLink = () => {
    setError(null)
    const parsed = parseLatLng(linkInput)
    if (!parsed) {
      setError('اللينك ده مفهوش إحداثيات. افتح المكان في خرايط جوجل واعمل «مشاركة» وانسخ اللينك.')
      return
    }
    onChange(parsed)
    setLinkInput('')
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 flex-wrap">
        <button
          type="button"
          onClick={useMyLocation}
          disabled={locating}
          className="flex items-center gap-1.5 px-3 py-2 bg-[#059669]/5 border border-[#059669]/30 text-[#059669] rounded-xl text-xs font-bold disabled:opacity-50"
        >
          {locating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Crosshair className="w-3.5 h-3.5" />}
          {locating ? 'بيحدد…' : 'استخدم موقعي الحالي'}
        </button>
        {has && (
          <>
            <span className="text-xs text-gray-500 font-mono" dir="ltr">
              {value.latitude!.toFixed(5)}, {value.longitude!.toFixed(5)}
            </span>
            <button
              type="button"
              onClick={() => onChange({ latitude: null, longitude: null })}
              className="text-gray-400 hover:text-red-500"
              title="شيل الموقع"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </>
        )}
      </div>

      <div className="flex items-center gap-2">
        <input
          type="text"
          value={linkInput}
          onChange={(e) => setLinkInput(e.target.value)}
          onPaste={(e) => {
            // اللصق أشيع من الكتابة هنا — بنطبّقه على طول
            const t = e.clipboardData.getData('text')
            const parsed = parseLatLng(t)
            if (parsed) {
              e.preventDefault()
              onChange(parsed)
              setLinkInput('')
              setError(null)
            }
          }}
          dir="ltr"
          placeholder="أو الصق لينك خرايط جوجل"
          className="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-sm"
        />
        <button
          type="button"
          onClick={applyLink}
          disabled={!linkInput.trim()}
          className="px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-bold disabled:opacity-40"
        >
          حدّد
        </button>
      </div>

      {error && (
        <p className="text-xs text-amber-700 flex items-start gap-1.5">
          <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          {error}
        </p>
      )}

      {has && !compact && (
        // نفس الـembed اللي صفحة الإعلان بتستخدمه بالظبط — من غير مفتاح
        <div className="rounded-xl overflow-hidden border border-gray-200">
          <iframe
            src={`https://maps.google.com/maps?q=${value.latitude},${value.longitude}&z=16&output=embed`}
            width="100%"
            height="180"
            style={{ border: 0 }}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            title="معاينة الموقع"
          />
        </div>
      )}

      {!has && (
        <p className="text-[11px] text-gray-400 flex items-center gap-1">
          <MapPin className="w-3 h-3" />
          من غير موقع، تبويب «الموقع» في صفحة إعلانك مش هيعرض خريطة.
        </p>
      )}
    </div>
  )
}
