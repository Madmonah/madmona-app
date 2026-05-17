import Link from 'next/link'
import { ArrowRight, Home, Compass, MessageCircle } from 'lucide-react'

export default function NotFound() {
  return (
    <div
      className="min-h-screen gradient-mesh flex items-center justify-center px-6"
      dir="rtl"
    >
      <div className="max-w-md w-full text-center bg-white rounded-3xl shadow-luxe p-8 md:p-10">
        <div className="mb-6">
          <span className="text-7xl md:text-8xl font-black gradient-text-green tracking-tight tabular">
            ٤٠٤
          </span>
        </div>

        <h1 className="text-2xl md:text-3xl font-black text-gray-900 mb-3">
          الصفحة دي مش موجودة
        </h1>
        <p className="text-gray-600 leading-relaxed mb-8 text-sm md:text-base">
          ممكن تكون اتنقلت أو الرابط مش صح.
          <br />
          استكشف الـMarketplace أو اتواصل معانا.
        </p>

        <div className="space-y-2">
          <Link
            href="/"
            className="flex items-center justify-center gap-2 w-full bg-[#1F6F5F] text-white py-3.5 px-6 rounded-2xl font-bold hover:bg-[#1F6F5F]/90 shadow-elevated hover:shadow-luxe hover:-translate-y-0.5 transition-all no-underline"
          >
            <Home className="w-4 h-4" />
            <span>الصفحة الرئيسية</span>
          </Link>

          <Link
            href="/marketplace"
            className="flex items-center justify-center gap-2 w-full bg-white border border-gray-200 text-gray-900 py-3.5 px-6 rounded-2xl font-bold hover:bg-gray-50 hover:-translate-y-0.5 transition-all no-underline"
          >
            <Compass className="w-4 h-4" />
            <span>تصفح الـMarketplace</span>
            <ArrowRight className="w-4 h-4" />
          </Link>

          <a
            href="https://wa.me/201002229982"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full text-[#25D366] py-2.5 px-6 rounded-2xl font-bold text-sm hover:bg-[#25D366]/5 transition-all no-underline"
          >
            <MessageCircle className="w-4 h-4" />
            <span>تواصل عبر واتساب</span>
          </a>
        </div>

        <div className="mt-8 pt-6 border-t border-gray-100 text-[10px] text-gray-400 tracking-[0.3em] font-bold">
          MADMONA
        </div>
      </div>
    </div>
  )
}
