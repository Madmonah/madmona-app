'use client'
// أزرار البوستر: طباعة · شارك صفحتك على واتساب · انسخ الرابط (بتتخفي في الطباعة)
import { useState } from 'react'
import { Printer, MessageCircle, Copy, Check } from 'lucide-react'

export default function PosterActions({ name, url, posterUrl }: { name: string; url: string; posterUrl: string }) {
  const [copied, setCopied] = useState(false)
  const share = `https://wa.me/?text=${encodeURIComponent(`${name} على مضمونة — الأسعار والمواعيد والحجز من موبايلك:\n${url}?utm_source=whatsapp&utm_medium=share`)}`
  return (
    <div className="print:hidden sticky top-0 z-10 bg-[#04352A] text-white">
      <div className="mx-auto max-w-[520px] px-4 py-3 flex items-center gap-2 text-sm">
        <button onClick={() => window.print()} className="flex-1 rounded-xl bg-[#34D399] text-[#04352A] font-black py-2.5 flex items-center justify-center gap-1.5"><Printer className="w-4 h-4" /> اطبع</button>
        <a href={share} target="_blank" rel="noopener noreferrer" className="flex-1 rounded-xl bg-[#25D366] text-white font-black py-2.5 flex items-center justify-center gap-1.5 no-underline"><MessageCircle className="w-4 h-4" /> شارك صفحتك</a>
        <button onClick={async () => { try { await navigator.clipboard.writeText(posterUrl); setCopied(true); setTimeout(() => setCopied(false), 1500) } catch { /* لا كليب بورد */ } }} className="rounded-xl bg-white/10 px-3 py-2.5 font-bold flex items-center gap-1.5">{copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}</button>
      </div>
    </div>
  )
}
