'use client'
// src/app/admin/staff/page.tsx
// =====================================================================
// 🔐 (١٩ أغسطس ٢٠٢٦ — محمد: «هعمل صفحة إدارة الموظفين وانتا تضيفهم بنفسك»)
// إدارة حسابات دخول الأدمن — كل موظف مضمونة بحسابه الشخصي (إيميل/تليفون/باسورد)
// بدل الباسورد المشترك القديم.
// =====================================================================

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Loader2, AlertCircle, ArrowRight, UserPlus, Shield, ShieldOff, KeyRound, Trash2, Crown, User } from 'lucide-react'

type Staff = {
  id: string
  full_name: string
  email: string
  phone: string
  role: 'owner' | 'admin'
  status: 'active' | 'disabled'
  last_login_at: string | null
  created_at: string
}

async function api<T>(url: string, opts?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...opts,
    headers: { 'Content-Type': 'application/json', ...(opts?.headers || {}) },
  })
  const raw = await res.text()
  let j: Record<string, unknown> = {}
  try { j = JSON.parse(raw) } catch { throw new Error(`السيرفر رجّع ${res.status} مش JSON`) }
  if (!res.ok || j.error) throw new Error((j.error as string) || `فشل (${res.status})`)
  return j as T
}

export default function StaffPage() {
  const [staff, setStaff] = useState<Staff[] | null>(null)
  const [myRole, setMyRole] = useState<'owner' | 'admin' | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [toast, setToast] = useState('')
  const [addOpen, setAddOpen] = useState(false)
  const [busy, setBusy] = useState<Record<string, boolean>>({})
  const isOwner = myRole === 'owner'

  // فورم الإضافة
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<'owner' | 'admin'>('admin')
  const [submitting, setSubmitting] = useState(false)
  const [formErr, setFormErr] = useState('')

  function flash(m: string) { setToast(m); setTimeout(() => setToast(''), 2500) }

  async function load() {
    setLoading(true); setError('')
    try {
      const data = await api<{ staff: Staff[]; me: { role: 'owner' | 'admin' } }>('/api/admin/staff')
      setStaff(data.staff)
      setMyRole(data.me?.role ?? null)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  async function addStaff() {
    if (submitting) return
    setFormErr('')
    if (!fullName.trim() || !email.trim() || !phone.trim() || !password) {
      setFormErr('كل الحقول مطلوبة')
      return
    }
    setSubmitting(true)
    try {
      await api('/api/admin/staff', {
        method: 'POST',
        body: JSON.stringify({ full_name: fullName.trim(), email: email.trim(), phone: phone.trim(), password, role }),
      })
      setFullName(''); setEmail(''); setPhone(''); setPassword(''); setRole('admin')
      setAddOpen(false)
      flash('اتضاف الموظف ✅')
      load()
    } catch (e) {
      setFormErr((e as Error).message)
    } finally {
      setSubmitting(false)
    }
  }

  async function toggleStatus(s: Staff) {
    const next = s.status === 'active' ? 'disabled' : 'active'
    if (next === 'disabled' && !confirm(`متأكد إنك عايز تعطّل حساب ${s.full_name}؟ هيخرج فورًا من أي جلسة مفتوحة.`)) return
    setBusy((b) => ({ ...b, [s.id]: true }))
    try {
      await api('/api/admin/staff', { method: 'PATCH', body: JSON.stringify({ id: s.id, status: next }) })
      flash(next === 'disabled' ? 'اتعطّل الحساب' : 'اتفعّل الحساب')
      load()
    } catch (e) {
      alert((e as Error).message)
    } finally {
      setBusy((b) => ({ ...b, [s.id]: false }))
    }
  }

  async function resetPassword(s: Staff) {
    const pw = prompt(`باسورد جديدة لـ ${s.full_name} (٨ حروف على الأقل):`)
    if (!pw) return
    setBusy((b) => ({ ...b, [s.id]: true }))
    try {
      await api('/api/admin/staff', { method: 'PATCH', body: JSON.stringify({ id: s.id, new_password: pw }) })
      flash('اتغيّرت الباسورد — هيخرج من أي جلسة مفتوحة قبل كده')
    } catch (e) {
      alert((e as Error).message)
    } finally {
      setBusy((b) => ({ ...b, [s.id]: false }))
    }
  }

  async function removeStaff(s: Staff) {
    if (!confirm(`متأكد إنك عايز تمسح حساب ${s.full_name} نهائيًا؟`)) return
    setBusy((b) => ({ ...b, [s.id]: true }))
    try {
      await api('/api/admin/staff', { method: 'DELETE', body: JSON.stringify({ id: s.id }) })
      flash('اتمسح الحساب')
      load()
    } catch (e) {
      alert((e as Error).message)
    } finally {
      setBusy((b) => ({ ...b, [s.id]: false }))
    }
  }

  return (
    <div dir="rtl" style={{ minHeight: '100vh', background: '#FAFAF7', fontFamily: 'Cairo, Tahoma, sans-serif' }}>
      <header style={{ borderBottom: '1px solid #e8e6df', padding: '16px 20px', position: 'sticky', top: 0, background: 'rgba(250,250,247,0.95)', backdropFilter: 'blur(6px)', zIndex: 10 }}>
        <div style={{ maxWidth: 900, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Link href="/admin/dashboard" style={{ color: '#6B7280', display: 'flex', alignItems: 'center' }}><ArrowRight size={20} /></Link>
            <div>
              <h1 style={{ margin: 0, fontSize: 19, fontWeight: 900, color: '#059669' }}>إدارة الموظفين</h1>
              <p style={{ margin: '2px 0 0', fontSize: 12, color: '#6B7280' }}>حسابات دخول لوحة الأدمن — لموظفي مضمونة فقط</p>
            </div>
          </div>
          {isOwner && (
            <button
              onClick={() => setAddOpen((v) => !v)}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 16px', borderRadius: 10, border: 'none', background: '#059669', color: '#fff', fontWeight: 800, fontSize: 13, cursor: 'pointer' }}
            >
              <UserPlus size={16} /> إضافة موظف
            </button>
          )}
        </div>
      </header>

      <main style={{ maxWidth: 900, margin: '0 auto', padding: '20px' }}>
        {!loading && !isOwner && myRole && (
          <div style={{ background: '#d4a01715', color: '#92700f', padding: '10px 14px', borderRadius: 10, fontSize: 13, fontWeight: 700, marginBottom: 14 }}>
            👁️ عرض بس — إضافة/تعديل/حذف الحسابات لـ owner بس.
          </div>
        )}
        {addOpen && isOwner && (
          <div style={{ background: '#fff', border: '1px solid #e8e6df', borderRadius: 16, padding: 18, marginBottom: 16 }}>
            <h3 style={{ margin: '0 0 12px', fontSize: 15, fontWeight: 800 }}>موظف جديد</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <input placeholder="الاسم الكامل" value={fullName} onChange={(e) => setFullName(e.target.value)} style={inputStyle} />
              <select value={role} onChange={(e) => setRole(e.target.value as 'owner' | 'admin')} style={inputStyle}>
                <option value="admin">أدمن</option>
                <option value="owner">مالك (صلاحيات كاملة)</option>
              </select>
              <input placeholder="الإيميل" type="email" value={email} onChange={(e) => setEmail(e.target.value)} style={inputStyle} dir="ltr" />
              <input placeholder="رقم التليفون (01xxxxxxxxx)" value={phone} onChange={(e) => setPhone(e.target.value)} style={inputStyle} dir="ltr" />
              <input placeholder="الباسورد (٨ حروف على الأقل)" type="text" value={password} onChange={(e) => setPassword(e.target.value)} style={inputStyle} dir="ltr" />
            </div>
            {formErr && <div style={{ color: '#d9534f', fontSize: 13, fontWeight: 700, marginTop: 10 }}>{formErr}</div>}
            <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
              <button onClick={addStaff} disabled={submitting} style={{ padding: '10px 18px', borderRadius: 10, border: 'none', background: '#059669', color: '#fff', fontWeight: 800, fontSize: 13, cursor: submitting ? 'default' : 'pointer', opacity: submitting ? 0.6 : 1 }}>
                {submitting ? '...بيتضاف' : 'ضيف الموظف'}
              </button>
              <button onClick={() => setAddOpen(false)} style={{ padding: '10px 18px', borderRadius: 10, border: '1px solid #e8e6df', background: '#fff', color: '#6B7280', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
                إلغاء
              </button>
            </div>
          </div>
        )}

        {toast && (
          <div style={{ background: '#05966915', color: '#059669', padding: '10px 14px', borderRadius: 10, fontSize: 13, fontWeight: 700, marginBottom: 14 }}>{toast}</div>
        )}

        {loading ? (
          <div style={{ textAlign: 'center', padding: 40, color: '#6B7280' }}><Loader2 className="animate-spin" size={28} style={{ margin: '0 auto 8px' }} /> جاري التحميل...</div>
        ) : error ? (
          <div style={{ textAlign: 'center', padding: 40, color: '#d9534f' }}><AlertCircle size={28} style={{ margin: '0 auto 8px' }} /> {error}</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {(staff ?? []).map((s) => (
              <div key={s.id} style={{ background: '#fff', border: '1px solid #e8e6df', borderRadius: 14, padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', opacity: s.status === 'disabled' ? 0.55 : 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                  <div style={{ width: 38, height: 38, borderRadius: 10, background: s.role === 'owner' ? '#d4a01722' : '#05966915', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {s.role === 'owner' ? <Crown size={18} color="#d4a017" /> : <User size={18} color="#059669" />}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 800, fontSize: 14 }}>{s.full_name} {s.status === 'disabled' && <span style={{ fontSize: 11, color: '#d9534f' }}>(معطّل)</span>}</div>
                    <div style={{ fontSize: 12, color: '#6B7280', direction: 'ltr', textAlign: 'right' }}>{s.email} · {s.phone}</div>
                    <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 2 }}>
                      {s.role === 'owner' ? 'مالك' : 'أدمن'} · آخر دخول: {s.last_login_at ? new Date(s.last_login_at).toLocaleString('ar-EG', { dateStyle: 'short', timeStyle: 'short' }) : 'لسه ما دخلش'}
                    </div>
                  </div>
                </div>
                {isOwner && (
                  <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                    <button title="غيّر الباسورد" onClick={() => resetPassword(s)} disabled={busy[s.id]} style={iconBtn}><KeyRound size={15} /></button>
                    <button title={s.status === 'active' ? 'عطّل الحساب' : 'فعّل الحساب'} onClick={() => toggleStatus(s)} disabled={busy[s.id]} style={iconBtn}>
                      {s.status === 'active' ? <ShieldOff size={15} /> : <Shield size={15} />}
                    </button>
                    <button title="امسح نهائيًا" onClick={() => removeStaff(s)} disabled={busy[s.id]} style={{ ...iconBtn, color: '#d9534f' }}><Trash2 size={15} /></button>
                  </div>
                )}
              </div>
            ))}
            {staff && staff.length === 0 && (
              <div style={{ textAlign: 'center', padding: 40, color: '#6B7280' }}>مفيش موظفين مضافين لسه — دوس «إضافة موظف»</div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  padding: '10px 12px', borderRadius: 10, border: '1px solid #e8e6df', fontSize: 14, fontFamily: 'inherit', outline: 'none', background: '#FAFAF7',
}

const iconBtn: React.CSSProperties = {
  width: 34, height: 34, borderRadius: 9, border: '1px solid #e8e6df', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#374151',
}
