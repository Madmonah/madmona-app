'use client'

import { useState, useRef, useEffect } from 'react'

type Msg = { role: 'user' | 'bot'; text: string; time: string }

function nowTime() {
  return new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })
}

export default function ChatPage() {
  const [phone, setPhone] = useState('')
  const [name, setName] = useState('')
  const [started, setStarted] = useState(false)
  const [messages, setMessages] = useState<Msg[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, sending])

  function start() {
    const p = phone.replace(/\D/g, '')
    if (p.length < 10) return
    setStarted(true)
    setMessages([
      { role: 'bot', text: `أهلاً بيك${name ? ' يا ' + name : ''} في مضمونة 👋\nأنا المارد — قولّي محتاج إيه وأنا تحت أمرك.`, time: nowTime() },
    ])
  }

  async function send() {
    const text = input.trim()
    if (!text || sending) return
    setInput('')
    setMessages((m) => [...m, { role: 'user', text, time: nowTime() }])
    setSending(true)
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, name, message: text }),
      })
      const data = await res.json()
      const reply = data?.ok ? data.reply : (data?.error || 'حصل خطأ مؤقت، جرّب تاني.')
      setMessages((m) => [...m, { role: 'bot', text: reply, time: nowTime() }])
    } catch {
      setMessages((m) => [...m, { role: 'bot', text: 'مش قادر أوصل للسيرفر دلوقتي، جرّب تاني.', time: nowTime() }])
    } finally {
      setSending(false)
    }
  }

  // ── شاشة الدخول (زي أونبوردنج واتساب) ──────────────────────────────
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

  // ── شاشة الشات ─────────────────────────────────────────────────────
  return (
    <div dir="rtl" style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: '#ECE5DD', fontFamily: 'system-ui, sans-serif' }}>
      <header style={{ background: '#075E54', color: '#fff', padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#25D366', display: 'grid', placeItems: 'center', fontSize: 20 }}>🤖</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700 }}>المارد — مضمونة</div>
          <div style={{ fontSize: 12, opacity: .85 }}>{sending ? 'بيكتب…' : 'متصل'}</div>
        </div>
      </header>

      <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: '14px 10px' }}>
        {messages.map((m, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-start' : 'flex-end', marginBottom: 8 }}>
            <div style={{ maxWidth: '78%', background: m.role === 'user' ? '#DCF8C6' : '#fff', padding: '7px 10px', borderRadius: 10, boxShadow: '0 1px 1px rgba(0,0,0,.12)', whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: 15, lineHeight: 1.5 }}>
              {m.text}
              <span style={{ display: 'block', textAlign: 'left', fontSize: 10, color: '#8a8a8a', marginTop: 2 }}>{m.time}</span>
            </div>
          </div>
        ))}
        {sending && <div style={{ textAlign: 'end', color: '#667', fontSize: 13, padding: '2px 8px' }}>المارد بيكتب…</div>}
      </div>

      <div style={{ display: 'flex', gap: 8, padding: 10, background: '#F0F0F0' }}>
        <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && send()} placeholder="اكتب رسالة" style={{ ...inp, margin: 0, flex: 1 }} />
        <button onClick={send} disabled={sending} style={{ ...btn, width: 52, padding: 0, opacity: sending ? .6 : 1 }}>➤</button>
      </div>
    </div>
  )
}

const inp: React.CSSProperties = { width: '100%', boxSizing: 'border-box', padding: '12px 14px', margin: '0 0 12px', border: '1px solid #ddd', borderRadius: 10, fontSize: 15, outline: 'none' }
const btn: React.CSSProperties = { background: '#128C7E', color: '#fff', border: 'none', borderRadius: 10, padding: '12px 16px', fontSize: 16, fontWeight: 700, cursor: 'pointer' }
