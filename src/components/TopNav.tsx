'use client'

// ============================================================================
// TopNav — ultra-minimal: logo + notifications + menu.
// Primary CTAs ("أجر مننا" / "إضافة منتج") moved to the body of the home page
// so the header stays clean and boutique-luxe (May 13 2026 — Mohamed request).
// ============================================================================

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Menu, X, User, LogIn, LogOut, Share2, Briefcase, Plus } from 'lucide-react'
import { supabaseBrowser } from '@/lib/supabase-browser'
import NotificationButton from './NotificationButton'
import LanguageToggle from './LanguageToggle'
import CartButton from './CartButton'
import { useT } from '@/lib/i18n/LanguageProvider'

export default function TopNav() {
  const { t, dir } = useT()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [loggedIn, setLoggedIn] = useState(false)

  useEffect(() => {
    supabaseBrowser.auth.getSession().then(({ data }) => setLoggedIn(!!data.session))
    const { data: sub } = supabaseBrowser.auth.onAuthStateChange((_e, s) => setLoggedIn(!!s))
    return () => sub.subscription.unsubscribe()
  }, [])

  const signOut = async () => {
    setMobileOpen(false)
    await supabaseBrowser.auth.signOut()
    if (typeof window !== 'undefined') window.location.href = '/'
  }

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
          title: t('nav.share_title'),
          text: t('nav.share_text'),
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
              <p className="font-black text-[#1F6F5F] text-base leading-none">مضمونة</p>
              <p className="text-[9px] text-gray-500 font-bold tracking-[0.25em] mt-0.5">
                MADMONA
              </p>
            </div>
          </Link>

          {/* 2 primary tabs removed — they live in the home page body now */}

          {/* Compact actions — language + notifications (enlarged) + menu */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <LanguageToggle className="bg-white shadow-soft" />
            <NotificationButton variant="icon-only" />
            <CartButton className="w-11 h-11 bg-white shadow-soft hover:shadow-card hover:-translate-y-0.5 rounded-2xl" />
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="w-11 h-11 bg-white shadow-soft hover:shadow-card hover:-translate-y-0.5 rounded-2xl flex items-center justify-center transition-all"
              aria-label={t('nav.menu')}
            >
              <Menu className="w-5 h-5 text-gray-700" />
            </button>
          </div>
        </div>
      </header>

      {/* "More" drawer — minimal, just the secondary actions */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50" dir={dir}>
          <div
            className="absolute inset-0 bg-gray-900/50 backdrop-blur-sm animate-fade-in"
            onClick={() => setMobileOpen(false)}
          />
          <div className="absolute top-0 ltr:left-0 rtl:right-0 bottom-0 w-80 bg-white flex flex-col animate-slide-down">
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
                  <p className="font-black text-[#1F6F5F]">مضمونة</p>
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
                  <p className="font-bold text-gray-900">{t('nav.account')}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{t('nav.account_desc')}</p>
                </div>
              </Link>

              <Link
                href="/add-listing"
                onClick={(e) => {
                  setMobileOpen(false)
                  // FIX (Jul 17 2026): لو المستخدم واقف على تاب (?track=) —
                  // مطاعم مثلاً — نفتح الويزارد على نفس التاب مش الديفولت.
                  try {
                    const tr = new URLSearchParams(window.location.search).get('track')
                    if (tr) {
                      e.preventDefault()
                      window.location.assign(`/add-listing?track=${encodeURIComponent(tr)}`)
                    }
                  } catch { /* fall through to plain link */ }
                }}
                className="flex items-center gap-3 p-3 rounded-2xl hover:bg-[#FAFAF7] no-underline group transition-colors"
              >
                <div className="w-10 h-10 rounded-xl bg-[#d4a017]/10 flex items-center justify-center flex-shrink-0">
                  <Plus className="w-5 h-5 text-[#d4a017]" strokeWidth={3} />
                </div>
                <div className="flex-1">
                  <p className="font-bold text-gray-900">ضيف المنتج</p>
                  <p className="text-xs text-gray-500 mt-0.5">ابدأ تبيع أو تؤجّر على مضمونة</p>
                </div>
              </Link>

              <Link
                href="/careers"
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-3 p-3 rounded-2xl hover:bg-[#FAFAF7] no-underline group transition-colors"
              >
                <div className="w-10 h-10 rounded-xl bg-[#1F6F5F]/10 flex items-center justify-center flex-shrink-0">
                  <Briefcase className="w-5 h-5 text-[#1F6F5F]" />
                </div>
                <div className="flex-1">
                  <p className="font-bold text-gray-900">التوظيف</p>
                  <p className="text-xs text-gray-500 mt-0.5">تقدّم لفرص العمل في مضمونة</p>
                </div>
              </Link>

              {loggedIn ? (
                <button
                  type="button"
                  onClick={signOut}
                  className="w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-red-50 group transition-colors text-right"
                >
                  <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center flex-shrink-0">
                    <LogOut className="w-5 h-5 text-red-500" />
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-gray-900">تسجيل الخروج</p>
                    <p className="text-xs text-gray-500 mt-0.5">إنهاء الجلسة الحالية</p>
                  </div>
                </button>
              ) : (
                <Link
                  href="/auth/login"
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-3 p-3 rounded-2xl hover:bg-[#FAFAF7] no-underline group transition-colors"
                >
                  <div className="w-10 h-10 rounded-xl bg-[#1F6F5F]/10 flex items-center justify-center flex-shrink-0">
                    <LogIn className="w-5 h-5 text-[#1F6F5F]" />
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-gray-900">{t('nav.login')}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{t('nav.login_desc')}</p>
                  </div>
                </Link>
              )}

              <button
                type="button"
                onClick={triggerShare}
                className="w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-[#FAFAF7] group transition-colors text-right"
              >
                <div className="w-10 h-10 rounded-xl bg-[#2FA084]/10 flex items-center justify-center flex-shrink-0">
                  <Share2 className="w-5 h-5 text-[#2FA084]" />
                </div>
                <div className="flex-1">
                  <p className="font-bold text-gray-900">{t('nav.share')}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{t('nav.share_desc')}</p>
                </div>
              </button>
            </nav>

            <div className="p-4 border-t border-gray-100">
              <Link
                href="/chat"
                onClick={() => setMobileOpen(false)}
                className="flex items-center justify-center gap-2 w-full bg-[#25D366] text-white py-3.5 rounded-2xl font-bold shadow-soft hover:shadow-elevated hover:-translate-y-0.5 transition-all no-underline"
              >
                💬 كلّمنا مباشر — رد فوري
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
