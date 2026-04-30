'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { Menu, X, Search, ChevronDown, Building2, User, LogIn, UserPlus, Compass } from 'lucide-react'

// ============================================================
// TopNav — sticky navbar shared by public pages.
// Links:
//   - / Madmona logo
//   - /browse — Madmona's own spaces (iteration3)
//   - /marketplace — Multi-supplier Marketplace (NEW)
//   - /account — Customer account hub
//   - /supplier/register or /auth/login → /supplier/marketplace
// ============================================================

export default function TopNav() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [supplierMenuOpen, setSupplierMenuOpen] = useState(false)
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

  return (
    <>
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <Link href="/" className="flex items-center gap-2 no-underline flex-shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/madmona-logo.png"
              alt="مضمونة"
              className="w-10 h-10 object-contain"
              width={40}
              height={40}
            />
            <div className="hidden sm:block">
              <p className="font-bold text-[#1F5F3F] text-base leading-none">مضمونة</p>
              <p className="text-[10px] text-gray-500 tracking-[0.2em] mt-0.5">MADMONA</p>
            </div>
          </Link>

          {/* Center nav (desktop) */}
          <nav className="hidden md:flex items-center gap-1">
            <Link
              href="/browse"
              className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-700 hover:text-[#1F5F3F] hover:bg-gray-50 rounded-lg no-underline"
            >
              <Search className="w-4 h-4" />
              استكشف مضمونة
            </Link>
            <Link
              href="/marketplace"
              className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-700 hover:text-[#1F5F3F] hover:bg-gray-50 rounded-lg no-underline"
            >
              <Compass className="w-4 h-4" />
              Marketplace
            </Link>
          </nav>

          {/* Auth actions (desktop) */}
          <div className="hidden md:flex items-center gap-2">
            <Link
              href="/account"
              className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-700 hover:text-[#1F5F3F] hover:bg-gray-50 rounded-lg no-underline"
            >
              <User className="w-4 h-4" />
              حسابي
            </Link>

            <div className="relative" ref={supplierMenuRef}>
              <button
                type="button"
                onClick={() => setSupplierMenuOpen((o) => !o)}
                className="flex items-center gap-1.5 px-4 py-2 bg-[#1F5F3F] text-white text-sm font-semibold rounded-lg hover:bg-[#1F5F3F]/90"
              >
                <Building2 className="w-4 h-4" />
                للموردين
                <ChevronDown
                  className={`w-3.5 h-3.5 transition-transform ${
                    supplierMenuOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {supplierMenuOpen && (
                <div className="absolute top-full left-0 mt-2 w-56 bg-white rounded-xl border border-gray-100 shadow-lg overflow-hidden">
                  <Link
                    href="/supplier/register"
                    onClick={() => setSupplierMenuOpen(false)}
                    className="flex items-start gap-3 p-4 hover:bg-[#FAFAF7] no-underline"
                  >
                    <UserPlus className="w-4 h-4 text-[#B8860B] flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-gray-900">سجّل عرضك</p>
                      <p className="text-xs text-gray-500 mt-0.5">انضم للمنصة</p>
                    </div>
                  </Link>
                  <div className="h-px bg-gray-100" />
                  <Link
                    href="/auth/login?redirect=/supplier/marketplace"
                    onClick={() => setSupplierMenuOpen(false)}
                    className="flex items-start gap-3 p-4 hover:bg-[#FAFAF7] no-underline"
                  >
                    <LogIn className="w-4 h-4 text-[#1F5F3F] flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-gray-900">لوحة المورد</p>
                      <p className="text-xs text-gray-500 mt-0.5">عندك حساب بالفعل</p>
                    </div>
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* Mobile menu button */}
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="md:hidden p-2 hover:bg-gray-50 rounded-lg"
            aria-label="فتح القائمة"
          >
            <Menu className="w-5 h-5 text-gray-700" />
          </button>
        </div>
      </header>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden" dir="rtl">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setMobileOpen(false)}
          />
          <div className="absolute top-0 right-0 bottom-0 w-72 bg-white shadow-xl flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-gray-100">
              <div className="flex items-center gap-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/madmona-logo.png"
                  alt="مضمونة"
                  className="w-9 h-9 object-contain"
                  width={36}
                  height={36}
                />
                <p className="font-bold text-[#1F5F3F]">مضمونة</p>
              </div>
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className="p-2 hover:bg-gray-50 rounded-lg"
                aria-label="إغلاق"
              >
                <X className="w-5 h-5 text-gray-700" />
              </button>
            </div>

            <nav className="flex-1 overflow-y-auto p-4 space-y-1">
              <Link
                href="/browse"
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-3 p-3 rounded-xl hover:bg-[#FAFAF7] no-underline"
              >
                <Search className="w-5 h-5 text-[#1F5F3F]" />
                <span className="font-medium text-gray-900">استكشف مضمونة</span>
              </Link>

              <Link
                href="/marketplace"
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-3 p-3 rounded-xl hover:bg-[#FAFAF7] no-underline"
              >
                <Compass className="w-5 h-5 text-[#1F5F3F]" />
                <span className="font-medium text-gray-900">Marketplace</span>
              </Link>

              <Link
                href="/account"
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-3 p-3 rounded-xl hover:bg-[#FAFAF7] no-underline"
              >
                <User className="w-5 h-5 text-gray-600" />
                <span className="font-medium text-gray-900">حسابي</span>
              </Link>

              <div className="pt-4 mt-4 border-t border-gray-100">
                <p className="px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                  للموردين
                </p>
                <Link
                  href="/supplier/register"
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-3 p-3 rounded-xl hover:bg-[#FAFAF7] no-underline"
                >
                  <UserPlus className="w-5 h-5 text-[#B8860B]" />
                  <div>
                    <p className="font-medium text-gray-900">سجّل عرضك</p>
                    <p className="text-xs text-gray-500">انضم للمنصة</p>
                  </div>
                </Link>
                <Link
                  href="/auth/login?redirect=/supplier/marketplace"
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-3 p-3 rounded-xl hover:bg-[#FAFAF7] no-underline"
                >
                  <LogIn className="w-5 h-5 text-[#1F5F3F]" />
                  <div>
                    <p className="font-medium text-gray-900">لوحة المورد</p>
                    <p className="text-xs text-gray-500">عندك حساب بالفعل</p>
                  </div>
                </Link>
              </div>
            </nav>

            <div className="p-4 border-t border-gray-100">
              <a
                href="https://wa.me/201002229982"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full bg-[#25D366] text-white py-3 rounded-xl font-semibold no-underline"
              >
                واتساب
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
