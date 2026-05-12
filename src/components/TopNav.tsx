'use client'

// ============================================================================
// TopNav — minimal: logo + 2 primary tabs only.
//   "أجر مننا"      → /marketplace      (rent FROM us — customer)
//   "إضافة ليستنج" → /add-listing      (any user can add a listing; we approve in background)
// Everything else (account, login, share) lives behind the hamburger.
// ============================================================================

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Menu, X, ShoppingBag, Plus, User, LogIn, Share2 } from 'lucide-react'

export default function TopNav() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    const handler = () => setMobileOpen(false)
    window.addEventListener('popstate', handler)
    return () => window.removeEventListener('popstate', handler)
  }, [])

  const triggerShare = async () => {
    setMobileOpen(false)
    if (typeof navigator !== 'undefined' && 'share' in navigator) {
      try {
        await navigator.share({
          title: 'مضمونة - منصة الإيجار',
          text: 'مضمونة 🟢 — احنا بتوع الإيجار في مصر.',
          url: 'https://madmonacairo.com',
        })
      } catch {}
    }
  }

  return (
    <>
      <header
        className={`sticky top-0 z-50 transition-all duration-300 ${
          scrolled ? 'glass border-b border-white/40 shadow-soft' : 'bg-transparent'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          {/* Logo */}
          <Link
            href="/"
            className="flex items-center gap-2.5 no-underline flex-shrink-0 group"
          >
            <div className="w-10 h-10 bg-white shadow-soft group-hover:shadow-card group-hover:-translate-y-0.5 rounded-2xl flex items-center justify-center transition-all overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/madmona-logo.png"
                alt="مضمونة"
                className="w-8 h-8 object-contain"
                width={32}
                height={32}
              />
            </div>
            <div className="hidden sm:block">
              <p className="font-black text-[#1F5F3F] text-base leading-none">مضمونة</p>
              <p className="text-[9px] text-gray-500 font-bold tracking-[0.25em] mt-0.5">
                MADMONA
              </p>
            </div>
          </Link>

          {/* 2 PRIMARY TABS — visible on every breakpoint */}
          <nav className="flex items-center gap-2 flex-1 justify-center md:justify-end">
            <Link
              href="/marketplace"
              className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-5 py-2.5 bg-[#1F5F3F] text-white text-xs sm:text-sm font-black rounded-xl shadow-soft hover:shadow-elevated hover:-translate-y-0.5 transition-all no-underline whitespace-nowrap"
            >
              <ShoppingBag className="w-4 h-4" />
              <span>أجر مننا</span>
            </Link>

            <Link
              href="/add-listing"
              className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-5 py-2.5 bg-[#B8860B] text-white text-xs sm:text-sm font-black rounded-xl shadow-soft hover:shadow-elevated hover:-translate-y-0.5 transition-all no-underline whitespace-nowrap"
            >
              <Plus className="w-4 h-4" strokeWidth={3} />
              <span>إضافة ليستنج</span>
            </Link>
          </nav>

          {/* Compact "more" menu — account/login/share */}
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="w-10 h-10 bg-white shadow-soft hover:shadow-card hover:-translate-y-0.5 rounded-xl flex items-center justify-center transition-all flex-shrink-0"
            aria-label="القائمة"
          >
            <Menu className="w-5 h-5 text-gray-700" />
          </button>
        </div>
      </header>

      {/* "More" drawer — minimal, just the secondary actions */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50" dir="rtl">
          <div
            className="absolute inset-0 bg-gray-900/50 backdrop-blur-sm animate-fade-in"
            onClick={() => setMobileOpen(false)}
          />
          <div className="absolute top-0 right-0 bottom-0 w-80 bg-white flex flex-col animate-slide-down">
            <div className="flex items-center justify-between p-4 border-b border-gray-100">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 bg-[#FAFAF7] rounded-2xl flex items-center justify-center overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/madmona-logo.png"
                    alt="مضمونة"
                    className="w-9 h-9 object-contain"
                    width={36}
                    height={36}
                  />
                </div>
                <div>
                  <p className="font-black text-[#1F5F3F]">مضمونة</p>
                  <p className="text-[9px] text-gray-500 font-bold tracking-[0.2em]">
                    MADMONA
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className="w-9 h-9 hover:bg-gray-50 rounded-xl flex items-center justify-center transition-colors"
              >
                <X className="w-5 h-5 text-gray-700" />
              </button>
            </div>

            <nav className="flex-1 overflow-y-auto p-4 space-y-1">
              <Link
                href="/account"
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-3 p-3 rounded-2xl hover:bg-[#FAFAF7] no-underline group transition-colors"
              >
                <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center flex-shrink-0">
                  <User className="w-5 h-5 text-gray-700" />
                </div>
                <div className="flex-1">
                  <p className="font-bold text-gray-900">حسابي</p>
                  <p className="text-xs text-gray-500 mt-0.5">حجوزاتي وليستنجاتي</p>
                </div>
              </Link>

              <Link
                href="/auth/login"
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-3 p-3 rounded-2xl hover:bg-[#FAFAF7] no-underline group transition-colors"
              >
                <div className="w-10 h-10 rounded-xl bg-[#1F5F3F]/10 flex items-center justify-center flex-shrink-0">
                  <LogIn className="w-5 h-5 text-[#1F5F3F]" />
                </div>
                <div className="flex-1">
                  <p className="font-bold text-gray-900">تسجيل الدخول</p>
                  <p className="text-xs text-gray-500 mt-0.5">عندك حساب بالفعل</p>
                </div>
              </Link>

              <button
                type="button"
                onClick={triggerShare}
                className="w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-[#FAFAF7] group transition-colors text-right"
              >
                <div className="w-10 h-10 rounded-xl bg-[#B8860B]/10 flex items-center justify-center flex-shrink-0">
                  <Share2 className="w-5 h-5 text-[#B8860B]" />
                </div>
                <div className="flex-1">
                  <p className="font-bold text-gray-900">شارك مضمونة</p>
                  <p className="text-xs text-gray-500 mt-0.5">ابعت الموقع لأصحابك</p>
                </div>
              </button>
            </nav>

            <div className="p-4 border-t border-gray-100">
              <a
                href="https://wa.me/201002229982"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full bg-[#25D366] text-white py-3.5 rounded-2xl font-bold shadow-soft hover:shadow-elevated hover:-translate-y-0.5 transition-all no-underline"
              >
                واتساب · رد فوري
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
