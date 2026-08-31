'use client'

// ============================================================================
// TopNav — ultra-minimal: logo + notifications + menu.
// Primary CTAs ("أجر مننا" / "إضافة منتج") moved to the body of the home page
// so the header stays clean and boutique-luxe (May 13 2026 — Mohamed request).
// ============================================================================

import { useState, useEffect } from 'react'
import Link from 'next/link'
import SupplierModulesInline from '@/components/SupplierModulesInline'
import { Car, Package, Bell, Menu, X, User, LogIn, LogOut, Share2, Briefcase, Plus } from 'lucide-react'
import { supabaseBrowser } from '@/lib/supabase-browser'
import NotificationButton from './NotificationButton'
import LanguageToggle from './LanguageToggle'
import CartButton from './CartButton'
import { useT } from '@/lib/i18n/LanguageProvider'
import { useMadmonaStaff } from '@/lib/useMadmonaStaff'

export default function TopNav() {
  const { t, dir } = useT()
  // 💼 (٢٢ أغسطس ٢٠٢٦) «شغلي» في القايمة كمان — عشان يبان على الديسكتوب،
  //    وعشان موظفين مضمونة يفضل قدامهم «حسابي» بعد ما التاب السفلي بقى شغلي.
  const staff = useMadmonaStaff()
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
        className={`sticky top-0 z-50 transition-all duration-300 bg-[#34D399] ${
          scrolled ? 'shadow-soft' : ''
        }`}
        style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
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
              <p className="font-black text-white text-base leading-none">{t('tn.brand')}</p>
              <p className="text-[9px] text-white/70 font-bold tracking-[0.25em] mt-0.5">
                MADMONA
              </p>
            </div>
          </Link>

          {/* 2 primary tabs removed — they live in the home page body now */}

          {/* Compact actions — language + notifications (enlarged) + menu */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <Link
              href="/chat"
              aria-label="شات مضمونة"
              className="w-11 h-11 bg-white/15 hover:bg-white/25 hover:-translate-y-0.5 rounded-2xl flex items-center justify-center transition-all overflow-hidden no-underline"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="https://res.cloudinary.com/duxfgqioc/image/upload/c_crop,x_375,y_120,w_410,h_410/c_fill,w_96,h_96/madmona/mascots/genie.png"
                alt="شات مضمونة"
                className="w-9 h-9 object-cover rounded-full"
                width={36}
                height={36}
              />
            </Link>
            <LanguageToggle
              className="bg-white/15"
              activeClass="bg-white text-[#059669]"
              inactiveClass="bg-transparent text-white"
            />
            <NotificationButton variant="icon-only" />
            <CartButton
              className="w-11 h-11 bg-white/15 hover:bg-white/25 hover:-translate-y-0.5 rounded-2xl"
              iconColorClass="text-white"
            />
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="w-11 h-11 bg-white/15 hover:bg-white/25 hover:-translate-y-0.5 rounded-2xl flex items-center justify-center transition-all"
              aria-label={t('nav.menu')}
            >
              <Menu className="w-5 h-5 text-white" />
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
                  <p className="font-black text-[#059669]">{t('tn.brand')}</p>
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
              {staff.staff && (
                <Link
                  href="/account/work"
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-3 p-3 rounded-2xl bg-[#059669]/[0.06] hover:bg-[#059669]/10 no-underline group transition-colors"
                >
                  <div className="w-10 h-10 rounded-xl bg-[#059669]/10 flex items-center justify-center flex-shrink-0 relative">
                    <Briefcase className="w-5 h-5 text-[#059669]" />
                    {((staff.tasks ?? 0) + (staff.due ?? 0)) > 0 && (
                      <span className="absolute -top-1.5 -left-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-[#b3261e] text-white text-[10px] font-black flex items-center justify-center">
                        {(staff.tasks ?? 0) + (staff.due ?? 0)}
                      </span>
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-gray-900">{t('tn.my_work')}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {((staff.due ?? 0) > 0 || (staff.tasks ?? 0) > 0)
                        ? t('tn.staff_due', { calls: staff.due ?? 0, tasks: staff.tasks ?? 0 })
                        : t('tn.staff_sub')}
                    </p>
                  </div>
                </Link>
              )}

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

              {/* 🧹 (٢٨ أغسطس ٢٠٢٦) «ضيف المنتج» اتشالت من هنا —
                  موجودة في ٦ مكان تاني وفي الشريط السفلي. */}
              {/* 🧹 (٢٨ أغسطس ٢٠٢٦) «ضيف المنتج» اتشالت من القايمة خالص —
                  موجودة في ٦ مكان تاني وفي الشريط السفلي. */}

              {/* 🔔 (٢٨ أغسطس ٢٠٢٦) محمد: «تاب النوتيفيكيشن مش بيعرض الإشعارات».
                  زرار الجرس فوق بيفعّل الـpush بس — ده الرابط للشاشة الحقيقية. */}
              {/* 🚗 (٢٨/٨) صفحة السيارات كانت موجودة من غير أي رابط */}
              <Link
                href="/cars"
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-3 px-3 py-3 rounded-2xl hover:bg-[#FAFAF7] no-underline"
              >
                <div className="w-10 h-10 rounded-2xl bg-[#34D399]/12 flex items-center justify-center shrink-0">
                  <Car className="w-[18px] h-[18px] text-[#059669]" />
                </div>
                <div className="flex-1 text-right">
                  <p className="font-bold text-gray-900">سيارات</p>
                  <p className="text-xs text-gray-500 mt-0.5">زيرو ومستعمل من معارض وأفراد</p>
                </div>
              </Link>

              {/* 📦 (٢٨/٨) طلباتي — كانت من غير رابط كمان */}
              <Link
                href="/my-orders"
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-3 px-3 py-3 rounded-2xl hover:bg-[#FAFAF7] no-underline"
              >
                <div className="w-10 h-10 rounded-2xl bg-[#34D399]/12 flex items-center justify-center shrink-0">
                  <Package className="w-[18px] h-[18px] text-[#059669]" />
                </div>
                <div className="flex-1 text-right">
                  <p className="font-bold text-gray-900">طلباتي</p>
                  <p className="text-xs text-gray-500 mt-0.5">حجوزاتك وطلباتك</p>
                </div>
              </Link>

              <Link
                href="/notifications"
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-3 px-3 py-3 rounded-2xl hover:bg-[#FAFAF7] no-underline"
              >
                <div className="w-10 h-10 rounded-2xl bg-[#34D399]/12 flex items-center justify-center shrink-0">
                  <Bell className="w-[18px] h-[18px] text-[#059669]" />
                </div>
                <div className="flex-1 text-right">
                  <p className="font-bold text-gray-900">الإشعارات</p>
                  <p className="text-xs text-gray-500 mt-0.5">كل اللي جالك في مكان واحد</p>
                </div>
              </Link>

              {/* 🧩 (٢٨/٨) محمد: «راجع التابات بتاعت نظام إدارة بيزنسك
                  وانقلها برّه أول ما تدوس على الـ٣ شرط» — المورد بقى
                  يوصل لموديولاته من هنا على طول. */}
              <SupplierModulesInline onNavigate={() => setMobileOpen(false)} />

              <Link
                href="/careers"
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-3 p-3 rounded-2xl hover:bg-[#FAFAF7] no-underline group transition-colors"
              >
                <div className="w-10 h-10 rounded-xl bg-[#34D399]/10 flex items-center justify-center flex-shrink-0">
                  <Briefcase className="w-5 h-5 text-[#059669]" />
                </div>
                <div className="flex-1">
                  <p className="font-bold text-gray-900">{t('tn.careers')}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{t('tn.careers_sub')}</p>
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
                    <p className="font-bold text-gray-900">{t('tn.logout')}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{t('tn.logout_sub')}</p>
                  </div>
                </button>
              ) : (
                <Link
                  href="/auth/login"
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-3 p-3 rounded-2xl hover:bg-[#FAFAF7] no-underline group transition-colors"
                >
                  <div className="w-10 h-10 rounded-xl bg-[#34D399]/10 flex items-center justify-center flex-shrink-0">
                    <LogIn className="w-5 h-5 text-[#059669]" />
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
                {t('tn.chat_now')}
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
