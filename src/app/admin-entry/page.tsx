'use client'
// src/app/admin-entry/page.tsx
// =====================================================================
// 🔐 (١٩ أغسطس ٢٠٢٦) صفحة دخول لوحة الإدارة — بحساب شخصي.
// إيميل أو تليفون + باسورد، لموظفي مضمونة فقط. الباسورد المشترك القديم اتلغى.
// =====================================================================

import { useState } from 'react'

const C = {
  green: '#059669', greenMid: '#2FA084', gold: '#d4a017',
  cream: '#FAFAF7', ink: '#0A0A0A', gray: '#6B7280', line: '#e8e6df', white: '#FFFFFF', red: '#d9534f',
}

export default function AdminEntryPage() {
  const [identifier, setIdentifier] = useState('')
  const [pw, setPw] = useState('')
  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(false)

  async function submit() {
    if (!identifier || !pw || loading) return
    setLoading(true); setErr('')
    try {
      const r = await fetch('/api/admin-entry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, password: pw }),
      })
      const raw = await r.text()
      let j: { ok?: boolean; error?: string } = {}
      try { j = JSON.parse(raw) } catch {
        setErr(`السيرفر رجّع ${r.status} مش JSON — ${raw.slice(0, 160) || '(رد فاضي)'}`)
        setLoading(false)
        return
      }
      if (r.ok && j?.ok) {
        const next = new URLSearchParams(window.location.search).get('next') || '/admin/dashboard'
        window.location.href = next.startsWith('/admin') ? next : '/admin/dashboard'
      } else {
        setErr(j?.error || `فشل الدخول (${r.status})`)
        setLoading(false)
      }
    } catch (e) {
      setErr(`مامقدرناش نوصل للسيرفر: ${(e as Error)?.message || 'سبب مش معروف'}`)
      setLoading(false)
    }
  }

  return (
    <div dir="rtl" style={{ fontFamily: 'Cairo, Tahoma, sans-serif', background: C.cream, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 380, background: C.white, border: `1px solid ${C.line}`, borderRadius: 22, padding: '32px 26px', boxShadow: '0 14px 44px rgba(250, 129, 37,0.13)' }}>

        <div style={{ width: 62, height: 62, borderRadius: 18, margin: '0 auto 16px', background: `linear-gradient(135deg, ${C.gold}, ${C.greenMid}, ${C.green})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28 }}>
          🔒
        </div>

        <h1 style={{ textAlign: 'center', margin: 0, fontSize: 22, fontWeight: 900, color: C.green }}>لوحة تحكم مضمونة</h1>
        <p style={{ textAlign: 'center', margin: '6px 0 22px', fontSize: 13, color: C.gray }}>موظفي مضمونة فقط — ادخل بحسابك الشخصي</p>

        <input
          type="text"
          value={identifier}
          onChange={e => setIdentifier(e.target.value)}
          placeholder="الإيميل أو رقم التليفون"
          autoFocus
          style={{ width: '100%', boxSizing: 'border-box', padding: '13px 15px', fontSize: 15, fontFamily: 'inherit', borderRadius: 12, border: `1.5px solid ${err ? C.red : C.line}`, outline: 'none', background: C.cream, color: C.ink, textAlign: 'center', marginBottom: 10 }}
          dir="ltr"
        />

        <input
          type="password"
          value={pw}
          onChange={e => setPw(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') submit() }}
          placeholder="••••••••"
          style={{ width: '100%', boxSizing: 'border-box', padding: '13px 15px', fontSize: 16, fontFamily: 'inherit', borderRadius: 12, border: `1.5px solid ${err ? C.red : C.line}`, outline: 'none', background: C.cream, color: C.ink, textAlign: 'center', letterSpacing: 3 }}
        />

        {err && <div style={{ color: C.red, fontSize: 13, fontWeight: 700, textAlign: 'center', marginTop: 10 }}>{err}</div>}

        <button
          onClick={submit}
          disabled={loading || !identifier || !pw}
          style={{ width: '100%', marginTop: 16, padding: '13px', fontSize: 16, fontWeight: 900, fontFamily: 'inherit', color: C.white, border: 'none', borderRadius: 12, cursor: (loading || !identifier || !pw) ? 'default' : 'pointer', opacity: (loading || !identifier || !pw) ? 0.6 : 1, background: `linear-gradient(100deg, ${C.gold}, ${C.greenMid} 55%, ${C.green})` }}
        >
          {loading ? '...بيتأكد' : 'دخول'}
        </button>

        <p style={{ textAlign: 'center', margin: '18px 0 0', fontSize: 11, color: C.gray }}>
          محمي بقفل مضمونة 🔐 — الجلسة فعّالة ٣٠ يوم
        </p>
      </div>
    </div>
  )
}
