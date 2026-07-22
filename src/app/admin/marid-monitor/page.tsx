'use client'

import { useEffect, useState, useCallback } from 'react'

type Msg = { direction: string; body: string | null; ai_generated: boolean; created_at: string; message_type: string }
type Conv = { id: string; name: string | null; phone: string; channel: string; status: string | null; last_at: string | null; waiting: boolean; messages: Msg[] }

function tm(iso: string | null) {
  if (!iso) return ''
  try { return new Date(iso).toLocaleString('ar-EG', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) } catch { return '' }
}

export default function MaridMonitor() {
  const [convs, setConvs] = useState<Conv[]>([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')
  const [auto, setAuto] = useState(true)

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/marid-monitor', { cache: 'no-store' })
      const d = await res.json()
      if (d?.ok) { setConvs(d.conversations || []); setErr('') }
      else setErr(d?.error || 'فشل التحميل')
    } catch { setErr('مش قادر أوصل للسيرفر') } finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])
  useEffect(() => {
    if (!auto) return
    const id = setInterval(load, 15000)
    return () => clearInterval(id)
  }, [auto, load])

  return (
    <div dir="rtl" style={{ minHeight: '100vh', background: '#f3f5f7', fontFamily: "'Cairo', system-ui, sans-serif", padding: 16 }}>
      <style>{"@import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800&display=swap');"}</style>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <h1 style={{ margin: 0, fontSize: 22, color: '#0f172a' }}>🧞 مراقبة المارد — محادثات حية</h1>
        <span style={{ fontSize: 13, color: '#64748b' }}>({convs.length} محادثة · بيتحدّث كل ١٥ث)</span>
        <label style={{ marginInlineStart: 'auto', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
          <input type="checkbox" checked={auto} onChange={(e) => setAuto(e.target.checked)} /> تحديث تلقائي
        </label>
        <button onClick={load} style={{ background: '#075E54', color: '#fff', border: 'none', borderRadius: 10, padding: '8px 14px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>حدّث الآن ↻</button>
      </div>

      {err && <div style={{ background: '#fee2e2', color: '#991b1b', padding: 12, borderRadius: 10, marginBottom: 12 }}>{err}</div>}
      {loading && <div style={{ color: '#64748b' }}>لحظة…</div>}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(340px,1fr))', gap: 12 }}>
        {convs.map((c) => (
          <div key={c.id} style={{ background: '#fff', borderRadius: 14, padding: 12, boxShadow: '0 1px 4px rgba(0,0,0,.08)', border: c.waiting ? '2px solid #f59e0b' : '1px solid #e5e7eb' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <div style={{ fontWeight: 700, color: '#0f172a', flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.name || c.phone}</div>
              <span style={{ fontSize: 11, background: c.channel === 'ويب' ? '#dbeafe' : '#dcfce7', color: c.channel === 'ويب' ? '#1e40af' : '#166534', padding: '2px 8px', borderRadius: 20 }}>{c.channel}</span>
              {c.waiting && <span style={{ fontSize: 11, background: '#fef3c7', color: '#92400e', padding: '2px 8px', borderRadius: 20, fontWeight: 700 }}>مستني رد ⏳</span>}
            </div>
            <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 8 }}>{c.phone} · {tm(c.last_at)}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              {c.messages.map((m, i) => {
                const isBot = m.direction === 'outbound'
                return (
                  <div key={i} style={{ alignSelf: isBot ? 'flex-start' : 'flex-end', maxWidth: '92%', background: isBot ? (m.ai_generated ? '#eef6ff' : '#e7f9ef') : '#f1f5f9', border: isBot && m.ai_generated ? '1px solid #bfdbfe' : '1px solid #e5e7eb', borderRadius: 10, padding: '6px 9px', fontSize: 13, lineHeight: 1.55, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: isBot ? (m.ai_generated ? '#2563eb' : '#059669') : '#475569', display: 'block', marginBottom: 2 }}>
                      {isBot ? (m.ai_generated ? '🤖 المارد' : '👤 رد يدوي') : '📩 العميل'}
                    </span>
                    {m.message_type && m.message_type !== 'text' ? `[${m.message_type}] ` : ''}{(m.body || '').slice(0, 400)}
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
