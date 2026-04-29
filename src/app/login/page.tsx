'use client'

import Link from 'next/link'
import { ArrowRight, User, Sparkles, Search, MessageCircle } from 'lucide-react'

// ============================================================
// Customer login — placeholder while customer accounts are being built.
// Currently customers book without an account; this page communicates
// what's coming and steers them to actions they can take today
// (browse spaces, contact us, sign up as a supplier).
// ============================================================

export default function CustomerLoginPage() {
  return (
    <div className="min-h-screen bg-[#FAFAF7] flex flex-col" dir="rtl">
      <header className="border-b border-gray-100 bg-white">
        <div className="max-w-md mx-auto px-4 py-4 flex items-center gap-3">
          <Link href="/" className="p-1 hover:bg-gray-50 rounded-full">
            <ArrowRight className="w-4 h-4 text-gray-600" />
          </Link>
          <h1 className="text-lg font-bold text-gray-900">حساب العملاء</h1>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-2xl border border-gray-100 p-8 shadow-sm">
          <div className="flex items-center justify-center w-14 h-14 bg-[#B8860B]/10 rounded-full mx-auto mb-4">
            <Sparkles className="w-6 h-6 text-[#B8860B]" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 text-center mb-2">قريباً</h2>
          <p className="text-sm text-gray-600 text-center leading-relaxed mb-6">
            بنشتغل على نظام حسابات العملاء. هتقدر تتابع حجوزاتك، تحفظ مساحاتك المفضلة، وتشوف تاريخ الحجز كله. حالياً تقدر تحجز مباشرة بدون حساب.
          </p>

          <div className="space-y-3">
            <Link
              href="/browse"
              className="flex items-center gap-3 p-4 bg-[#1F5F3F] text-white rounded-xl hover:bg-[#1F5F3F]/90 no-underline"
            >
              <Search className="w-5 h-5 flex-shrink-0" />
              <div className="flex-1 text-right">
                <p className="font-semibold">احجز مساحة دلوقتي</p>
                <p className="text-xs opacity-80">بدون حساب، حجز فوري</p>
              </div>
            </Link>

            <a
              href="https://wa.me/201002229982"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 p-4 bg-[#FAFAF7] border border-gray-100 hover:border-gray-200 rounded-xl no-underline"
            >
              <MessageCircle className="w-5 h-5 text-[#25D366] flex-shrink-0" />
              <div className="flex-1 text-right">
                <p className="font-semibold text-gray-900">تواصل عبر واتساب</p>
                <p className="text-xs text-gray-500">لو محتاج مساعدة في الحجز</p>
              </div>
            </a>
          </div>

          <div className="mt-6 pt-6 border-t border-gray-100 text-center">
            <Link
              href="/"
              className="inline-block text-sm text-gray-500 hover:text-[#1F5F3F] no-underline"
            >
              العودة للرئيسية
            </Link>
          </div>
        </div>
      </main>
    </div>
  )
}
