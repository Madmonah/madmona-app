'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabaseBrowser } from '@/lib/supabase-browser'
import ChatBottomNav from '@/components/ChatBottomNav'
import AvatarUpload from '@/components/AvatarUpload'
import { subscribeToPush, unsubscribeFromPush, getNotificationPermission, isPushSupported, isSubscribed } from '@/lib/push-subscription'

type BIPEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> }

export default function ChatSettings() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [avatar, setAvatar] = useState<string | null>(null)
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
          const { data: prof } = await supabaseBrowser.from('profiles').select('phone, full_name, avatar_url').eq('id', session.user.id).maybeSingle()
          setName((prof as { full_name?: string } | null)?.full_name || '')
          setPhone((prof as { phone?: string } | null)?.phone || session.user.phone || '')
          setAvatar((prof as { avatar_url?: string | null } | null)?.avatar_url || null)
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
    <div dir="rtl" style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: '#FAFAF7', fontFamily: "var(--font-cairo), system-ui, sans-serif" }}>
      <header style={{ background: 'linear-gradient(135deg,#14231E,#1F6F5F)', color: '#fff', padding: '14px 16px', fontSize: 17, fontWeight: 900, boxShadow: '0 2px 14px rgba(20,35,30,.28)' }}>الإعدادات ⚙️</header>

      <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
        {loggedIn && (
          <div style={{ background: '#fff', borderRadius: 16, padding: 16, marginBottom: 14, border: '1px solid #EAE5D9', boxShadow: '0 1px 2px rgba(20,35,30,.06)' }}>
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontWeight: 900, color: '#14231E' }}>{name || 'مستخدم مضمونة'}</div>
              <div style={{ fontSize: 13, color: '#8A9690', fontWeight: 600, direction: 'ltr', textAlign: 'right' }}>{phone}</div>
            </div>
            <AvatarUpload currentUrl={avatar} name={name} onChange={setAvatar} />
          </div>
        )}

        <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #EAE5D9', overflow: 'hidden', marginBottom: 14, boxShadow: '0 1px 2px rgba(20,35,30,.06)' }}>
          <button onClick={toggleNotif} disabled={!notifSupported || busy} style={rowBtn}>
            <span style={{ fontSize: 20 }}>🔔</span>
            <span style={{ flex: 1, textAlign: 'start', fontWeight: 700, color: '#14231E' }}>تنبيهات ردود المارد</span>
            <span style={{ fontSize: 13, color: notifOn ? '#1F6F5F' : '#8A9690', fontWeight: 800 }}>{!notifSupported ? 'مش مدعوم' : notifOn ? 'مفعّلة' : 'متوقفة'}</span>
          </button>
          {installEvt && (
            <button onClick={installApp} style={{ ...rowBtn, borderTop: '1px solid #F4F1E8' }}>
              <span style={{ fontSize: 20 }}>📲</span>
              <span style={{ flex: 1, textAlign: 'start', fontWeight: 700, color: '#14231E' }}>ثبّت شات مضمونة على التليفون</span>
              <span style={{ fontSize: 13, color: '#1F6F5F', fontWeight: 800 }}>ثبّت</span>
            </button>
          )}
          <Link href="/account" style={{ ...rowBtn, borderTop: '1px solid #F4F1E8', textDecoration: 'none' }}>
            <span style={{ fontSize: 20 }}>👤</span>
            <span style={{ flex: 1, textAlign: 'start', fontWeight: 700, color: '#14231E' }}>حسابي على مضمونة</span>
            <span style={{ fontSize: 16, color: '#C9C3B5' }}>←</span>
          </Link>
        </div>

        {msg && <div style={{ fontSize: 13, color: '#1F6F5F', fontWeight: 700, textAlign: 'center', marginBottom: 14 }}>{msg}</div>}

        {loggedIn && (
          <button onClick={signOut} style={{ width: '100%', background: '#fff', border: '1px solid rgba(226,109,92,.4)', color: '#E26D5C', borderRadius: 16, padding: '13px', fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit' }}>تسجيل الخروج</button>
        )}
      </div>

      <ChatBottomNav />
    </div>
  )
}

const rowBtn: React.CSSProperties = { width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', background: 'none', border: 'none', cursor: 'pointer' }
