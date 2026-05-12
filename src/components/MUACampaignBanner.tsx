'use client'

import { useEffect, useState, Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Sparkles, X, ArrowLeft, Building2, ShoppingBag, Heart } from 'lucide-react'

// ============================================================================
// MUACampaignBanner — Banner مخصص لزوار إعلانات Meta لميكب أرتيست
//
// يظهر فقط لما يكون فيه واحد من دول في الـ URL:
//   - ?from=mua_ad
//   - ?utm_campaign=mua
//   - ?utm_campaign=mua_test
//   - ?utm_content=makeup
//
// بيعرض CTAين واضحين:
//   1. سجّلي كموردة (→ /supplier/register)
//   2. شوفي الاستوديو (→ /marketplace/madmona-makeup-studio-heliopolis)
//
// Dismissible (saves to localStorage)
// ============================================================================

const STORAGE_KEY = 'madmona_mua_banner_dismissed_v1'
const STUDIO_SLUG = 'madmona-makeup-studio-heliopolis'

function MUABannerInner() {
  const searchParams = useSearchParams()
  const [visible, setVisible] = useState(false)
  const [animatingOut, setAnimatingOut] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!searchParams) return

    const from = searchParams.get('from') || ''
    const utmCampaign = searchParams.get('utm_campaign') || ''
    const utmContent = searchParams.get('utm_content') || ''

    const isMUATraffic =
      from === 'mua_ad' ||
      from === 'mua' ||
      utmCampaign.toLowerCase().includes('mua') ||
      utmCampaign.toLowerCase().includes('makeup') ||
      utmContent.toLowerCase().includes('makeup') ||
      utmContent.toLowerCase().includes('mua')

    if (!isMUATraffic) return

    // Check if user dismissed before
    if (localStorage.getItem(STORAGE_KEY)) return

    // Small delay for smoother UX
    const t = setTimeout(() => setVisible(true), 200)
    return () => clearTimeout(t)
  }, [searchParams])

  const handleDismiss = () => {
    setAnimatingOut(true)
    setTimeout(() => {
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, '1')
      }
      setVisible(false)
    }, 200)
  }

  if (!visible) return null

  return (
    <div
      className={`relative bg-gradient-to-br from-[#1F5F3F] via-[#2d7a52] to-[#1F5F3F] text-white overflow-hidden transition-all duration-300 ${
        animatingOut ? 'opacity-0 -translate-y-2' : 'opacity-100'
      }`}
      dir="rtl"
    >
      {/* Decorative shine */}
      <div className="absolute inset-0 -translate-x-full animate-[shine_4s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-white/10 to-transparent pointer-events-none" />

      {/* Decorative blobs */}
      <div className="absolute top-0 left-0 w-48 h-48 bg-[#B8860B]/30 rounded-full blur-3xl pointer-events-none -translate-y-1/2 -translate-x-1/2" />
      <div className="absolute bottom-0 right-0 w-40 h-40 bg-white/10 rounded-full blur-3xl pointer-events-none translate-y-1/3 translate-x-1/3" />

      {/* Close button */}
      <button
        type="button"
        onClick={handleDismiss}
        className="absolute top-3 left-3 w-7 h-7 rounded-full hover:bg-white/20 flex items-center justify-center transition-colors z-20"
        aria-label="إخفاء"
      >
        <X className="w-3.5 h-3.5" />
      </button>

      <div className="relative z-10 max-w-7xl mx-auto px-4 py-5 md:py-6">
        {/* Header */}
        <div className="flex items-start gap-3 mb-4">
          <div className="w-10 h-10 md:w-12 md:h-12 rounded-2xl bg-white/15 backdrop-blur flex items-center justify-center flex-shrink-0">
            <Heart className="w-5 h-5 md:w-6 md:h-6 fill-[#B8860B]/40 text-[#B8860B]" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-[#B8860B]/30 backdrop-blur rounded-full text-[10px] font-black tracking-widest uppercase mb-1.5">
              <Sparkles className="w-2.5 h-2.5" />
              <span>Beauty Pros</span>
            </div>
            <h2 className="text-lg md:text-2xl font-black leading-tight">
              ميكب أرتيست؟ أهلاً بيكي في مضمونة 💄
            </h2>
            <p className="text-xs md:text-sm text-white/90 mt-1 leading-relaxed">
              منصة مصرية بتدعم محترفي التجميل بحاجتين أساسيين 👇
            </p>
          </div>
        </div>

        {/* Two CTAs - side by side */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mt-4">
          {/* CTA 1: Register as supplier */}
          <Link
            href="/supplier/register?utm_source=meta&utm_campaign=mua&utm_content=banner"
            className="group flex items-center gap-3 bg-[#B8860B] hover:bg-[#9d710a] text-white p-4 rounded-2xl no-underline shadow-soft hover:shadow-elevated hover:-translate-y-0.5 transition-all"
          >
            <div className="w-11 h-11 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
              <Building2 className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-black text-sm md:text-base leading-tight">
                ١. سجّلي كموردة
              </p>
              <p className="text-[11px] md:text-xs text-white/85 mt-0.5 leading-snug">
                عملاء عرايس هييجوكي · مجاناً
              </p>
            </div>
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform flex-shrink-0" />
          </Link>

          {/* CTA 2: Browse the studio */}
          <Link
            href={`/marketplace/${STUDIO_SLUG}?utm_source=meta&utm_campaign=mua&utm_content=banner`}
            className="group flex items-center gap-3 bg-white text-[#1F5F3F] hover:bg-gray-50 p-4 rounded-2xl no-underline shadow-soft hover:shadow-elevated hover:-translate-y-0.5 transition-all"
          >
            <div className="w-11 h-11 rounded-xl bg-[#1F5F3F]/10 flex items-center justify-center flex-shrink-0">
              <ShoppingBag className="w-5 h-5 text-[#1F5F3F]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-black text-sm md:text-base leading-tight">
                ٢. احجزي الاستوديو
              </p>
              <p className="text-[11px] md:text-xs text-gray-600 mt-0.5 leading-snug">
                مصر الجديدة · من ٣٠٠ج/ساعة
              </p>
            </div>
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform flex-shrink-0 text-[#1F5F3F]" />
          </Link>
        </div>

        {/* Trust line */}
        <div className="flex items-center justify-center gap-3 mt-4 text-[11px] md:text-xs text-white/80">
          <span className="flex items-center gap-1">
            🛡️ حماية كاملة
          </span>
          <span className="opacity-40">·</span>
          <span className="flex items-center gap-1">
            ⚡ دفع مستحقات سريع
          </span>
          <span className="opacity-40">·</span>
          <span className="flex items-center gap-1 hidden sm:inline-flex">
            💬 دعم مستمر
          </span>
        </div>

        <p className="text-center mt-3 text-[10px] text-white/60 tracking-wider">
          أو اتفرّجي حر في الموقع 👇 احنا بتوع الإيجار
        </p>
      </div>

      <style jsx>{`
        @keyframes shine {
          0% { transform: translateX(-100%); }
          50%, 100% { transform: translateX(200%); }
        }
      `}</style>
    </div>
  )
}

export default function MUACampaignBanner() {
  return (
    <Suspense fallback={null}>
      <MUABannerInner />
    </Suspense>
  )
}
