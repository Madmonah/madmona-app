'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

// MaridChatFab — زرار عائم «كلّم المارد» بيوصّل لشات مضمونة على الموقع نفسه (/chat/marid).
// بيظهر في كل الموقع ماعدا صفحات التطبيق الداخلية (الشات/الفريق/الأدمن/الموردين/الدخول/الحضور)
// عشان ميكررش نفسه وميضايقش المستخدم. فوق الـBottomNav على الموبايل (z-50).
const GENIE = 'https://res.cloudinary.com/duxfgqioc/image/upload/madmona/mascots/genie.png'
const HIDE_ON = ['/chat', '/team', '/admin', '/supplier', '/owner', '/auth', '/login', '/clock', '/qr', '/at', '/v']

export default function MaridChatFab() {
  const pathname = usePathname() || ''
  if (HIDE_ON.some((p) => pathname === p || pathname.startsWith(p + '/'))) return null

  return (
    <Link
      href="/chat/marid"
      aria-label="كلّم المارد على مضمونة"
      title="كلّم المارد"
      className="fixed z-50 right-4 bottom-24 md:bottom-6 flex items-center gap-2 ps-1.5 pe-4 py-1.5 rounded-full text-white font-bold text-sm no-underline shadow-luxe ring-2 ring-white/60 hover:-translate-y-0.5 transition-transform"
      style={{ background: 'linear-gradient(135deg,#0a7d6e 0%,#075E54 100%)' }}
    >
      <span className="w-9 h-9 rounded-full bg-white grid place-items-center overflow-hidden shrink-0">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={GENIE} alt="" className="w-7 h-7 object-contain" />
      </span>
      <span>كلّم المارد</span>
    </Link>
  )
}
