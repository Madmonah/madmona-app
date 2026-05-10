'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { Menu, X, ChevronDown, Building2, User, LogIn, UserPlus, ShoppingBag, Share2, LayoutGrid } from 'lucide-react'
import ShareAppButton from './ShareAppButton'
import NotificationButton from './NotificationButton'

// ============================================================
// TopNav — sticky glass navbar with CLEAR DUAL CTAs at the top
// "أجر مننا" (rent FROM us) + "أجر معانا" (rent WITH us)
// Plus "خدماتنا" link to the full services page.
// ============================================================

export default function TopNav() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [supplierMenuOpen, setSupplierMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const supplierMenuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (supplierMenuRef.current && !supplierMenuRef.current.contains(e.target as Node)) {
        setSupplierMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  useEffect(() => {
    const handler = () => setMobileOpen(false)
    window.addEventListener('popstate', handler)
    return () => window.removeEventListener('popstate', handler)
  }, [])

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const triggerShare = async () => {
    setMobileOpen(false)
    if (typeof navigator !== 'undefined' && 'share' in navigator) {
      try {
        await navigator.share({
          title: 'مضمونة - منصة الحجز',
          text: 'شوف مضمونة 🟢 - منصة مصرية بتجمع كل اللي يتأجر من مصادر معتمدة.',
          url: 'https://madmonacairo.com',
        })
      } catch {}
    }
  }

  return (
    <>
      <header className={`sticky top-0 z-50 transition-all duration-300 ${
        scrolled ? 'glass border-b border-white/40 shadow-soft' : 'bg-transparent'
      }`}>
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 no-underline flex-shrink-0 group">
            <div className="w-11 h-11 bg-white shadow-soft group-hover:shadow-card group-hover:-translate-y-0.5 rounded-2xl flex items-center justify-center transition-all overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/madmona-logo.png" alt="مضمونة" className="w-9 h-9 object-contain" width={36} height={36} />
            </div>
            <div className="hidden sm:block">
              <p className="font-black text-[#1F5F3F] text-lg leading-none">مضمونة</p>
              <p className="text-[9px] text-gray-500 font-bold tracking-[0.25em] mt-1">MADMONA</p>
            </div>
          </Link>

          {/* DUAL CTA TABS — top, clear, impossible to miss (desktop) */}
          <nav className="hidden md:flex items-center gap-2">
            {/* أجر مننا — للعميل */}
            <Link
              href="/marketplace"
              className="flex items-center gap-2 px-5 py-2.5 bg-[#1F5F3F] text-white text-sm font-black rounded-xl shadow-soft hover:shadow-elevated hover:-translate-y-0.5 transition-all no-underline"
            >
              <ShoppingBag className="w-4 h-4" />
              <span>أجر مننا</span>
            </Link>

            {/* أجر معانا — للمورد */}
            <div className="relative" ref={supplierMenuRef}>
              <button
                type="button"
                onClick={() => setSupplierMenuOpen((o) => !o)}
                className="flex items-center gap-2 px-5 py-2.5 bg-[#B8860B] text-white text-sm font-black rounded-xl shadow-soft hover:shadow-elevated hover:-translate-y-0.5 transition-all"
              >
                <Building2 className="w-4 h-4" />
                <span>أجر معانا</span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${supplierMenuOpen ? 'rotate-180' : ''}`} />
              </button>

              {supplierMenuOpen && (
                <div className="absolute top-full left-0 mt-2 w-64 bg-white rounded-2xl shadow-luxe border border-gray-100 overflow-hidden animate-scale-in">
                  <Link href="/supplier/register" onClick={() => setSupplierMenuOpen(false)} className="flex items-start gap-3 p-4 hover:bg-[#FAFAF7] no-underline transition-colors group">
                    <div className="w-9 h-9 rounded-xl bg-[#B8860B]/10 flex items-center justify-center flex-shrink-0 group-hover:bg-[#B8860B]/20 transition-colors">
                      <UserPlus className="w-4 h-4 text-[#B8860B]" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-900">سجّل وابدأ تأجير</p>
                      <p className="text-xs text-gray-500 mt-0.5">٠٪ عمولة لأول ٣٠ يوم</p>
                    </div>
                  </Link>
                  <div className="h-px bg-gray-100" />
                  <Link href="/auth/login?redirect=/supplier/marketplace" onClick={() => setSupplierMenuOpen(false)} className="flex items-start gap-3 p-4 hover:bg-[#FAFAF7] no-underline transition-colors group">
                    <div className="w-9 h-9 rounded-xl bg-[#1F5F3F]/10 flex items-center justify-center flex-shrink-0 group-hover:bg-[#1F5F3F]/20 transition-colors">
                      <LogIn className="w-4 h-4 text-[#1F5F3F]" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-900">لوحة المورد</p>
                      <p className="text-xs text-gray-500 mt-0.5">عندك حساب بالفعل</p>
                    </div>
                  </Link>
                </div>
              )}
            </div>

            {/* Services link */}
            <Link
              href="/services"
              className="flex items-center gap-1.5 px-3 py-2 text-sm font-semibold text-gray-700 hover:text-[#1F5F3F] hover:bg-white/60 rounded-xl no-underline transition-all"
            >
              <LayoutGrid className="w-4 h-4" />
              خدماتنا
            </Link>
          </nav>

          {/* Auth actions (desktop) */}
          <div className="hidden md:flex items-center gap-2">
            <Link href="/account" className="flex items-center gap-1.5 px-3 py-2 text-sm font-semibold text-gray-700 hover:text-[#1F5F3F] hover:bg-white/60 rounded-xl no-underline transition-all">
              <User className="w-4 h-4" />
              حسابي
            </Link>

            <NotificationButton variant="icon-only" />
            <ShareAppButton variant="compact" />
          </div>

          {/* Mobile actions */}
          <div className="md:hidden flex items-center gap-2">
            {/* Mobile dual CTA pill - immediately visible */}
            <Link
              href="/marketplace"
              className="flex items-center gap-1 px-3 py-2 bg-[#1F5F3F] text-white text-xs font-black rounded-lg shadow-soft no-underline"
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              <span>أجر مننا</span>
            </Link>
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="w-10 h-10 bg-white shadow-soft hover:shadow-card hover:-translate-y-0.5 rounded-xl flex items-center justify-center transition-all"
              aria-label="فتح القائمة"
            >
              <Menu className="w-5 h-5 text-gray-700" />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden" dir="rtl">
          <div className="absolute inset-0 bg-gray-900/50 backdrop-blur-sm animate-fade-in" onClick={() => setMobileOpen(false)} />
          <div className="absolute top-0 right-0 bottom-0 w-80 bg-white flex flex-col animate-slide-down">
            <div className="flex items-center justify-between p-4 border-b border-gray-100">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 bg-[#FAFAF7] rounded-2xl flex items-center justify-center overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/madmona-logo.png" alt="مضمونة" className="w-9 h-9 object-contain" width={36} height={36} />
                </div>
                <div>
                  <p className="font-black text-[#1F5F3F]">مضمونة</p>
                  <p className="text-[9px] text-gray-500 font-bold tracking-[0.2em]">MADMONA</p>
                </div>
              </div>
              <button type="button" onClick={() => setMobileOpen(false)} className="w-9 h-9 hover:bg-gray-50 rounded-xl flex items-center justify-center transition-colors">
                <X className="w-5 h-5 text-gray-700" />
              </button>
            </div>

            <nav className="flex-1 overflow-y-auto p-4 space-y-3">
              {/* TWO BIG CTA TABS - top of mobile drawer */}
              <Link
                href="/marketplace"
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-3 p-4 rounded-2xl bg-gradient-to-br from-[#1F5F3F] to-[#2d7a52] text-white no-underline shadow-soft hover:shadow-elevated transition-all"
              >
                <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
                  <ShoppingBag className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <p className="font-black text-lg">أجر مننا</p>
                  <p className="text-xs text-white/80 mt-0.5">اتصفّح الخدمات واحجز فوراً</p>
                </div>
              </Link>

              <Link
                href="/supplier/register"
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-3 p-4 rounded-2xl bg-gradient-to-br from-[#B8860B] to-[#d4a017] text-white no-underline shadow-soft hover:shadow-elevated transition-all"
              >
                <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
                  <Building2 className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <p className="font-black text-lg">أجر معانا</p>
                  <p className="text-xs text-white/80 mt-0.5">عندك خدمة؟ ٠٪ عمولة ٣٠ يوم</p>
                </div>
              </Link>

              {/* Other links */}
              <div className="pt-2 space-y-1">
                <Link href="/services" onClick={() => setMobileOpen(false)} className="flex items-center gap-3 p-3 rounded-2xl hover:bg-[#FAFAF7] no-underline group transition-colors">
                  <div className="w-10 h-10 rounded-xl bg-[#1F5F3F]/10 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                    <LayoutGrid className="w-5 h-5 text-[#1F5F3F]" />
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-gray-900">خدماتنا</p>
                    <p className="text-xs text-gray-500 mt-0.5">كل ما تقدمه مضمونة</p>
                  </div>
                </Link>

                <Link href="/account" onClick={() => setMobileOpen(false)} className="flex items-center gap-3 p-3 rounded-2xl hover:bg-[#FAFAF7] no-underline group transition-colors">
                  <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                    <User className="w-5 h-5 text-gray-700" />
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-gray-900">حسابي</p>
                    <p className="text-xs text-gray-500 mt-0.5">حجوزاتي والمفضلة</p>
                  </div>
                </Link>

                <Link href="/auth/login?redirect=/supplier/marketplace" onClick={() => setMobileOpen(false)} className="flex items-center gap-3 p-3 rounded-2xl hover:bg-[#FAFAF7] no-underline group transition-colors">
                  <div className="w-10 h-10 rounded-xl bg-[#B8860B]/10 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                    <LogIn className="w-5 h-5 text-[#B8860B]" />
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-gray-900">لوحة المورد</p>
                    <p className="text-xs text-gray-500 mt-0.5">عندك حساب بالفعل</p>
                  </div>
                </Link>

                <button
                  type="button"
                  onClick={triggerShare}
                  className="w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-[#FAFAF7] group transition-colors text-right"
                >
                  <div className="w-10 h-10 rounded-xl bg-[#B8860B]/10 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                    <Share2 className="w-5 h-5 text-[#B8860B]" />
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-gray-900">شارك مضمونة</p>
                    <p className="text-xs text-gray-500 mt-0.5">ابعت الموقع لأصحابك</p>
                  </div>
                </button>
              </div>
            </nav>

            <div className="p-4 border-t border-gray-100">
              <a href="https://wa.me/201002229982" target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 w-full bg-[#25D366] text-white py-3.5 rounded-2xl font-bold shadow-soft hover:shadow-elevated hover:-translate-y-0.5 transition-all no-underline">
                واتساب · رد فوري
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
