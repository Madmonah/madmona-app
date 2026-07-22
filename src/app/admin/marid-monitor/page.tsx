'use client'

import { useEffect, useState, useCallback, useMemo, useRef } from 'react'

type Msg = { direction: string; body: string | null; ai_generated: boolean; created_at: string; message_type: string }
type Conv = { id: string; name: string | null; phone: string; channel: string; status: string | null; last_at: string | null; waiting: boolean; messages: Msg[] }

function tm(iso: string | null) {
  if (!iso) return ''
  try { return new Date(iso).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }) } catch { return '' }
}
function preview(c: Conv) {
  const last = c.messages[c.messages.length - 1]
  if (!last) return ''
  const who = last.direction === 'outbound' ? (last.ai_generated ? '🧞 ' : '👤 ') : ''
  const txt = last.message_type && last.message_type !== 'text' ? `[${last.message_type}]` : (last.body || '')
  return who + txt.replace(/\s+/g, ' ').slice(0, 46)
}

export default function MaridMonitor() {
  const [convs, setConvs] = useState<Conv[]>([])
  const [selId, setSelId] = useState<string | null>(null)
  const [err, setErr] = useState('')
  const [auto, setAuto] = useState(true)
  const [loaded, setLoaded] = useState(false)

  // تدخّل يدوي
  const [reply, setReply] = useState('')
  const [sending, setSending] = useState(false)
  const [pauseAfter, setPauseAfter] = useState(true)
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null)
  const threadRef = useRef<HTMLDivElement | null>(null)

  const flash = (msg: string, ok = true) => {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 3200)
  }

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/marid-monitor', { cache: 'no-store' })
      if (res.status === 401) { setErr('لازم تكون داخل كأدمن'); return }
      const d = await res.json()
      if (d?.ok) { setConvs(d.conversations || []); setErr('') } else setErr(d?.error || 'فشل التحميل')
    } catch { setErr('مش قادر أوصل للسيرفر') } finally { setLoaded(true) }
  }, [])

  useEffect(() => { load() }, [load])
  useEffect(() => {
    if (!auto) return
    const id = setInterval(load, 10000)
    return () => clearInterval(id)
  }, [auto, load])

  const setConvStatus = useCallback(async (id: string, action: 'pause' | 'resume') => {
    try {
      await fetch('/api/admin/marid-monitor', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ conversationId: id, action }) })
      setConvs((cs) => cs.map((c) => (c.id === id ? { ...c, status: action === 'resume' ? 'active' : 'paused' } : c)))
      flash(action === 'resume' ? 'رجّعنا المارد' : 'وقّفنا المارد', true)
    } catch { flash('مش قادر أغيّر الحالة', false) }
  }, [])

  const sel = useMemo(() => convs.find((c) => c.id === selId) || null, [convs, selId])
  const waitingCount = useMemo(() => convs.filter((c) => c.waiting && c.status !== 'paused').length, [convs])

  // ننزل لآخر الرسايل لما نفتح محادثة أو توصل رسالة جديدة
  useEffect(() => {
    if (sel && threadRef.current) threadRef.current.scrollTop = threadRef.current.scrollHeight
  }, [sel?.id, sel?.messages.length])

  const sendReply = useCallback(async () => {
    if (!sel || !reply.trim() || sending) return
    if (sel.channel === 'ويب') { flash('محادثة ويب — الرد اليدوي لواتساب بس دلوقتي', false); return }
    setSending(true)
    try {
      const res = await fetch('/api/admin/marid-monitor/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId: sel.id, text: reply.trim(), pause: pauseAfter }),
      })
      const d = await res.json()
      if (d?.ok) {
        setReply('')
        flash(d.paused ? 'اتبعت ✓ ووقّفنا المارد' : 'اتبعت ✓', true)
        await load()
      } else {
        flash(d?.error || 'فشل الإرسال', false)
      }
    } catch {
      flash('مش قادر أوصل للسيرفر', false)
    } finally {
      setSending(false)
    }
  }, [sel, reply, sending, pauseAfter, load])

  return (
    <div dir="rtl" style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: '#ECE5DD', fontFamily: "'Cairo', system-ui, sans-serif" }}>
      <style>{"@import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800&display=swap');"}</style>

      {/* توست */}
      {toast && (
        <div style={{ position: 'fixed', top: 12, insetInlineEnd: 12, zIndex: 50, background: toast.ok ? '#059669' : '#dc2626', color: '#fff', padding: '9px 14px', borderRadius: 10, fontSize: 13, fontWeight: 700, boxShadow: '0 4px 14px rgba(0,0,0,.25)' }}>
          {toast.msg}
        </div>
      )}

      {/* هيدر */}
      <div style={{ background: 'linear-gradient(135deg,#0a7d6e,#075E54)', color: '#fff', padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10, boxShadow: '0 2px 10px rgba(0,0,0,.18)', zIndex: 2 }}>
        {sel && <button onClick={() => { setSelId(null); setReply('') }} style={{ background: 'none', border: 'none', color: '#fff', fontSize: 22, cursor: 'pointer' }}>→</button>}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {sel ? (sel.name || sel.phone) : '🧞 مراقبة المارد لايف'}
          </div>
          <div style={{ fontSize: 11, opacity: .85 }}>
            {sel
              ? `${sel.phone} · ${sel.channel}${sel.status === 'paused' ? ' · ⏸️ المارد موقوف' : ''}`
              : `${convs.length} محادثة · بيتحدّث كل ١٠ث${waitingCount ? ` · ${waitingCount} مستني رد` : ''}`}
          </div>
        </div>
        {!sel && (
          <label style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer' }}>
            <input type="checkbox" checked={auto} onChange={(e) => setAuto(e.target.checked)} /> تلقائي
          </label>
        )}
        {sel && (
          <button onClick={() => setConvStatus(sel.id, sel.status === 'paused' ? 'resume' : 'pause')} style={{ background: sel.status === 'paused' ? '#22c55e' : '#ef4444', color: '#fff', border: 'none', borderRadius: 12, padding: '5px 11px', fontSize: 12, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>
            {sel.status === 'paused' ? '▶️ رجّع المارد' : '⏸️ وقّف المارد'}
          </button>
        )}
        <button onClick={load} title="حدّث" style={{ background: 'rgba(255,255,255,.2)', color: '#fff', border: 'none', borderRadius: 12, padding: '5px 10px', fontSize: 13, cursor: 'pointer' }}>↻</button>
      </div>

      {err && <div style={{ background: '#fee2e2', color: '#991b1b', padding: 10, textAlign: 'center', fontSize: 14 }}>{err}</div>}

      {/* قايمة المحادثات */}
      {!sel && (
        <div style={{ flex: 1, overflowY: 'auto', background: '#fff' }}>
          {!loaded && <div style={{ padding: 20, color: '#667' }}>لحظة…</div>}
          {loaded && convs.length === 0 && !err && <div style={{ padding: 20, color: '#667', textAlign: 'center' }}>مفيش محادثات</div>}
          {convs.map((c) => {
            const paused = c.status === 'paused'
            return (
              <button key={c.id} onClick={() => { setSelId(c.id); setReply('') }} style={{ display: 'flex', width: '100%', textAlign: 'right', alignItems: 'center', gap: 12, background: c.waiting && !paused ? '#fffbeb' : '#fff', border: 'none', borderBottom: '1px solid #eee', padding: '10px 14px', cursor: 'pointer' }}>
                <div style={{ width: 46, height: 46, borderRadius: '50%', background: c.channel === 'ويب' ? '#2563eb' : '#128C7E', color: '#fff', display: 'grid', placeItems: 'center', fontSize: 18, fontWeight: 700, flexShrink: 0 }}>{(c.name || 'م').trim()[0]}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <span style={{ fontWeight: 700, color: '#111', flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.name || c.phone}</span>
                    {paused && <span title="المارد موقوف" style={{ fontSize: 10, background: '#fee2e2', color: '#991b1b', padding: '1px 7px', borderRadius: 20, fontWeight: 700, flexShrink: 0 }}>موقوف ⏸️</span>}
                    <span style={{ fontSize: 10, background: c.channel === 'ويب' ? '#dbeafe' : '#dcfce7', color: c.channel === 'ويب' ? '#1e40af' : '#166534', padding: '1px 7px', borderRadius: 20 }}>{c.channel}</span>
                    <span style={{ fontSize: 10, color: '#999' }}>{tm(c.last_at)}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 2 }}>
                    <span style={{ fontSize: 13, color: '#667', flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{preview(c)}</span>
                    {c.waiting && !paused && <span title="العميل مستني رد" style={{ fontSize: 10, background: '#fef3c7', color: '#92400e', padding: '1px 7px', borderRadius: 20, fontWeight: 700, flexShrink: 0 }}>مستني ⏳</span>}
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      )}

      {/* المحادثة بشكل واتساب + تدخّل يدوي */}
      {sel && (
        <>
          <div ref={threadRef} style={{ flex: 1, overflowY: 'auto', padding: '14px 10px' }}>
            {sel.messages.map((m, i) => {
              const bot = m.direction === 'outbound'
              return (
                <div key={i} style={{ display: 'flex', justifyContent: bot ? 'flex-start' : 'flex-end', marginBottom: 8 }}>
                  <div style={{ maxWidth: '82%', background: bot ? (m.ai_generated ? '#dcf8c6' : '#fff7cc') : '#fff', borderRadius: 14, padding: '8px 11px', boxShadow: '0 1px 3px rgba(0,0,0,.08)', whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: 14.5, lineHeight: 1.6 }}>
                    <span style={{ display: 'block', fontSize: 10, fontWeight: 700, marginBottom: 2, color: bot ? (m.ai_generated ? '#0a6b4f' : '#92400e') : '#475569' }}>
                      {bot ? (m.ai_generated ? '🧞 المارد' : '👤 رد يدوي') : `📩 ${sel.name || 'العميل'}`}
                    </span>
                    {m.message_type && m.message_type !== 'text' ? `[${m.message_type}] ` : ''}{m.body || ''}
                    <span style={{ display: 'block', textAlign: 'left', fontSize: 10, color: '#999', marginTop: 3 }}>{tm(m.created_at)}</span>
                  </div>
                </div>
              )
            })}
          </div>

          {/* شريط التدخّل — الأدمن يصحّح غلطة المارد فورًا */}
          <div style={{ background: '#f0f2f5', borderTop: '1px solid #ddd', padding: '8px 10px' }}>
            {sel.channel === 'ويب' ? (
              <div style={{ textAlign: 'center', color: '#667', fontSize: 12, padding: '6px 0' }}>
                دي محادثة ويب — الرد اليدوي من هنا لواتساب بس دلوقتي.
              </div>
            ) : (
              <>
                <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
                  <textarea
                    value={reply}
                    onChange={(e) => setReply(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendReply() } }}
                    placeholder="اكتب رد يدوي… (Enter يبعت · Shift+Enter سطر جديد)"
                    rows={1}
                    style={{ flex: 1, resize: 'none', maxHeight: 120, minHeight: 40, border: '1px solid #ccc', borderRadius: 20, padding: '10px 14px', fontSize: 14, fontFamily: 'inherit', outline: 'none', direction: 'rtl' }}
                  />
                  <button
                    onClick={sendReply}
                    disabled={sending || !reply.trim()}
                    style={{ background: sending || !reply.trim() ? '#9ca3af' : '#075E54', color: '#fff', border: 'none', borderRadius: '50%', width: 44, height: 44, fontSize: 18, cursor: sending || !reply.trim() ? 'default' : 'pointer', flexShrink: 0 }}
                    title="ابعت"
                  >
                    {sending ? '⟳' : '➤'}
                  </button>
                </div>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#475569', marginTop: 6, cursor: 'pointer' }}>
                  <input type="checkbox" checked={pauseAfter} onChange={(e) => setPauseAfter(e.target.checked)} />
                  وقّف المارد بعد ما أبعت (عشان مايردّش فوق تصحيحي)
                </label>
              </>
            )}
          </div>
        </>
      )}
    </div>
  )
}
