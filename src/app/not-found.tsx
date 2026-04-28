import Link from 'next/link'
import { ArrowRight, Home } from 'lucide-react'

export default function NotFound() {
  return (
    <div
      className="min-h-screen bg-[#FAFAF7] flex items-center justify-center px-6"
      dir="rtl"
    >
      <div className="max-w-md w-full text-center">
        {/* Subtle 404 mark with brand styling */}
        <div className="mb-6">
          <span className="text-7xl font-bold text-[#1F5F3F]/20 tracking-tight">
            ٤٠٤
          </span>
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-3">
          الصفحة دي مش موجودة
        </h1>
        <p className="text-gray-600 leading-relaxed mb-8">
          ممكن تكون اتنقلت أو الرابط مش صح. خليك معانا، فيه أماكن أحلى تستكشفها.
        </p>

        <div className="space-y-3">
          <Link
            href="/"
            className="flex items-center justify-center gap-2 w-full bg-[#1F5F3F] text-white py-3.5 px-6 rounded-xl font-semibold hover:bg-[#1F5F3F]/90 transition-colors no-underline"
          >
            <Home className="w-4 h-4" />
            <span>الصفحة الرئيسية</span>
          </Link>

          <Link
            href="/spaces/indoor-coworking"
            className="flex items-center justify-center gap-2 w-full bg-white border border-gray-200 text-gray-900 py-3.5 px-6 rounded-xl font-medium hover:bg-gray-50 transition-colors no-underline"
          >
            <span>اطّلع على المساحات</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Subtle wordmark at the bottom */}
        <div className="mt-12 text-xs text-gray-400 tracking-[0.3em]">
          MADMONA
        </div>
      </div>
    </div>
  )
}
