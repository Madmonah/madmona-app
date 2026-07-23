'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  isPushSupported,
  getNotificationPermission,
  isSubscribed,
  subscribeToPush,
} from '@/lib/push-subscription'
import { supabaseBrowser } from '@/lib/supabase-browser'

// بوابة إجبارية لشات مضمونة: لازم تفعّل الإشعارات عشان يوصلك رد المارد.
// الشات async (المارد بيرد بعد شوية) فمن غير إشعار الرد بيضيع. بتتعامل بذكاء مع:
// iOS غير مثبّت → تثبيت الأول · الإذن متمنوع → من الإعدادات · متصفح مبيدعمش → مرور ·
// مفيش دخول → لازم دخول عشان نحفظ الاشتراك. بنستثني /chat/settings عشان إدارة الحساب.

type GateState =
  | 'checking' | 'ok' | 'need_enable' | 'denied'
  | 'ios_install' | 'need_login' | 'unsupported'

function isIOS() {
  if (typeof navigator === 'undefined') return false
  return /iphone|ipad|ipod/i.test(navigator.userAgent)
}
function isStandalone() {
  if (typeof window === 'undefined') return false
  return !!(window.matchMedia?.('(display-mode: standalone)')?.matches
    || (window.navigator as unknown as { standalone?: boolean }).standalone === true)
}

export default function ChatNotificationGate() {
  const pathname = usePathname() || ''
  const [state, setState] = useState<GateState>('checking')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const evaluate = useCallback(async () => {
    if (!isPushSupported()) {
      if (isIOS() && !isStandalone()) { setState('ios_install'); return }
      setState('unsupported'); return
    }
    const perm = getNotificationPermission()
    if (perm === 'denied') { setState('denied'); return }
    if (perm === 'granted' && (await isSubscribed())) { setState('ok'); return }
    const { data: { session } } = await supabaseBrowser.auth.getSession()
    if (!session?.user) { setState('need_login'); return }
    setState('need_enable')
  }, [])

  useEffect(() => { evaluate() }, [evaluate])

  const enable = async () => {
    setBusy(true); setErr(null)
    const r = await subscribeToPush()
    setBusy(false)
    if (r.ok) { setState('ok'); return }
    if (getNotificationPermission() === 'denied') { setState('denied'); return }
    if (/دخول/.test(r.error || '')) { setState('need_login'); return }
    setErr(r.error || 'مش قادر أفعّل — جرّب تاني')
  }

  // صفحة الإعدادات دايمًا متاحة (فيها إدارة الإشعارات وتسجيل الخروج)
  if (pathname.startsWith('/chat/settings')) return null
  if (state === 'checking' || state === 'ok' || state === 'unsupported') return null

  const wrap: React.CSSProperties = {
    position: 'fixed', inset: 0, zIndex: 10000, padding: 20,
    background: 'linear-gradient(160deg,#075E54,#0a3d36)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontFamily: 'system-ui, sans-serif',
  }
  const card: React.CSSProperties = {
    background: '#fff', borderRadius: 22, padding: '26px 22px', maxWidth: 380,
    width: '100%', textAlign: 'center', boxShadow: '0 20px 60px rgba(0,0,0,.35)',
  }
  const h2: React.CSSProperties = { margin: '0 0 8px', fontSize: 20, color: '#075E54', fontWeight: 800 }
  const para: React.CSSProperties = { margin: '0 0 14px', color: '#555', fontSize: 14, lineHeight: 1.7 }
  const btn: React.CSSProperties = {
    width: '100%', background: 'linear-gradient(135deg,#1aa58f,#0f7d6c)', color: '#fff',
    border: 'none', borderRadius: 16, padding: '14px', fontSize: 16, fontWeight: 800,
    cursor: 'pointer', textDecoration: 'none', display: 'block', boxSizing: 'border-box',
  }

  return (
    <div dir="rtl" style={wrap}>
      <div style={card}>
        <div style={{ fontSize: 46, marginBottom: 6 }}>🔔</div>
        {state === 'need_enable' && (
          <>
            <h2 style={h2}>فعّل الإشعارات عشان تكمّل</h2>
            <p style={para}>المارد بيرد بعد شوية — من غير إشعارات مش هتعرف إنه رد. فعّلها عشان أي رد يوصلك على طول.</p>
            {err && <div style={{ background: '#fdecea', color: '#c0392b', borderRadius: 12, padding: 8, fontSize: 13, marginBottom: 10 }}>{err}</div>}
            <button onClick={enable} disabled={busy} style={{ ...btn, opacity: busy ? 0.6 : 1 }}>{busy ? 'جاري التفعيل…' : '🔔 فعّل الإشعارات'}</button>
          </>
        )}
        {state === 'denied' && (
          <>
            <h2 style={h2}>الإشعارات متمنوعة</h2>
            <p style={para}>المتصفح رافض الإشعارات. افتح إعدادات الموقع (القفل 🔒 جنب العنوان) وفعّل «الإشعارات»، وبعدين ارجع واضغط تحت.</p>
            <button onClick={evaluate} style={btn}>جرّبت تاني ✓</button>
          </>
        )}
        {state === 'ios_install' && (
          <>
            <h2 style={h2}>ثبّت شات مضمونة الأول</h2>
            <p style={para}>عشان الإشعارات تشتغل على الآيفون، ضيف الشات للشاشة الرئيسية: اضغط زر المشاركة ⬆️ تحت في سفاري، واختار «إضافة إلى الشاشة الرئيسية»، وافتحه من الأيقونة.</p>
            <button onClick={evaluate} style={btn}>عملت كده — كمّل</button>
          </>
        )}
        {state === 'need_login' && (
          <>
            <h2 style={h2}>سجّل دخولك عشان تكمّل</h2>
            <p style={para}>عشان يوصلك رد المارد لازم تسجّل دخول وتفعّل الإشعارات — دقيقة وتخلص.</p>
            <Link href="/auth/login" style={btn}>تسجيل الدخول</Link>
          </>
        )}
      </div>
    </div>
  )
}
