'use client'

import { useState } from 'react'
import { Share2, Copy, Check, X, MessageCircle, Send } from 'lucide-react'

// ============================================================================
// ShareAppButton
//
// Lets visitors share Madmona via:
//   - Native Web Share API (mobile — opens system share sheet)
//   - Modal with WhatsApp, Telegram, Twitter, Facebook, copy link (desktop)
// ============================================================================

interface Props {
  variant?: 'default' | 'compact' | 'icon-only'
  className?: string
}

const SHARE_URL = 'https://madmonacairo.com'
const SHARE_TITLE = 'مضمونة - منصة حجز الخدمات'
const SHARE_TEXT = 'شوف خدمات مضمونة 🟢 - منصة مصرية بتجمع كل اللي يتأجر من موردين معتمدين، بضمان كامل. عقارات، مركبات، معدات، فعاليات، ومساحات عمل.'

export default function ShareAppButton({ variant = 'default', className = '' }: Props) {
  const [modalOpen, setModalOpen] = useState(false)
  const [copied, setCopied] = useState(false)

  const handleClick = async () => {
    // Try native Web Share API first (mobile, modern browsers)
    if (typeof navigator !== 'undefined' && 'share' in navigator) {
      try {
        await navigator.share({
          title: SHARE_TITLE,
          text: SHARE_TEXT,
          url: SHARE_URL,
        })
        return
      } catch (e) {
        // User cancelled or API failed → fall through to modal
        if (e instanceof Error && e.name === 'AbortError') return
      }
    }

    // Fallback: open share modal
    setModalOpen(true)
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(SHARE_URL)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (e) {
      // ignore
    }
  }

  const shareText = encodeURIComponent(`${SHARE_TEXT}\n\n${SHARE_URL}`)
  const shareUrl = encodeURIComponent(SHARE_URL)
  const shareTitleEnc = encodeURIComponent(SHARE_TITLE)

  const shareLinks = [
    {
      name: 'واتساب',
      icon: <MessageCircle className="w-5 h-5" />,
      url: `https://wa.me/?text=${shareText}`,
      color: 'bg-[#25D366] text-white',
    },
    {
      name: 'تيليجرام',
      icon: <Send className="w-5 h-5" />,
      url: `https://t.me/share/url?url=${shareUrl}&text=${shareText}`,
      color: 'bg-[#0088cc] text-white',
    },
    {
      name: 'فيسبوك',
      icon: <FacebookIcon />,
      url: `https://www.facebook.com/sharer/sharer.php?u=${shareUrl}`,
      color: 'bg-[#1877F2] text-white',
    },
    {
      name: 'X',
      icon: <XIcon />,
      url: `https://twitter.com/intent/tweet?url=${shareUrl}&text=${shareTitleEnc}`,
      color: 'bg-black text-white',
    },
  ]

  // -- Render trigger button --
  const renderTrigger = () => {
    if (variant === 'icon-only') {
      return (
        <button
          type="button"
          onClick={handleClick}
          className={`w-10 h-10 bg-white shadow-soft hover:shadow-card hover:-translate-y-0.5 rounded-xl flex items-center justify-center transition-all ${className}`}
          aria-label="مشاركة التطبيق"
          title="مشاركة الموقع"
        >
          <Share2 className="w-4 h-4 text-[#1F6F5F]" />
        </button>
      )
    }
    if (variant === 'compact') {
      return (
        <button
          type="button"
          onClick={handleClick}
          className={`flex items-center gap-1.5 px-3 py-2 text-sm font-semibold text-gray-700 hover:text-[#1F6F5F] hover:bg-white/60 rounded-xl transition-all ${className}`}
        >
          <Share2 className="w-4 h-4" />
          <span className="hidden lg:inline">مشاركة</span>
        </button>
      )
    }
    return (
      <button
        type="button"
        onClick={handleClick}
        className={`flex items-center justify-center gap-2 bg-[#2FA084] hover:bg-[#a07509] text-white px-4 py-2.5 rounded-xl font-bold text-sm shadow-soft hover:shadow-elevated hover:-translate-y-0.5 transition-all ${className}`}
      >
        <Share2 className="w-4 h-4" />
        <span>شارك الموقع</span>
      </button>
    )
  }

  return (
    <>
      {renderTrigger()}

      {/* Share modal — fallback for browsers without Web Share API */}
      {modalOpen && (
        <>
          <div
            className="fixed inset-0 z-[9998] bg-black/40 backdrop-blur-sm animate-fade-in"
            onClick={() => setModalOpen(false)}
          />
          <div
            className="fixed inset-0 z-[9999] flex items-end md:items-center justify-center p-4 pointer-events-none"
            dir="rtl"
          >
            <div className="bg-white rounded-3xl shadow-2xl p-6 max-w-md w-full pointer-events-auto animate-slide-down">
              {/* Header */}
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 bg-[#2FA084]/10 rounded-2xl flex items-center justify-center">
                    <Share2 className="w-5 h-5 text-[#2FA084]" />
                  </div>
                  <div>
                    <h2 className="font-black text-gray-900 text-lg">شارك مضمونة</h2>
                    <p className="text-xs text-gray-500">ابعت الموقع لأصحابك وعيلتك</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="w-9 h-9 hover:bg-gray-100 rounded-xl flex items-center justify-center transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              {/* Social buttons grid */}
              <div className="grid grid-cols-2 gap-2 mb-4">
                {shareLinks.map((link) => (
                  <a
                    key={link.name}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => setModalOpen(false)}
                    className={`flex items-center justify-center gap-2 py-3 px-4 rounded-2xl font-bold text-sm hover:scale-105 transition-transform no-underline ${link.color}`}
                  >
                    {link.icon}
                    <span>{link.name}</span>
                  </a>
                ))}
              </div>

              {/* Copy link */}
              <div className="bg-[#FAFAF7] border border-gray-100 rounded-2xl p-3 flex items-center gap-2">
                <div className="flex-1 px-3 py-2 bg-white rounded-xl text-xs text-gray-700 font-mono truncate" dir="ltr">
                  {SHARE_URL}
                </div>
                <button
                  type="button"
                  onClick={handleCopy}
                  className={`px-4 py-2 rounded-xl font-bold text-sm flex items-center gap-1.5 transition-all ${
                    copied
                      ? 'bg-green-600 text-white'
                      : 'bg-[#1F6F5F] hover:bg-[#1F6F5F]/90 text-white'
                  }`}
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4" />
                      <span>تم النسخ</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      <span>نسخ</span>
                    </>
                  )}
                </button>
              </div>

              <p className="text-[11px] text-center text-gray-400 mt-4">
                لما تشارك الموقع، بتساعد ناس تانية تستفيد من الخدمات المضمونة 💚
              </p>
            </div>
          </div>
        </>
      )}
    </>
  )
}

// Inline icon components (avoid extra package deps)
function FacebookIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  )
}

function XIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  )
}
