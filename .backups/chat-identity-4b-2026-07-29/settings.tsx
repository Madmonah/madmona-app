'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabaseBrowser } from '@/lib/supabase-browser'
import ChatBottomNav from '@/components/ChatBottomNav'
import { subscribeToPush, unsubscribeFromPush, getNotificationPermission, isPushSupported, isSubscribed } from '@/lib/push-subscription'

type BIPEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> }

export default function ChatSettings() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [loggedIn, setLoggedIn] = useState(false)
  const [notifOn, setNotifOn] = useState(false)
  const [notifSupported, setNotifSupported] = useState(true)
  const [busy, setBusy] = useState(false)
  const [installEvt, setInstallEvt] = useState<BIPEvent | null>(null)
  const [msg, setMsg] = useState('')

  useEffect(() => {
    ;(async () => {
      try {
        const { data: { session } } = await supabaseBrowser.auth.getSession()
        if (session?.user) {
          setLoggedIn(true)
          const { data: prof } = await supabaseBrowser.from('profiles').select('phone, full_name').eq('id', session.user.id).maybeSingle()
          setName((prof as { full_name?: string } | null)?.full_name || '')
          setPhone((prof as { phone?: string } | null)?.phone || session.user.phone || '')
        }
      } catch {}
      if (!isPushSupported()) setNotifSupported(false)
      else setNotifOn(getNotificationPermission() === 'granted' && (await isSubscribed()))
    })()
    const onBip = (e: Event) => { e.preventDefault(); setInstallEvt(e as BIPEvent) }
    window.addEventListener('beforeinstallprompt', onBip)
    return () => window.removeEventListener('beforeinstallprompt', onBip)
  }, [])

  async function toggleNotif() {
    if (busy) return
    setBusy(true); setMsg('')
    try {
      if (notifOn) {
        await unsubscribeFromPush(); setNotifOn(false); setMsg('اتوقفت التنبيهات')
      } else {
        const r = await subscribeToPush()
        if (r.ok) { setNotifOn(true); setMsg('🔔 اتفعّلت — هنبعتلك لما المارد يرد وانت مش هنا') }
        else setMsg(r.error || 'مش قادر أفعّل التنبيهات')
      }
    } finally { setBusy(false) }
  }

  async function installApp() {
    if (!installEvt) return
    try { await installEvt.prompt(); await installEvt.userChoice } catch {}
    setInstallEvt(null)
  }

  async function signOut() {
    await supabaseBrowser.auth.signOut()
    router.push('/chat')
  }

  return (
    <div dir="rtl" style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: '#FAFAF7', fontFamily: 'system-ui, sans-serif' }}>
      <header style={{ background: '#075E54', color: '#fff', padding: '14px 16px', fontSize: 20, fontWeight: 800 }}>الإعدادات ⚙️</header>

      <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
        {loggedIn && (
          <div style={{ background: '#fff', borderRadius: 16, padding: 16, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 12, border: '1px solid #eee' }}>
            <div style={{ width: 52, height: 52, borderRadius: '50%', background: '#075E54', color: '#fff', display: 'grid', placeItems: 'center', fontSize: 22, fontWeight: 800 }}>{(name || '؟').trim().charAt(0)}</div>
            <div>
              <div style={{ fontWeight: 800, color: '#111' }}>{name || 'مستخدم مضمونة'}</div>
              <div style={{ fontSize: 13, color: '#8a8a8a', direction: 'ltr', textAlign: 'right' }}>{phone}</div>
            </div>
          </div>
        )}

        <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #eee', overflow: 'hidden', marginBottom: 14 }}>
          <button onClick={toggleNotif} disabled={!notifSupported || busy} style={rowBtn}>
            <span style={{ fontSize: 20 }}>🔔</span>
            <span style={{ flex: 1, textAlign: 'start', fontWeight: 600, color: '#111' }}>تنبيهات ردود المارد</span>
            <span style={{ fontSize: 13, color: notifOn ? '#1F6F5F' : '#999', fontWeight: 700 }}>{!notifSupported ? 'مش مدعوم' : notifOn ? 'مفعّلة' : 'متوقفة'}</span>
          </button>
          {installEvt && (
            <button onClick={installApp} style={{ ...rowBtn, borderTop: '1px solid #f0f0f0' }}>
              <span style={{ fontSize: 20 }}>📲</span>
              <span style={{ flex: 1, textAlign: 'start', fontWeight: 600, color: '#111' }}>ثبّت شات مضمونة على التليفون</span>
              <span style={{ fontSize: 13, color: '#1F6F5F', fontWeight: 700 }}>ثبّت</span>
            </button>
          )}
          <Link href="/account" style={{ ...rowBtn, borderTop: '1px solid #f0f0f0', textDecoration: 'none' }}>
            <span style={{ fontSize: 20 }}>👤</span>
            <span style={{ flex: 1, textAlign: 'start', fontWeight: 600, color: '#111' }}>حسابي على مضمونة</span>
            <span style={{ fontSize: 16, color: '#ccc' }}>←</span>
          </Link>
        </div>

        {msg && <div style={{ fontSize: 13, color: '#1F6F5F', textAlign: 'center', marginBottom: 14 }}>{msg}</div>}

        {loggedIn && (
          <button onClick={signOut} style={{ width: '100%', background: '#fff', border: '1px solid #f2c1c1', color: '#c0392b', borderRadius: 16, padding: '13px', fontWeight: 700, cursor: 'pointer' }}>تسجيل الخروج</button>
        )}
      </div>

      <ChatBottomNav />
    </div>
  )
}

const rowBtn: React.CSSProperties = { width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', background: 'none', border: 'none', cursor: 'pointer' }
