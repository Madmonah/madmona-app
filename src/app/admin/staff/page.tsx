'use client'
// src/app/admin/staff/page.tsx
// =====================================================================
// 🔐 (١٩ أغسطس ٢٠٢٦ — محمد: «هعمل صفحة إدارة الموظفين وانتا تضيفهم بنفسك»)
// إدارة حسابات دخول الأدمن — كل موظف مضمونة بحسابه الشخصي (إيميل/تليفون/باسورد)
// بدل الباسورد المشترك القديم.
//
// 👥 (٢٢ أغسطس ٢٠٢٦ — محمد: «ليه في إدارة الموظفين الموظفين مش باينين؟»)
//    لأن الشاشة دي كانت بتعرض `platform_admins` بس (٣ حسابات دخول أدمن)،
//    والفريق الحقيقي في `business_employees` (٨ أفراد). **تلات قوايم
//    منفصلة ومحدش رابطها:**
//      1) `business_employees` — الفريق الحقيقي              ٨
//      2) `auth/profiles`      — حساب على أبليكيشن مضمونة    ٥
//      3) `platform_admins`    — دخول لوحة الأدمن            ٣
//    فخمس أفراد كانوا مختفيين تمامًا من الشاشة اللي اسمها «إدارة الموظفين».
//
//    الحل: قسم «فريق مضمونة كله» فوق، بيعرض الـ٨ وجنب كل واحد **ناقصه إيه
//    بالظبط** (حساب أبليكيشن؟ دخول أدمن؟ رقم؟ تخصص في الـCRM؟).
//    مابندمجش الجداول ولا بنخترع حسابات — بنوريك الحقيقة وانت تقرّر.
// =====================================================================

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Loader2, AlertCircle, ArrowRight, UserPlus, Shield, ShieldOff, KeyRound, Trash2, Crown, User, Users, Smartphone, Headphones, RefreshCw, Check, X } from 'lucide-react'
import { adminRpc } from '@/lib/adminRpc'

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

type TeamMember = {
  employee_id: string; full_name: string; role_ar: string; phone: string | null
  email: string | null
  has_app: boolean; has_password: boolean; login_email: string | null
  has_admin: boolean; admin_role: string | null
  admin_status: string | null; last_admin_login: string | null
  specialties: string[]; crm_contacts: number; open_tasks: number
  missing: string[]
}

type TeamCounts = { team: number; with_app: number; with_admin: number; can_login: number; no_phone: number }

type SyncRow = {
  employee_id: string; full_name: string; ok: boolean; created: boolean
  reason: string | null; detail: string | null; login_email: string | null; has_password: boolean
}

export default function StaffPage() {
  const [team, setTeam] = useState<TeamMember[] | null>(null)
  const [teamCounts, setTeamCounts] = useState<TeamCounts | null>(null)
  const [syncing, setSyncing] = useState(false)
  const [syncRows, setSyncRows] = useState<SyncRow[] | null>(null)
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
      // 👥 الفريق كله — نداء منفصل عشان لو وقع مايوقّعش الشاشة كلها
      try {
        const t = await adminRpc<{ ok: boolean; team: TeamMember[]; counts: TeamCounts }>('madmona_team_accounts')
        if (t?.ok) { setTeam(t.team || []); setTeamCounts(t.counts) }
      } catch { /* القسم ده إضافي — مايمنعش عرض حسابات الأدمن */ }
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  // 🧑‍💼 (٢٣ أغسطس ٢٠٢٦ — محمد: «لوحة الاستف خليها تاخد البيانات من الموظفين
  //    وتعمل الحسابات») بتمشي على كل موظفي مضمونة وتعمل اللي ناقص.
  //    ⚠️ بنعرض نتيجة **كل موظف** — مش «تمام ✅» وبس. اللي فشل بنقول ليه.
  async function syncAccounts() {
    if (syncing) return
    setSyncing(true); setSyncRows(null)
    try {
      const r = await adminRpc<{ ok: boolean; rows: SyncRow[]; counts: { created: number; existed: number; failed: number }; error?: string }>('madmona_sync_staff_accounts')
      if (!r?.ok) { alert(r?.error || 'مقدرناش نعمل الحسابات'); return }
      setSyncRows(r.rows || [])
      flash(`اتعمل ${r.counts.created} حساب جديد · ${r.counts.existed} كانوا موجودين${r.counts.failed ? ` · ${r.counts.failed} مش قادرين` : ''}`)
      load()
    } catch (e) {
      alert((e as Error).message)
    } finally {
      setSyncing(false)
    }
  }

  // 📵 حطّ رقم/إيميل من نفس الشاشة → الحساب بيتعمل على طول
  async function saveContact(m: TeamMember, phone: string, email: string) {
    const r = await adminRpc<{ ok: boolean; error?: string; provision?: { ok: boolean; reason?: string; created?: boolean } }>(
      'madmona_staff_set_contact',
      { p_employee_id: m.employee_id, p_phone: phone || null, p_email: email || null },
    )
    if (!r?.ok) return r?.error || 'مقدرناش نحفظ'
    flash(r.provision?.created ? `اتعمل حساب لـ${m.full_name} ✅` : `اتحفظ — ${m.full_name} عنده حساب`)
    load()
    return ''
  }

  // 🔑 الباسورد بتتخزّن bcrypt في جدول الموظفين (المصدر الوحيد) وبتتنسخ للحساب
  async function savePassword(m: TeamMember, pw: string) {
    const r = await adminRpc<{ ok: boolean; error?: string }>(
      'madmona_staff_set_password',
      { p_employee_id: m.employee_id, p_password: pw },
    )
    if (!r?.ok) return r?.error || 'مقدرناش نحفظ الباسورد'
    flash(`${m.full_name} بقى يقدر يدخل ✅`)
    load()
    return ''
  }

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

        {team && team.length > 0 && (
          <section style={{ marginBottom: 22 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
              <Users size={16} color="#059669" />
              <h2 style={{ fontSize: 15, fontWeight: 800, margin: 0 }}>فريق مضمونة كله</h2>
              {teamCounts && (
                <span style={{ fontSize: 12, color: '#6B7280' }}>
                  {teamCounts.team} فرد · <b style={{ color: teamCounts.can_login === teamCounts.team ? '#059669' : '#B45309' }}>{teamCounts.can_login} يقدروا يدخلوا</b> · {teamCounts.with_admin} معاهم دخول الأدمن
                </span>
              )}
              {isOwner && (
                <button
                  onClick={syncAccounts}
                  disabled={syncing}
                  style={{ marginInlineStart: 'auto', display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 10, border: '1px solid #059669', background: syncing ? '#f3f4f6' : '#05966912', color: '#059669', fontWeight: 800, fontSize: 12.5, cursor: syncing ? 'default' : 'pointer', fontFamily: 'inherit' }}
                >
                  {syncing ? <Loader2 className="animate-spin" size={14} /> : <RefreshCw size={14} />}
                  {syncing ? 'بيعمل الحسابات...' : 'اعمل الحسابات من الموظفين'}
                </button>
              )}
            </div>
            {/* 🧑‍💼 (٢٣ أغسطس ٢٠٢٦ — محمد: «لوحة الاستف خليها تاخد البيانات من
                الموظفين وتعمل الحسابات») الشاشة دي كانت **بتتفرّج** بس. وأول ما
                عملناها اكتشفنا حاجة أهم: ٧ من ٩ عندهم حساب فعلاً بس **من غير
                باسورد** — يعني الشاشة كانت بتقول «الأبليكيشن ✓» وهو مش قادر
                يدخل. فبقى في تلات حالات مفصولة مش حالتين. */}
            <p style={{ fontSize: 11.5, color: '#9CA3AF', margin: '0 0 10px', lineHeight: 1.7 }}>
              دي القايمة الحقيقية من ملف الموظفين — أي حد تضيفه في «الإدارة الكاملة» بيظهر هنا.
              <br />
              <b style={{ color: '#B45309' }}>الحساب لوحده مش كفاية:</b> عشان الموظف يدخل لازم
              يكون عنده <b>رقم</b> (منه بيتعمل الحساب) و<b>باسورد</b>. الاتنين بيتحطّوا من هنا،
              والباسورد بتتخزّن مشفّرة في ملف الموظف — مش بنولّدها ومش بنعرضها لحد.
            </p>
            {syncRows && (
              <div style={{ background: '#fff', border: '1px solid #e8e6df', borderRadius: 12, padding: '10px 12px', marginBottom: 10 }}>
                <div style={{ fontSize: 12, fontWeight: 800, marginBottom: 6 }}>نتيجة آخر تشغيل</div>
                {syncRows.map((r) => (
                  <div key={r.employee_id} style={{ fontSize: 11.5, color: r.ok ? '#059669' : '#B45309', padding: '2px 0', fontWeight: r.ok ? 400 : 700 }}>
                    {r.ok ? (r.created ? '✅ اتعمل حساب' : '✓ كان موجود') : '⚠️'} — {r.full_name}
                    {!r.ok && (r.reason === 'no_phone_or_email'
                      ? ' — مفيش رقم ولا إيميل، مستحيل يتعمل حساب'
                      : ` — ${r.detail || r.reason || 'مش عارفين السبب'}`)}
                    {r.ok && !r.has_password && <span style={{ color: '#B45309', fontWeight: 700 }}> — بس من غير باسورد، مش هيعرف يدخل</span>}
                  </div>
                ))}
              </div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {team.map((m) => (
                <TeamRow
                  key={m.employee_id}
                  m={m}
                  isOwner={isOwner}
                  onSaveContact={saveContact}
                  onSavePassword={savePassword}
                />
              ))}
            </div>
          </section>
        )}

        {team && team.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <Shield size={16} color="#059669" />
            <h2 style={{ fontSize: 15, fontWeight: 800, margin: 0 }}>حسابات دخول لوحة الأدمن</h2>
          </div>
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

// =====================================================================
// 🧑‍💼 صف الموظف — بيقول الحقيقة كاملة وبيخلّيك تصلّحها من نفس المكان
//    تلات حالات مفصولة عن بعض عن قصد:
//      • مفيش رقم           → مستحيل يتعمل حساب أصلاً (بنطلب الرقم)
//      • حساب من غير باسورد → موجود بس الدخول مقفول (بنطلب باسورد)
//      • جاهز                → يقدر يدخل فعلاً
//    قبل كده الاتنين الأولانيين كانوا بيتلموا تحت «الأبليكيشن ✓» أو
//    «مفيش حساب» — يعني الشاشة كانت بتقول حاجة مش دقيقة.
// =====================================================================
function TeamRow({ m, isOwner, onSaveContact, onSavePassword }: {
  m: TeamMember
  isOwner: boolean
  onSaveContact: (m: TeamMember, phone: string, email: string) => Promise<string>
  onSavePassword: (m: TeamMember, pw: string) => Promise<string>
}) {
  const [mode, setMode] = useState<null | 'phone' | 'pw'>(null)
  const [phone, setPhone] = useState('')
  const [pw, setPw] = useState('')
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  const ready = m.has_app && m.has_password
  const digits = phone.replace(/\D/g, '')
  const phoneOk = /^01\d{9}$/.test(digits) || /^201\d{9}$/.test(digits)

  async function submit() {
    if (saving) return
    setSaving(true); setErr('')
    const msg = mode === 'phone' ? await onSaveContact(m, phone, '') : await onSavePassword(m, pw)
    setSaving(false)
    if (msg) { setErr(msg); return }
    setMode(null); setPhone(''); setPw('')
  }

  return (
    <div style={{ background: '#fff', border: '1px solid #e8e6df', borderRadius: 14, padding: '12px 14px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <div style={{ width: 34, height: 34, borderRadius: 10, background: ready ? '#05966915' : '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <User size={16} color={ready ? '#059669' : '#9CA3AF'} />
        </div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontWeight: 800, fontSize: 13.5 }}>
            {m.full_name} <span style={{ fontSize: 11, color: '#9CA3AF', fontWeight: 600 }}>· {m.role_ar}</span>
          </div>
          <div style={{ fontSize: 11.5, color: '#6B7280', marginTop: 3, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 3,
              color: ready ? '#059669' : '#B45309',
              fontWeight: ready ? 400 : 700,
            }}>
              <Smartphone size={12} />
              {!m.phone && !m.email
                ? 'مفيش رقم — عشان كده مالوش حساب'
                : !m.has_app
                  ? 'لسه مالوش حساب — دوس «اعمل الحسابات»'
                  : !m.has_password
                    ? 'الحساب موجود بس من غير باسورد — مش هيعرف يدخل'
                    : 'جاهز يدخل ✓'}
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, color: m.has_admin ? '#059669' : '#9CA3AF' }}>
              <Shield size={12} /> {m.has_admin ? 'لوحة الأدمن ✓' : 'مفيش دخول أدمن'}
            </span>
            {m.has_app && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                <Headphones size={12} /> {m.specialties.length ? m.specialties.join(' · ') : 'مفيش تخصص'}
                {m.crm_contacts > 0 && ` · ${m.crm_contacts} رقم`}
              </span>
            )}
          </div>
          {m.login_email && (
            <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 4, direction: 'ltr', textAlign: 'right' }}>
              {m.login_email}
            </div>
          )}
        </div>
        {isOwner && mode === null && (
          <div style={{ display: 'flex', gap: 6, flexShrink: 0, flexWrap: 'wrap' }}>
            {!m.phone && !m.email && (
              <button onClick={() => setMode('phone')} style={smallBtn}>ضيف رقمه</button>
            )}
            {(m.phone || m.email) && (
              <button onClick={() => setMode('pw')} style={smallBtn}>
                {m.has_password ? 'غيّر الباسورد' : 'حطّ باسورد'}
              </button>
            )}
          </div>
        )}
      </div>

      {mode !== null && (
        <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px dashed #e8e6df' }}>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
            {mode === 'phone' ? (
              <input
                autoFocus dir="ltr" placeholder="01xxxxxxxxx" value={phone}
                onChange={(e) => setPhone(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && phoneOk) submit() }}
                style={{ ...inputStyle, flex: 1, minWidth: 180, padding: '8px 10px', fontSize: 13 }}
              />
            ) : (
              <input
                autoFocus dir="ltr" type="text" placeholder="باسورد جديدة (٨ حروف على الأقل)" value={pw}
                onChange={(e) => setPw(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && pw.length >= 8) submit() }}
                style={{ ...inputStyle, flex: 1, minWidth: 180, padding: '8px 10px', fontSize: 13 }}
              />
            )}
            <button
              onClick={submit}
              disabled={saving || (mode === 'phone' ? !phoneOk : pw.length < 8)}
              style={{ ...smallBtn, background: '#059669', color: '#fff', border: 'none', opacity: saving || (mode === 'phone' ? !phoneOk : pw.length < 8) ? 0.5 : 1 }}
            >
              {saving ? <Loader2 className="animate-spin" size={14} /> : <Check size={14} />}
            </button>
            <button onClick={() => { setMode(null); setErr(''); setPhone(''); setPw('') }} style={smallBtn}><X size={14} /></button>
          </div>
          <p style={{ fontSize: 10.5, color: '#9CA3AF', margin: '6px 0 0' }}>
            {mode === 'phone'
              ? 'أول ما تحفظ الرقم، الحساب بيتعمل على طول — بعدها حطّ له باسورد.'
              : 'الباسورد بتتخزّن مشفّرة في ملف الموظف. قولهاله بنفسك — مفيش مكان بيعرضها تاني.'}
          </p>
          {err && <p style={{ fontSize: 11.5, color: '#d9534f', fontWeight: 700, margin: '6px 0 0' }}>{err}</p>}
        </div>
      )}
    </div>
  )
}

const smallBtn: React.CSSProperties = {
  padding: '7px 12px', borderRadius: 9, border: '1px solid #e8e6df', background: '#fff',
  color: '#374151', fontWeight: 700, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit',
  display: 'flex', alignItems: 'center', gap: 5,
}

const inputStyle: React.CSSProperties = {
  padding: '10px 12px', borderRadius: 10, border: '1px solid #e8e6df', fontSize: 14, fontFamily: 'inherit', outline: 'none', background: '#FAFAF7',
}

const iconBtn: React.CSSProperties = {
  width: 34, height: 34, borderRadius: 9, border: '1px solid #e8e6df', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#374151',
}
