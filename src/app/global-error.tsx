'use client'

import Link from 'next/link'
import { useEffect } from 'react'
import { AlertTriangle, Home, RefreshCw, MessageCircle } from 'lucide-react'

// Global error boundary — shown when an unhandled error occurs in any route
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log error to console (could also send to Sentry/etc)
    console.error('Global error:', error)
  }, [error])

  return (
    <html lang="ar" dir="rtl">
      <body className="min-h-screen bg-[#FAFAF7] flex items-center justify-center px-6 font-sans">
        <div className="max-w-md w-full text-center bg-white rounded-3xl shadow-xl p-8 md:p-10">
          <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-2xl flex items-center justify-center">
            <AlertTriangle className="w-8 h-8 text-red-600" />
          </div>

          <h1 className="text-2xl md:text-3xl font-black text-gray-900 mb-3">
            حصل خطأ مش متوقع
          </h1>
          <p className="text-gray-600 leading-relaxed mb-6 text-sm">
            معلش، فيه مشكلة تقنية. حاول تاني، ولو الموضوع كرر اتصل بينا.
          </p>

          {error?.digest && (
            <p className="text-[10px] text-gray-400 font-mono mb-6 bg-gray-50 py-2 px-3 rounded-lg">
              ID: {error.digest}
            </p>
          )}

          <div className="space-y-2">
            <button
              onClick={reset}
              className="flex items-center justify-center gap-2 w-full bg-[#FA8125] text-white py-3.5 px-6 rounded-2xl font-bold hover:bg-[#FA8125]/90 transition-all"
            >
              <RefreshCw className="w-4 h-4" />
              حاول تاني
            </button>

            <Link
              href="/"
              className="flex items-center justify-center gap-2 w-full bg-white border border-gray-200 text-gray-900 py-3.5 px-6 rounded-2xl font-bold hover:bg-gray-50 transition-all no-underline"
            >
              <Home className="w-4 h-4" />
              الصفحة الرئيسية
            </Link>

            <a
              href="https://wa.me/201002229982"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full text-[#25D366] py-2.5 px-6 rounded-2xl font-bold text-sm hover:bg-[#25D366]/5 transition-all no-underline"
            >
              <MessageCircle className="w-4 h-4" />
              تواصل عبر واتساب
            </a>
          </div>

          <div className="mt-8 pt-6 border-t border-gray-100 text-[10px] text-gray-400 tracking-[0.3em] font-bold">
            MADMONA
          </div>
        </div>
      </body>
    </html>
  )
}
