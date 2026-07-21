'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { supabaseBrowser } from '@/lib/supabase-browser'
import ChatBottomNav from '@/components/ChatBottomNav'
import { subscribeToPush, getNotificationPermission, isPushSupported } from '@/lib/push-subscription'

type Attach = { type: 'image' | 'audio' | 'video' | 'document'; mimetype: string; data_base64: string; filename?: string; previewUrl?: string }
type Msg = { role: 'user' | 'bot' | 'sys'; text: string; time: string; media?: Attach }
type BIPEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }> }

const EMOJIS = ['😀','😂','🥰','😍','👍','🙏','🔥','🎉','❤️','😅','😊','🤝','👌','💪','🙌','😎','🤔','😢','😮','🥳','😉','🫡','💯','✅','⭐','🎁','📦','🚗','🏠','🍔','☕','💰','📞','✍️','👏','😇','🤩','🌹','🙈','🤗']
const QUICKS = ['عايز أشوف العروض 🛍️', 'احجزلي ميعاد 🗓️', 'كلمني عن العقارات 🏠', 'عايز أضيف إعلان ➕']

function nowTime() {
  return new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })
}
function normEg(raw: string) {
  let d = (raw || '').replace(/\D/g, '')
  if (d.startsWith('0') && d.length === 11) d = '20' + d.slice(1)
  if (d.length === 10) d = '20' + d
  return d
}
function linkify(text: string): React.ReactNode[] {
  return (text || '').split(/(https?:\/\/[^\s]+)/g).map((p, i) =>
    /^https?:\/\//.test(p) ? (
      <a key={i} href={p} target="_blank" rel="noopener noreferrer" style={{ color: '#1F6F5F', fontWeight: 600, textDecoration: 'underline', wordBreak: 'break-all' }}>{p}</a>
    ) : (
      <span key={i}>{p}</span>
    )
  )
}

export default function ChatPage() {
  const [phone, setPhone] = useState('')
  const [name, setName] = useState('')
  const [started, setStarted] = useState(false)
  const [authChecked, setAuthChecked] = useState(false)
  const [messages, setMessages] = useState<Msg[]>([])
  const [input, setInput] = useState('')
  const [attach, setAttach] = useState<Attach | null>(null)
  const [sending, setSending] = useState(false)
  const [recording, setRecording] = useState(false)
  const [showEmoji, setShowEmoji] = useState(false)
  const [showPlus, setShowPlus] = useState(false)
  const [maridOn] = useState(true) // تاب المارد = المارد دايمًا حاضر (شخصي)
  const [installEvt, setInstallEvt] = useState<BIPEvent | null>(null)
  const [iosHint, setIosHint] = useState(false)
  const [installDismissed, setInstallDismissed] = useState(false)
  const [notifState, setNotifState] = useState<'unsupported' | 'default' | 'granted' | 'denied'>('default')
  const scrollRef = useRef<HTMLDivElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const calRef = useRef<HTMLInputElement>(null)
  const recRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])

  const welcome = useCallback((nm: string) => {
    setMessages([{ role: 'sys', text: `أهلاً${nm ? ' يا ' + nm : ''} 👋 أنا المارد، مساعدك الشخصي على مضمونة — اسألني في أي حاجة.`, time: nowTime() }])
  }, [])

  // تحميل تاريخ المحادثة السابقة (محمي بالتوكن) وتحويله لرسايل الشاشة
  async function loadHistory(token: string): Promise<Msg[]> {
    try {
      const res = await fetch('/api/chat', { headers: { Authorization: `Bearer ${token}` } })
      const data = await res.json()
      if (!data?.ok || !Array.isArray(data.messages)) return []
      type HistRow = { direction: string; message_type: string; text: string; media_url: string | null; created_at: string }
      return (data.messages as HistRow[]).map((m): Msg => {
        const role: Msg['role'] = m.direction === 'inbound' ? 'user' : 'bot'
        let media: Attach | undefined
        let text = m.text || ''
        if (m.message_type === 'image' && m.media_url) {
          media = { type: 'image', mimetype: 'image/jpeg', data_base64: '', previewUrl: m.media_url }
        } else if (m.media_url) {
          text = (text ? text + '\n' : '') + m.media_url
        }
        const time = (() => { try { return new Date(m.created_at).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }) } catch { return nowTime() } })()
        return { role, text, time, media }
      })
    } catch { return [] }
  }

  useEffect(() => {
    ;(async () => {
      try {
        const { data: { session } } = await supabaseBrowser.auth.getSession()
        if (session?.user) {
          const { data: prof } = await supabaseBrowser.from('profiles').select('phone, full_name').eq('id', session.user.id).maybeSingle()
          const p = normEg((prof as { phone?: string } | null)?.phone || session.user.phone || '')
          const nm = ((prof as { full_name?: string } | null)?.full_name || '').trim()
          if (p && p.length >= 11) {
            setPhone(p); setName(nm); setStarted(true)
            const hist = await loadHistory(session.access_token)
            if (hist.length) setMessages(hist)
            else welcome(nm)
          }
        }
      } catch {}
      setAuthChecked(true)
    })()
  }, [welcome])

  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' }) }, [messages, sending])

  // تثبيت الشات كأيقونة على التليفون (PWA)
  useEffect(() => {
    const standalone = window.matchMedia?.('(display-mode: standalone)')?.matches
      || (window.navigator as unknown as { standalone?: boolean }).standalone === true
    if (standalone) return
    const onBip = (e: Event) => { e.preventDefault(); setInstallEvt(e as BIPEvent) }
    const onInstalled = () => { setInstallEvt(null); setIosHint(false) }
    window.addEventListener('beforeinstallprompt', onBip)
    window.addEventListener('appinstalled', onInstalled)
    const ua = navigator.userAgent || ''
    const isIOS = /iphone|ipad|ipod/i.test(ua)
    const isSafari = /^((?!chrome|android|crios|fxios).)*safari/i.test(ua)
    if (isIOS && isSafari) setIosHint(true)
    return () => {
      window.removeEventListener('beforeinstallprompt', onBip)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  async function installApp() {
    if (!installEvt) return
    try { await installEvt.prompt(); await installEvt.userChoice } catch {}
    setInstallEvt(null)
  }

  // حالة إذن التنبيهات
  useEffect(() => {
    if (!isPushSupported()) { setNotifState('unsupported'); return }
    const p = getNotificationPermission()
    setNotifState(p === 'unsupported' ? 'unsupported' : p)
  }, [])

  async function enableNotifs() {
    const r = await subscribeToPush()
    if (r.ok) {
      setNotifState('granted')
      setMessages((m) => [...m, { role: 'sys', text: '🔔 تمام — هنبعتلك تنبيه لو المارد رد وانت مش فاتح الشات.', time: nowTime() }])
    } else {
      setMessages((m) => [...m, { role: 'sys', text: r.error || 'مش قادر أفعّل التنبيهات دلوقتي.', time: nowTime() }])
      if (getNotificationPermission() === 'denied') setNotifState('denied')
    }
  }

  function start() { if (normEg(phone).length < 11) return; setStarted(true); welcome(name.trim()) }

  async function submit(text: string, media: Attach | null, summonNow: boolean) {
    if ((!text && !media) || sending) return
    setMessages((m) => [...m, { role: 'user', text, time: nowTime(), media: media || undefined }])
    if (summonNow) setSending(true)
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, name, message: text, summon: summonNow, media: media ? { type: media.type, mimetype: media.mimetype, data_base64: media.data_base64, filename: media.filename } : undefined }),
      })
      const data = await res.json()
      if (data?.ok && data.reply) setMessages((m) => [...m, { role: 'bot', text: data.reply, time: nowTime() }])
      else if (!data?.ok) setMessages((m) => [...m, { role: 'sys', text: data?.error || 'حصل خطأ مؤقت، جرّب تاني.', time: nowTime() }])
    } catch {
      setMessages((m) => [...m, { role: 'sys', text: 'مش قادر أوصل للسيرفر دلوقتي، جرّب تاني.', time: nowTime() }])
    } finally {
      setSending(false)
    }
  }

  function send() {
    const t = input.trim(); const m = attach
    if (!t && !m) return
    setInput(''); setAttach(null); setShowEmoji(false); setShowPlus(false)
    submit(t, m, maridOn)
  }
  function sendQuick(t: string) { submit(t, null, maridOn) }
  function sendLocation() {
    setShowPlus(false)
    if (!navigator.geolocation) { alert('الموقع مش متاح في المتصفح ده'); return }
    navigator.geolocation.getCurrentPosition(
      (pos) => submit(`📍 موقعي: https://maps.google.com/?q=${pos.coords.latitude.toFixed(6)},${pos.coords.longitude.toFixed(6)}`, null, maridOn),
      () => alert('مش قادر أجيب موقعك — اسمح للمتصفح بالوصول للموقع')
    )
  }
  function onCal(e: React.ChangeEvent<HTMLInputElement>) {
    const v = e.target.value; e.target.value = ''; setShowPlus(false)
    if (!v) return
    submit(`🗓️ أنا متاح: ${new Date(v).toLocaleString('ar-EG', { dateStyle: 'full', timeStyle: 'short' })}`, null, maridOn)
  }

  function compressImage(file: File): Promise<Attach> {
    return new Promise((resolve) => {
      const img = new Image(); const url = URL.createObjectURL(file)
      img.onload = () => {
        const scale = Math.min(1, 1280 / img.width)
        const c = document.createElement('canvas')
        c.width = Math.round(img.width * scale); c.height = Math.round(img.height * scale)
        c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height)
        const dataUrl = c.toDataURL('image/jpeg', 0.7); URL.revokeObjectURL(url)
        resolve({ type: 'image', mimetype: 'image/jpeg', data_base64: dataUrl.split(',')[1], filename: file.name, previewUrl: dataUrl })
      }
      img.src = url
    })
  }
  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return; e.target.value = ''; setShowPlus(false)
    if (file.size > 30 * 1024 * 1024) { alert('الملف كبير أوي (أقصى ٣٠ ميجا)'); return }
    if (file.type.startsWith('image/')) { setAttach(await compressImage(file)); return }
    const b64: string = await new Promise((res) => { const r = new FileReader(); r.onload = () => res((r.result as string).split(',')[1]); r.readAsDataURL(file) })
    const type = file.type.startsWith('video/') ? 'video' : file.type.startsWith('audio/') ? 'audio' : 'document'
    setAttach({ type, mimetype: file.type || 'application/octet-stream', data_base64: b64, filename: file.name })
  }
  async function toggleRec() {
    if (recording) { recRef.current?.stop(); return }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mr = new MediaRecorder(stream); chunksRef.current = []
      mr.ondataavailable = (ev) => chunksRef.current.push(ev.data)
      mr.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop())
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
        const b64: string = await new Promise((res) => { const r = new FileReader(); r.onload = () => res((r.result as string).split(',')[1]); r.readAsDataURL(blob) })
        setAttach({ type: 'audio', mimetype: 'audio/webm', data_base64: b64, filename: 'voice.webm' }); setRecording(false)
      }
      recRef.current = mr; mr.start(); setRecording(true)
    } catch { alert('مش قادر أوصل للمايك') }
  }

  if (!authChecked) return <div dir="rtl" style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: '#075E54', color: '#fff', fontFamily: 'system-ui' }}>لحظة…</div>

  if (!started) {
    return (
      <div dir="rtl" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#075E54', padding: 16, fontFamily: 'system-ui, sans-serif' }}>
        <div style={{ background: '#fff', borderRadius: 16, padding: 28, width: '100%', maxWidth: 380, boxShadow: '0 10px 40px rgba(0,0,0,.3)' }}>
          <div style={{ textAlign: 'center', fontSize: 44, marginBottom: 6 }}>💬</div>
          <h1 style={{ textAlign: 'center', margin: '0 0 4px', fontSize: 22, color: '#075E54' }}>شات مضمونة</h1>
          <p style={{ textAlign: 'center', margin: '0 0 20px', color: '#667', fontSize: 14 }}>كلّم المارد مباشرة — زي واتساب بالظبط</p>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="اسمك" style={inp} />
          <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="رقم موبايلك" inputMode="tel" style={inp} onKeyDown={(e) => e.key === 'Enter' && start()} />
          <button onClick={start} style={{ ...btn, width: '100%', marginTop: 6 }}>ابدأ المحادثة</button>
        </div>
      </div>
    )
  }

  const hasText = input.trim().length > 0 || !!attach

  return (
    <div dir="rtl" style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: '#ECE5DD', fontFamily: 'system-ui, sans-serif' }}>
      <header style={{ background: '#075E54', color: '#fff', padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
        <Link href="/chat" aria-label="رجوع" style={{ color: '#fff', textDecoration: 'none', fontSize: 24, lineHeight: 1, padding: '2px 4px', flexShrink: 0 }}>→</Link>
        <div style={{ width: 42, height: 42, borderRadius: '50%', background: '#fff', overflow: 'hidden', flexShrink: 0, border: '2px solid rgba(255,255,255,.35)' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="https://res.cloudinary.com/duxfgqioc/image/upload/c_crop,x_375,y_120,w_410,h_410/c_fill,w_120,h_120/madmona/mascots/genie.png" alt="المارد" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700 }}>المارد 🧞</div>
          <div style={{ fontSize: 12, opacity: .85 }}>{sending ? 'بيكتب…' : 'مساعدك الشخصي · حاضر'}</div>
        </div>
        {notifState === 'default' && (
          <button onClick={enableNotifs} title="فعّل التنبيهات" aria-label="فعّل التنبيهات" style={{ background: 'rgba(255,255,255,.15)', color: '#fff', border: 'none', borderRadius: '50%', width: 34, height: 34, fontSize: 16, cursor: 'pointer', flexShrink: 0 }}>🔔</button>
        )}
      </header>

      {(installEvt || iosHint) && !installDismissed && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: '#DCF8C6', borderBottom: '1px solid #cbe8bd', fontSize: 13, color: '#0a5e46' }}>
          <span style={{ fontSize: 18 }}>📲</span>
          {installEvt ? (
            <>
              <span style={{ flex: 1 }}>ثبّت شات مضمونة على تليفونك — أيقونة مستقلة، رد فوري بضغطة.</span>
              <button onClick={installApp} style={{ background: '#128C7E', color: '#fff', border: 'none', borderRadius: 16, padding: '6px 14px', fontSize: 13, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>ثبّت</button>
            </>
          ) : (
            <span style={{ flex: 1 }}>عايز الشات كأيقونة؟ اضغط زر المشاركة ⬆️ في سفاري واختار «إضافة إلى الشاشة الرئيسية».</span>
          )}
          <button onClick={() => setInstallDismissed(true)} aria-label="إغلاق" style={{ border: 'none', background: 'none', color: '#0a5e46', cursor: 'pointer', fontSize: 16, lineHeight: 1 }}>✕</button>
        </div>
      )}

      <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: '14px 10px' }}>
        {messages.map((m, i) => (
          m.role === 'sys' ? (
            <div key={i} style={{ textAlign: 'center', margin: '10px 0' }}>
              <span style={{ background: '#d7ece2', color: '#0a6b4f', fontSize: 12, padding: '5px 12px', borderRadius: 12, display: 'inline-block', maxWidth: '85%' }}>{m.text}</span>
            </div>
          ) : (
          <div key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-start' : 'flex-end', marginBottom: 8 }}>
            <div style={{ maxWidth: '78%', background: m.role === 'user' ? '#DCF8C6' : '#fff', padding: '7px 10px', borderRadius: 10, boxShadow: '0 1px 1px rgba(0,0,0,.12)', whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: 15, lineHeight: 1.5 }}>
              {m.media?.type === 'image' && m.media.previewUrl && <img src={m.media.previewUrl} alt="" style={{ maxWidth: '100%', borderRadius: 8, marginBottom: m.text ? 6 : 0 }} />}
              {m.media?.type === 'audio' && <div style={{ marginBottom: m.text ? 6 : 0 }}>🎤 رسالة صوتية</div>}
              {m.media && m.media.type !== 'image' && m.media.type !== 'audio' && <div style={{ marginBottom: m.text ? 6 : 0 }}>📎 {m.media.filename || m.media.type}</div>}
              {linkify(m.text)}
              <span style={{ display: 'block', textAlign: 'left', fontSize: 10, color: '#8a8a8a', marginTop: 2 }}>{m.time}</span>
            </div>
          </div>
          )
        ))}
        {sending && <div style={{ textAlign: 'end', color: '#667', fontSize: 13, padding: '2px 8px' }}>المارد بيكتب…</div>}
        {maridOn && !sending && messages[messages.length - 1]?.role === 'bot' && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'flex-end', marginTop: 6 }}>
            {QUICKS.map((q) => (
              <button key={q} onClick={() => sendQuick(q)} style={{ background: '#fff', border: '1px solid #25D366', color: '#075E54', borderRadius: 16, padding: '6px 12px', fontSize: 13, cursor: 'pointer' }}>{q}</button>
            ))}
          </div>
        )}
      </div>

      {showEmoji && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, padding: 8, background: '#fff', borderTop: '1px solid #ddd', maxHeight: 160, overflowY: 'auto' }}>
          {EMOJIS.map((e) => (
            <button key={e} onClick={() => setInput((v) => v + e)} style={{ border: 'none', background: 'none', fontSize: 24, cursor: 'pointer', padding: 3 }}>{e}</button>
          ))}
        </div>
      )}

      {showPlus && (
        <div style={{ display: 'flex', gap: 10, padding: 12, background: '#fff', borderTop: '1px solid #ddd' }}>
          <button onClick={() => fileRef.current?.click()} style={sheetBtn}>🖼️<div style={sheetLbl}>صورة/ملف</div></button>
          <button onClick={sendLocation} style={sheetBtn}>📍<div style={sheetLbl}>موقعي</div></button>
          <button onClick={() => { const el = calRef.current; if (el) { try { el.showPicker() } catch { el.click() } } }} style={sheetBtn}>🗓️<div style={sheetLbl}>ميعاد</div></button>
        </div>
      )}

      {attach && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px', background: '#e8f5e9', fontSize: 13 }}>
          <span>{attach.type === 'image' ? '🖼️ صورة جاهزة' : attach.type === 'audio' ? '🎤 صوت جاهز' : '📎 ' + (attach.filename || 'ملف')}</span>
          <button onClick={() => setAttach(null)} style={{ marginInlineStart: 'auto', border: 'none', background: 'none', color: '#c00', cursor: 'pointer', fontSize: 16 }}>✕</button>
        </div>
      )}

      <div style={{ display: 'flex', gap: 4, padding: 8, background: '#F0F0F0', alignItems: 'center' }}>
        <input ref={fileRef} type="file" accept="image/*,video/*,application/pdf" onChange={onFile} style={{ display: 'none' }} />
        <input ref={calRef} type="datetime-local" onChange={onCal} style={{ display: 'none' }} />
        <button onClick={() => { setShowPlus((v) => !v); setShowEmoji(false) }} title="إرفاق" style={{ ...iconBtn, transform: showPlus ? 'rotate(45deg)' : 'none' }}>➕</button>
        <button onClick={() => { setShowEmoji((v) => !v); setShowPlus(false) }} title="إيموجي" style={iconBtn}>😊</button>
        <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && send()} onFocus={() => { setShowEmoji(false); setShowPlus(false) }} placeholder={recording ? 'بسجّل…' : 'اكتب رسالة'} style={{ ...inp, margin: 0, flex: 1 }} />
        {hasText ? (
          <button onClick={send} disabled={sending} style={{ ...btn, width: 48, padding: 0, opacity: sending ? .6 : 1 }}>➤</button>
        ) : (
          <button onClick={toggleRec} title="تسجيل صوت" style={{ ...btn, width: 48, padding: 0, background: recording ? '#c0392b' : '#128C7E' }}>{recording ? '⏹️' : '🎤'}</button>
        )}
      </div>
      <ChatBottomNav />
    </div>
  )
}

const inp: React.CSSProperties = { width: '100%', boxSizing: 'border-box', padding: '12px 14px', margin: '0 0 12px', border: '1px solid #ddd', borderRadius: 22, fontSize: 15, outline: 'none' }
const btn: React.CSSProperties = { background: '#128C7E', color: '#fff', border: 'none', borderRadius: '50%', height: 48, fontSize: 18, fontWeight: 700, cursor: 'pointer' }
const iconBtn: React.CSSProperties = { border: 'none', background: 'none', fontSize: 22, cursor: 'pointer', padding: 4, lineHeight: 1, transition: 'transform .15s' }
const sheetBtn: React.CSSProperties = { border: '1px solid #eee', background: '#fafafa', borderRadius: 12, padding: '10px 16px', fontSize: 26, cursor: 'pointer', display: 'grid', placeItems: 'center', gap: 2 }
const sheetLbl: React.CSSProperties = { fontSize: 12, color: '#555' }
